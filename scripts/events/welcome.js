export default {
  config: {
    name: "welcome"
  },
  onEvent: async ({ event, sock, client, getGroupData }) => {
    if (!['add', 'remove'].includes(event.action)) return;

    const groupId = event.id;
    const metadata = await sock.groupMetadata(groupId).catch(() => null);
    if (!metadata) return;

    const groupDB = await getGroupData(groupId);
    let customWelcome = null;
    let customLeave = null;

    if (groupDB && groupDB[0]?.data) {
        const data = typeof groupDB[0].data === 'string' ? JSON.parse(groupDB[0].data) : groupDB[0].data;
        customWelcome = data.welcomeMessage;
        customLeave = data.leaveMessage;
    }

    const botBase = sock.user.id.split(":")[0];
    const botNumberS = `${botBase}@s.whatsapp.net`;
    const botNumberLid = `${botBase}@lid`;

    for (const participantObj of event.participants) {
      const participantId = participantObj.id; 

      if (event.action === "add" && (participantId === botNumberS || participantId === botNumberLid)) {
        const text = `Thanks for adding me to *${metadata.subject}*! 🎉\nUse */help* to see all available commands.`;
        await sock.sendMessage(groupId, { text });
        continue; 
      }

      const username = participantId.split("@")[0];
      const pp = await sock.profilePictureUrl(participantId, "image").catch(() => "https://i.ibb.co/FzYpDmt/default.png");

      if (event.action === "add") {
        let text = customWelcome 
            ? customWelcome.replace(/{name}/g, `@${username}`).replace(/{group}/g, metadata.subject)
            : `👋 Welcome @${username} to *${metadata.subject}*! 🎉`;

        await sock.sendMessage(groupId, {
          image: { url: pp },
          caption: text,
          mentions: [participantId],
        });
      } else if (event.action === "remove") {
        let text = customLeave
            ? customLeave.replace(/{name}/g, `@${username}`).replace(/{group}/g, metadata.subject)
            : `😢 @${username} has left *${metadata.subject}*. Farewell!`;

        await sock.sendMessage(groupId, {
          image: { url: pp },
          caption: text,
          mentions: [participantId],
        });
      }
    }
  }
}
