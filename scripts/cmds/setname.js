export default {
  config: {
    name: 'setname',
    description: 'Change your display name',
    role: 0,
    category: "info",
    author: "lance",
    usage: "!setname <new name>"
  },

  async onRun({ sock, event, threadID, message, getUserData, saveTable, senderID, args }) {
    const newName = args.join(" ");

    if (!newName || newName.length > 20) {
      return message.reply("Please provide a name (max 20 characters).");
    }

    try {
      const user = await getUserData(senderID);
      user.name = newName;

      await saveTable("userData", [user]);
      await message.react("✅", event);
      await sock.sendMessage(threadID, { text: `✅ Your name has been updated to: *${newName}*` }, { quoted: event });
    } catch (error) {
      await sock.sendMessage(threadID, { text: `Error: ${error.message}` });
    }
  }
};