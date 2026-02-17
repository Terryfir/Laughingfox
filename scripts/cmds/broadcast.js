import { downloadContentFromMessage } from "@whiskeysockets/baileys";

export default {
    config: {
        name: "broadcast",
        aliase: ["bc"],
        description:
            "Broadcast through all child accounts (Skips Main account)",
        role: 3,
        category: "admin",
        author: "lance",
        usage: "!broadcast <message> (or reply to media)"
    },

    async onRun({ sock, event, threadID, message, getTable, args, font }) {
        const content = args.join(" ");
        const quoted =
            event.message?.extendedTextMessage?.contextInfo?.quotedMessage;

        try {
            const allGroups = await getTable("groupData");
            if (!allGroups || allGroups.length === 0)
                return message.reply("No groups in database.");

            // Filter for child accounts only
            const childSockets = [];
            if (global.client.activeSockets) {
                for (let [num, s] of global.client.activeSockets) {
                    if (num !== global.client.mainNumber) {
                        childSockets.push({ num, s });
                    }
                }
            }

            if (childSockets.length === 0) {
                return message.reply(
                    "❌ No child accounts found. Broadcast canceled to protect the Main account."
                );
            }

            let mediaData = null;
            let mediaType = null;

            if (quoted) {
                const type = Object.keys(quoted)[0];
                if (
                    ["imageMessage", "videoMessage", "audioMessage"].includes(
                        type
                    )
                ) {
                    const stream = await downloadContentFromMessage(
                        quoted[type],
                        type.replace("Message", "")
                    );
                    let buffer = Buffer.from([]);
                    for await (const chunk of stream) {
                        buffer = Buffer.concat([buffer, chunk]);
                    }
                    mediaData = buffer;
                    mediaType = type;
                }
            }

            const baseText = `📢 ${font.bold(
                "CHILD BROADCAST"
            )}\n━━━━━━━━━━━━━━━━━━\n\n${content || ""}\n\n━━━━━━━━━━━━━━━━━━`;
            await message.reply(
                `🚀 Broadcasting via ${childSockets.length} child accounts...`
            );

            let successCount = 0;
            for (const group of allGroups) {
                
                const worker =
                    childSockets[successCount % childSockets.length].s;

                try {
                    const metadata = await worker.groupMetadata(group.id);
                    const mentions = metadata.participants.map(p => p.id);

                    const sendOptions = { mentions };
                    if (mediaType === "imageMessage") {
                        await worker.sendMessage(group.id, {
                            image: mediaData,
                            caption: baseText,
                            ...sendOptions
                        });
                    } else if (mediaType === "videoMessage") {
                        await worker.sendMessage(group.id, {
                            video: mediaData,
                            caption: baseText,
                            ...sendOptions
                        });
                    } else if (mediaType === "audioMessage") {
                        await worker.sendMessage(group.id, {
                            audio: mediaData,
                            mimetype: "audio/mp4",
                            ptt: true,
                            ...sendOptions
                        });
                    } else {
                        await worker.sendMessage(group.id, {
                            text: baseText,
                            ...sendOptions
                        });
                    }
                    successCount++;
                } catch (err) {
                    // Skip failed groups
                }
            }

            await message.react("✅", event);
            await sock.sendMessage(
                threadID,
                {
                    text: `✅ ${font.bold(
                        "Broadcast Complete"
                    )}\n\nSent to: ${successCount} groups\nAccounts Used: ${
                        childSockets.length
                    } (Child only)`
                },
                { quoted: event }
            );
        } catch (error) {
            await sock.sendMessage(threadID, {
                text: `Error: ${error.message}`
            });
        }
    }
};
