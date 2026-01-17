export default {
  config: {
    name: 'rob',
    description: 'Try to steal points from another user',
    role: 0,
    category: "economy",
    author: "lance",
    usage: "!rob (reply to a message)"
  },

  async onRun({ sock, event, threadID, message, getUserData, saveTable, senderID }) {
    const targetID = event.message?.extendedTextMessage?.contextInfo?.participant;

    if (!targetID) return message.reply("Please reply to the user you want to rob.");
    if (targetID === senderID) return message.reply("You can't rob yourself!");

    try {
      const user = await getUserData(senderID);
      const target = await getUserData(targetID);

      const cooldown = 1 * 60 * 60 * 1000; // 1 hour cooldown
      const now = Date.now();

      if (now - (user.data.lastRob || 0) < cooldown) {
        const remaining = Math.ceil((cooldown - (now - user.data.lastRob)) / (1000 * 60));
        return message.reply(`🕒 You are laying low. Try again in ${remaining} minutes.`);
      }

      if (target.money < 100) return message.reply("This user is too poor to be worth robbing.");

      const success = Math.random() < 0.4; // 40% chance
      user.data.lastRob = now;

      if (success) {
        const stolen = Math.floor(Math.random() * (target.money * 0.3)); // Steal up to 30%
        user.money += stolen;
        target.money -= stolen;
        
        await message.react("🥷", event);
        await sock.sendMessage(threadID, { 
          text: `🥷 *Heist Successful!*\n\nYou stole **${stolen.toLocaleString()}** points from ${target.name || 'your target'}!` 
        }, { quoted: event });
      } else {
        const fine = 500;
        user.money = Math.max(0, user.money - fine);
        target.money += fine;

        await message.react("👮", event);
        await sock.sendMessage(threadID, { 
          text: `👮 *Caught!*\n\nYou were caught and fined *${fine}* points. The fine was paid to ${target.name || 'the victim'}.` 
        }, { quoted: event });
      }

      await saveTable("userData", [user, target]);

    } catch (error) {
      await sock.sendMessage(threadID, { text: `Error: ${error.message}` });
    }
  }
};