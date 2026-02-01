import dotenv from "dotenv";
import P from "pino";
import makeWASocket, {
    useMultiFileAuthState,
    fetchLatestBaileysVersion,
    Browsers,
    DisconnectReason,
    makeCacheableSignalKeyStore
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
import NodeCache from "node-cache";

dotenv.config();

const logger = P({ level: "silent" });
const sessionDir = path.join(process.cwd(), "cache", "auth_info_baileys");
const messageCache = new NodeCache({ stdTTL: 300, useClones: false });

let sock = null;
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
        await fs.ensureDir(sessionDir);
        const writer = fs.createWriteStream(
            path.join(sessionDir, "creds.json")
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

async function connectToWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
    const { version } = await fetchLatestBaileysVersion();

    sock = makeWASocket({
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
                log.error("Session logged out. Delete cache and restart.");
                process.exit(1);
            } else {
                log.info("Connection closed. Triggering manager restart...");
                process.exit(2);
            }
        } else if (connection === "open") {
            log.success("Bot connected successfully!");
        }
    });

    sock.ev.on("messages.upsert", async ({ messages, type }) => {
        if (type !== "notify") return;
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
}

async function startServer() {
    const app = express();
    app.get("/", (req, res) => res.json({ status: "running" }));
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
            replies: new Map()
        };
        global.utils = utils;

        await fs.ensureDir(sessionDir);
        await loadSession();
        await db.initSQLite();

        await connectToWhatsApp();
        await startServer();
    } catch (error) {
        log.error("Critical failure during initialization:", error);
        process.exit(2);
    }
}

process.on("unhandledRejection", err => {
    log.error("Unhandled Rejection");
    console.log(err)
});
process.on("uncaughtException", err => {
    log.error("Uncaught Exception");
    console.log(err);
});

init();
