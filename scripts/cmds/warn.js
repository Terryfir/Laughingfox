export default {
    config: {
        name: 'warn',
        description: 'Give a warning to a user (3 strikes = Ban)',
        role: 1,
        category: "admin",
        author: "lance",
        usage: "!warn [@tag/reply] [reason]"
    },

    async onRun({ sock, event, threadID, message, getUserData, saveTable, setUserBanned, args, font }) {
        const quotedID = event.message?.extendedTextMessage?.contextInfo?.participant;
        const mentionedIDs = event.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
        const targetID = quotedID || mentionedIDs[0];
        
        const reason = args.filter(arg => !arg.includes('@')).join(" ") || "No reason provided.";

        if (!targetID) return message.reply("Please reply to a user or tag them to issue a warning.");

        try {
            const target = await getUserData(targetID);
            target.data.warns = (target.data.warns || 0) + 1;

            if (target.data.warns >= 3) {
                target.banned = 1;
                await setUserBanned(targetID, true);
                target.data.warns = 0; 
                await saveTable("userData", [target]);
                
                await message.react("🔨", event);
                return sock.sendMessage(threadID, { 
                    text: `🚫 ${font.bold("LIMIT REACHED")}\n\nUser: @${targetID.split('@')[0]}\nStatus: ${font.bold("BANNED")}\nReason: Received 3/3 warnings.`,
                    mentions: [targetID]
                }, { quoted: event });
            }

            await saveTable("userData", [target]);
            await message.react("⚠️", event);
            await sock.sendMessage(threadID, { 
                text: `⚠️ ${font.bold("WARNING ISSUED")}\n\nUser: @${targetID.split('@')[0]}\nStrikes: ${target.data.warns}/3\nReason: ${reason}`,
                mentions: [targetID]
            }, { quoted: event });

        } catch (error) {
            await sock.sendMessage(threadID, { text: `Error: ${error.message}` });
        }
    }
};