import axios from "axios";
import fs from "fs-extra";
import path from "path";

const SETTINGS_PATH = path.join(process.cwd(), "cache", "accountSettings.json");
const EXTRA_SESSIONS_DIR = path.join(process.cwd(), "cache", "sessions");

async function saveSettings(data) {
    await fs.writeJSON(SETTINGS_PATH, data, { spaces: 2 });
}

export default {
    config: {
        name: "manager",
        aliase: ["mng", "acc"],
        version: "1.1.0",
        author: "lance",
        countDown: 5,
        role: 3,
        description:
            "account management (Prefix, Admins, Pause, Logout)",
        category: "admin",
        guide: "{p}manager"
    },

    onRun: async function ({ sock, event, message }) {
        const myNumber = sock.user.id.split(":")[0].split("@")[0];
        const isMain = myNumber === global.client.mainNumber;

        let menu =
            `🌐 *Account Manager*\n` +
            `Current: ${myNumber} ${isMain ? "(MAIN)" : "(CHILD)"}\n\n` +
            `1. 🔗 Link New Account\n` +
            `2. ✏️ Set Account Prefix\n` +
            `3. 🛡️ Add Account Admin\n` +
            `4. 📜 List Settings & Status\n` +
            `5. ⏸️ Pause/Resume Account\n` +
            `6. 🚪 Logout Account\n\n` +
            `Reply with a number.`;

        const sent = await message.reply(menu);
        global.client.replies.set(sent.key.id, {
            commandName: "manager",
            author: event.key.participant || event.key.remoteJid,
            step: "main_menu",
            targetNum: myNumber
        });
    },

    onReply: async function ({ sock, message, data, args, senderID }) {
        if (!data || senderID !== data.author) return;
        const choice = args.trim();
        const targetNum = data.targetNum;
        const PORT = global.client.config.PORT || 8000;

        if (data.step === "main_menu") {
            if (choice === "1") {
                const m = await message.reply(
                    "📱 Enter phone number to link (with country code):"
                );
                global.client.replies.set(m.key.id, {
                    ...data,
                    step: "link_account"
                });
            } else if (choice === "2") {
                const m = await message.reply(
                    "⌨️ Enter the new prefix for this account:"
                );
                global.client.replies.set(m.key.id, {
                    ...data,
                    step: "set_prefix"
                });
            } else if (choice === "3") {
                const m = await message.reply(
                    "👤 Enter the number to add as admin for THIS account:"
                );
                global.client.replies.set(m.key.id, {
                    ...data,
                    step: "add_admin"
                });
            } else if (choice === "4") {
                const s = global.client.accountSettings[targetNum] || {};
                const isPaused = global.client.pausedAccounts.has(targetNum);
                const list =
                    `⚙️ *Status for ${targetNum}*\n` +
                    `Prefix: ${s.prefix || global.client.config.PREFIX}\n` +
                    `Status: ${isPaused ? "⏸️ Paused" : "✅ Active"}\n` +
                    `Admins: ${s.admins?.join(", ") || "None"}`;
                await message.reply(list);
            } else if (choice === "5") {
                const isPaused = global.client.pausedAccounts.has(targetNum);
                if (isPaused) {
                    global.client.pausedAccounts.delete(targetNum);
                    await message.reply(
                        `▶️ Account ${targetNum} has been Resumed.`
                    );
                } else {
                    global.client.pausedAccounts.add(targetNum);
                    await message.reply(
                        `⏸️ Account ${targetNum} has been Paused.`
                    );
                }
            } else if (choice === "6") {
                const m = await message.reply(
                    `⚠️ Are you sure you want to logout ${targetNum}?\nReply "YES" to confirm.`
                );
                global.client.replies.set(m.key.id, {
                    ...data,
                    step: "confirm_logout"
                });
            }
        } else if (data.step === "link_account") {
            const num = choice.replace(/[^0-9]/g, "");
            await message.reply(`⏳ Requesting pairing code for ${num}...`);
            try {
                const res = await axios.get(
                    `http://localhost:${PORT}/pair?number=${num}`
                );
                await message.reply(`✅ *Pairing Code:* ${res.data.code}`);
            } catch (e) {
                await message.reply("❌ Pairing failed. Check server logs.");
            }
        } else if (data.step === "set_prefix") {
            if (!global.client.accountSettings[targetNum])
                global.client.accountSettings[targetNum] = {};
            global.client.accountSettings[targetNum].prefix = choice;
            await saveSettings(global.client.accountSettings);
            await message.reply(
                `✅ Prefix for ${targetNum} updated to: ${choice}`
            );
        } else if (data.step === "add_admin") {
            const newAdmin = choice.replace(/[^0-9]/g, "");
            if (!global.client.accountSettings[targetNum])
                global.client.accountSettings[targetNum] = {};
            if (!global.client.accountSettings[targetNum].admins)
                global.client.accountSettings[targetNum].admins = [];

            if (
                !global.client.accountSettings[targetNum].admins.includes(
                    newAdmin
                )
            ) {
                global.client.accountSettings[targetNum].admins.push(newAdmin);
                await saveSettings(global.client.accountSettings);
                await message.reply(
                    `✅ ${newAdmin} added as admin for ${targetNum}`
                );
            } else {
                await message.reply("❌ User is already an admin.");
            }
        } else if (data.step === "confirm_logout") {
            if (choice.toUpperCase() === "YES") {
                await message.reply(`🚪 Logging out ${targetNum}...`);
                await sock.logout();
                // Note: The main.js connection.update listener handles file cleanup
            } else {
                await message.reply("❌ Logout cancelled.");
            }
        }
    }
};
