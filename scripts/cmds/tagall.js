export default {
    config: {
        name: "tagall",
        aliases: ["everyone"],
        description: "Tag everyone in the group.",
        category: "group",
        role: 0
    },
    onRun: async function ({ sock, event, font }) {
        const metadata = await sock.groupMetadata(event.key.remoteJid);
        const participants = metadata.participants;
        let msg = `📣 ${font.bold("Attention Everyone!")}\n\n`;
        let mentions = [];

        for (let p of participants) {
            msg += `@${p.id.split('@')[0]} `;
            mentions.push(p.id);
        }

        await sock.sendMessage(event.key.remoteJid, { text: msg, mentions });
    }
};