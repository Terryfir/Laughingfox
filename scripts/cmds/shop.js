export default {
  config: {
    name: 'shop',
    description: 'View and buy items from the shop',
    role: 0,
    category: "economy",
    author: "lance",
    usage: "!shop [item_number]"
  },

  async onRun({ sock, event, threadID, message, getUserData, saveTable, senderID, args }) {
    const items = [
      { id: 'luck_charm', name: '🍀 Luck Charm', price: 5000, desc: 'Slightly increases gambling odds.' },
      { id: 'booster', name: '🚀 Reward Booster', price: 10000, desc: 'Increases daily rewards by 50%.' },
      { id: 'vip_card', name: '🎟️ VIP Card', price: 50000, desc: 'A shiny badge on your profile.' }
    ];

    if (!args[0]) {
      let shopMsg = "🏪 *POINTS SHOP* 🏪\n\n";
      items.forEach((item, i) => {
        shopMsg += `*${i + 1}. ${item.name}*\n💰 Price: ${item.price.toLocaleString()}\n📝 ${item.desc}\n\n`;
      });
      shopMsg += "_To buy, use: !shop <number>_";
      return sock.sendMessage(threadID, { text: shopMsg }, { quoted: event });
    }

    const index = parseInt(args[0]) - 1;
    if (!items[index]) return message.reply("Invalid item number.");

    try {
      const user = await getUserData(senderID);
      const selected = items[index];

      if (user.money < selected.price) {
        return message.reply(`You need ${selected.price - user.money} more points!`);
      }

      user.data.inventory = user.data.inventory || [];
      if (user.data.inventory.includes(selected.id)) {
        return message.reply("You already own this item!");
      }

      user.money -= selected.price;
      user.data.inventory.push(selected.id);

      await saveTable("userData", [user]);
      await message.react("🛍️", event);
      await sock.sendMessage(threadID, { text: `✅ Successfully bought **${selected.name}**!` }, { quoted: event });

    } catch (error) {
      await sock.sendMessage(threadID, { text: `Error: ${error.message}` });
    }
  }
};