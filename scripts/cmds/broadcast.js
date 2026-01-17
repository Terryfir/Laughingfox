import { downloadContentFromMessage } from '@whiskeysockets/baileys';

export default {
    config: {
        name: 'broadcast',
        description: 'Broadcast media or text with a silent tagall to all groups',
        role: 1,
        category: "admin",
        author: "lance",
        usage: "!broadcast <message> (or reply to media)"
    },

    async onRun({ sock, event, threadID, message, getTable, args, font }) {
        const content = args.join(" ");
        const quoted = event.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        
        try {
            const allGroups = await getTable("groupData");
            if (!allGroups || allGroups.length === 0) return message.reply("No groups in database.");

            let mediaData = null;
            let mediaType = null;
            let msgOptions = {};

            if (quoted) {
                const type = Object.keys(quoted)[0];
                if (['imageMessage', 'videoMessage', 'audioMessage'].includes(type)) {
                    const stream = await downloadContentFromMessage(quoted[type], type.replace('Message', ''));
                    let buffer = Buffer.from([]);
                    for await (const chunk of stream) {
                        buffer = Buffer.concat([buffer, chunk]);
                    }
                    mediaData = buffer;
                    mediaType = type;
                }
            }

            const baseText = `📢 ${font.bold("SYSTEM BROADCAST")}\n━━━━━━━━━━━━━━━━━━\n\n${content || ""}\n\n━━━━━━━━━━━━━━━━━━`;

            let successCount = 0;
            let failCount = 0;

            for (const group of allGroups) {
                try {
                    const metadata = await sock.groupMetadata(group.id);
                    const mentions = metadata.participants.map(p => p.id);

                    if (mediaType === 'imageMessage') {
                        await sock.sendMessage(group.id, { image: mediaData, caption: baseText, mentions });
                    } else if (mediaType === 'videoMessage') {
                        await sock.sendMessage(group.id, { video: mediaData, caption: baseText, mentions });
                    } else if (mediaType === 'audioMessage') {
                        await sock.sendMessage(group.id, { audio: mediaData, mimetype: 'audio/mp4', ptt: true, mentions });
                    } else {
                        await sock.sendMessage(group.id, { text: baseText, mentions });
                    }
                    successCount++;
                } catch (err) {
                    failCount++;
                }
            }

            await message.react("✅", event);
            await sock.sendMessage(threadID, { 
                text: `✅ ${font.bold("Broadcast Complete")}\n\nSent to: ${successCount} groups\nFailed: ${failCount}` 
            }, { quoted: event });

        } catch (error) {
            await sock.sendMessage(threadID, { text: `Error: ${error.message}` });
        }
    }
};