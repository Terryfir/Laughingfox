import axios from "axios";

export default {
    config: {
        name: "run",
        cooldown: 5,
        aliase: ["code", "exec", "execute"],
        description: "Execute code snippets directly or by replying to a message",
        category: "utility",
        usage: `${global.client.config.PREFIX}run <language> [code] (or reply to code)`
    },

    async onRun({ sock, event, args, font }) {
        const chatId = event.key.remoteJid;
        const quotedMessage = event.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        
        let language = args[0]?.toLowerCase();
        let code = "";

        if (quotedMessage) {
            code = quotedMessage.conversation || 
                   quotedMessage.extendedTextMessage?.text || 
                   quotedMessage.imageMessage?.caption || "";
        } else {
            code = args.slice(1).join(" ");
        }

        if (!language || !code) {
            return await sock.sendMessage(
                chatId,
                {
                    text: `*${font.bold("CODE RUNNER")}*\n\n` +
                          `1. *Direct:* !run <lang> <code>\n` +
                          `2. *Reply:* Reply to code with !run <lang>\n\n` +
                          `*Example:* !run python print("Hello")`
                },
                { quoted: event }
            );
        }

        try {
            await sock.sendMessage(chatId, { react: { text: "⏳", key: event.key } });

            const response = await axios.post("https://emkc.org/api/v2/piston/execute", {
                language: language,
                version: "*",
                files: [{ content: code }]
            });

            const output = response.data.run;

            if (!output) {
                throw new Error("Invalid language or no response from compiler.");
            }

            let resultMsg = `💻 *${font.bold("EXECUTION RESULT")}*\n\n`;
            resultMsg += `*Language:* ${response.data.language} (${response.data.version})\n`;
            resultMsg += `━━━━━━━━━━━━━━━━━━\n`;

            if (output.stderr) {
                resultMsg += `*❌ Error:*\n\`\`\`\n${output.stderr}\n\`\`\``;
            } else if (output.stdout) {
                resultMsg += `*✅ Output:*\n\`\`\`\n${output.stdout}\n\`\`\``;
            } else {
                resultMsg += `_Code executed successfully with no output._`;
            }

            await sock.sendMessage(chatId, { text: resultMsg }, { quoted: event });
            await sock.sendMessage(chatId, { react: { text: "✅", key: event.key } });

        } catch (error) {
            await sock.sendMessage(chatId, { react: { text: "❌", key: event.key } });
            await sock.sendMessage(
                chatId,
                { text: `❌ *Execution Failed*\nReason: ${error.message}` },
                { quoted: event }
            );
        }
    }
};