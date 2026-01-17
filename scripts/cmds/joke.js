import axios from 'axios';

export default {
    config: {
        name: 'joke',
        description: 'Get a random joke',
        role: 0,
        category: 'fun',
        author: 'lance',
        usage: '!joke'
    },

    async onRun({ sock, event, threadID, message, font }) {
        try {
            const res = await axios.get('https://official-joke-api.appspot.com/random_joke');
            const { setup, punchline } = res.data;

            const jokeMsg = `😂 *${font.bold("JOKE TIME")}*\n\n` +
                             `*Setup:* ${setup}\n` +
                             `*Punchline:* ${punchline}`;

            await sock.sendMessage(threadID, { text: jokeMsg }, { quoted: event });
        } catch (error) {
            await message.reply('Failed to get a joke. Try again later.');
        }
    }
};