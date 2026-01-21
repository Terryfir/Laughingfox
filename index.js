import { spawn } from "child_process";
import log from "./utils/log.js";
import { dirname } from "path";
import { fileURLToPath } from "url";
import setupAutoRestart from "./utils/autoRestart.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

let bot;

setupAutoRestart(() => {
    if (bot) {
        bot.kill(); 
    }
});

function start() {
    bot = spawn("node", ["fox.js"], {
        cwd: __dirname,
        stdio: "inherit"
    });

    bot.on("close", (code) => {
        if (code === 2 || code === null) {
            log.info(`Bot stopped (Code: ${code}). Restarting...`);
            start();
        } else {
            log.error(`Bot stopped with unexpected code: ${code}`);
        }
    });

    bot.on("error", err => {
        log.error(`Error starting bot: ${err.message}`);
    });
}

start();
