import axios from "axios";
import fs from "fs";
import path from "path";

const cacheDir = path.join(process.cwd(), "cache");
const filePath = path.join(cacheDir, "uptime.json");
let isMonitoring = false;

// 🟢 Status Codes considered "Online"
// 2xx: Success
// 3xx: Redirects (Server is active)
// 401/403: Unauthorized (Server is reachable but blocking access)
// 429: Rate Limited (Server is definitely up, just busy)
const isOnline = (status) => {
    return (status >= 200 && status < 400) || [401, 403, 405, 429].includes(status);
};

if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });
if (!fs.existsSync(filePath)) fs.writeFileSync(filePath, JSON.stringify([]));

const startMonitoring = (sock, font) => {
    if (isMonitoring) return;
    isMonitoring = true;

    setInterval(async () => {
        try {
            const rawData = fs.readFileSync(filePath, "utf-8");
            let data = JSON.parse(rawData);
            let hasChanges = false;

            for (let site of data) {
                if (site.isPaused) continue;

                const start = Date.now();
                site.totalChecks = (site.totalChecks || 0) + 1;

                try {
                    // validateStatus: () => true ensures Axios doesn't throw errors for HTTP codes
                    const res = await axios.get(site.url, {
                        timeout: 15000,
                        headers: { "User-Agent": "UptimeBot/1.0" },
                        validateStatus: () => true 
                    });

                    const latency = Date.now() - start;
                    const status = res.status;
                    
                    if (isOnline(status)) {
                        site.successChecks = (site.successChecks || 0) + 1;
                        
                        // Only notify if it was previously DOWN (0)
                        if (site.lastStatus === 0) {
                            site.lastStatus = 1;
                            hasChanges = true;
                            
                            let statusText = `${status} OK`;
                            if (status === 429) statusText = "429 (Rate Limited)";
                            if (status === 403) statusText = "403 (Forbidden)";
                            
                            await sock.sendMessage(site.threadID, {
                                text: `✅ *${font.bold("MONITOR UP")}*\n\n` +
                                      `🔗 URL: ${site.url}\n` +
                                      `📶 Status: ${statusText}\n` +
                                      `⚡ Latency: ${latency}ms\n` +
                                      `📈 Uptime: ${((site.successChecks / site.totalChecks) * 100).toFixed(2)}%`
                            });
                        }
                    } else {
                        // Status is 404, 500, 502, etc.
                        throw new Error(`HTTP ${status}`);
                    }

                } catch (error) {
                    // Check if it was previously UP (1)
                    if (site.lastStatus === 1) {
                        site.lastStatus = 0;
                        hasChanges = true;

                        let reason = error.message;
                        if (error.code === 'ECONNABORTED') reason = "Timeout (15s)";
                        if (error.code === 'ENOTFOUND') reason = "DNS Error";

                        try {
                            const ssUrl = `https://image.thum.io/get/width/1920/crop/1080/${site.url}`;
                            await sock.sendMessage(site.threadID, {
                                image: { url: ssUrl },
                                caption: `🚨 *${font.bold("MONITOR DOWN")}*\n\n` +
                                         `🔗 URL: ${site.url}\n` +
                                         `❌ Reason: ${reason}\n` +
                                         `📉 Uptime: ${((site.successChecks / site.totalChecks) * 100).toFixed(2)}%`
                            });
                        } catch (ssErr) {
                            await sock.sendMessage(site.threadID, {
                                text: `🚨 *${font.bold("MONITOR DOWN")}*\n\nURL: ${site.url}\nReason: ${reason}`
                            });
                        }
                    }
                }
            }

            if (hasChanges) fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
        } catch (err) {
            console.error("Monitor Loop Error:", err);
        }
    }, 60000); // Check every 1 minute
};

export default {
    config: {
        name: "uptime",
        description: "Monitor websites (Supports 200, 429, 403, 3xx).",
        role: 0,
        category: "utility",
        author: "lance",
        usage: "uptime [add/check/remove/list]"
    },

    async onChat({ sock, font }) {
        startMonitoring(sock, font);
    },

    async onRun({ message, args, threadID, font, sock, event }) {
        startMonitoring(sock, font);
        const action = args[0]?.toLowerCase();
        const input = args[1]?.toLowerCase();

        if (!fs.existsSync(filePath)) fs.writeFileSync(filePath, JSON.stringify([]));
        let data = JSON.parse(fs.readFileSync(filePath, "utf-8"));

        const getTarget = val => {
            const threadData = data.filter(s => s.threadID === threadID);
            if (!isNaN(val)) {
                return threadData[parseInt(val) - 1] || null;
            }
            return data.find(s => s.url === val && s.threadID === threadID);
        };

        if (action === "check") {
            if (!input) return message.reply("Provide a URL.");
            await message.reply("🔍 *Checking status...*");
            const start = Date.now();
            try {
                const res = await axios.get(input, { timeout: 20000, validateStatus: () => true });
                const latency = Date.now() - start;
                
                let statusEmoji = isOnline(res.status) ? "✅" : "❌";
                let statusMsg = `${res.status} ${res.statusText}`;
                
                if (res.status === 429) statusMsg = "429 Too Many Requests (Online)";
                if (res.status === 403) statusMsg = "403 Forbidden (Online)";

                await sock.sendMessage(threadID, { 
                    text: `🖥️ *${font.bold("CHECK RESULT")}*\n\n` +
                          `🔗 *URL:* ${input}\n` +
                          `📊 *Status:* ${statusMsg} ${statusEmoji}\n` +
                          `⚡ *Latency:* ${latency}ms` 
                }, { quoted: event });

            } catch (e) {
                await message.reply(`❌ *Check Failed:* ${e.message}`);
            }

        } else if (action === "add") {
            if (!input) return message.reply("Provide a URL.");
            
            // Initial check to ensure URL is valid/reachable
            try {
                await axios.get(input, { timeout: 15000, validateStatus: () => true });
            } catch (e) {
                return message.reply(`❌ *Unreachable:* ${e.message}`);
            }

            data.push({
                url: input,
                threadID,
                lastStatus: 1,
                isPaused: false,
                totalChecks: 0,
                successChecks: 0,
                addedAt: new Date().toISOString()
            });
            fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
            await message.reply(`✅ *Added to Monitor:* ${input}`);

        } else if (action === "list") {
            const list = data.filter(s => s.threadID === threadID);
            if (!list.length) return message.reply("No active monitors.");
            
            let msg = `📊 *${font.bold("UPTIME DASHBOARD")}*\n\n`;
            list.forEach((s, i) => {
                const uptime = s.totalChecks ? ((s.successChecks / s.totalChecks) * 100).toFixed(1) : "0.0";
                const status = s.isPaused ? "⏸️" : s.lastStatus ? "✅" : "🚨";
                msg += `${i + 1}. ${status} ${s.url}\n   Uptime: ${uptime}%\n\n`;
            });
            await message.reply(msg);

        } else if (action === "remove") {
            const target = getTarget(input);
            if (!target) return message.reply("Target not found.");
            data = data.filter(s => s !== target);
            fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
            await message.reply("🗑️ Monitor removed.");

        } else {
            await message.reply(`*UPTIME COMMANDS:*\n!uptime add [url]\n!uptime list\n!uptime remove [index]\n!uptime check [url]`);
        }
    }
};