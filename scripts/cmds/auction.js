export default {
  config: {
    name: 'auction',
    description: 'Start or bid in an auction',
    role: 0,
    category: "economy",
    author: "lance",
    usage: "!auction [start <item> <min_bid> | bid <amount> | end]"
  },

  async onRun({ sock, event, threadID, message, getUserData, saveTable, senderID, args }) {
    const systemID = 'AUCTION_SYSTEM';
    const subCommand = args[0]?.toLowerCase();

    try {
      const user = await getUserData(senderID);
      const auctionData = await getUserData(systemID);

      if (subCommand === 'start') {
        if (auctionData.data.active) return message.reply("An auction is already running!");
        
        const item = args[1];
        const minBid = parseInt(args[2]);

        if (!item || isNaN(minBid)) return message.reply("Usage: !auction start <item> <min_bid>");

        auctionData.data = {
          active: true,
          item: item,
          currentBid: minBid,
          highestBidder: null,
          highestBidderName: 'None',
          starter: senderID
        };

        await saveTable("userData", [auctionData]);
        return sock.sendMessage(threadID, { 
          text: `📢 *AUCTION STARTED*\n\n📦 *Item:* ${item}\n💰 *Starting Bid:* ${minBid.toLocaleString()} pts\n\n_Use !auction bid <amount> to participate!_` 
        }, { quoted: event });
      }

      if (subCommand === 'bid') {
        if (!auctionData.data.active) return message.reply("No active auction.");
        
        const bidAmount = parseInt(args[1]);
        if (isNaN(bidAmount) || bidAmount <= auctionData.data.currentBid) {
          return message.reply(`Bid must be higher than ${auctionData.data.currentBid.toLocaleString()} pts.`);
        }

        if (user.money < bidAmount) return message.reply("You don't have enough points.");

        auctionData.data.currentBid = bidAmount;
        auctionData.data.highestBidder = senderID;
        auctionData.data.highestBidderName = user.name || senderID;

        await saveTable("userData", [auctionData]);
        await message.react("🔨", event);
        return sock.sendMessage(threadID, { 
          text: `📈 *New Highest Bid!*\n👤 *Bidder:* ${auctionData.data.highestBidderName}\n💰 *Amount:* ${bidAmount.toLocaleString()} pts` 
        });
      }

      if (subCommand === 'end') {
        if (!auctionData.data.active) return message.reply("No active auction.");
        if (senderID !== auctionData.data.starter) return message.reply("Only the starter can end the auction.");

        const winnerID = auctionData.data.highestBidder;
        const finalPrice = auctionData.data.currentBid;
        const item = auctionData.data.item;

        if (!winnerID) {
          auctionData.data = { active: false };
          await saveTable("userData", [auctionData]);
          return message.reply("Auction ended with no bidders.");
        }

        const winner = await getUserData(winnerID);
        winner.money -= finalPrice;
        winner.data.inventory = winner.data.inventory || [];
        winner.data.inventory.push(item);

        auctionData.data = { active: false };

        await saveTable("userData", [winner, auctionData]);
        await message.react("🎊", event);
        return sock.sendMessage(threadID, { 
          text: `🏁 *AUCTION CLOSED*\n\n📦 *Item:* ${item}\n🥳 *Winner:* ${winner.name || winnerID}\n💰 *Final Price:* ${finalPrice.toLocaleString()} pts\n\n_The item has been added to the winners inventory!_` 
        });
      }

      if (!subCommand) {
        if (!auctionData.data.active) return message.reply("There is no active auction. Use !auction start <item> <price>");
        return sock.sendMessage(threadID, { 
          text: `🔨 *CURRENT AUCTION*\n\n📦 *Item:* ${auctionData.data.item}\n💰 *Current Bid:* ${auctionData.data.currentBid.toLocaleString()} pts\n👤 *Highest Bidder:* ${auctionData.data.highestBidderName}` 
        });
      }

    } catch (error) {
      await sock.sendMessage(threadID, { text: `Error: ${error.message}` });
    }
  }
};