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
    name: "ytb",
    cooldown: 10,
    aliase: ["youtube", "y", "yt"],
    description: "Download YouTube Audio or Video via Search or URL",
    category: "media",
    usage: `ytb -a|-v <query or url>`,
  },

  async onRun({ sock, event, args }) {
    const chatId = event.key.remoteJid;

    if (args.length === 0) {
      return await sock.sendMessage(
        chatId,
        {
          text: "Please specify type and query.\nUsage:\nytb -a <song name/url> (Audio)\nytb -v <video name/url> (Video)",
        },
        { quoted: event },
      );
    }

    let type = "video";
    if (["audio", "-a"].includes(args[0].toLowerCase())) {
      type = "audio";
      args.shift();
    } else if (["video", "-v"].includes(args[0].toLowerCase())) {
      type = "video";
      args.shift();
    } else {
      if (!args[0].startsWith("http")) {
        return await sock.sendMessage(
          chatId,
          { text: "⚠️ Please use -a for audio or -v for video first." },
          { quoted: event },
        );
      }
    }

    const query = args.join(" ").trim();
    if (!query)
      return await sock.sendMessage(
        chatId,
        { text: "Please provide a URL or search term." },
        { quoted: event },
      );

    const isUrl = /^https?:\/\/(www\.)?(youtube\.com|youtu\.be)\//.test(query);

    if (isUrl) {
      await downloadAndSend(query, type, sock, chatId, event);
    } else {
      try {
        await sock.sendMessage(
          chatId,
          { text: `🔍 Searching YouTube for: *${query}*...` },
          { quoted: event },
        );

        const search = await yts(query);
        const videos = search.videos.slice(0, 5);

        if (videos.length === 0) {
          return await sock.sendMessage(
            chatId,
            { text: `No results found for "${query}".` },
            { quoted: event },
          );
        }

        let listMsg = `🎵 *YouTube ${type === "audio" ? "Audio" : "Video"} Results*\n\n`;

        videos.forEach((v, i) => {
          listMsg += `*${i + 1}.* ${v.title}\n`;
          listMsg += `   ⏱️ ${v.timestamp} | 📺 ${v.author.name}\n`;
        });
        listMsg += `\n_Reply with 1-5 to download._`;

        const sentMsg = await sock.sendMessage(
          chatId,
          { text: listMsg },
          { quoted: event },
        );

        global.client.replies.set(sentMsg.key.id, {
          commandName: this.config.name,
          videos: videos,
          type: type,
        });
      } catch (error) {
        await sock.sendMessage(
          chatId,
          { text: "❌ Search failed." },
          { quoted: event },
        );
      }
    }
  },

  onReply: async ({ sock, event, args, data, threadID }) => {
    const { videos, type } = data;
    const body = Array.isArray(args) ? args[0] : args;
    const choice = parseInt(body?.trim());

    if (isNaN(choice) || choice < 1 || choice > videos.length) {
      return await sock.sendMessage(
        threadID,
        { text: "❌ Invalid choice." },
        { quoted: event },
      );
    }

    const selected = videos[choice - 1];
    await downloadAndSend(selected.url, type, sock, threadID, event);
  },
};

const downloadAndSend = async (url, type, sock, chatId, quotedEvent) => {
  try {
    await sock.sendMessage(
      chatId,
      { text: `📥 Initializing ${type} download...\nPlease wait.` },
      { quoted: quotedEvent },
    );

    const format = type === "audio" ? "mp3" : "480";
    const apiUrl = `https://p.savenow.to/ajax/download.php?copyright=0&format=${format}&url=${encodeURIComponent(url)}&api=dfaxaxcb6d76f2f6a9894gjkege8a4ab232222`;

    const response = await axios.get(apiUrl);
    const resData = response.data;

    if (!resData.success || !resData.progress_url) {
      throw new Error("API failed to provide a progress URL.");
    }

    const title = resData.info?.title || resData.title || "download";
    let downloadUrl = null;

    for (let i = 0; i < 15; i++) {
      const progressRes = await axios.get(resData.progress_url);
      const progressData = progressRes.data;

      if (progressData.download_url) {
        downloadUrl = progressData.download_url;
        break;
      } else if (progressData.url) {
        downloadUrl = progressData.url;
        break;
      }

      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    if (!downloadUrl) {
      throw new Error("Timed out waiting for the download link to generate.");
    }

    const ext = type === "audio" ? "mp3" : "mp4";
    const safeTitle = title.replace(/[<>:"\/\\|?*\x00-\x1F]/g, "").slice(0, 40);
    const tmpFilePath = path.join(os.tmpdir(), `${Date.now()}.${ext}`);

    const writer = fs.createWriteStream(tmpFilePath);
    const stream = await axios({
      url: downloadUrl,
      method: "GET",
      responseType: "stream",
    });
    stream.data.pipe(writer);

    await new Promise((resolve, reject) => {
      writer.on("finish", resolve);
      writer.on("error", reject);
    });

    if (type === "audio") {
      await sock.sendMessage(
        chatId,
        {
          audio: { url: tmpFilePath },
          mimetype: "audio/mpeg",
          fileName: `${safeTitle}.mp3`,
          ptt: false,
          contextInfo: {
            externalAdReply: {
              title: title,
              body: "Downloaded via Sypher bot",
              thumbnailUrl: resData.info?.image || "",
              sourceUrl: url,
              mediaType: 1,
              renderLargerThumbnail: true,
              showAdAttribution: false,
            },
          },
        },
        { quoted: quotedEvent },
      );
    } else {
      await sock.sendMessage(
        chatId,
        {
          video: { url: tmpFilePath },
          mimetype: "video/mp4",
          fileName: `${safeTitle}.mp4`,
          caption: `📺 _${title}_`,
        },
        { quoted: quotedEvent },
      );
    }

    fs.unlink(tmpFilePath, () => {});
  } catch (error) {
    await sock.sendMessage(
      chatId,
      { text: `❌ Error: ${error.message}` },
      { quoted: quotedEvent },
    );
  }
};
