import axios from "axios";

export default {
    config: {
        name: "lyrics",
        cooldown: 5,
        aliase: ["lyric"],
        description: "Fetch lyrics with song thumbnail using PopCat API.",
        category: "entertainment",
        usage: "!lyrics <song name>"
    },

    async onRun({ sock, event, args, font }) {
        const chatId = event.key.remoteJid;
        const query = args.join(" ");

        if (!query) {
            return await sock.sendMessage(chatId, { text: `🎶 *What song are we looking for?*\nExample: ${font.bold(".lyrics Never Gonna Give You Up")}` }, { quoted: event });
        }

        try {
            await sock.sendMessage(chatId, { react: { text: "🔍", key: event.key } });

            const res = await axios.get(`https://api.popcat.xyz/v2/lyrics?song=${encodeURIComponent(query)}`);
            
            if (res.data.error) {
                return await sock.sendMessage(chatId, { text: "❌ No lyrics found for this song." }, { quoted: event });
            }

            const { title, artist, image, lyrics, url } = res.data.message;

            let msg = `🎶 *${font.bold(title.toUpperCase())}*\n`;
            msg += `👤 *Artist:* ${artist}\n`;
            msg += `────────────────────\n\n`;
            
            const finalLyrics = lyrics.length > 3900 ? lyrics.substring(0, 3900) + "\n\n...[Lyrics Truncated]" : lyrics;
            msg += finalLyrics;

            await sock.sendMessage(chatId, { 
                text: msg,
                contextInfo: {
                    externalAdReply: {
                        title: title,
                        body: artist,
                        thumbnailUrl: image,
                        sourceUrl: url,
                        mediaType: 1,
                        renderLargerThumbnail: true,
                        showAdAttribution: false
                    }
                }
            }, { quoted: event });

            await sock.sendMessage(chatId, { react: { text: "✅", key: event.key } });

        } catch (error) {
            console.error("Lyrics Engine Error:", error.message);
            await sock.sendMessage(chatId, { text: "❌ *Engine Error:* Failed to process lyrics request." }, { quoted: event });
        }
    }
};