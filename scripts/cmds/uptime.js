import axios from "axios";
import fs from "fs";
import path from "path";

const cacheDir = path.join(process.cwd(), "cache");
const filePath = path.join(cacheDir, "uptime.json");

if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });
if (!fs.existsSync(filePath)) fs.writeFileSync(filePath, JSON.stringify([]));

const startMonitoring = (sock, font) => {
    if (global.uptimeMonitorStarted) return;
    global.uptimeMonitorStarted = true;

    setInterval(async () => {
        try {
            if (!fs.existsSync(filePath)) return;
            const rawData = fs.readFileSync(filePath, "utf-8");
            let data = JSON.parse(rawData);
            let hasChanges = false;

            for (let site of data) {
                if (site.isPaused) continue;

                site.totalChecks = (site.totalChecks || 0) + 1;

                try {
                    const res = await axios.get(site.url, {
                        timeout: 15000,
                        headers: { "User-Agent": "UptimeBot/1.0" }
                    });

                    if (res.status === 200) {
                        site.successChecks = (site.successChecks || 0) + 1;
                        if (site.lastStatus === 0) {
                            site.lastStatus = 1;
                            hasChanges = true;
                        }
                    }
                } catch (error) {
                    if (site.lastStatus === 1) {
                        site.lastStatus = 0;
                        hasChanges = true;

                        const ownerID = site.senderID || "0@s.whatsapp.net";
                        const ownerTag = ownerID.includes("@")
                            ? ownerID.split("@")[0]
                            : "user";

                        try {
                            const ssRes = await axios.get(
                                `https://api.ccprojectsapis-jonell.gleeze.com/api/screenshot?url=${encodeURIComponent(
                                    site.url
                                )}`
                            );
                            const ssUrl = ssRes.data.screenshotURL;

                            if (!ssUrl)
                                throw new Error(
                                    "Screenshot API returned empty"
                                );

                            const caption = `🚨 *${font.bold(
                                "MONITOR DOWN"
                            )}*\n\nAttention @${ownerTag}!\n\nYour website is currently unreachable.\nURL: ${
                                site.url
                            }\nReason: ${error.message}\nUptime Score: ${(
                                (site.successChecks / site.totalChecks) *
                                100
                            ).toFixed(2)}%`;

                            await sock.sendMessage(site.threadID, {
                                image: { url: ssUrl },
                                caption: caption,
                                mentions: [ownerID]
                            });
                        } catch (ssErr) {
                            await sock.sendMessage(site.threadID, {
                                text: `🚨 *${font.bold(
                                    "MONITOR DOWN"
                                )}*\n\n@${ownerTag}, your website is down!\nURL: ${
                                    site.url
                                }\nReason: ${error.message}`,
                                mentions: [ownerID]
                            });
                        }
                    }
                }
            }

            if (hasChanges)
                fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
        } catch (err) {
            console.error("Uptime Interval Error:", err);
        }
    }, 180000);
};

