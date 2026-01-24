import axios from "axios";

export default {
    config: {
        name: "translate",
        aliase: ["tr"],
        description: "Translate text to any language.",
        category: "utility",
        usage: "!tr [lang] [text] or reply to a message"
    },

    onRun: async function ({ sock, event, args, message, font }) {
        const threadID = event.key.remoteJid;
        const targetLang = args[0] || "en";
        
        let textToTranslate = args.slice(1).join(" ");
        const quotedMsg = event.message?.extendedTextMessage?.contextInfo?.quotedMessage;

        if (!textToTranslate && quotedMsg) {
            textToTranslate = quotedMsg.conversation || quotedMsg.extendedTextMessage?.text;
        }

        if (!textToTranslate) return await message.reply("❌ Please provide text or reply to a message to translate.");

        try {
            const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(textToTranslate)}`;
            const res = await axios.get(url);
            const translation = res.data[0].map(item => item[0]).join("");

            const response = `🌍 ${font.bold("Translation")} (${targetLang})\n\n${translation}`;
            
            await sock.sendMessage(threadID, { text: response }, { quoted: event });

        } catch (error) {
            await message.reply("❌ Translation failed. Check if the language code is correct (e.g., en, es, fr, ar).");
        }
    }
};