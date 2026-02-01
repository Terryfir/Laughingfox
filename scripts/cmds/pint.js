import axios from "axios";
import fs from "fs";
import path from "path";
import { pipeline } from "stream/promises";
import os from "os";

export default {
    config: {
        name: "pint",
        aliase: ["pinterest"],
        description: "Search and download Pinterest images.",
        category: "media",
        usage: "pint <query> -<number>"
    },

    async onRun({ sock, event, args, threadID, font }) {
        if (!args.length) return sock.sendMessage(threadID, { text: "❌ Provide a search query." }, { quoted: event });

        let count = 1;
        let queryArgs = [...args];
        const lastArg = queryArgs[queryArgs.length - 1];

        if (lastArg.startsWith("-")) {
            const num = parseInt(lastArg.replace("-", ""));
            if (!isNaN(num)) {
                count = Math.min(Math.max(num, 1), 10);
                queryArgs.pop();
            }
        }

        const query = queryArgs.join(" ");

        try {
            const res = await axios.get(`https://api.vreden.my.id/api/v1/search/pinterest?query=${encodeURIComponent(query)}`);
            const imageUrls = res.data.result.search_data;

            if (!imageUrls || imageUrls.length === 0) {
                return sock.sendMessage(threadID, { text: "❌ No images found." }, { quoted: event });
            }

            const selection = imageUrls.slice(0, count);

            for (let i = 0; i < selection.length; i++) {
                const tempFilePath = path.join(os.tmpdir(), `pint_${Date.now()}_${i}.jpg`);
                
                const response = await axios({
                    method: 'get',
                    url: selection[i],
                    responseType: 'stream'
                });

                await pipeline(response.data, fs.createWriteStream(tempFilePath));

                await sock.sendMessage(threadID, {
                    image: { url: tempFilePath },
                    caption: `📌 ${font.bold(query.toUpperCase())} (${i + 1}/${selection.length})`
                }, { quoted: event });

                if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
            }

        } catch (error) {
            return sock.sendMessage(threadID, { text: "❌ Error: " + error.message }, { quoted: event });
        }
    }
};