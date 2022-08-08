const Crawler = require("../common/crawler");
const { web3, ContractAddress, isUSD } = require('../common/network').getConfig();
const { pairModel } = require('./model');
const { calcPrice } = require('../common/util')

const SYNC_TOPIC = '0x1c411e9a96e071241c2f21f7726b17ae89e3cab4c78be50e062b03a9fffbbad1';

class SyncModel {
    constructor() {
        this.lastPrice = {};
        this.reserves = {};
    }

    async runCrawler() {
        this.crawler = new Crawler("sync", SYNC_TOPIC, async (log) => {
            const values = web3.eth.abi.decodeParameters(['uint256', 'uint256'], log.data)
            this.onSyncLog(log.blockNumber, log.transactionIndex, log.logIndex, log.address, values[0].toString(10), values[1].toString(10));
        }, 2000);
        await this.crawler.run();
    }

    async get(token) {
        const pools = pairModel.getPools(token);
        return { pools, price: this.lastPrice[token] };
    }

    onSyncLog(block, txIdx, logIdx, pair, reserve0, reserve1) {
        reserve0 = toBN(reserve0);
        reserve1 = toBN(reserve1);
        const { token0, token1 } = pairModel.getTokens(pair);
        if (isUSD(token0)) {
            this.lastPrice[token1] = calcPrice([reserve1, reserve0]);
        } else if (isUSD(token1)) {
            this.lastPrice[token0] = calcPrice([reserve0, reserve1]);
        } else if (token0 == ContractAddress.wrappedNative) {
            this.lastPrice[token1] = calcPrice([reserve1, reserve0]) * getNativePrice();
        } else if (token1 == ContractAddress.wrappedNative) {
            this.lastPrice[token0] = calcPrice([reserve0, reserve1]) * getNativePrice();
        }
        this.reserves[pair] = [reserve0, reserve1];
    }

    getNativePrice() {
        const r = this.reserves[ContractAddress.nativePricePair];
        return r ? calcPrice(r) : 0;
    }
}

module.exports = SyncModel;