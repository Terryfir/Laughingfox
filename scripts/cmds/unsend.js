export default {
    config: {
        name: "unsend",
        aliase: ["delete", "del"],
        description: "Delete a message sent by the bot.",
        category: "utility",
        usage: "Reply to a bot message with !unsend"
    },

    onRun: async function ({ sock, event, message }) {
        const threadID = event.key.remoteJid;
        const quotedMsg = event.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        const quotedKey = event.message?.extendedTextMessage?.contextInfo?.stanzaId;
        const participant = event.message?.extendedTextMessage?.contextInfo?.participant;

        if (!quotedMsg) return await message.reply("❌ Please reply to the message you want me to delete.");

        try {
            await sock.sendMessage(threadID, { 
                delete: { 
                    remoteJid: threadID, 
                    fromMe: true, 
                    id: quotedKey, 
                    participant: participant 
                } 
            });
        } catch (error) {
            await message.reply(`Error: ${error.message}`);
        }
    }
};