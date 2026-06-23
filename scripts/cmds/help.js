import moment from "moment";
import fetch from "node-fetch";

export default {
  config: {
    name: "help",
    aliase: ["h", "commands", "menu"],
    category: "general",
    description: "Get a list of all commands or info about a specific command",
    usage: "help [command]",
    cooldown: 3,
    author: "raphael | compatibility by lance"
  },
  async onRun({ sock, event, args, threadID, senderID }) {
    const config = global.client.config;
    const prefix = config.PREFIX;

    const pushName = event.pushName || "unknown";

    if (args.length > 0) {
      return this.showCommandDetails({
        sock,
        event,
        threadID,
        commandName: args[0],
        prefix,
        senderID,
      });
    }

    const allCommands = [...global.client.commands.values()];
    const categories = [...new Set(allCommands.map((d) => d.config.category))].filter(Boolean);
    const totalCommands = global.client.commands.size;

    const now = moment();
    const currentDate = now.format("DD/MM/YYYY");
    const currentDay = now.format("dddd");
    const currentTime = now.format("hh:mm:ss A");

    const categoryMap = {
      admin: "🛡️",
      ai: "🤖",
      downloader: "📥",
      economy: "💰",
      fun: "🎭",
      games: "🎮",
      general: "📱",
      media: "🎨",
      owner: "👑",
      utility: "🔧",
      moderation: "⚖️",
      music: "🎵",
      social: "👥",
      info: "📊",
      misc: "⭐",
      search: "🔍",
      anime: "🌸",
      tools: "🛠️",
      image: "🖼️",
      system: "⚙️",
      rank: "🏆",
    };

    let helpMessage = `╭──⦿【 ⚡ ${config.botname.toUpperCase()} 】\n`;
    helpMessage += `│ 🎯 𝗨𝘀𝗲𝗿: ${pushName}\n`;
    helpMessage += `│ 🌐 𝗣𝗿𝗲𝗳𝗶𝦅: ${prefix}\n`;
    helpMessage += `│ 📅 𝗗𝗮𝘁𝗲: ${currentDate}\n`;
    helpMessage += `│ 📆 𝗗𝗮𝘆: ${currentDay}\n`;
    helpMessage += `│ ⏰ 𝗧𝗶𝗺𝗲: ${currentTime}\n`;
    helpMessage += `╰────────⦿\n`;

    for (const category of categories.sort()) {
      const commands = allCommands.filter((d) => d.config.category === category);

      if (commands.length === 0) continue;

      const emoji = categoryMap[category.toLowerCase()] || "⭐";

      helpMessage += `\n╭──⦿【 ${emoji} ${category.toUpperCase()} 】\n`;
      const commandsInRow = [];
      commands.forEach((cmd) => {
        commandsInRow.push(`✧${cmd.config.name}`);
      });

      for (let i = 0; i < commandsInRow.length; i += 6) {
        const row = commandsInRow.slice(i, i + 6).join(" ");
        helpMessage += `│ ${row}\n`;
      }

      helpMessage += `╰────────⦿`;
    }

    helpMessage += `\n\n╭──────────⦿\n`;
    helpMessage += `│ 𝗧𝗼𝘁𝗮𝗹 𝗰𝗺𝗱𝘀:「${totalCommands}」\n`;
    helpMessage += `│ 𝗧𝘆𝗽𝗲: [ ${prefix}help <cmd> ]\n`;
    helpMessage += `│ 𝘁𝗼 𝗹𝗲𝗮𝗿𝗻 𝘁𝗵𝗲 𝘂𝘀𝗮𝗴𝗲.\n`;
    helpMessage += `│ 𝗧𝘆𝗽𝗲: [ ${prefix}support ] to join\n`;
    helpMessage += `│ Support Group\n`;
    helpMessage += `╰─────────────⦿\n`;
    helpMessage += `╭─────────────⦿\n`;
    helpMessage += `│💫 | [ ${config.botname} 🍀 ]\n`;
    helpMessage += `╰────────────⦿`;

    try {
      // Updated to waifu.im API endpoint
      const apiResponse = await fetch("https://api.waifu.im/images", {
        timeout: 5000,
      });
      if (!apiResponse.ok)
        throw new Error(`API returned status ${apiResponse.status}`);

      const apiData = await apiResponse.json();
      
      // Dig down into items[0] to find the URL property
      if (!apiData.items || apiData.items.length === 0)
        throw new Error("No images returned from API");
        
      const imgUrl = apiData.items[0].url;

      await sock.sendMessage(
        threadID,
        {
          image: { url: imgUrl },
          caption: helpMessage,
          mentions: [senderID],
        },
        { quoted: event },
      );
    } catch (error) {
      console.error("Help command image fetch error:", error);
      await sock.sendMessage(
        threadID,
        {
          text: helpMessage,
          mentions: [senderID],
        },
        { quoted: event },
      );
    }
  },

  async showCommandDetails({
    sock,
    event,
    threadID,
    commandName,
    prefix,
    senderID,
  }) {
    const cmd =
      global.client.commands.get(commandName.toLowerCase()) ||
      [...global.client.commands.values()].find(
        (c) => c.config.aliase && c.config.aliase.includes(commandName.toLowerCase()),
      );

    if (!cmd) {
      return sock.sendMessage(
        threadID,
        {
          text: `╭──⦿【 ❌ COMMAND ERROR 】\n│ Command "${commandName}" not found\n│ Use ${prefix}help to see all commands\n╰────────⦿`,
        },
        { quoted: event },
      );
    }

    const config = global.client.config;
    const cmdConfig = cmd.config;
    const aliases = cmdConfig.aliase || [];

    let info = `╭──⦿【 📋 COMMAND DETAILS 】\n`;
    info += `│ 🏷️ 𝗡𝗮𝗺𝗲: ${cmdConfig.name}\n`;
    info += `│ 🔄 𝗔𝗹𝗶𝗮𝘀𝗲𝘀: ${aliases.length ? aliases.join(", ") : "None"}\n`;
    info += `│ 📖 𝗨𝘀𝗮𝗴𝗲: ${prefix}${cmdConfig.usage || cmdConfig.name}\n`;
    info += `│ 📝 𝗗𝗲𝘀𝗰𝗿𝗶𝗽𝘁𝗶𝗼𝗻: ${cmdConfig.description || "No description provided"}\n`;
    info += `│ 📂 𝗖𝗮𝘁𝗲𝗴𝗼𝗿𝘆: ${cmdConfig.category || "Uncategorized"}\n`;
    info += `│ ⏱️ 𝗖𝗼𝗼𝗹𝗱𝗼𝘄𝗻: ${cmdConfig.cooldown || 0}s\n`;
    info += `│ 👑 𝗢𝘄𝗻𝗲𝗿 𝗢𝗻𝗹𝘆: ${cmdConfig.role === 1 ? "Yes" : "No"}\n`;
    info += `╰────────⦿\n`;
    info += `╭─────────────⦿\n`;
    info += `│💫 | [ ${config.botname} 🍀 ] - Command Analysis\n`;
    info += `╰────────────⦿`;

    return sock.sendMessage(
      threadID,
      {
        text: info,
        mentions: [senderID],
      },
      { quoted: event },
    );
  },
};