export default {
    config: {
        name: "uptime",
        description: "Professional URL monitoring",
        role: 0,
        category: "utility",
        author: "lance",
        usage: "!uptime [add/check/remove/list/pause/resume/edit]"
    },

    async onChat({ sock, font }) {
        startMonitoring(sock, font);
    },

    async onRun({ message, args, senderID, threadID, font, sock, event }) {
        startMonitoring(sock, font);

        const action = args[0]?.toLowerCase();
        const url = args[1]?.toLowerCase();

        if (!fs.existsSync(filePath))
            fs.writeFileSync(filePath, JSON.stringify([]));
        let data = JSON.parse(fs.readFileSync(filePath, "utf-8"));

        if (action === "check") {
            if (!url) return message.reply("Provide a URL to check.");
            await message.reply(
                "🔍 *Checking status and capturing live view...*"
            );

            const start = Date.now();
            try {
                const res = await axios.get(url, { timeout: 20000 });
                const latency = Date.now() - start;
                const ssRes = await axios.get(
                    `https://api.ccprojectsapis-jonell.gleeze.com/api/screenshot?url=${encodeURIComponent(
                        url
                    )}`
                );
                const ssUrl = ssRes.data.screenshotURL;

                if (!ssUrl) throw new Error("Could not generate screenshot");

                const checkMsg =
                    `🖥️ *${font.bold("SITE CHECK RESULT")}*\n\n` +
                    `*URL:* ${url}\n` +
                    `*Status:* ${res.status} OK ✅\n` +
                    `*Latency:* ${latency}ms\n` +
                    `*Owner:* @${senderID.split("@")[0]}`;

                await sock.sendMessage(
                    threadID,
                    {
                        image: { url: ssUrl },
                        caption: checkMsg,
                        mentions: [senderID]
                    },
                    { quoted: event }
                );
            } catch (e) {
                await message.reply(`❌ *Check Failed:* ${e.message}`);
            }
        } else if (action === "add") {
            if (!url) return message.reply("Provide a URL.");
            try {
                message.reply("Checking site health...");
                await axios.get(url, { timeout: 15000 });
                data.push({
                    url,
                    threadID,
                    senderID,
                    lastStatus: 1,
                    isPaused: false,
                    totalChecks: 1,
                    successChecks: 1,
                    addedAt: new Date().toISOString()
                });
                fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
                await message.reply(
                    `✅ *${font.bold(
                        "MONITOR ADDED"
                    )}*\n\nNow tracking ${url}.\nOwner: @${
                        senderID.split("@")[0]
                    }`,
                    { mentions: [senderID] }
                );
            } catch (e) {
                return message.reply(
                    `❌ *Failed:* Site is offline or invalid.`
                );
            }
        } else if (action === "list") {
            const list = data.filter(s => s.threadID === threadID);
            if (list.length === 0)
                return message.reply("No monitors found in this chat.");

            let msg = `📊 *${font.bold("UPTIME DASHBOARD")}*\n\n`;
            let mentions = [];

            list.forEach((s, i) => {
                const status = s.isPaused ? "⏸️" : s.lastStatus ? "✅" : "🚨";
                const uptimePct = (
                    (s.successChecks / s.totalChecks) *
                    100
                ).toFixed(1);
                const owner = s.senderID
                    ? `@${s.senderID.split("@")[0]}`
                    : "System";
                if (s.senderID) mentions.push(s.senderID);

                msg += `${i + 1}. ${status} ${s.url}\n`;
                msg += `Uptime: ${uptimePct}%\n`;
                msg += `Checks: ${s.totalChecks}\n`;
                msg += `Owner: ${owner}\n\n`;
            });
            await message.reply(msg, { mentions });
        } else if (["remove", "pause", "resume", "edit"].includes(action)) {
            const siteIndex = data.findIndex(
                s => s.url === url && s.threadID === threadID
            );
            if (siteIndex === -1) return message.reply("URL not found.");

            const site = data[siteIndex];
            if (site.senderID && site.senderID !== senderID) {
                return message.reply(
                    `❌ *Access Denied:* Only owner can ${action} this.`
                );
            }

            if (action === "remove") data.splice(siteIndex, 1);
            else if (action === "pause" || action === "resume")
                site.isPaused = action === "pause";
            else if (action === "edit") {
                const newUrl = args[2]?.toLowerCase();
                if (!newUrl)
                    return message.reply("Usage: !uptime edit [old] [new]");
                site.url = newUrl;
                site.lastStatus = 1;
                site.totalChecks = 0;
                site.successChecks = 0;
            }
            fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
            await message.reply(`✨ Action ${action} completed.`);
        } else {
            await message.reply(
                `*${font.bold(
                    "UPTIME MANAGER"
                )}*\n\n!uptime add [url]\n!uptime check [url]\n!uptime list\n!uptime remove [url]\n!uptime pause/resume [url]\n!uptime edit [old] [new]`
            );
        }
    }
};