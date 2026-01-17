export default {
  config: {
    name: 'net',
    description: 'View your profile and global ranking',
    role: 0,
    category: "info",
    author: "lance",
    usage: "!net"
  },

  async onRun({ sock, event, threadID, message, getUserData, getTable, senderID }) {
    try {
      const user = await getUserData(senderID);
      const allUsers = await getTable("userData");
      
      const rank = allUsers
        .sort((a, b) => (b.money || 0) - (a.money || 0))
        .findIndex(u => u.id === senderID) + 1;

      const inventory = user.data.inventory || [];
      const isVIP = inventory.includes('vip_card');

      const profileMsg = `👤 *USER PROFILE* ${isVIP ? '✨[VIP]✨' : ''}\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `📝 *Name:* ${user.name || "Unknown"}\n` +
        `💰 *Money:* ${user.money.toLocaleString()} pts\n` +
        `📊 *Global Rank:* #${rank}\n` +
        `✉️ *Msg Count:* ${user.msgCount || 0}\n` +
        `🎒 *Items:* ${inventory.length} owned\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━`;

      await sock.sendMessage(threadID, { text: profileMsg }, { quoted: event });
      await message.react("👤", event);

    } catch (error) {
      await sock.sendMessage(threadID, { text: `Error: ${error.message}` });
    }
  }
};