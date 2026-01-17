export default {
    config: {
        name: "antiad"
    },
    onEvent: async ({ event, sock, getGroupData, getUserData, saveTable, setUserBanned, font }) => {
        const threadID = event.key.remoteJid;
        if (!threadID.endsWith("@g.us") || event.key.fromMe) return;

        const body = event.message?.conversation || 
                     event.message?.extendedTextMessage?.text || "";

        if (!body.includes("chat.whatsapp.com/")) return;

        try {
            // groupDB is now the object directly: { id, name, banned, data: {} }
            const group = await getGroupData(threadID);
            
            // Access the data key directly
            if (!group.data?.antiad) return;

            const metadata = await sock.groupMetadata(threadID);
            const senderID = event.key.participant || event.participant;
            const isAdmin = metadata.participants.find(p => p.id === senderID)?.admin;

            if (isAdmin) return;

            const botId = sock.user.id.split(':')[0] + '@s.whatsapp.net';
            const botIsAdmin = metadata.participants.find(p => p.id === botId)?.admin;

            // Delete the link immediately
            await sock.sendMessage(threadID, { delete: event.key });

            const user = await getUserData(senderID);
            user.data.warns = (user.data.warns || 0) + 1;

            if (user.data.warns >= 3) {
                user.banned = 1;
                user.data.warns = 0;
                await setUserBanned(senderID, true);
                await saveTable("userData", [user]);

                if (botIsAdmin) {
                    await sock.groupParticipantsUpdate(threadID, [senderID], "remove");
                }

                return sock.sendMessage(threadID, { 
                    text: `🚫 ${font.bold("TERMINATED")}\n\nUser: @${senderID.split('@')[0]}\nReason: Sharing links (Strike 3/3).`,
                    mentions: [senderID]
                });
            }

            await saveTable("userData", [user]);
            await sock.sendMessage(threadID, { 
                text: `⚠️ ${font.bold("LINK DETECTED")}\n\nUser: @${senderID.split('@')[0]}\nStrikes: ${user.data.warns}/3`,
                mentions: [senderID]
            });

        } catch (error) {
            console.error("Anti-Ad Error:", error);
        }
    }
};
