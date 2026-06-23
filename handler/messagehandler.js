import commandHander from "./commandHandler.js";
import handleOnReaction from "./handleOnReaction.js";
import handleOnReply from "./handleOnReply.js";
import handleOnChat from "./handleonChat.js";
import handleOnMention from "./handleOnMention.js";

import {
    handleDatabase,
    setgroupBanned,
    setuserBanned
} from "./handleDatabase.js";

import db, {
    getGroupData,
    getTable,
    getUserData,
    saveTable,
    dataCache
} from "../utils/data.js";

class MessageHandler {
    constructor({ font, sock, log, proto }) {
        this.font = font;
        this.sock = sock;
        this.log = log;
        this.proto = proto;

        const myNumber = this.sock.user.id.split(":")[0].split("@")[0];
        const accountSettings = global.client.accountSettings?.[myNumber] || {};

        this.prefix = accountSettings.prefix || global.client.config.PREFIX;

        const isMainAccount = myNumber === global.client.mainNumber;
        this.admins = isMainAccount
            ? global.client.config.admins
            : accountSettings.admins || [];
    }

    async mainFunc({ senderID, threadID, event, message, args, bot }) {
        try {
            const cleanSender = senderID
                .replace("@lid", "")
                .split(":")[0]
                .split("@")[0];

            if (
                global.client.config.private &&
                !this.admins.includes(cleanSender) &&
                args.startsWith(this.prefix)
            ) {
                return message.send(
                    `❌ | Only admins of this account can use the bot`
                );
            }

            if (!args.startsWith(this.prefix)) return;

            if (
                (await db.isUserBanned(senderID)) &&
                !this.admins.includes(cleanSender)
            )
                return;

            if (
                (await db.isGroupBanned(threadID)) &&
                !this.admins.includes(cleanSender)
            ) {
                return message.send("❌ | This group is banned");
            }

            const [commandName, ...commandArgs] = args
                .slice(this.prefix.length)
                .trim()
                .split(" ");

            const cmd =
                global.client.commands.get(commandName.toLowerCase()) ||
                global.client.aliases.get(commandName.toLowerCase());

            if (!cmd) {
                await this.sock.sendMessage(threadID, {
                    text: `❌ | Command '${commandName}' does not exist.`
                });
                return;
            }

            await commandHander({
                sock: this.sock,
                event,
                threadID,
                senderID,
                args: commandArgs,
                log: this.log,
                commandName,
                font: this.font,
                message,
                bot,
                proto: this.proto,
                dataCache,
                saveTable,
                getTable,
                getUserData,
                getGroupData,
                setgroupBanned,
                setuserBanned,
                admins: this.admins,
                prefix: this.prefix
            });
        } catch (error) {
            console.log(error);
        }
    }

    async helperFunc({
        threadID,
        senderID,
        message,
        args,
        bot,
        event,
        isMentioned
    }) {
        try {
            const cleanSender = senderID
                .replace("@lid", "")
                .split(":")[0]
                .split("@")[0];
            if (
                global.client.config.private &&
                !this.admins.includes(cleanSender)
            )
                return;
            if (
                (await db.isUserBanned(senderID)) &&
                !this.admins.includes(cleanSender)
            )
                return;

            const tasks = [
                handleDatabase({ threadID, senderID, sock: this.sock, event }),
                handleOnReply({
                    sock: this.sock,
                    event,
                    threadID,
                    senderID,
                    proto: this.proto,
                    font: this.font,
                    bot,
                    message,
                    args,
                    dataCache,
                    saveTable,
                    getTable,
                    getUserData,
                    getGroupData,
                    setuserBanned,
                    setgroupBanned,
                    admins: this.admins
                }),
                handleOnReaction({
                    sock: this.sock,
                    event,
                    threadID,
                    senderID,
                    proto: this.proto,
                    font: this.font,
                    bot,
                    message,
                    dataCache,
                    saveTable,
                    getTable,
                    getUserData,
                    getGroupData,
                    admins: this.admins
                }),
                handleOnChat({
                    sock: this.sock,
                    event,
                    threadID,
                    senderID,
                    proto: this.proto,
                    font: this.font,
                    bot,
                    message,
                    args,
                    dataCache,
                    saveTable,
                    getTable,
                    getUserData,
                    getGroupData,
                    setuserBanned,
                    setgroupBanned,
                    admins: this.admins
                })
            ];

            if (isMentioned) {
                tasks.push(
                    handleOnMention({
                        sock: this.sock,
                        event,
                        threadID,
                        senderID,
                        proto: this.proto,
                        font: this.font,
                        bot,
                        message,
                        args,
                        dataCache,
                        saveTable,
                        getTable,
                        getUserData,
                        getGroupData,
                        setuserBanned,
                        setgroupBanned,
                        admins: this.admins
                    })
                );
            }

            await Promise.all(tasks);
        } catch (error) {
            console.log(error);
        }
    }

    async handleMessage(event) {
        try {
            const threadID = event.key.remoteJid;
            const myId = this.sock.user.id.split(":")[0] + "@s.whatsapp.net";
            const myLid = this.sock.user.lid.split(":")[0] + "@lid";
            const myNumber = this.sock.user.id.split(":")[0];

            let senderID =
                event.key.participant || threadID.split("@")[0] + "@lid";
            const msg = event.message;
            if (!msg) return;

            const existing = global.client.replies.get(event.key.id) || {};
            global.client.replies.set(event.key.id, {
                ...existing,
                owner: myNumber
            });

            const ex = global.client.reactions.get(event.key.id) || {};
            global.client.reactions.set(event.key.id, {
                ...ex,
                owner: myNumber
            });

            const mentions =
                msg.extendedTextMessage?.contextInfo?.mentionedJid;
            const isMentioned = mentions !== null ? mentions?.includes(myLid) : false;

            const args =
                msg.conversation ||
                msg.extendedTextMessage?.text ||
                msg.imageMessage?.caption ||
                msg.videoMessage?.caption ||
                "";

            if (
                global.client.config.whitelist.status &&
                !global.client.config.whitelist.ids.includes(
                    senderID.split("@")[0]
                )
            )
                return;

            const message = {
                send: async form =>
                    await this.sock.sendMessage(threadID, { text: form }),
                reply: async form =>
                    await this.sock.sendMessage(
                        threadID,
                        { text: form },
                        { quoted: event }
                    ),
                edit: async (form, data) =>
                    await this.sock.sendMessage(threadID, {
                        text: form,
                        edit: data.key
                    }),
                react: async (emoji, data) =>
                    await this.sock.sendMessage(threadID, {
                        react: { text: emoji, key: data.key }
                    }),
                unsend: async data =>
                    await this.sock.sendMessage(threadID, { delete: data.key })
            };

            const bot = {
                user: (id, action) => this.sock.updateBlockStatus(id, action),
                leave: id => this.sock.groupLeave(id)
            };

            await Promise.all([
                this.mainFunc({
                    senderID,
                    threadID,
                    event,
                    message,
                    args,
                    bot
                }),
                this.helperFunc({
                    threadID,
                    senderID,
                    message,
                    args,
                    bot,
                    event,
                    isMentioned
                })
            ]);
        } catch (e) {
            console.log(e);
        }
    }
}

export default async ({ font, sock, event, log, proto }) => {
    const messageHandler = new MessageHandler({ font, sock, log, proto });
    await messageHandler.handleMessage(event);
};
