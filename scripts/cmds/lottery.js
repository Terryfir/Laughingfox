export default {
  config: {
    name: 'lottery',
    description: 'Buy a lottery ticket for 500 points',
    role: 0,
    category: "economy",
    author: "lance",
    usage: "!lottery [buy/info/draw]"
  },

  async onRun({ sock, event, threadID, message, getUserData, saveTable, senderID, args }) {
    const ticketPrice = 500;
    const systemID = 'LOTTERY_SYSTEM';

    try {
      const user = await getUserData(senderID);
      const lottoData = await getUserData(systemID); 
      
      lottoData.data.pool = lottoData.data.pool || [];
      const subCommand = args[0]?.toLowerCase();

      if (!subCommand || subCommand === 'info') {
        const totalPot = lottoData.data.pool.length * ticketPrice;
        const userTickets = lottoData.data.pool.filter(id => id === senderID).length;
        return sock.sendMessage(threadID, { 
          text: `🎟️ *LOTTERY INFO* 🎟️\n\n💰 *Total Pot:* ${totalPot.toLocaleString()} pts\n👥 *Total Tickets:* ${lottoData.data.pool.length}\n🎫 *Your Tickets:* ${userTickets}\n\n_Use !lottery buy to enter!_` 
        }, { quoted: event });
      }

      if (subCommand === 'buy') {
        if (user.money < ticketPrice) return message.reply("You don't have enough points (500 pts).");

        user.money -= ticketPrice;
        lottoData.data.pool.push(senderID);

        await saveTable("userData", [user, lottoData]);
        await message.react("🎫", event);
        return sock.sendMessage(threadID, { text: `✅ You bought 1 ticket! The pot is now ${(lottoData.data.pool.length * ticketPrice).toLocaleString()} pts.` });
      }

      if (subCommand === 'draw') {
        if (lottoData.data.pool.length < 2) return message.reply("Need at least 2 tickets to draw.");

        const winnerID = lottoData.data.pool[Math.floor(Math.random() * lottoData.data.pool.length)];
        const winner = await getUserData(winnerID);
        const prize = lottoData.data.pool.length * ticketPrice;

        winner.money += prize;
        const winnerName = winner.name || winnerID;

        lottoData.data.pool = [];

        await saveTable("userData", [winner, lottoData]);
        await message.react("🎊", event);
        return sock.sendMessage(threadID, { 
          text: `🎉 *LOTTERY DRAW RESULTS* 🎉\n\n🥳 *Winner:* ${winnerName}\n💰 *Prize Won:* ${prize.toLocaleString()} pts\n\nThe pot is now empty. Start buying for the next round!` 
        });
      }

    } catch (error) {
      await sock.sendMessage(threadID, { text: `Error: ${error.message}` });
    }
  }
};