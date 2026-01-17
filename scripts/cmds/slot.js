export default {
  config: {
    name: 'slots',
    description: 'Bet points on the slot machine',
    role: 0,
    category: "economy",
    author: "lance",
    usage: "!slots <amount>"
  },

  async onRun({ sock, event, threadID, message, getUserData, saveTable, senderID, args }) {
    try {
      const bet = parseInt(args[0]);
      if (isNaN(bet) || bet < 100) {
        return message.reply("Minimum bet is 100 points.");
      }

      const user = await getUserData(senderID);
      if ((user.money || 0) < bet) {
        return message.reply(`You don't have enough points. Balance: ${user.money}`);
      }

      const items = ["🍎", "💎", "🍋", "🍒", "🔔", "⭐"];
      const slot1 = items[Math.floor(Math.random() * items.length)];
      const slot2 = items[Math.floor(Math.random() * items.length)];
      const slot3 = items[Math.floor(Math.random() * items.length)];

      let win = false;
      let multiplier = 0;

      if (slot1 === slot2 && slot2 === slot3) {
        win = true;
        multiplier = 10; // Jackpot
      } else if (slot1 === slot2 || slot2 === slot3 || slot1 === slot3) {
        win = true;
        multiplier = 2; // Pair
      }

      let resultMsg = `🎰 *SLOTS* 🎰\n--------------\n[ ${slot1} | ${slot2} | ${slot3} ]\n--------------\n`;

      if (win) {
        const winnings = bet * multiplier;
        user.money += winnings;
        resultMsg += `🎉 YOU WON!\n💰 Winnings: ${winnings.toLocaleString()} points`;
        await message.react("🤩", event);
      } else {
        user.money -= bet;
        resultMsg += `❌ YOU LOST\n💸 Loss: ${bet.toLocaleString()} points`;
        await message.react("💀", event);
      }

      await saveTable("userData", [user]);
      await sock.sendMessage(threadID, { text: resultMsg }, { quoted: event });

    } catch (error) {
      await sock.sendMessage(threadID, { text: `Error: ${error.message}` });
    }
  }
};