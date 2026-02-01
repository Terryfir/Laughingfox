import axios from "axios";

export default {
    config: {
        name: "riddle",
        aliases: ["riddles", "brain"],
        description: "Fetch a random riddle.",
        category: "fun",
        usage: "!riddle"
    },

    async onRun({ sock, event, font }) {
        const chatId = event.key.remoteJid;

        try {
            const res = await axios.get(
                "https://riddles-api.vercel.app/random"
            );
            const { riddle, answer } = res.data;

            if (!riddle || !answer) throw new Error();

            const msg = await sock.sendMessage(
                chatId,
                {
                    text: `🧩 ${font.bold(
                        "RIDDLE TIME"
                    )}\n\n${riddle}\n\n_Reply to this message with your answer!_`
                },
                { quoted: event }
            );

            global.client.replies.set(msg.key.id, {
                commandName: this.config.name,
                answer: answer
            });
        } catch (error) {
            return sock.sendMessage(
                chatId,
                { text: "❌ Failed to fetch a riddle." },
                { quoted: event }
            );
        }
    },

    onReply: async ({ sock, event, args, data, threadID, font }) => {
        const { answer } = data;
        const userAnswer = args.toLowerCase().replace(/[^a-z0-9]/g, "");
        const correctAnswer = answer.toLowerCase().replace(/[^a-z0-9]/g, "");

        if (
            userAnswer.includes(correctAnswer) ||
            correctAnswer.includes(userAnswer)
        ) {
            await sock.sendMessage(
                threadID,
                {
                    text: `✅ ${font.bold(
                        "Correct!"
                    )} 🎉\n\nThe answer was: ${font.bold(answer)}`
                },
                { quoted: event }
            );
        } else {
            await sock.sendMessage(
                threadID,
                {
                    text: `❌ ${font.bold(
                        "Wrong!"
                    )} 💀\n\nThe correct answer was: ${font.bold(answer)}`
                },
                { quoted: event }
            );
        }
    }
};