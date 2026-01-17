export default {
  config: {
    name: 'leaderboard',
    description: 'See the top users with the most points',
    role: 0,
    category: "economy",
    author: "lance",
    usage: "!leaderboard"
  },

  async onRun({ sock, event, threadID, message, getTable }) {
    try {
      const allUsers = await getTable("userData");

      if (!allUsers || allUsers.length === 0) {
        return sock.sendMessage(threadID, { text: "The leaderboard is currently empty." });
      }

      const topUsers = allUsers
        .sort((a, b) => (b.money || 0) - (a.money || 0))
        .slice(0, 10);

      let leaderboardMsg = "🏆 *Top 10 Richest Users* 🏆\n\n";

      topUsers.forEach((user, index) => {
        let rankLabel;
        if (index === 0) rankLabel = "🥇";
        else if (index === 1) rankLabel = "🥈";
        else if (index === 2) rankLabel = "🥉";
        else rankLabel = `${index + 1}.`;

        const name = user.name || "Unknown User";
        const points = user.money || 0;
        
        leaderboardMsg += `${rankLabel} *${name}*\n💰 ${points.toLocaleString()} points\n\n`;
      });

      await sock.sendMessage(threadID, { text: leaderboardMsg.trim() }, { quoted: event });
      await message.react("🏆", event);

    } catch (error) {
      await message.react("❌", event);
      await sock.sendMessage(threadID, { text: `Error generating leaderboard: ${error.message}` });
    }
  }
};