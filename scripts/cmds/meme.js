import axios from 'axios';

export default {
    config: {
        name: 'meme',
        description: 'Get a random meme from Reddit',
        role: 0,
        category: 'fun',
        author: 'lance',
        usage: '!meme'
    },

    async onRun({ sock, event, threadID, message, font }) {
        try {
            const res = await axios.get('https://meme-api.com/gimme');
            const { title, url, postLink, subreddit } = res.data;

            const caption = `🖼️ *${font.bold(title)}*\n\n*Subreddit:* r/${subreddit}\n*Link:* ${postLink}`;

            await sock.sendMessage(threadID, { 
                image: { url: url }, 
                caption: caption 
            }, { quoted: event });

        } catch (error) {
            await message.reply('Failed to fetch a meme.');
        }
    }
};