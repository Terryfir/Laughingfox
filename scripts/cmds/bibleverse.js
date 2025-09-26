import axios from "axios";

export default {
    config: {
        name: "bibleverse",
        cooldown: 5,
        aliase: ["verse", "bible", "randomverse"],
        description: "Get a random Bible verse.",
        category: "study",
        usage: `${global.client.config.PREFIX}bibleverse`
    },

    async onRun({ sock, event }) {
        const chatId = event.key.remoteJid;
        try {
            const apiUrl = "https://api.ccprojectsapis-jonell.gleeze.com/api/randomverse";
            const response = await axios.get(apiUrl);
            const data = response.data;
            if (!data || !data.reference || !data.text) {
                return await sock.sendMessage(
                    chatId,
                    { text: "Failed to fetch a Bible verse. Please try again later." },
                    { quoted: event }
                );
            }
            let verseMsg = `📖 *${data.reference}*\n\n${data.text}\n\n_Translation: ${data.translation_name}_`;
            await sock.sendMessage(
                chatId,
                { text: verseMsg },
                { quoted: event }
            );
        } catch (error) {
            await sock.sendMessage(
                chatId,
                { text: `Error fetching Bible verse: ${error.message}` },
                { quoted: event }
            );
        }
    }
};
