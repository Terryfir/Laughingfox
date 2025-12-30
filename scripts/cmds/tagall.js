export default {
    config: {
        name: "tagall",
        category: "group"
    },
    async onRun({ sock, message, event, args, senderID, font }) {
        if (!args.join(" "))
            return message.reply(
                "please provide a message to share to everyone"
            );
        const groupId = event.key.remoteJid;
        if (!groupId.endsWith("@g.us")) {
            return await sock.sendMessage(groupId, {
                text: "🚫 This command can only be used in group chats."
            });
        }
        const metadata = await sock.groupMetadata(groupId);
        const participants = metadata.participants;
        const isAdmin = participants.find(p => p.id === senderID)?.admin;
        if (!isAdmin) {
            return await sock.sendMessage(groupId, {
                text: "🚫 Only group admins can use this command."
            });
        }

        const mentions = participants.map(p => p.id);
        await sock.sendMessage(groupId, {
            text: `🏷️${font.bold("tagall utility")}\n${args.join(" ")}`,
            mentions
        });
    }
};