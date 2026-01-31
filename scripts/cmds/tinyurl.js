import axios from "axios";

export default {
    config: {
        name: "tinyurl",
        aliase: ["shorturl"],
        description: "Shorten a long URL.",
        category: "tools"
    },
    onRun: async function ({ sock, event, args, font }) {
        const url = args[0];
        if (!url) return sock.sendMessage(event.key.remoteJid, { text: "Provide a URL to shorten." });

        try {
            const res = await axios.get(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(url)}`);
            await sock.sendMessage(event.key.remoteJid, { 
                text: `🔗 ${font.bold("Shortened URL:")}\n${res.data}` 
            }, { quoted: event });
        } catch (e) {
            await sock.sendMessage(event.key.remoteJid, { text: "Failed to shorten link." });
        }
    }
};