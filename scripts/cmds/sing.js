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
        description: "Download music audio from YouTube using the updated Meow-DL API.",
        category: "media",
        usage: `sing <YouTube URL or search query>`
    },

    async onRun({ sock, event, args }) {
        const chatId = event.key.remoteJid;
        if (args.length === 0) {
            return await sock.sendMessage(
                chatId,
                { text: "Please provide a YouTube URL or search query." },
                { quoted: event }
            );
        }

        let query = args.join(" ");
        let videoUrl = "";
        let thumbnail = "";
        let title = "";

        try {
            const search = await yts(query);
            if (!search.videos || search.videos.length === 0) {
                return await sock.sendMessage(chatId, { text: `No results found.` }, { quoted: event });
            }

            videoUrl = search.videos[0].url;
            thumbnail = search.videos[0].thumbnail;
            title = search.videos[0].title;

            const apiUrl = `https://meow-dl.onrender.com/yt?url=${encodeURIComponent(videoUrl)}`;
            const response = await axios.get(apiUrl);
            
            const mediaArray = response.data.media;
            const audioData = mediaArray.find(m => m.quality === "128kbps") || mediaArray[mediaArray.length - 1];

            if (!audioData || !audioData.url) {
                return await sock.sendMessage(chatId, { text: "Failed to retrieve audio link from the API." }, { quoted: event });
            }

            const downloadLink = audioData.url;
            const tmpFileName = `${title.replace(/[<>:"\/\\|?*\x00-\x1F]/g, "").slice(0, 40)}.mp3`;
            const tmpFilePath = path.join(os.tmpdir(), tmpFileName);
            const writer = fs.createWriteStream(tmpFilePath);

            const responseStream = await axios({
                url: downloadLink,
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
                    contextInfo: {
                        externalAdReply: {
                            title: title,
                            body: "Downloaded via Sypher bot",
                            thumbnailUrl: thumbnail,
                            sourceUrl: videoUrl,
                            mediaType: 1,
                            renderLargerThumbnail: true,
                            showAdAttribution: false
                        }
                    }
                },
                { quoted: event }
            );

            fs.unlink(tmpFilePath, err => {
                if (err) console.error(err);
            });
        } catch (error) {
            await sock.sendMessage(chatId, { text: `Error: ${error.message}` }, { quoted: event });
        }
    }
};