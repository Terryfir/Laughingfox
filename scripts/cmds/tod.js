import axios from "axios";

export default {
    config: {
        name: "tod",
        description: "Play Truth or Dare.",
        category: "fun"
    },
    onRun: async function ({ sock, event, font }) {
        const type = event.message?.conversation?.toLowerCase().includes("truth") ? "truth" : "dare";
        try {
            const res = await axios.get(`https://api.truthordarebot.xyz/v1/${type}`);
            await sock.sendMessage(event.key.remoteJid, { text: `🎮 ${font.bold(type.toUpperCase())}:\n\n${res.data.question}` }, { quoted: event });
        } catch (e) {
            sock.sendMessage(event.key.remoteJid, { text: "Game server is down." });
        }
    }
};