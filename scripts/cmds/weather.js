import axios from "axios";

export default {
    config: {
        name: "weather",
        description: "Check weather for a city.",
        category: "tools"
    },
    onRun: async function ({ sock, event, args, font }) {
        const city = args.join(" ");
        if (!city) return sock.sendMessage(event.key.remoteJid, { text: "Provide a city name." });

        try {
            const res = await axios.get(`https://api.openweathermap.org/data/2.5/weather?q=${city}&units=metric&appid=061f24e3592064101e128b477c73024c`);
            const { main, weather, name, sys } = res.data;
            const msg = `🌤️ ${font.bold("Weather in " + name + ", " + sys.country)}\n\n` +
                        `🌡️ ${font.bold("Temp:")} ${main.temp}°C\n` +
                        `💧 ${font.bold("Humidity:")} ${main.humidity}%\n` +
                        `☁️ ${font.bold("Condition:")} ${weather[0].description}`;
            await sock.sendMessage(event.key.remoteJid, { text: msg }, { quoted: event });
        } catch (e) {
            await sock.sendMessage(event.key.remoteJid, { text: "City not found." });
        }
    }
};