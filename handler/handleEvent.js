async function handler({
  args,
  event,
  sock,
  senderID,
  threadID,
  commandName,
  bot,
  message,
  font,
  proto,
  dataCache,
  saveTable,
  getTable,
  getUserData,
  getGroupData,
  setgroupBanned,
  setuserBanned,
  admins,
  prefix
}) {
  try {
    const { cooldowns } = global.client;
    const command = global.client.commands.get(commandName.toLowerCase()) || global.client.aliases.get(commandName.toLowerCase());

    if (!command) return;

    const now = Date.now();
    const cooldownKey = `${senderID}_${commandName.toLowerCase()}`;
    const cooldownTime = command.config.countDown || 0;
    const cooldownExpiration = cooldowns.get(cooldownKey) || 0;
    const secondsLeft = Math.ceil((cooldownExpiration - now) / 1000);

    if (cooldownExpiration && now < cooldownExpiration) {
      return message.send(
        `❌ | Please wait ${secondsLeft}s to use this command!`
      );
    }
    cooldowns.set(cooldownKey, now + cooldownTime * 1000);

    const role = command.config?.role || 0;
    const cleanSender = senderID.replace("@lid", "").split(":")[0].split("@")[0];

    if (role === 1) {
        if (!admins.includes(cleanSender)) {
            return message.reply("❌ | This command is restricted to admins of this specific account.");
        }
    }

    if (role === 2) {
        if (threadID.endsWith("@g.us")) {
            const metadata = await sock.groupMetadata(threadID);
            const groupAdmins = metadata.participants
                .filter((ad) => ad.admin !== null)
                .map((uid) => uid.id);

            if (!groupAdmins.includes(senderID)) {
                return message.reply("❌ | This command can only be used by group admins.");
            }
        } else {
            return message.reply("❌ | This command can only be used in groups.");
        }
    }

    if (command?.onLoad) {
      await command.onLoad({
        sock,
        event,
        args,
        threadID,
        senderID,
        font,
        commandName,
        message,
        bot,
        proto,
        dataCache,
        saveTable,
        getTable,
        getUserData,
        getGroupData,
        setuserBanned,
        setgroupBanned,
        prefix,
        admins
      });
    }

    return await command.onRun({
      sock,
      event,
      args,
      threadID,
      senderID,
      font,
      commandName,
      message,
      bot,
      proto,
      dataCache,
      saveTable,
      getTable,
      getUserData,
      getGroupData,
      setuserBanned,
      setgroupBanned,
      prefix,
      admins
    });
  } catch (e) {
    console.error(e);
    message.reply(
      `❌ | An error occurred: ${e.message}`
    );
  }
}

export default handler;