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
    description:
      "Download music audio from YouTube using the updated Meow-DL API.",
    category: "media",
    usage: `sing <YouTube URL or search query>`,
  },
  async onRun({ sock, event, args }) {
    const chatId = event.key.remoteJid;
    if (args.length === 0) {
      return await sock.sendMessage(
        chatId,
        { text: "Please provide a YouTube URL or search query." },
        { quoted: event },
      );
    }

    let query = args.join(" ");

    try {
      const search = await yts(query);
      if (!search.videos || search.videos.length === 0) {
        return await sock.sendMessage(
          chatId,
          { text: `No results found.` },
          { quoted: event },
        );
      }

      const videoUrl = search.videos[0].url;
      const thumbnail = search.videos[0].thumbnail;
      const title = search.videos[0].title;

      const apiUrl = `https://p.savenow.to/ajax/download.php?copyright=0&format=mp3&url=${encodeURIComponent(videoUrl)}&api=dfaxaxcb6d76f2f6a9894gjkege8a4ab232222`;
      const response = await axios.get(apiUrl);
      const resData = response.data;

      if (!resData.success || !resData.progress_url) {
        return await sock.sendMessage(
          chatId,
          { text: "Failed to initialize download." },
          { quoted: event },
        );
      }

      let downloadUrl = null;
      for (let i = 0; i < 15; i++) {
        const progressRes = await axios.get(resData.progress_url);
        const progressData = progressRes.data;

        if (progressData.download_url || progressData.url) {
          downloadUrl = progressData.download_url || progressData.url;
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }

      if (!downloadUrl) {
        return await sock.sendMessage(
          chatId,
          { text: "Download generation timed out." },
          { quoted: event },
        );
      }

      const tmpFileName = `${title.replace(/[<>:"\/\\|?*\x00-\x1F]/g, "").slice(0, 40)}.mp3`;
      const tmpFilePath = path.join(os.tmpdir(), `${Date.now()}.mp3`);
      const writer = fs.createWriteStream(tmpFilePath);

      const responseStream = await axios({
        url: downloadUrl,
        method: "GET",
        responseType: "stream",
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
              showAdAttribution: false,
            },
          },
        },
        { quoted: event },
      );

      fs.unlink(tmpFilePath, () => {});
    } catch (error) {
      await sock.sendMessage(
        chatId,
        { text: `Error: ${error.message}` },
        { quoted: event },
      );
    }
  },
};
