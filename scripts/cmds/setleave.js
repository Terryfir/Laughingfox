export default {
    config: {
        name: 'setleave',
        description: 'Set a custom leave/goodbye message for this group',
        role: 1,
        category: 'admin',
        author: 'lance',
        usage: '!setleave <message>'
    },

    async onRun({ sock, event, threadID, message, getGroupData, saveTable, args, font }) {
        if (!threadID.endsWith("@g.us")) return message.reply("This is a group-only command.");
        
        const leaveText = args.join(" ");
        if (!leaveText) return message.reply("Please provide a message. Use {name} for the user and {group} for the group name.");

        try {
            let group = await getGroupData(threadID);
            group = group[0] || { id: threadID, name: "New Group", banned: 0, data: {} };
            
            if (typeof group.data === 'string') group.data = JSON.parse(group.data);
            group.data.leaveMessage = leaveText;

            await saveTable("groupData", [group]);
            await message.react("✅", event);
            await sock.sendMessage(threadID, { 
                text: `✅ ${font.bold("Leave Message Set")}\n\nPreview: ${leaveText.replace('{name}', '@user').replace('{group}', 'Group Name')}` 
            });

        } catch (error) {
            await message.reply(`Error: ${error.message}`);
        }
    }
};