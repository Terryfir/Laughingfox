import axios from 'axios';

export default {
    config: {
        name: 'funjoke',
        description: 'Get a joke from specific categories',
        role: 0,
        category: 'fun',
        author: 'lance',
        usage: '!funjoke [programming/misc/dark/pun]'
    },

    async onRun({ sock, event, threadID, message, args, font }) {
        const category = args[0] || 'Any';
        const url = `https://v2.jokeapi.dev/joke/${category}?safe-mode`;

        try {
            const res = await axios.get(url);
            const data = res.data;

            let jokeText = '';
            if (data.type === 'single') {
                jokeText = data.joke;
            } else {
                jokeText = `*Q:* ${data.setup}\n*A:* ${data.delivery}`;
            }

            const response = `🎭 *${font.bold("RANDOM JOKE")}*\n\n${jokeText}`;
            await sock.sendMessage(threadID, { text: response }, { quoted: event });

        } catch (error) {
            await message.reply('Could not fetch a joke at the moment.');
        }
    }
};