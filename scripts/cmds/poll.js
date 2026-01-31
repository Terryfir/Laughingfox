export default {
    config: {
        name: "poll",
        description: "Create a group poll.",
        category: "group"
    },
    onRun: async function ({ sock, event, args, threadID }) {
        const query = args.join(" ").split("|");
        const question = query[0];
        const options = query.slice(1);

        if (!question || options.length < 2) return sock.sendMessage(threadID, { text: "Usage: .poll Question|Option1|Option2" });

        await sock.sendMessage(threadID, {
            poll: {
                name: question,
                values: options,
                selectableCount: 1
            }
        });
    }
};