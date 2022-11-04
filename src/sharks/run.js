require('dotenv').config({ path: '/Users/vng/Desktop/coinmap/avachain/.env' });
// require('dotenv').config({ path: '/home/bakaking/bscchain/.env' });
require('../common/network').useBSC();

const Storage = require('./storage');
const { getTopHolders, getTopTokens, getTokenTransfers } = require('./bscscan');
const { getPriceHistory } = require('./bitquery');
const { toBN } = require('../common/util');

async function run() {
    const storage = new Storage('20221104');

    // Crawl token+holder
    const topTokens = await getTopTokens();
    storage.writeTopTokens(topTokens)
    for (let token of topTokens) {
        console.log(`Crawl holders ${token.address}`);
        const topHolders = await getTopHolders(token.address);
        storage.writeTopHolders(token.address, topHolders);
    }

    // Crawl top 50 holders' transfer
    // const topTokens = await storage.loadTopTokens()
    // for (let i = 0; i < 200; i++) {
    //     const token = topTokens[i];
    //     const topHolders = await storage.loadTopHolders(token.address);
    //     let holderCount = 0;
    //     console.log(`Crawl ${token.address}, ${new Date()}`);
    //     for (let holder of topHolders) {
    //         if (holderCount > 50) break;
    //         if (holder.isContract == "true" || holder.name != holder.address) continue;
    //         if (storage.hasTokenTransfers(holder.address)) continue;
    //         console.log(`Crawl transfers ${holder.address}`);
    //         const transfers = await getTokenTransfers(holder.address);
    //         storage.writeTokenTransfers(holder.address, transfers);
    //         holderCount++;
    //     }
    // }

    // const countTransfer = (transfers) => {
    //     const currentBN = 21994385;
    //     const dayBN = currentBN - 28800;
    //     const weekBN = currentBN - 28800 * 7;
    //     const monthBN = currentBN - 28800 * 30;
    //     const count = { D: 0, W: 0, M: 0 };
    //     transfers.forEach(t => {
    //         const bn = parseInt(t.blockNumber);
    //         if (bn > dayBN) count.D++;
    //         if (bn > weekBN) count.W++;
    //         if (bn > monthBN) count.M++;
    //     });
    //     return count;
    // }

    // const BUSD = '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56';
    // const token = '0x2170ed0880ac9a755fd29b2688956bd959f933f8';
    // const priceHistory = await getPriceHistory(token, BUSD);
    // const getPrice = (block) => {
    //     let p;
    //     for (p of priceHistory) if (p.block < block) return p.price;
    //     return p.price;
    // }

    // const TEN18 = toBN(10).pow(toBN(18));
    // const getPNL = (holder, balance, transfers) => {
    //     let vin = toBN(0);
    //     let vout = toBN(0);
    //     for (let transfer of transfers) {
    //         if (transfer.contractAddress != token) continue;
    //         const value = toBN(transfer.value);
    //         const price = toBN(Math.round(1000000 * getPrice(parseInt(transfer.blockNumber))));
    //         const v = value.mul(price).div(TEN18).divn(1000000);
    //         if (transfer.from == holder) vout = vout.add(v)
    //         else if (transfer.to == holder) vin = vin.add(v)
    //     }
    //     const price = toBN(Math.round(1000000 * priceHistory[0].price));
    //     const hold = toBN(Math.round(balance)).mul(price).divn(1000000);
    //     return parseInt(vout.add(hold).muln(1000).div(vin)) / 1000;
    // }

    // const topHolders = await storage.loadTopHolders(token);
    // let holderCount = 0;
    // for (let holder of topHolders) {
    //     if (holderCount > 20) break;
    //     if (!storage.hasTokenTransfers(holder.address)) continue;
    //     const transfers = await storage.loadTokenTransfers(holder.address);
    //     const count = countTransfer(transfers);
    //     const pnl = getPNL(holder.address, holder.quantity, transfers);
    //     console.log('Sumary', holder.address, holder.quantity, count, pnl)
    // }
}

run();