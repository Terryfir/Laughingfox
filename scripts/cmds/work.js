export default {
  config: {
    name: 'work',
    description: 'Work to earn some points',
    role: 0,
    category: "economy",
    author: "lance",
    usage: "!work"
  },

  async onRun({ sock, event, threadID, message, getUserData, saveTable, senderID }) {
    try {
      const user = await getUserData(senderID);
      const cooldown = 30 * 60 * 1000;
      const now = Date.now();

      if (now - (user.data.lastWork || 0) < cooldown) {
        const remaining = cooldown - (now - (user.data.lastWork || 0));
        const minutes = Math.floor(remaining / (1000 * 60));
        return sock.sendMessage(threadID, { text: `🕒 You're tired! Rest for another ${minutes} minutes.` }, { quoted: event });
      }

      const jobs = ["Programmer", "Chef", "Driver", "Designer", "Doctor", "Cleaner"];
      const job = jobs[Math.floor(Math.random() * jobs.length)];
      const salary = Math.floor(Math.random() * (500 - 100 + 1)) + 100;

      user.money = (user.money || 0) + salary;
      user.data.lastWork = now;

      await saveTable("userData", [user]);

      await message.react("💼", event);
      await sock.sendMessage(threadID, { 
        text: `👨‍💻 *Job:* ${job}\n💰 *Salary:* ${salary} points\n💳 *Balance:* ${user.money.toLocaleString()}` 
      }, { quoted: event });

    } catch (error) {
      await sock.sendMessage(threadID, { text: `Error: ${error.message}` });
    }
  }
};