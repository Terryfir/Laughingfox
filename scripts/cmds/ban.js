export default {
  config: {
    name: 'ban',
    description: 'Ban a user from using the bot',
    role: 1,
    category: "admin",
    author: "lance",
    usage: "!ban (reply to user)"
  },

  async onRun({ sock, event, threadID, message, setUserBanned }) {
    const targetID = event.message?.extendedTextMessage?.contextInfo?.participant;

    if (!targetID) return message.reply("Please reply to the user you want to ban.");

    try {
      await setUserBanned(targetID, true);
      await message.react("🚫", event);
      await sock.sendMessage(threadID, { text: `🚫 User ${targetID} has been banned.` }, { quoted: event });
    } catch (error) {
      await sock.sendMessage(threadID, { text: `Error: ${error.message}` });
    }
  }
};