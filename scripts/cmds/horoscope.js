import axios from "axios";

export default {
    config: {
        name: "horoscope",
        description: "Get your daily horoscope.",
        category: "fun"
    },
    onRun: async function ({ sock, event, args, font }) {
        const sign = args[0]?.toLowerCase();
        const signs = ["aries", "taurus", "gemini", "cancer", "leo", "virgo", "libra", "scorpio", "sagittarius", "capricorn", "aquarius", "pisces"];
        
        if (!sign || !signs.includes(sign)) return sock.sendMessage(event.key.remoteJid, { text: `Provide a valid sign:\n${signs.join(", ")}` });

        try {
            const res = await axios.post(`https://aztro.sameerkumar.website/?sign=${sign}&day=today`);
            const data = res.data;
            const msg = `✨ ${font.bold(sign.toUpperCase() + " HOROSCOPE")}\n\n` +
                        `📅 ${font.bold("Date:")} ${data.current_date}\n` +
                        `🔮 ${font.bold("Description:")} ${data.description}\n` +
                        `🌈 ${font.bold("Color:")} ${data.color}\n` +
                        `🔢 ${font.bold("Lucky Number:")} ${data.lucky_number}`;
            await sock.sendMessage(event.key.remoteJid, { text: msg }, { quoted: event });
        } catch (e) {
            await sock.sendMessage(event.key.remoteJid, { text: "Could not fetch horoscope." });
        }
    }
};