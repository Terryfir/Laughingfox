import axios from "axios";
import fs from "fs";
import path from "path";
import { dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

export default {
    config: {
        name: "ytb",
        cooldown: 30,
        aliese: ["youtube", "y", "yt"],
        description: "download YouTube videos",
        category: "media",
        usage: `${global.client.config.PREFIX}ytb -a|-v <your query>`
    },

    async onRun({ sock, event, args }) {
        const chatId = event.key.remoteJid;

        if (args.length === 0) {
            return await sock.sendMessage(
                chatId,
                {
                    text: "Please provide a search query.\nUsage: !ytb audio <query> or !ytb video <query>"
                },
                { quoted: event }
            );
        }

        let type = null;
        if (
            args[0].toLowerCase() === "audio" ||
            args[0].toLowerCase() === "-a"
        ) {
            type = "audio";
            args.shift();
        } else if (
            args[0].toLowerCase() === "video" ||
            args[0].toLowerCase() === "-v"
        ) {
            type = "video";
            args.shift();
        } else {
            return await sock.sendMessage(
                chatId,
                {
                    text: "Please specify type audio (-a) or video (-v).\nUsage: !ytb audio <query> or !ytb video <query>"
                },
                { quoted: event }
            );
        }

        const query = args.join(" ").trim();
        if (!query) {
            return await sock.sendMessage(
                chatId,
                { text: "Please provide a search query after the type." },
                { quoted: event }
            );
        }

        try {
            const apiUrl = `https://noobs-api.top/dipto/ytFullSearch?songName=${encodeURIComponent(
                query
            )}`;
            const response = await axios.get(apiUrl, { timeout: 20000 });
            const results = response.data;

            if (!Array.isArray(results) || results.length === 0) {
                return await sock.sendMessage(
                    chatId,
                    { text: `No results found for "${query}".` },
                    { quoted: event }
                );
            }

            const videos = results.slice(0, 5);

            let listevent = `🎵 *YouTube ${
                type === "audio" ? "Audio" : "Video"
            } Search Results for:* ${query}\n\n`;
            videos.forEach((video, i) => {
                listevent += `*${i + 1}.* ${video.title}\n`;
                listevent += `   ⏱️ ${video.time} | 📺 ${video.channel.name}\n`;
            });
            listevent +=
                "_Reply with the number (1-5) to select and download._";

            const sentevent = await sock.sendMessage(chatId, {
                text: listevent,
                quoted: event
            });
            global.client.replies.set(sentevent.key.id, {
                commandName: this.config.name,
                videos: videos,
                type: type
            });
        } catch (error) {
            console.error("Search error:", error);
            await sock.sendMessage(
                chatId,
                { text: "Failed to search YouTube. Please try again later." },
                { quoted: event }
            );
        }
    },
    onReply: async ({ sock, event, args, data, threadID, senderID }) => {
        const { videos, type } = data;
        try {
            await downloadAndSendMedia(
                videos,
                threadID,
                event,
                type,
                sock,
                args
            );
        } catch (err) {
            console.log(err);
            await sock.sendMessage(threadID, { text: "An error occurred please try again later" }, { quoted: event });
        }
    }
};

const getData = async (url, type, quality = "480") => {
    try {
        const format = type === "audio" ? "m4a" : "mp4";
        const apiUrl = `https://meow-dl.onrender.com/yt?url=${encodeURIComponent(url)}${type === "video" ? `&format=${format}&quality=${quality}` : `&format=${format}`}`;
        
        const response = await axios.get(apiUrl, { timeout: 30000 });
        if (response.data.status !== "ok" || !response.data.downloadLink) {
            throw new Error("Invalid response from API");
        }
        return response.data;
    } catch (error) {
        console.error("getData error:", error?.message || error);
        return null;
    }
};

const downloadAndSendMedia = async (videos, chatId, event, type, sock, body) => {
    const parseReplyText = () => {
        if (typeof body === "string") return body.trim();
        if (Array.isArray(body) && body.length > 0) return String(body[0]).trim();
        const msg = event?.message;
        if (!msg) return "";
        if (msg.conversation) return msg.conversation.trim();
        if (msg.extendedTextMessage?.text) return msg.extendedTextMessage.text.trim();
        return "";
    };

    let tmpFilePath = null;
    try {
        const replyText = parseReplyText();
        const choice = parseInt(replyText, 10);
        if (isNaN(choice) || choice < 1 || choice > videos.length) {
            return await sock.sendMessage(
                chatId,
                { text: "❌ Invalid selection. Please reply with a number between 1 and 5." },
                { quoted: event }
            );
        }

        const selectedVideo = videos[choice - 1];
        await sock.sendMessage(
            chatId,
            { text: `📥 Fetching your ${type} from:\n${selectedVideo.title}` },
            { quoted: event }
        );

        const dlData = await getData(`https://www.youtube.com/watch?v=${selectedVideo.id}`, type);
        if (!dlData || !dlData.downloadLink) {
            return await sock.sendMessage(
                chatId,
                { text: "❌ Download info not found from provider." },
                { quoted: event }
            );
        }

        const format = type === "audio" ? "m4a" : "mp4";
        const safeName = `${dlData.title.replace(/[<>:"\/\\|?*\x00-\x1F]/g, "").slice(0, 40)}.${format}`;
        const cacheDir = path.join(__dirname, "cache");
        if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });
        tmpFilePath = path.join(cacheDir, safeName);

        const responseStream = await axios({
            url: dlData.downloadLink,
            method: "GET",
            responseType: "stream",
            timeout: 0
        });

        const writer = fs.createWriteStream(tmpFilePath);
        responseStream.data.pipe(writer);

        await new Promise((resolve, reject) => {
            writer.on("finish", resolve);
            writer.on("error", reject);
            responseStream.data.on("error", reject);
        });

        if (type === "audio") {
            await sock.sendMessage(
                chatId,
                {
                    audio: { url: tmpFilePath },
                    mimetype: "audio/mp4",
                    fileName: safeName,
                    ptt: false,
                    caption: `🎵 ${dlData.title}\n👤 ${dlData.channel}\n⏱️ ${Math.floor(dlData.duration_seconds/60)}:${String(dlData.duration_seconds%60).padStart(2,'0')}`
                },
                { quoted: event }
            );
        } else {
            await sock.sendMessage(
                chatId,
                {
                    video: { url: tmpFilePath },
                    mimetype: "video/mp4",
                    fileName: safeName,
                    caption: `📺 ${dlData.title}\n👤 ${dlData.channel}\n🎥 ${dlData.quality}\n⏱️ ${Math.floor(dlData.duration_seconds/60)}:${String(dlData.duration_seconds%60).padStart(2,'0')}`
                },
                { quoted: event }
            );
        }

        fs.unlink(tmpFilePath, err => {
            if (err) console.error("Failed to delete temp file:", err);
        });

    } catch (err) {
        console.log("downloadAndSendMedia error:", err);
        if (tmpFilePath && fs.existsSync(tmpFilePath)) {
            try {
                fs.unlinkSync(tmpFilePath);
            } catch (e) {}
        }
        await sock.sendMessage(
            chatId,
            { text: "❌ Failed to download/send the file. Please try again later." },
            { quoted: event }
        );
    }
};