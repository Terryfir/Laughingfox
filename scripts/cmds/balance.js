export default {
  config: {
    name: 'balance',
    description: 'Check your current point balance',
    role: 0,
    category: "economy",
    author: "lance",
    usage: "!balance"
  },

  async onRun({ sock, event, threadID, message, getUserData, senderID }) {
    try {
      const user = await getUserData(senderID);

      const name = user.name || "User";
      const points = user.money || 0;

      const balanceMsg = `👤 *User:* ${name}\n💰 *Balance:* ${points.toLocaleString()} points`;

      await sock.sendMessage(threadID, { text: balanceMsg }, { quoted: event });
      await message.react("💳", event);

    } catch (error) {
      await message.react("❌", event);
      await sock.sendMessage(threadID, { text: `Error fetching balance: ${error.message}` });
    }
  }
};