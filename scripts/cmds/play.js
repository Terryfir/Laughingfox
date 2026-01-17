import axios from 'axios';
import fs from 'fs';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';
import os from 'os';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default {
  config: {
    name: 'play',
    description: 'Search and download audio from YouTube Music',
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
      const title = data.title;
      const channel = data.channel;

      await sock.sendMessage(threadID, { 
        image: { url: data.thumbnail }, 
        caption: `🎵 *Title:* ${title}\n🎤 *Channel:* ${channel}\n\n*Status:* Downloading audio...` 
      }, { quoted: event });

      const tmpFileName = `${Date.now()}.mp3`;
      const tmpFilePath = path.join(os.tmpdir(), tmpFileName);

      const writer = fs.createWriteStream(tmpFilePath);
      const audioStream = await axios.get(audioUrl, { responseType: 'stream' });

      audioStream.data.pipe(writer);

      await new Promise((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
      });

      await sock.sendMessage(threadID, {
        audio: { url: tmpFilePath },
        mimetype: 'audio/mpeg',
        fileName: `${title}.mp3`,
        ptt: false
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