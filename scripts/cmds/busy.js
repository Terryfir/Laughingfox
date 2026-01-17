export default {
    config: {
        name: 'busy',
        description: 'Set a busy/AFK status with a reason',
        role: 0,
        category: "utility",
        author: "lance",
        usage: "!busy [reason]"
    },

    onRun: async function ({ sock, event, message, getUserData, saveTable, senderID, args, font }) {
        try {
            const user = await getUserData(senderID);
            const reason = args.join(" ") || "I'm busy right now.";

            user.data.busy = {
                status: true,
                reason: reason,
                time: Date.now()
            };

            await saveTable("userData", [user]);
            await message.react("🌙", event);
            await sock.sendMessage(event.key.remoteJid, { 
                text: `🌙 ${font.bold("Status Set")}\n@${senderID.split('@')[0]} is now busy: ${reason}`,
                mentions: [senderID]
            }, { quoted: event });

        } catch (error) {
            await message.reply(`Error: ${error.message}`);
        }
    },

    onChat: async function ({ sock, event, threadID, getUserData, saveTable, senderID, font }) {
        const body = event.message?.conversation || 
                     event.message?.extendedTextMessage?.text || 
                     "";

        const sender = await getUserData(senderID);
        if (sender.data?.busy?.status) {
            sender.data.busy.status = false;
            await saveTable("userData", [sender]);
            await sock.sendMessage(threadID, { 
                text: `👋 ${font.bold("Welcome Back!")}\n@${senderID.split('@')[0]} is no longer busy.`,
                mentions: [senderID]
            });
            return;
        }

        const mentions = event.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
        
        if (mentions.length > 0) {
            for (const id of mentions) {
                if (id === senderID) continue;

                const taggedUser = await getUserData(id);
                
                if (taggedUser.data?.busy?.status) {
                    const { reason, time } = taggedUser.data.busy;
                    const duration = Math.floor((Date.now() - time) / 60000);
                    
                    const response = `🚫 ${font.bold("User is Busy")}\n\n` +
                                     `👤 @${id.split('@')[0]} is currently away.\n` +
                                     `📝 ${font.bold("Reason:")} ${reason}\n` +
                                     `🕒 ${font.bold("Since:")} ${duration} minutes ago.`;

                    await sock.sendMessage(threadID, { 
                        text: response, 
                        mentions: [id] 
                    }, { quoted: event });
                }
            }
        }
    }
};