import fs from "fs-extra";
import { fileURLToPath } from "url";

export default {
    config: {
        name: "whitelist",
        description: "Toggles private mode on or off",
        usage: "whitelist <on/off>",
        category: "owner",
        cooldown: 5,
        role: 1
    },
    onRun: async ({ message, args }) => {
        try {
            const configPath = new URL("../../config.json", import.meta.url);

            if (!args[0]) {
                return message.reply(
                    "Please specify 'on' or 'off'. Example: whitelist on"
                );
            }

            const status = args[0].toLowerCase();
            const config = await fs.readJson(configPath);

            if (status === "on") {
                if(config.whitelist.ids.length <= 0){
                  config.whitelist.ids = [...config.admins]
                }
                config.whitelist.status = true;

                await fs.writeJson(configPath, config, { spaces: 2 });
                return message.reply(
                    "✅ Whitelist is now *ON*. The bot is now in *Private* mode."
                );
            } else if (status === "off") {
                config.whitelist.status = false;

                await fs.writeJson(configPath, config, { spaces: 2 });
                return message.reply(
                    "❌ Whitelist is now *OFF*. The bot is now in *Public* mode."
                );
            } else {
                return message.reply(
                    "Invalid argument! Use `whitelist on` or `whitelist off`."
                );
            }
        } catch (error) {
            console.error(error);
            message.reply(`Failed to update config! Error: ${error.message}`);
        }
    }
};