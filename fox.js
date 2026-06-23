import dotenv from "dotenv";
import P from "pino";
import baileysPkg, {
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  Browsers,
  DisconnectReason,
  makeCacheableSignalKeyStore,
  delay
} from "@ryuu-reinzz/baileys";
import utils from "./utils/utils.js";
import path from "path";
import log from "./utils/log.js";
import fs from "fs-extra";
import express from "express";
import messageHandler from "./handler/messagehandler.js";
import db from "./utils/data.js";
import NodeCachePkg from "node-cache";

dotenv.config();

const makeWASocket = baileysPkg.default || baileysPkg.makeWASocket || baileysPkg;
const NodeCache = NodeCachePkg.default || NodeCachePkg;

const logger = P({ level: "silent" });
const activeSockets = new Map();
const MAIN_SESSION_DIR = path.join(process.cwd(), "cache", "auth_info_baileys");
const EXTRA_SESSIONS_DIR = path.join(process.cwd(), "cache", "sessions");
const SETTINGS_PATH = path.join(process.cwd(), "cache", "accountSettings.json");

let config = {};

const msgRetryCounterMap = new Map();
const msgRetryCounterCache = {
  get: key => msgRetryCounterMap.get(key) || 0,
  set: (key, value) => msgRetryCounterMap.set(key, value),
  delete: key => msgRetryCounterMap.delete(key)
};

async function loadConfig() {
  const data = await fs.readFile(
    new URL("./config.json", import.meta.url),
    "utf-8"
  );
  config = JSON.parse(data);
}

async function startSession(sessionPath, isMain = false, number = "Main", requestPairing = false) {
  const messageCache = new NodeCache({ stdTTL: 300, useClones: false });
  const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    logger,
    version,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, logger)
    },
    printQRInTerminal: false,
    browser: Browsers.ubuntu("Chrome"),
    msgRetryCounterCache,
    markOnlineOnConnect: true,
    getMessage: async key => messageCache.get(`${key.remoteJid}:${key.id}`)
  });

  sock.ev.on("creds.update", saveCreds);

  if (requestPairing && !state.creds.registered) {
    await delay(3000);
    try {
      const pairingNumber = config.botNumber || config.pairingNumber;
      if (!pairingNumber) {
        log.error("Missing 'botNumber' in config.json for local pairing");
        process.exit(1);
      }
      const cleanNumber = String(pairingNumber).replace(/[^0-9]/g, "");
      const code = await sock.requestPairingCode(cleanNumber);
      console.log(`\nLOCAL PAIRING CODE: \x1b[1;32m${code}\x1b[0m\n`);
    } catch (err) {
      log.error(`Pairing failed: ${err.message}`);
    }
  }

  sock.ev.on("connection.update", async ({ connection, lastDisconnect }) => {
    if (connection === "close") {
      const reason = lastDisconnect?.error?.output?.statusCode;
      activeSockets.delete(number);

      if (reason === DisconnectReason.loggedOut) {
        log.error(`Session [${number}] logged out.`);
        await fs.remove(sessionPath);
        if (isMain) {
          log.error("Main session expired or unlinked. Exiting script to allow re-pairing.");
          process.exit(2);
        }
      } else {
        log.info(`Connection closed for [${number}] (Reason: ${reason}). Reconnecting in 5s to preserve credentials...`);
        await delay(5000);
        startSession(sessionPath, isMain, number, false);
      }
    } else if (connection === "open") {
      const myNum = sock.user.id.split(":")[0].split("@")[0];
      activeSockets.set(myNum, sock);

      if (global.client && global.client.activeSockets) {
        global.client.activeSockets.set(myNum, sock);
      }

      if (isMain && global.client) {
        global.client.mainNumber = myNum;
      }
      log.success(`Bot connected successfully! (${myNum})`);
    }
  });

  sock.ev.on("messages.upsert", async ({ messages, type }) => {
    if (type !== "notify") return;
    if (!global.client || !global.client.pausedAccounts) return;

    const myNumber = sock.user.id.split(":")[0].split("@")[0];
    if (global.client.pausedAccounts.has(myNumber)) return;

    for (const event of messages) {
      const jid = event.key.remoteJid;
      if (!jid || jid === "status@broadcast") continue;

      messageCache.set(`${jid}:${event.key.id}`, event);

      try {
        await messageHandler({
          font: utils.font,
          event,
          sock,
          log,
          proto: baileysPkg.proto
        });
      } catch (err) {
        log.error("Handler error:", err);
      }
    }
  });

  return sock;
}

async function startServer() {
  const app = express();
  app.use(express.json());

  app.get("/", (req, res) =>
    res.json({ status: "running", active: activeSockets.size })
  );

  app.get("/pair", async (req, res) => {
    const number = req.query.number?.replace(/[^0-9]/g, "");
    if (!number) return res.status(400).json({ error: "Number required" });

    const sessionPath = path.join(EXTRA_SESSIONS_DIR, `auth_${number}`);
    await fs.ensureDir(sessionPath);

    const sock = await startSession(sessionPath, false, number, true);

    try {
      await delay(5000);
      const code = await sock.requestPairingCode(number);
      res.json({ code });
    } catch (e) {
      res.status(500).json({ error: "Pairing failed" });
    }
  });

  app.listen(config.PORT || 8000);
  log.success(`Server listening on port ${config.PORT || 8000}`);
}

async function init() {
  try {
    await db.initSQLite();
    await loadConfig();
    global.client = {
      config,
      mainNumber: null,
      pausedAccounts: new Set(),
      activeSockets: new Map(),
      commands: new Map(),
      aliases: new Map(),
      events: new Map(),
      cooldowns: new Map(),
      reactions: new Map(),
      replies: new Map(),
      accountSettings: {},
      startTime: Date.now()
    };
    global.utils = utils;

    await fs.ensureDir(MAIN_SESSION_DIR);

    const mainCredsExist = fs.existsSync(path.join(MAIN_SESSION_DIR, "creds.json"));
    await startSession(MAIN_SESSION_DIR, true, "Main", !mainCredsExist);
    while (!global.client.mainNumber) {
      await delay(1000);
    }

    if (fs.existsSync(SETTINGS_PATH)) {
      global.client.accountSettings = fs.readJSONSync(SETTINGS_PATH);
    }
    await fs.ensureDir(EXTRA_SESSIONS_DIR);
    const extraFolders = await fs.readdir(EXTRA_SESSIONS_DIR);
    for (const folder of extraFolders) {
      if (folder.startsWith("auth_")) {
        const num = folder.replace("auth_", "");
        startSession(path.join(EXTRA_SESSIONS_DIR, folder), false, num, false);
      }
    }
    await global.utils.loadCommands()
    await startServer();
  } catch (error) {
    log.error(`Critical failure during initialization: ${error.message}`);
    process.exit(2);
  }
}

process.on("unhandledRejection", err => {
  log.error("Unhandled Rejection");
  console.log(err);
});
process.on("uncaughtException", err => {
  log.error("Uncaught Exception");
  console.log(err);
});

init();