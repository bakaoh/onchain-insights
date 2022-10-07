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
    for (let token of topTokens) {
        const topHolders = await storage.loadTopHolders(token.address);
        for (let holder of topHolders) {
            if (holder.isContract == "true" || holder.name != holder.address) continue;
            if (storage.hasTokenTransfers(holder.address)) continue;
            console.log(`Crawl transfers ${holder.address}`);
            const transfers = await getTokenTransfers(holder.address);
            storage.writeTokenTransfers(holder.address, transfers);
        }
    }
}

run();