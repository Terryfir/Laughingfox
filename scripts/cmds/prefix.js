export default {
    config: {
        name: "prefix",
        version: "1.2.0",
        author: "lance",
        description:
            "Check the bot's prefix for this account (No prefix required)",
        category: "utility",
        role: 0
    },
    onRun: function () {},
    onChat: async function ({ sock, message, args }) {
        const input = args.toLowerCase().trim();
        const myNumber = sock.user.id.split(":")[0].split("@")[0];

        const settings = global.client.accountSettings[myNumber] || {};
        const currentPrefix = settings.prefix || global.client.config.PREFIX;

        if (input === "prefix") {
            return message.reply(
                `🤖 My current prefix for this account is: [ ${currentPrefix} ]\n\n💡 Use this symbol before commands to interact with me.`
            );
        }
    }
};
