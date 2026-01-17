export default {
  config: {
    name: 'daily',
    description: 'Claim your daily reward (Boosted if you own a Booster)',
    role: 0,
    category: "economy",
    author: "lance",
    usage: "!daily"
  },

  async onRun({ sock, event, threadID, message, getUserData, saveTable, senderID }) {
    try {
      const user = await getUserData(senderID);
      const cooldown = 24 * 60 * 60 * 1000;
      const now = Date.now();

      const lastClaim = user.data.lastDaily || 0;

      if (now - lastClaim < cooldown) {
        const remaining = cooldown - (now - lastClaim);
        const hours = Math.floor(remaining / (1000 * 60 * 60));
        const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
        
        await message.react("⏳", event);
        return sock.sendMessage(threadID, { 
          text: `🕒 *Cooldown Active*\n\nYou can claim again in *${hours}h ${minutes}m*.` 
        }, { quoted: event });
      }

      let reward = 1000;
      const inventory = user.data.inventory || [];
      const hasBooster = inventory.includes('booster');

      if (hasBooster) {
        reward = 1500;
      }

      user.money = (user.money || 0) + reward;
      user.data.lastDaily = now;

      await saveTable("userData", [user]);

      await message.react("🎁", event);
      await sock.sendMessage(threadID, { 
        text: `🎉 *Daily Reward!*\n\n💰 Received: *${reward.toLocaleString()}* points${hasBooster ? ' (incl. 🚀 Booster)' : ''}\n💳 Balance: *${user.money.toLocaleString()}*` 
      }, { quoted: event });

    } catch (error) {
      await sock.sendMessage(threadID, { text: `Error: ${error.message}` });
    }
  }
};