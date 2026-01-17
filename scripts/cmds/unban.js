export default {
  config: {
    name: 'unban',
    description: 'Unban a user',
    role: 1,
    category: "admin",
    author: "lance",
    usage: "!unban (reply to user or provide ID)"
  },

  async onRun({ sock, event, threadID, message, setUserBanned, args }) {
    const targetID = event.message?.extendedTextMessage?.contextInfo?.participant || args[0];

    if (!targetID) return message.reply("Please reply to a user or provide their ID.");

    try {
      await setUserBanned(targetID, false);
      await message.react("✅", event);
      await sock.sendMessage(threadID, { text: `✅ User ${targetID} has been unbanned.` }, { quoted: event });
    } catch (error) {
      await sock.sendMessage(threadID, { text: `Error: ${error.message}` });
    }
  }
};