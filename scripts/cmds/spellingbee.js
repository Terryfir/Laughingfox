import axios from "axios";

const words = [
    "accommodation",
    "achieve",
    "beautiful",
    "calendar",
    "definitely",
    "experience",
    "foreign",
    "grateful",
    "hierarchy",
    "independent",
    "jewelry",
    "knowledge",
    "leisure",
    "maintenance",
    "neighbor",
    "occurrence",
    "parliament",
    "rhythm",
    "schedule",
    "tomorrow",
    "vacuum"
];

export default {
    config: {
        name: "spellingbee",
        description:
            "Listen to the audio and spell the word correctly to win credits!",
        role: 0,
        category: "games",
        author: "lance",
        usage: "!spellingbee"
    },

    async onRun({ sock, event, threadID, message, getUserData, saveTable }) {
        const randomWord = words[Math.floor(Math.random() * words.length)];
        const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(
            randomWord
        )}&tl=en&client=tw-ob`;

        await message.react("🐝", event);

        const sentAudio = await sock.sendMessage(
            threadID,
            {
                audio: { url: ttsUrl },
                mimetype: "audio/mpeg",
                ptt: true
            },
            { quoted: event }
        );

        const promptMsg = await sock.sendMessage(
            threadID,
            {
                text: "⬆️ *Spelling Bee Alert!*\n\nListen to the audio above. It will disappear in 15 seconds. Reply to *this message* with the correct spelling to win *500 credits*!"
            },
            { quoted: event }
        );

        global.client.replies.set(promptMsg.key.id, {
            commandName: this.config.name,
            word: randomWord.toLowerCase()
        });

        setTimeout(async () => {
            try {
                await sock.sendMessage(threadID, { delete: sentAudio.key });
            } catch (err) {
                console.error(err);
            }
        }, 15000);
    },

    async onReply({
        sock,
        event,
        args,
        data,
        threadID,
        message,
        getUserData,
        saveTable,
        senderID
    }) {
        const userAnswer = args.toLowerCase();
        const correctAnswer = data.word;
        const userId = senderID;

        if (userAnswer === correctAnswer) {
            try {
                const user = await getUserData(userId);
                const reward = 500;

                user.money = (user.money || 0) + reward;
                await saveTable("userData", [user]);

                await message.react("✅", event);
                await sock.sendMessage(
                    threadID,
                    {
                        text: `🎉 *Correct!* The word was *${correctAnswer}*.\n💰 +${reward} credits added to your balance!`
                    },
                    { quoted: event }
                );
            } catch (error) {
                await sock.sendMessage(threadID, {
                    text: "Correct, but there was an error updating your credits."
                });
            }
        } else {
            await message.react("❌", event);
            await sock.sendMessage(
                threadID,
                {
                    text: `❌ *Wrong!* The correct spelling was *${correctAnswer}*.`
                },
                { quoted: event }
            );
        }

        global.client.replies.delete(data.messageID);
    }
};