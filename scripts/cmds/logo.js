import axios from "axios";
import fs from "fs";
import path from "path";
import { pipeline } from "stream/promises";
import os from "os";

export default {
    config: {
        name: "logo",
        aliases: ["maker", "ephoto"],
        description: "Create various text effects and logos.",
        category: "maker",
        usage: "logo <style_name> <text> or logo <text> (for random)"
    },

    async onRun({ sock, event, args, threadID, font }) {
        if (!args.length) return sock.sendMessage(threadID, { text: "❌ Provide text for the logo." }, { quoted: event });

        const styles = {
            "3d": "flag3dtext",
            "flag": "flagtext",
            "neon": "neonglitch",
            "pixel": "pixelglitch",
            "typo": "typographytext",
            "maker": "logomaker",
            "water": "underwatertext",
            "glow": "glowingtext",
            "bpstyle": "blackpinkstyle",
            "gold": "luxurygold",
            "beach": "summerbeach",
            "gradient": "gradienttext",
            "bplogo": "blackpinklogo",
            "cloud": "effectclouds"
        };

        let style, text;
        const inputStyle = args[0].toLowerCase();

        if (styles[inputStyle]) {
            style = styles[inputStyle];
            text = args.slice(1).join(" ");
        } else {
            const styleKeys = Object.keys(styles);
            style = styles[styleKeys[Math.floor(Math.random() * styleKeys.length)]];
            text = args.join(" ");
        }

        if (!text) return sock.sendMessage(threadID, { text: "❌ Provide text after the style name." }, { quoted: event });

        try {
            const apiUrl = `https://api.vreden.my.id/api/v1/maker/ephoto/${style}?text=${encodeURIComponent(text)}`;
            const res = await axios.get(apiUrl);

            if (res.data.status && res.data.result) {
                const imageUrl = res.data.result;
                const tempFilePath = path.join(os.tmpdir(), `logo_${Date.now()}.jpg`);
                
                const response = await axios({
                    method: 'get',
                    url: imageUrl,
                    responseType: 'stream'
                });

                await pipeline(response.data, fs.createWriteStream(tempFilePath));

                await sock.sendMessage(threadID, {
                    image: { url: tempFilePath },
                    caption: `✨ ${font.bold("LOGO GENERATED")}\n📝 ${font.bold("Text:")} ${text}\n🎨 ${font.bold("Style:")} ${style}`
                }, { quoted: event });

                if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
            } else {
                throw new Error(res.data.message || "API error");
            }

        } catch (error) {
            return sock.sendMessage(threadID, { text: "❌ Error: " + error.message }, { quoted: event });
        }
    }
};