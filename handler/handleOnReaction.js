function getStanzaId(message) {
  if (message.reactionMessage && message.reactionMessage.key) {
    return message.reactionMessage.key.id;
  }
  return null;
}

export default async ({
    sock,
    event,
    threadID,
    senderID,
    proto,
    font,
    message,
    bot,
    dataCache,
    saveTable,
    getTable,
    getUserData,
    getGroupData,
    admins
}) => {
    const { reactions, commands } = global.client;
    try {
        const stanzaId = getStanzaId(event.message);
        if (stanzaId && reactions.has(stanzaId)) {
            const data = reactions.get(stanzaId);
            const myNumber = sock.user.id.split(':')[0].split('@')[0];

            if (data.owner && data.owner !== myNumber) return;

            if (data && data.commandName) {
                const command = commands.get(data.commandName);
                if (command && command.onReaction) {
                    const emoji = event.message?.reactionMessage?.text;
                    await command.onReaction({
                        sock,
                        threadID,
                        senderID,
                        proto,
                        font,
                        message,
                        bot,
                        emoji,
                        data,
                        dataCache,
                        saveTable,
                        getTable,
                        getUserData,
                        getGroupData,
                        event,
                        admins
                    });
                }
            }
        }
    } catch (err) {
        console.log(err);
    }
};