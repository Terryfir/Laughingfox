export default {
    config: {
        name: "hidetag",
        description: "Tag everyone without showing names.",
        category: "group",
        role: 1
    },
    onRun: async function ({ sock, event, args }) {
        const chatId = event.key.remoteJid;
        const metadata = await sock.groupMetadata(chatId);
        const participants = metadata.participants.map(p => p.id);
        const text = args.join(" ") || "No message provided.";

        await sock.sendMessage(chatId, { text, mentions: participants });
    }
};