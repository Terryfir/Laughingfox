import axios from 'axios';

export default {
    config: {
        name: 'crypto',
        description: 'Check cryptocurrency prices',
        role: 0,
        category: 'economy',
        author: 'lance',
        usage: '!crypto [coin-name]'
    },

    async onRun({ message, args, font }) {
        const coin = args[0]?.toLowerCase() || 'bitcoin';

        try {
            const res = await axios.get(`https://api.coingecko.com/api/v3/simple/price?ids=${coin}&vs_currencies=usd&include_24hr_change=true`);
            
            if (!res.data[coin]) return message.reply('Coin not found.');

            const price = res.data[coin].usd;
            const change = res.data[coin].usd_24h_change.toFixed(2);
            const emoji = change >= 0 ? '📈' : '📉';

            const text = `${emoji} *${font.bold(coin.toUpperCase())}*\n\n` +
                         `*Price:* $${price.toLocaleString()}\n` +
                         `*24h Change:* ${change}%`;

            await message.reply(text);
        } catch (error) {
            await message.reply('Error fetching crypto data.');
        }
    }
};