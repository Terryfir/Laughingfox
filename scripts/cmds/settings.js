export default {
    config: {
        name: 'settings',
        description: 'Toggle group security features',
        role: 1,
        category: "admin",
        author: "lance",
        usage: "!settings [feature] on/off"
    },

    async onRun({ sock, event, threadID, message, getGroupData, saveTable, args, font }) {
        if (!threadID.endsWith("@g.us")) return message.reply("Group only command.");
        
        const feature = args[0]?.toLowerCase();
        const status = args[1]?.toLowerCase();
        const validFeatures = ['antilink', 'antiad', 'antispam', 'antieveryone'];

        if (!validFeatures.includes(feature)) {
            return message.reply(`Available: ${validFeatures.join(", ")}`);
        }

        try {
            // Get the group object directly
            const group = await getGroupData(threadID);
            
            if (status === 'on') {
                group.data[feature] = true;
                await message.react("🔒", event);
            } else if (status === 'off') {
                group.data[feature] = false;
                await message.react("🔓", event);
            } else {
                return message.reply("Use 'on' or 'off'.");
            }

            // Save the object back to the table
            await saveTable("groupData", [group]);
            
            await sock.sendMessage(threadID, { 
                text: `⚙️ ${font.bold("Settings Updated")}\n\nFeature: ${feature}\nStatus: ${status.toUpperCase()}` 
            });

        } catch (error) {
            await message.reply(`Error: ${error.message}`);
        }
    }
};