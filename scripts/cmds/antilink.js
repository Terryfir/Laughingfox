import fs from "fs-extra";
import path from "path";

const dbPath = path.join(process.cwd(), "cache", "groupSettings.json");

export default {
    config: {
        name: "antilink",
        description: "Toggle group link protection (LID Compatible).",
        category: "anti",
        role: 1
    },
    onRun: async function ({ sock, event, args, message }) {
        await fs.ensureFile(dbPath);
        const db = (await fs.readJson(dbPath, { throws: false })) || {};
        const threadID = event.key.remoteJid;

        if (!db[threadID]) db[threadID] = { antilink: false };

        const status = args[0]?.toLowerCase();
        if (status === "on") {
            db[threadID].antilink = true;
            await fs.writeJson(dbPath, db, { spaces: 2 });
            return message.reply("✅ Anti-Link is now *ON*.");
        } else if (status === "off") {
            db[threadID].antilink = false;
            await fs.writeJson(dbPath, db, { spaces: 2 });
            return message.reply("❌ Anti-Link is now *OFF*.");
        }
        return message.reply("Usage: *antilink on/off*");
    },
    onChat: async function ({ sock, event, threadID, senderID }) {
        if (!threadID.endsWith('@g.us')) return;
        const db = (await fs.readJson(dbPath, { throws: false })) || {};
        if (!db[threadID]?.antilink) return;

        const body = event.message?.conversation || event.message?.extendedTextMessage?.text || "";
        const linkPattern = /chat.whatsapp.com\/[a-zA-Z0-9]/i;

        if (linkPattern.test(body)) {
            const metadata = await sock.groupMetadata(threadID);
            const botJid = sock.user.id.split(':')[0];
            
            const botParticipant = metadata.participants.find(p => 
                p.id.split('@')[0] === botJid || 
                p.phoneNumber?.split('@')[0] === botJid
            );
            
            const senderParticipant = metadata.participants.find(p => 
                p.id === senderID || 
                p.phoneNumber === senderID
            );

            const isBotAdmin = botParticipant?.admin || botParticipant?.isAdmin || false;
            const isSenderAdmin = senderParticipant?.admin || senderParticipant?.isAdmin || false;

            if (isSenderAdmin) return;

            if (!isBotAdmin) {
                return await sock.sendMessage(threadID, { text: "⚠️ I need Admin to delete links!" });
            }

            await sock.sendMessage(threadID, { delete: event.key });
            await sock.sendMessage(threadID, { 
                text: `🚫 @${senderID.split('@')[0]}, links are not allowed.`, 
                mentions: [senderID] 
            });
        }
    }
};