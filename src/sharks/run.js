// require('dotenv').config({ path: '/Users/vng/Desktop/coinmap/avachain/.env' });
require('dotenv').config({ path: '/home/bakaking/bscchain/.env' });
require('../common/network').useBSC();

const Storage = require('./storage');
const { getTopHolders, getTopTokens, getTokenTransfers } = require('./bscscan');

async function run() {
    const storage = new Storage('20221007');

    // Crawl token+holder
    // const topTokens = await getTopTokens();
    // storage.writeTopTokens(topTokens)
    // for (let token of topTokens) {
    //     console.log(`Crawl holders ${token.address}`);
    //     const topHolders = await getTopHolders(token.address);
    //     storage.writeTopHolders(token.address, topHolders);
    // }

    const topTokens = await storage.loadTopTokens()
    for (let i = 0; i < 200; i++) {
        const token = topTokens[i];
        const topHolders = await storage.loadTopHolders(token.address);
        let holderCount = 0;
        console.log(`Crawl ${token.address}, ${new Date()}`);
        for (let holder of topHolders) {
            if (holderCount > 50) break;
            if (holder.isContract == "true" || holder.name != holder.address) continue;
            if (storage.hasTokenTransfers(holder.address)) continue;
            console.log(`Crawl transfers ${holder.address}`);
            const transfers = await getTokenTransfers(holder.address);
            storage.writeTokenTransfers(holder.address, transfers);
            holderCount++;
        }
    }
}

run();