export default {
  config: {
    name: 'inventory',
    description: 'Check your owned items',
    role: 0,
    category: "economy",
    author: "lance",
    usage: "!inventory"
  },

  async onRun({ sock, event, threadID, message, getUserData, senderID }) {
    try {
      const user = await getUserData(senderID);
      const inventory = user.data.inventory || [];

      if (inventory.length === 0) {
        return sock.sendMessage(threadID, { text: "📦 Your inventory is empty." }, { quoted: event });
      }

      const itemNames = {
        luck_charm: '🍀 Luck Charm',
        booster: '🚀 Reward Booster',
        vip_card: '🎟️ VIP Card'
      };

      let msg = "🎒 *YOUR INVENTORY* 🎒\n\n";
      inventory.forEach((itemID, i) => {
        msg += `${i + 1}. ${itemNames[itemID] || itemID}\n`;
      });

      await sock.sendMessage(threadID, { text: msg }, { quoted: event });
    } catch (error) {
      await sock.sendMessage(threadID, { text: `Error: ${error.message}` });
    }
  }
};