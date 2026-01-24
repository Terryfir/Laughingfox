import axios from "axios";

export default {
    config: {
        name: "roast",
        cooldown: 5,
        aliase: ["burn", "insult"],
        description: "Fetch a savage roast and tag the target correctly.",
        category: "fun",
        usage: "!roast [@tag]"
    },

    onRun: async function ({ sock, event, args, font, senderID }) {
        const threadID = event.key.remoteJid;
        const mention = event.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
        
        const targetID = mention || senderID;
        const targetName = `@${targetID.split('@')[0]}`;

        try {
            const res = await axios.get("https://evilinsult.com/generate_insult.php?lang=en&type=json");
            const roast = res.data.insult;

            await sock.sendMessage(threadID, { 
                text: `🔥 ${targetName}, ${roast}`, 
                mentions: [targetID] 
            }, { quoted: event });

        } catch (error) {
            await sock.sendMessage(threadID, { 
                text: `🔥 ${targetName}, I'd roast you, but your life is already doing a better job.` ,
                mentions: [targetID]
            }, { quoted: event });
        }
    }
};