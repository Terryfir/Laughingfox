import { exec } from "child_process";
import { promisify } from "util";

const execPromise = promisify(exec);

export default {
    config: {
        name: "nmap",
        cooldown: 20,
        description: "Perform a security scan on an IP or Domain to check for open ports.",
        category: "security",
        usage: "!nmap <host> (e.g., !nmap scanme.nmap.org)"
    },

    async onRun({ sock, event, args, font }) {
        const chatId = event.key.remoteJid;
        const host = args[0];

        if (!host) {
            return await sock.sendMessage(chatId, { text: "❌ Please provide a host or IP to scan." }, { quoted: event });
        }

        // Basic security check: prevent command injection
        const safeHost = host.replace(/[^a-zA-Z0-9.-]/g, "");

        try {
            await sock.sendMessage(chatId, { react: { text: "🔍", key: event.key } });
            
            let statusMsg = `🚀 *${font.bold("STARTING PORT SCAN")}*\n`;
            statusMsg += `🌐 *Target:* ${safeHost}\n`;
            statusMsg += `⏳ *Please wait...* This may take a minute.`;
            
            await sock.sendMessage(chatId, { text: statusMsg }, { quoted: event });

            // Run a "Fast Scan" (-F) to keep it quick for WhatsApp
            // -sV detects service versions
            const { stdout, stderr } = await execPromise(`nmap -F -sV ${safeHost}`);

            if (stderr && !stdout) {
                throw new Error(stderr);
            }

            // Cleaning up the output for WhatsApp readability
            const lines = stdout.split("\n");
            const relevantOutput = lines.filter(line => 
                line.includes("/tcp") || 
                line.includes("Nmap scan report") || 
                line.includes("Service Info")
            ).join("\n");

            let result = `🛡️ *${font.bold("SCAN RESULTS")}*\n\n`;
            result += "```" + (relevantOutput || "No open ports found in fast scan.") + "```\n\n";
            result += `💡 *Tip:* Use this to check if your ports like 22 (SSH) or 80 (HTTP) are exposed.`;

            await sock.sendMessage(chatId, { text: result }, { quoted: event });

        } catch (error) {
            console.error(error);
            await sock.sendMessage(chatId, { text: `❌ *Scan Failed:* ${error.message}` }, { quoted: event });
        }
    }
};