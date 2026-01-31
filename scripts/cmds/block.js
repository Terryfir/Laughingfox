export default {
    config: {
        name: "block",
        description: "Block a user.",
        usage: "block @tag or reply",
        category: "owner",
        role: 1
    },
    onRun: async function ({ sock, event, args }) {
        let target = event.message?.extendedTextMessage?.contextInfo?.participant || 
                     event.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0] || 
                     (args[0] ? args[0].split('@')[0] + "@s.whatsapp.net" : null);

        if (!target) return sock.sendMessage(event.key.remoteJid, { text: "Tag someone to block." });

        await sock.updateBlockStatus(target, "block");
        await sock.sendMessage(event.key.remoteJid, { text: `✅ User @${target.split('@')[0]} blocked.`, mentions: [target] });
    }
};