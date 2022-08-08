const Crawler = require("../common/crawler");
const { web3, ContractAddress, isUSD } = require('../common/network').getConfig();
const { pairModel } = require('./model');
const { calcPrice, toBN, ZERO } = require('../common/util')

const SYNC_TOPIC = '0x1c411e9a96e071241c2f21f7726b17ae89e3cab4c78be50e062b03a9fffbbad1';

class SyncModel {
    constructor() {
        this.price = {};
        this.volume = {};
        this.tx = {};
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
        const liquidity = ZERO;
        for (let pair in pools) {
            if (!this.reserves[pair]) continue;
            if (pools[pair].token0 == token) liquidity = liquidity.add(this.reserves[pair][0]);
            else if (pools[pair].token1 == token) liquidity = liquidity.add(this.reserves[pair][1]);
        }
        return {
            tx: this.tx[token],
            volume: this.volume[token].toString(),
            liquidity: liquidity.toString(),
            price: this.price[token]
        };
    }

    onSyncLog(block, txIdx, logIdx, pair, reserve0, reserve1) {
        if (reserve0 == '0' || reserve1 == '0') return;
        const tokens = pairModel.getTokens(pair);
        if (!tokens) return;

        const { token0, token1 } = tokens;
        reserve0 = toBN(reserve0);
        reserve1 = toBN(reserve1);

        // price
        if (isUSD(token0)) {
            this.price[token1] = calcPrice([reserve1, reserve0]);
        } else if (isUSD(token1)) {
            this.price[token0] = calcPrice([reserve0, reserve1]);
        } else if (token0 == ContractAddress.wrappedNative) {
            this.price[token1] = calcPrice([reserve1, reserve0]) * this.getNativePrice();
        } else if (token1 == ContractAddress.wrappedNative) {
            this.price[token0] = calcPrice([reserve0, reserve1]) * this.getNativePrice();
        }

        // volume
        if (this.reserves[pair]) {
            if (!this.volume[token0]) this.volume[token0] = ZERO;
            this.volume[token0] = this.volume[token0].add(this.reserves[pair][0].sub(reserve0).abs());
            if (!this.volume[token1]) this.volume[token1] = ZERO;
            this.volume[token1] = this.volume[token1].add(this.reserves[pair][1].sub(reserve1).abs());
        }

        // tx
        this.tx[token0] = (this.tx[token0] || 0) + 1;
        this.tx[token1] = (this.tx[token1] || 0) + 1;

        this.reserves[pair] = [reserve0, reserve1];
    }

    getNativePrice() {
        const r = this.reserves[ContractAddress.nativePricePair];
        return r ? calcPrice(r) : 0;
    }
}

module.exports = SyncModel;