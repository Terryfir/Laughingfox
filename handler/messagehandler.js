import commandHander from "./commandHandler.js";
import handleOnReaction from "./handleOnReaction.js";
import handleOnReply from "./handleOnReply.js";
import handleOnChat from "./handleonChat.js";

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
        
        const myNumber = this.sock.user.id.split(':')[0].split('@')[0];
        const accountSettings = global.client.accountSettings?.[myNumber] || {};
        
        this.prefix = accountSettings.prefix || global.client.config.PREFIX;
        
        const isMainAccount = (myNumber === global.client.mainNumber);
        this.admins = isMainAccount 
            ? global.client.config.admins 
            : (accountSettings.admins || []);
    }

    async mainFunc({ senderID, threadID, event, message, args, bot }) {
        try {
            const cleanSender = senderID.replace("@lid", "").split(":")[0].split("@")[0];

            if (
                global.client.config.private &&
                !this.admins.includes(cleanSender) &&
                args.startsWith(this.prefix)
            ) {
                return message.send(`❌ | Only admins of this account can use the bot`);
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
                    text: `❌ | Command '${commandName}' does not exist. Type ${this.prefix}help to view all commands.`
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

    async helperFunc({ threadID, senderID, message, args, bot, event }) {
        try {
            const cleanSender = senderID.replace("@lid", "").split(":")[0].split("@")[0];

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

            await Promise.all([
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
            ]);
        } catch (error) {
            console.log(error);
        }
    }

    async handleMessage(event) {
        try {
            const threadID = event.key.remoteJid;

            let senderID =
                event.key.participant || threadID.split("@")[0] + "@lid";
            let args = "";
            const msg = event.message;
            if (!msg) return;

            args =
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
                send: async form => {
                    return await this.sock.sendMessage(threadID, {
                        text: form
                    });
                },
                reply: async form => {
                    return await this.sock.sendMessage(
                        threadID,
                        { text: form },
                        { quoted: event }
                    );
                },
                edit: async (form, data) => {
                    return await this.sock.sendMessage(threadID, {
                        text: form,
                        edit: data.key
                    });
                },
                react: async (emoji, data) => {
                    return await this.sock.sendMessage(threadID, {
                        react: { text: emoji, key: data.key }
                    });
                },
                unsend: async data => {
                    await this.sock.sendMessage(threadID, { delete: data.key });
                },
                sendGif: async (filepath, cap) => {
                    return await this.sock.sendMessage(threadID, {
                        video: {
                            url: filepath,
                            caption: cap || "",
                            gifPlayback: true
                        }
                    });
                },
                sendAudio: async (filepath, cap) => {
                    return await this.sock.sendMessage(threadID, {
                        audio: { url: filepath, caption: cap || "" }
                    });
                },
                sendVideo: async (cap, filepath, boo) => {
                    return await this.sock.sendMessage(threadID, {
                        image: { url: filepath },
                        viewOnce: boo || false,
                        caption: cap || ""
                    });
                },
                sendImage: async (cap, filepath, boo) => {
                    return await this.sock.sendMessage(threadID, {
                        image: { url: filepath },
                        viewOnce: boo || false,
                        caption: cap || ""
                    });
                }
            };

            const bot = {
                changeProfileStatus: form =>
                    this.sock.updateProfileStatus(form),
                changeProfileName: form => this.sock.updateProfileName(form),
                changeProfilePic: filepath =>
                    this.sock.updateProfilePicture(threadID, { url: filepath }),
                removeProfilePic: id => this.sock.removeProfilePicture(id),
                createGroup: (_sock, name, members) =>
                    this.sock.groupCreate(name, [members]),
                participants: (id, action) =>
                    this.sock.groupParticipantsUpdate(threadID, [id], action),
                leave: id => this.sock.groupLeave(id),
                user: (id, action) => this.sock.updateBlockStatus(id, action)
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
                    event
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