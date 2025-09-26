
import axios from "axios";
import fs from "fs";
import path from "path";
import os from "os";
import yts from "yt-search";
import { dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

export default {
    config: {
        name: "sing",
        cooldown: 10,
        aliase: ["music", "song", "ytmp3"],
        description: "Download music audio from YouTube by URL or search query.",
        category: "media",
        usage: `${global.client.config.PREFIX}sing <YouTube URL or search query>`
    },

    async onRun({ sock, event, args }) {
        const chatId = event.key.remoteJid;
        if (args.length === 0) {
            return await sock.sendMessage(
                chatId,
                { text: "Please provide a YouTube URL or search query.\nUsage: !sing <YouTube URL or search query>" },
                { quoted: event }
            );
        }
        let url = args[0];
        // If not a YouTube URL, treat as search query
        if (!/^https?:\/\/(www\.)?(youtube\.com|youtu\.be)\//.test(url)) {
            const search = await yts(args.join(" "));
            if (!search.videos || search.videos.length === 0) {
                return await sock.sendMessage(
                    chatId,
                    { text: `No results found for "${args.join(" ")}".` },
                    { quoted: event }
                );
            }
            url = search.videos[0].url;
        }
        try {
            const apiUrl = `https://api.ccprojectsapis-jonell.gleeze.com/api/music?url=${encodeURIComponent(url)}`;
            const response = await axios.get(apiUrl);
            const data = response.data.data;
            if (!data || !data.link) {
                return await sock.sendMessage(
                    chatId,
                    { text: "Failed to retrieve download link. Please try again later." },
                    { quoted: event }
                );
            }
            const tmpFileName = `${data.title.replace(/[<>:"\/\\|?*\x00-\x1F]/g, "").slice(0, 40)}.mp3`;
            const tmpFilePath = path.join(os.tmpdir(), tmpFileName);
            const writer = fs.createWriteStream(tmpFilePath);
            const responseStream = await axios({
                url: data.link,
                method: "GET",
                responseType: "stream"
            });
            responseStream.data.pipe(writer);
            await new Promise((resolve, reject) => {
                writer.on("finish", resolve);
                writer.on("error", reject);
            });
            await sock.sendMessage(
                chatId,
                {
                    audio: { url: tmpFilePath },
                    mimetype: "audio/mpeg",
                    fileName: tmpFileName,
                    ptt: false,
                    caption: data.title
                },
                { quoted: event }
            );
            fs.unlink(tmpFilePath, err => {
                if (err) console.error("Failed to delete temp file:", err);
            });
        } catch (error) {
            await sock.sendMessage(
                chatId,
                { text: `Error downloading music: ${error.message}` },
                { quoted: event }
            );
        }
    }
};
