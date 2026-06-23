import dotenv from "dotenv";
dotenv.config();
import log from "./log.js";
import path, { dirname } from "path";
import fs from "fs-extra";
import { fileURLToPath } from "url";
import font from "./fonts.js";
import axios from "axios";
import FormData from "form-data";

const __dirname = dirname(fileURLToPath(import.meta.url));

class Utils {
    async loadCommands() {
        const errs = {};
        const commandsPath = path.join(__dirname, "..", "scripts", "cmds");
        
        let loadedCount = 0;
        let failedCount = 0;

        try {
            log.info("loading commands...");
            const commandFiles = fs
                .readdirSync(commandsPath)
                .filter(file => file.endsWith(".js"));
                
            for (const file of commandFiles) {
                try {
                    const filePath = path.join(commandsPath, file);
                    const commandModule = await import(filePath);
                    const command = commandModule.default;
                    if (!command) {
                        throw new Error(
                            `Error: ${file} does not export anything!`
                        );
                    } else if (!command.config) {
                        throw new Error(
                            `Error: ${file} does not export config!`
                        );
                    } else {
                        if (
                            command.config.name.includes(
                                global.client.config.unloadedCmds
                            )
                        ) {
                            continue;
                        }
                        global.client.commands.set(
                            command.config.name,
                            command
                        );
                        if (command.config.aliase || command.config.aliases) {
                            let aliases;
                            if (command.config.aliase) {
                                aliases = Array.isArray(command.config.aliase)
                                    ? command.config.aliase
                                    : new Array(command.config.aliase);
                            } else {
                                aliases = Array.isArray(command.config.aliases)
                                    ? command.config.aliases
                                    : new Array(command.config.aliases);
                            }
                            for (const alias of aliases) {
                                global.client.aliases.set(alias, command);
                            }
                        } else if (command.config.cooldown) {
                            global.client.cooldowns.set(
                                command.config.cooldown,
                                []
                            );
                        }
                        
                        loadedCount++;
                    }
                } catch (error) {
                    failedCount++;
                    errs[file] = error.message;
                }
                process.stdout.write(`\rLoaded commands: ${loadedCount}, Failed to load: ${failedCount}`);
            }
            process.stdout.write("\n");

        } catch (error) {
            log.error(error.message);
        }
        return Object.keys(errs).length === 0 ? false : errs;
    }

    async saveCreds(creds) {
        try {
            const sessionDir = path.join(
                __dirname,
                "..",
                "cache",
                "auth_info_baileys"
            );
            await fs.writeFile(
                path.join(sessionDir, "creds.json"),
                JSON.stringify(creds)
            );
            log.info("Authentication credentials saved successfully");
        } catch (error) {
            log.error("Error saving authentication credentials:", error);
        }
    }

    async uploadToImgbb(filePath) {
        try {
            const formData = new FormData();
            formData.append("image", fs.createReadStream(filePath));
            const response = await axios.post(
                `https://api.imgbb.com/1/upload?key=${global.client.config.keys.IMGBB}`,
                formData,
                {
                    headers: {
                        ...formData.getHeaders()
                    }
                }
            );
            return response.data.data;
        } catch (error) {
            log.error(`Error uploading file to imgbb: ${error.message}`);
        }
    }

    get font() {
        return font;
    }
}

const utils = new Utils();
export default utils;