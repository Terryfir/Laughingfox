import axios from 'axios';
import fs from 'fs';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';
import os from 'os';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default {
  config: {
    name: 'play',
    description: 'Search and download audio from YouTube Music as Document',
    role: 0,
    category: "media",
    author: "lance",
    usage: "!play <search query>"
  },

  async onRun({ sock, event, threadID, message, args }) {
    if (!args.length) {
      return message.reply('Please provide a search term.');
    }

    const query = args.join(' ');
    await message.react("⌛", event);

    try {
      const response = await axios.get(`https://meow-dl.onrender.com/music?q=${encodeURIComponent(query)}`);
      const data = response.data;

      if (!data.success || !data.media || data.media.length === 0) {
        await message.react("❌", event);
        return sock.sendMessage(threadID, { text: 'No results found.' });
      }

      const audioInfo = data.media.find(m => m.quality === '128kbps') || data.media[data.media.length - 1];
      const audioUrl = audioInfo.url;
      
      const cleanTitle = data.title.replace(/\s*\(.*?\)\s*/g, '').replace(/\s*\[.*?\]\s*/g, '').trim();
      const channel = data.channel;
      const thumbnail = data.thumbnail;
      const youtubeUrl = `https://www.youtube.com/watch?v=${data.videoId}`;

      const safeFileName = cleanTitle.replace(/[<>:"\/\\|?*\x00-\x1F]/g, "").slice(0, 50);
      const tmpFilePath = path.join(os.tmpdir(), `${safeFileName}.mp3`);

      const writer = fs.createWriteStream(tmpFilePath);
      const audioStream = await axios.get(audioUrl, { responseType: 'stream' });

      audioStream.data.pipe(writer);

      await new Promise((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
      });

      await sock.sendMessage(threadID, {
        document: { url: tmpFilePath },
        mimetype: 'audio/mpeg',
        fileName: `${safeFileName}.mp3`,
        contextInfo: {
          externalAdReply: {
            title: cleanTitle,
            body: `Artist: ${channel}`,
            thumbnailUrl: thumbnail,
            sourceUrl: youtubeUrl,
            mediaType: 1,
            renderLargerThumbnail: true,
            showAdAttribution: false
          }
        }
      }, { quoted: event });

      await message.react("✅", event);

      fs.unlink(tmpFilePath, err => {
        if (err) console.error(err);
      });

    } catch (error) {
      await message.react("❌", event);
      await sock.sendMessage(threadID, { text: `An error occurred: ${error.message}` });
    }
  }
};