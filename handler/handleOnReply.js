export default async ({
    sock,
    event,
    threadID,
    senderID,
    proto,
    font,
    message,
    args,
    bot,
    dataCache,
    saveTable,
    getTable,
    getUserData,
    getGroupData,
    setuserBanned,
    setgroupBanned
}) => {
    const { replies, commands } = global.client;
    try {
        const replyMsg = event.message?.extendedTextMessage?.contextInfo;
        const stanzaId = replyMsg?.stanzaId;

        if (stanzaId && replies.has(stanzaId)) {
            const data = replies.get(stanzaId) || {};
            const myNumber = sock.user.id.split(':')[0].split('@')[0];

            if (data.owner && data.owner !== myNumber) return;

            if (data && data.commandName) {
                const command = commands.get(data.commandName.toLowerCase());
                if (command && command.onReply) {
                    await command.onReply({
                        sock,
                        event,
                        threadID,
                        senderID,
                        proto,
                        font,
                        bot,
                        message,
                        args,
                        data,
                        dataCache,
                        saveTable,
                        getTable,
                        getUserData,
                        getGroupData,
                        setuserBanned,
                        setgroupBanned
                    });
                }
            }
        }
    } catch (err) {
        console.error(err);
    }
};