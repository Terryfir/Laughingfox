export default {
  config: {
    name: 'transfer',
    description: 'Transfer points to another user by replying to them',
    role: 0,
    category: "economy",
    author: "lance",
    usage: "!transfer <amount>"
  },

  async onRun({ sock, event, threadID, message, getUserData, saveTable, senderID, args }) {
    const amount = parseInt(args[0]);
    const targetID = event.message?.extendedTextMessage?.contextInfo?.participant;

    if (!targetID) return message.reply("Please reply to the message of the person you want to transfer points to.");
    if (isNaN(amount) || amount <= 0) return message.reply("Please provide a valid amount to transfer.");
    if (targetID === senderID) return message.reply("You cannot transfer points to yourself.");

    try {
      const sender = await getUserData(senderID);
      const receiver = await getUserData(targetID);

      if ((sender.money || 0) < amount) {
        return message.reply(`Insufficient balance. You only have ${sender.money} points.`);
      }

      sender.money -= amount;
      receiver.money = (receiver.money || 0) + amount;

      await saveTable("userData", [sender, receiver]);

      await message.react("💸", event);
      await sock.sendMessage(threadID, { 
        text: `✅ *Transfer Successful!*\n\n📤 *From:* ${sender.name || senderID}\n📥 *To:* ${receiver.name || targetID}\n💰 *Amount:* ${amount.toLocaleString()} points` 
      }, { quoted: event });

    } catch (error) {
      await message.react("❌", event);
      await sock.sendMessage(threadID, { text: `Transfer failed: ${error.message}` });
    }
  }
};