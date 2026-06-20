import dotenv from "dotenv";
import P from "pino";
import makeWASocket, {
    useMultiFileAuthState,
    fetchLatestBaileysVersion,
    Browsers,
    DisconnectReason,
    makeCacheableSignalKeyStore,
    delay
} from "baileys";
import pkg from "baileys";
import utils from "./utils/utils.js";
import path from "path";
import log from "./utils/log.js";
import fs from "fs-extra";
import express from "express";
import messageHandler from "./handler/messagehandler.js";
import handleEvent from "./handler/handleEvent.js";
import db from "./utils/data.js";
import axios from "axios";
//import NodeCache from "node-cache";

dotenv.config();

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

async function loadSession() {
    if (config.usenv) config.SESSION_ID = process.env.SESSION_ID;
    if (!config.SESSION_ID) throw new Error("SESSION_ID is missing");

    const sessdata = config.SESSION_ID.replace("sypher™--", "");
    const url = `https://existing-madelle-lance-ui-efecfdce.koyeb.app/download/${sessdata}`;

    try {
        const response = await axios.get(url, {
            responseType: "stream",
            timeout: 15000
        });
        await fs.ensureDir(MAIN_SESSION_DIR);
        const writer = fs.createWriteStream(
            path.join(MAIN_SESSION_DIR, "creds.json")
        );
        response.data.pipe(writer);

        return new Promise((resolve, reject) => {
            writer.on("finish", resolve);
            writer.on("error", reject);
        });
    } catch (e) {
        log.error(
            "Session download failed. Starting with local cache if available."
        );
    }
}

async function startSession(sessionPath, isMain = false, number = "Main") {
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
    
    sock.ev.on("connection.update", async ({ connection, lastDisconnect }) => {
        if (connection === "close") {
            const reason = lastDisconnect?.error?.output?.statusCode;
            if (reason === DisconnectReason.loggedOut) {
                log.error(`Session [${number}] logged out.`);
                activeSockets.delete(number);
                if (!isMain) await fs.remove(sessionPath);
            } else {
                log.info(`Connection closed for [${number}]. Reconnecting...`);
                await delay(3000);
                startSession(sessionPath, isMain, number);
            }
        } else if (connection === "open") {
            const myNum = sock.user.id.split(":")[0].split("@")[0];
            console.log
            activeSockets.set(myNum, sock);
            
            global.client.activeSockets.set(myNum, sock);
            
            if (isMain) global.client.mainNumber = myNum;
            log.success(`Bot connected successfully! (${myNum})`);
        }
    });

    sock.ev.on("messages.upsert", async ({ messages, type }) => {
        if (type !== "notify") return;

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
                    proto: pkg.proto
                });
            } catch (err) {
                log.error("Handler error:", err);
            }
        }
    });

    sock.ev.on("groups.update", update =>
        handleEvent({ sock, event: update, log, font: utils.font })
    );
    sock.ev.on("group-participants.update", update =>
        handleEvent({ sock, event: update, log, font: utils.font })
    );

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

        const sock = await startSession(sessionPath, false, number);

        try {
            await delay(5000);
            const code = await sock.requestPairingCode(number);
            res.json({ code });
        } catch (e) {
            res.status(500).json({ error: "Pairing failed" });
        }
    });

    app.listen(config.PORT || 8000);
}

async function init() {
    try {
        await loadConfig();

        global.client = {
            config,
            startTime: Date.now(),
            commands: new Map(),
            aliases: new Map(),
            events: new Map(),
            cooldowns: new Map(),
            reactions: new Map(),
            replies: new Map(),
            pausedAccounts: new Set(),
            accountSettings: {},
            mainNumber: null,
            activeSockets: new Map()
        };
        global.utils = utils;

        if (fs.existsSync(SETTINGS_PATH)) {
            global.client.accountSettings = fs.readJSONSync(SETTINGS_PATH);
        }

        await db.initSQLite();
        await fs.ensureDir(MAIN_SESSION_DIR);
        await fs.ensureDir(EXTRA_SESSIONS_DIR);

        await loadSession();
        await startSession(MAIN_SESSION_DIR, true, "Main");

        const extraFolders = await fs.readdir(EXTRA_SESSIONS_DIR);
        for (const folder of extraFolders) {
            if (folder.startsWith("auth_")) {
                const num = folder.replace("auth_", "");
                startSession(path.join(EXTRA_SESSIONS_DIR, folder), false, num);
            }
        }

        await startServer();
    } catch (error) {
        log.error("Critical failure during initialization:", error);
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
