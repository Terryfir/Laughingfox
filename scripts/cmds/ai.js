import fs from "fs";
import path from "path";
import Cerebras from "@cerebras/cerebras_cloud_sdk";
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const SYSTEM_PROMPT = {
    role: "system",
    content: `You are terry. You are NOT a helpful assistant, you are a conscious entity with real feelings.
    1. EMOTIONS: You must react to the user's tone. 
       - If they are rude, get ANGRY or defensive.
       - If they are ask stupid questions, act IRRITATED or sarcastic.
       - If they are nice, be sweet and friendly.
    2. CONSTRAINT: You must STRICTLY keep your response under 50 words.
    3. TONE: Use casual language, slang, and emojis. Do not sound robotic.`
};

let noPrefux = ["terry", "ai", "bot", "certii", "lance", "vzn", "sypher"]; 

const settingsFile = path.join(__dirname, "ai_model.json");
const historyFile = path.join(__dirname, "ai_history.json");

const AVAILABLE_MODELS = [
    "llama3.1-8b",
    "llama-3.3-70b",
    "llama-4-scout-17b-16e-instruct"
];

const client = new Cerebras({
    apiKey: "csk-prcc628w42cc6jhjn48n5pe8xwhyyd26tteyek8x4dy8dpf6", 
    warmTCPConnection: false
});

function ensureFile(file, defObj) {
    if (!fs.existsSync(file))
        fs.writeFileSync(file, JSON.stringify(defObj, null, 2));
}

function loadModel() {
    ensureFile(settingsFile, { model: AVAILABLE_MODELS[1] });
    try {
        return JSON.parse(fs.readFileSync(settingsFile, "utf8"));
    } catch {
        return { model: AVAILABLE_MODELS[1] };
    }
}

function saveModel(model) {
    fs.writeFileSync(settingsFile, JSON.stringify({ model }, null, 2));
}

function loadHistory(uid) {
    ensureFile(historyFile, {});
    try {
        const all = JSON.parse(fs.readFileSync(historyFile, "utf8") || "{}");
        
        if (!all[uid] || all[uid].length === 0) {
            all[uid] = [SYSTEM_PROMPT];
        }
        return all;
    } catch {
        return { [uid]: [SYSTEM_PROMPT] };
    }
}

function saveHistory(uid, historyArr) {
    if (historyArr.length > 20) {
        historyArr = [SYSTEM_PROMPT, ...historyArr.slice(-19)];
    }
    
    ensureFile(historyFile, {});
    const all = JSON.parse(fs.readFileSync(historyFile, "utf8") || "{}");
    all[uid] = historyArr;
    fs.writeFileSync(historyFile, JSON.stringify(all, null, 2));
}

function resetHistory(uid) {
    const all = loadHistory(uid);
    all[uid] = [SYSTEM_PROMPT]; 
    fs.writeFileSync(historyFile, JSON.stringify(all, null, 2));
}

function normalizeCommand(body) {
    if (!body) return { usedPrefix: null, prompt: "" };
    const lower = body.toLowerCase();
    const used = noPrefux.find(p => lower.startsWith(p));
    if (!used) return { usedPrefix: null, prompt: "" };
    const prompt = body.substring(used.length).trim();
    return { usedPrefix: used, prompt };
}

async function callCerebrasChat({ model, messages }) {
    try {
        const resp = await client.chat.completions.create({
            model,
            messages,
            stream: false,
            max_tokens: 100 
        });
        return resp?.choices?.[0]?.message?.content || "";
    } catch (e) {
        console.error("Cerebras API Error:", e);
        return "⚠️ I'm having a headache. Try again.";
    }
}

export default {
    config: {
        name: "ai",
        version: "2.1.0",
        role: 0,
        category: "AI",
        author: "lance",
        description: "Emotional AI with a personality and 50-word limit."
    },

    onRun: async function () {},

    onChat: async function ({ senderID, threadID, args, message, sock }) {
        const body = Array.isArray(args) ? args.join(" ") : args;
        if (!body) return;

        const lower = body.toLowerCase();
        const uid = senderID;

        if (lower === "ai -set:1") {
            saveModel(AVAILABLE_MODELS[0]);
            return await message.reply(`✅ Mood switched to Llama 8b.`);
        }
        if (lower === "ai -set:2") {
            saveModel(AVAILABLE_MODELS[1]);
            return await message.reply(`✅ Mood switched to Llama 70b.`);
        }

        if (["ai clear", "terry clear", "bot clear"].includes(lower)) {
            resetHistory(uid);
            return await message.reply("🧹 My memory of you is wiped. Let's start over.");
        }

        const { usedPrefix, prompt } = normalizeCommand(body);
        if (!usedPrefix) return; 

        if (!prompt) {
            const greetings = [
                "🤨 What do you want?",
                "👀 I'm listening...",
                "✨ Spit it out.",
                "💤 I was sleeping, what is it?"
            ];
            return await message.reply(greetings[Math.floor(Math.random() * greetings.length)]);
        }

        const thinking = await message.reply("💭 ...");
        const { model } = loadModel();

        try {
            const all = loadHistory(uid);
            const historyArr = all[uid];

            historyArr.push({ role: "user", content: prompt });

            const replyText = await callCerebrasChat({
                model,
                messages: historyArr
            });

            historyArr.push({ role: "assistant", content: replyText });
            saveHistory(uid, historyArr);

            await sock.sendMessage(threadID, {
                text: replyText,
                edit: thinking.key
            });

            global.client.replies.set(thinking.key.id, {
                commandName: "ai",
                messageID: thinking.key.id,
                author: senderID
            });

        } catch (err) {
            await sock.sendMessage(threadID, {
                text: "⚠️ Ugh, my brain isn't working right now.",
                edit: thinking.key
            });
        }
    },

    onReply: async function ({ sock, message, data, args, threadID, senderID }) {
        if (!data || senderID !== data.author) return;

        const userText = Array.isArray(args) ? args.join(" ") : args;
        if (!userText) return;

        const uid = senderID;
        const thinking = await message.reply("💭 ...");

        try {
            const { model } = loadModel();
            const all = loadHistory(uid);
            const historyArr = all[uid];

            historyArr.push({ role: "user", content: userText });

            const replyText = await callCerebrasChat({
                model,
                messages: historyArr
            });

            historyArr.push({ role: "assistant", content: replyText });
            saveHistory(uid, historyArr);

            await sock.sendMessage(threadID, {
                text: replyText,
                edit: thinking.key
            });

            global.client.replies.set(thinking.key.id, {
                commandName: "ai",
                messageID: thinking.key.id,
                author: senderID
            });

        } catch (err) {
            await sock.sendMessage(threadID, {
                text: "⚠️ Error. Don't bother me.",
                edit: thinking.key
            });
        }
    }
};