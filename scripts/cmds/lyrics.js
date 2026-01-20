import axios from "axios";

export default {
    config: {
        name: "lyrics",
        cooldown: 5,
        aliase: ["lyric"],
        description: "High-accuracy lyrics fetcher optimized for LRCLIB responses.",
        category: "entertainment",
        usage: "!lyrics <song name>"
    },

    async onRun({ sock, event, args, font }) {
        const chatId = event.key.remoteJid;
        const query = args.join(" ");

        if (!query) {
            return await sock.sendMessage(chatId, { text: `🎶 *What song are we looking for?*\nExample: ${font.bold("!lyrics NF Motto")}` }, { quoted: event });
        }

        try {
            await sock.sendMessage(chatId, { react: { text: "🔍", key: event.key } });

            const res = await axios.get(`https://lrclib.net/api/search?q=${encodeURIComponent(query)}`);
            
            if (!Array.isArray(res.data) || res.data.length === 0) {
                return await sock.sendMessage(chatId, { text: "❌ No lyrics found for this song. Try adding the artist name." }, { quoted: event });
            }

            const track = res.data[0];
            const lyricsBody = track.plainLyrics || (track.syncedLyrics ? track.syncedLyrics.replace(/\[\d+:\d+\.\d+\]/g, "").trim() : null);

            if (!lyricsBody) {
                return await sock.sendMessage(chatId, { text: `❌ Lyrics for "${track.trackName}" are available but couldn't be parsed.` }, { quoted: event });
            }

            let msg = `🎶 *${font.bold(track.trackName.toUpperCase())}*\n`;
            msg += `👤 *Artist:* ${track.artistName}\n`;
            msg += `💿 *Album:* ${track.albumName || "N/A"}\n`;
            msg += `────────────────────\n\n`;
            
            const finalLyrics = lyricsBody.length > 3900 ? lyricsBody.substring(0, 3900) + "\n\n...[Lyrics Truncated]" : lyricsBody;
            msg += finalLyrics;

            await sock.sendMessage(chatId, { text: msg }, { quoted: event });
            await sock.sendMessage(chatId, { react: { text: "✅", key: event.key } });

        } catch (error) {
            console.error("Lyrics Engine Error:", error.message);
            await sock.sendMessage(chatId, { text: "❌ *Engine Error:* Failed to process lyrics request." }, { quoted: event });
        }
    }
};