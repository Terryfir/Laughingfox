export default {
  config: {
    name: 'gift',
    description: 'Gift an item from your inventory to someone',
    role: 0,
    category: "economy",
    author: "lance",
    usage: "!gift (reply to user)"
  },

  async onRun({ sock, event, threadID, message, getUserData, saveTable, senderID }) {
    const targetID = event.message?.extendedTextMessage?.contextInfo?.participant;
    if (!targetID) return message.reply("Reply to the person you want to gift an item to.");

    try {
      const user = await getUserData(senderID);
      const target = await getUserData(targetID);
      const inventory = user.data.inventory || [];

      if (inventory.length === 0) return message.reply("You don't have any items to gift.");

      // Gift the last item for simplicity, or we could add args for selection
      const itemToGift = inventory.pop(); 
      
      target.data.inventory = target.data.inventory || [];
      target.data.inventory.push(itemToGift);

      await saveTable("userData", [user, target]);
      await sock.sendMessage(threadID, { 
        text: `🎁 You gifted a *${itemToGift.replace('_', ' ')}* to ${target.name || 'them'}!` 
      }, { quoted: event });

    } catch (error) {
      await sock.sendMessage(threadID, { text: `Error: ${error.message}` });
    }
  }
};