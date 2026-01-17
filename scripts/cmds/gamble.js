export default {
  config: {
    name: 'gamble',
    description: 'Bet points on a coin flip (Heads/Tails)',
    role: 0,
    category: "economy",
    author: "lance",
    usage: "!gamble <amount>"
  },

  async onRun({ sock, event, threadID, message, getUserData, saveTable, senderID, args }) {
    const bet = parseInt(args[0]);
    
    if (isNaN(bet) || bet < 50) {
      return message.reply("Please enter a valid bet (Minimum 50 points).");
    }

    try {
      const user = await getUserData(senderID);

      if ((user.money || 0) < bet) {
        return message.reply(`You don't have enough points! Balance: ${user.money}`);
      }

      const win = Math.random() < 0.5;

      if (win) {
        user.money += bet;
        await message.react("📈", event);
        await sock.sendMessage(threadID, { text: `🪙 *Result:* HEADS\n🎉 You won *${bet.toLocaleString()}* points!\nBalance: ${user.money.toLocaleString()}` }, { quoted: event });
      } else {
        user.money -= bet;
        await message.react("📉", event);
        await sock.sendMessage(threadID, { text: `🪙 *Result:* TAILS\n💀 You lost *${bet.toLocaleString()}* points.\nBalance: ${user.money.toLocaleString()}` }, { quoted: event });
      }

      await saveTable("userData", [user]);

    } catch (error) {
      await sock.sendMessage(threadID, { text: `Error: ${error.message}` });
    }
  }
};