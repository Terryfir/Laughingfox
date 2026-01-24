import fs from "fs-extra";

export default {
    config: {
        name: "settings",
        description: "Manage bot configurations",
        usage: "settings <prefix/whitelist/adminonly> <args>",
        category: "owner",
        cooldown: 5,
        role: 1
    },
    onRun: async function ({ sock, event, message, args, font, senderID }) {
        try {
            const configPath = new URL("../../config.json", import.meta.url);
            const action = args[0]?.toLowerCase();
            const config = await fs.readJson(configPath);
            const threadID = event.key.remoteJid;

            const cleanId = (id) => id.split('@')[0];
            const toJid = (id) => `${id}@s.whatsapp.net`;

            if (action === "prefix") {
                const newPrefix = args[1];
                if (!newPrefix) return message.reply("Please provide a prefix.");
                config.PREFIX = newPrefix;
                await fs.writeJson(configPath, config, { spaces: 2 });
                if (global.client?.config) global.client.config.PREFIX = newPrefix;
                return message.reply(`✅ Prefix changed to: *${newPrefix}*`);
            }

            if (action === "adminonly") {
                const status = args[1]?.toLowerCase();
                if (status === "on") {
                    config.private = true;
                    await fs.writeJson(configPath, config, { spaces: 2 });
                    if (global.client?.config) global.client.config.private = true;
                    return message.reply("✅ Admin-only mode is now *ON*.");
                } else if (status === "off") {
                    config.private = false;
                    await fs.writeJson(configPath, config, { spaces: 2 });
                    if (global.client?.config) global.client.config.private = false;
                    return message.reply("❌ Admin-only mode is now *OFF*.");
                } else {
                    return message.reply("Use: *settings adminonly on/off*");
                }
            }

            if (action === "whitelist") {
                const subAction = args[1]?.toLowerCase();

                if (subAction === "on") {
                    if (config.whitelist.ids.length <= 0) {
                        config.whitelist.ids = config.admins.map(id => cleanId(id));
                    }
                    config.whitelist.status = true;
                    await fs.writeJson(configPath, config, { spaces: 2 });
                    if (global.client?.config) global.client.config.whitelist.status = true;
                    return message.reply("✅ Whitelist is now *ON*.");
                }

                if (subAction === "off") {
                    config.whitelist.status = false;
                    await fs.writeJson(configPath, config, { spaces: 2 });
                    if (global.client?.config) global.client.config.whitelist.status = false;
                    return message.reply("❌ Whitelist is now *OFF*.");
                }

                if (subAction === "add" || subAction === "remove") {
                    let targetID;
                    const context = event.message?.extendedTextMessage?.contextInfo;
                    
                    if (context?.participant) {
                        targetID = context.participant;
                    } else if (context?.mentionedJid?.[0]) {
                        targetID = context.mentionedJid[0];
                    } else if (args[2]) {
                        targetID = args[2].includes("@") ? args[2] : args[2] + "@s.whatsapp.net";
                    }

                    if (!targetID) return message.reply("Tag a user, reply to a message, or provide an ID.");
                    
                    const targetNumber = cleanId(targetID);
                    const targetJid = toJid(targetNumber);

                    if (subAction === "add") {
                        if (config.whitelist.ids.includes(targetNumber)) return message.reply("User already whitelisted.");
                        config.whitelist.ids.push(targetNumber);
                        await sock.sendMessage(threadID, {
                            text: `✅ Added @${targetNumber} to whitelist.`,
                            mentions: [targetJid]
                        }, { quoted: event });
                    } else {
                        if (!config.whitelist.ids.includes(targetNumber)) return message.reply("User not in whitelist.");
                        config.whitelist.ids = config.whitelist.ids.filter(id => id !== targetNumber);
                        await sock.sendMessage(threadID, {
                            text: `❌ Removed @${targetNumber} from whitelist.`,
                            mentions: [targetJid]
                        }, { quoted: event });
                    }

                    await fs.writeJson(configPath, config, { spaces: 2 });
                    if (global.client?.config) global.client.config.whitelist.ids = config.whitelist.ids;
                    return;
                }
            }

            return message.reply("Options: *prefix, adminonly, whitelist*");
        } catch (error) {
            message.reply(`Error: ${error.message}`);
        }
    }
};