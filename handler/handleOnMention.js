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
    setgroupBanned,
    admins
}) => {
    const { commands } = global.client;
    const cmdsArray = Array.from(commands.values());
    try {
        for (const command of commands.entries()) {
            if (command && typeof command.onMention === "function") {
                await command.onMention({
                    sock,
                    event,
                    threadID,
                    senderID,
                    proto,
                    font,
                    bot,
                    message,
                    args,
                    dataCache,
                    saveTable,
                    getTable,
                    getUserData,
                    getGroupData,
                    setuserBanned,
                    setgroupBanned,
                    admins
                });
            }
        }
    } catch (err) {
        console.error("Error in Mention Handler execution:", err);
    }
};
