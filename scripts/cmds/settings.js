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

            const cleanId = id => id.split("@")[0].replace("+", "");
            const toLid = id => `${cleanId(id)}@lid`;

            if (action === "prefix") {
                const newPrefix = args[1];
                if (!newPrefix)
                    return message.reply("Please provide a prefix.");
                config.PREFIX = newPrefix;
                await fs.writeJson(configPath, config, { spaces: 2 });
                if (global.client?.config)
                    global.client.config.PREFIX = newPrefix;
                return message.reply(`✅ Prefix changed to: *${newPrefix}*`);
            }

            if (action === "adminonly") {
                const status = args[1]?.toLowerCase();
                if (status === "on") {
                    config.private = true;
                    await fs.writeJson(configPath, config, { spaces: 2 });
                    if (global.client?.config)
                        global.client.config.private = true;
                    return message.reply("✅ Admin-only mode is now *ON*.");
                } else if (status === "off") {
                    config.private = false;
                    await fs.writeJson(configPath, config, { spaces: 2 });
                    if (global.client?.config)
                        global.client.config.private = false;
                    return message.reply("❌ Admin-only mode is now *OFF*.");
                } else {
                    return message.reply("Use: *settings adminonly on/off*");
                }
            }

            if (action === "whitelist") {
                const subAction = args[1]?.toLowerCase();

                if (subAction === "on") {
                    config.whitelist.status = true;
                    let meta = {};
                    try {
                        meta = await sock.groupMetadata(threadID);
                    } catch (e) {
                        return message.reply(
                            "⚠️ Failed to fetch group metadata."
                        );
                    }

                    const childIds = [];
                    if (global.client.activeSockets) {
                        for (let [num, s] of global.client.activeSockets) {
                            if (num !== global.client.mainNumber) {
                                const participant = meta.participants.find(
                                    p =>
                                        p.phoneNumber &&
                                        p.phoneNumber.startsWith(num)
                                );
                                if (participant) {
                                    childIds.push(cleanId(participant.id));
                                }
                            }
                        }
                    }

                    const combinedIds = new Set([
                        ...config.whitelist.ids.map(id => cleanId(id)),
                        ...childIds
                    ]);
                    config.whitelist.ids = Array.from(combinedIds);

                    await fs.writeJson(configPath, config, { spaces: 2 });
                    if (global.client?.config) {
                        global.client.config.whitelist.status = true;
                        global.client.config.whitelist.ids =
                            config.whitelist.ids;
                    }

                    return message.reply(
                        `✅ Whitelist ON. Synced ${childIds.length} children IDs (LID format cleaned).`
                    );
                }

                if (subAction === "off") {
                    config.whitelist.status = false;
                    await fs.writeJson(configPath, config, { spaces: 2 });
                    if (global.client?.config)
                        global.client.config.whitelist.status = false;
                    return message.reply("❌ Whitelist is now *OFF*.");
                }

                if (subAction === "list") {
                    const ids = config.whitelist.ids;
                    if (!ids || ids.length === 0)
                        return message.reply(
                            "The whitelist is currently empty."
                        );

                    let listText = "📋 *Whitelisted Users (LIDs):*\n\n";
                    const mentions = [];

                    ids.forEach((id, index) => {
                        const fullLid = toLid(id);
                        listText += `${index + 1}. @${id}\n`;
                        mentions.push(fullLid);
                    });

                    return await sock.sendMessage(
                        threadID,
                        {
                            text: listText,
                            mentions: mentions
                        },
                        { quoted: event }
                    );
                }

                if (subAction === "add" || subAction === "remove") {
                    let targetRaw;
                    const context =
                        event.message?.extendedTextMessage?.contextInfo;

                    if (context?.participant) {
                        targetRaw = context.participant;
                    } else if (context?.mentionedJid?.[0]) {
                        targetRaw = context.mentionedJid[0];
                    } else if (args[2]) {
                        targetRaw = args[2];
                    }

                    if (!targetRaw)
                        return message.reply("Tag a user or provide an ID.");

                    const pureId = cleanId(targetRaw);
                    const fullLid = toLid(pureId);

                    if (subAction === "add") {
                        if (config.whitelist.ids.includes(pureId))
                            return message.reply("User already whitelisted.");
                        config.whitelist.ids.push(pureId);
                        await sock.sendMessage(
                            threadID,
                            {
                                text: `✅ Added @${pureId} to whitelist.`,
                                mentions: [fullLid]
                            },
                            { quoted: event }
                        );
                    } else {
                        if (!config.whitelist.ids.includes(pureId))
                            return message.reply("User not in whitelist.");
                        config.whitelist.ids = config.whitelist.ids.filter(
                            id => id !== pureId
                        );
                        await sock.sendMessage(
                            threadID,
                            {
                                text: `❌ Removed @${pureId} from whitelist.`,
                                mentions: [fullLid]
                            },
                            { quoted: event }
                        );
                    }

                    await fs.writeJson(configPath, config, { spaces: 2 });
                    if (global.client?.config)
                        global.client.config.whitelist.ids =
                            config.whitelist.ids;
                    return;
                }
            }

            return message.reply(
                "Options: *prefix, adminonly, whitelist <on/off/add/remove/list>*"
            );
        } catch (error) {
            message.reply(`Error: ${error.message}`);
        }
    }
};
