const Partitioner = require('../common/partitioner');
const Crawler = require("../common/crawler");
const { web3, ContractAddress, isUSD } = require('../common/network').getConfig();
const { pairModel, tokenModel } = require('./model');
const { calcPrice, toBN, ZERO, getLastFiles, getNumber } = require('../common/util')

const SYNC_TOPIC = '0x1c411e9a96e071241c2f21f7726b17ae89e3cab4c78be50e062b03a9fffbbad1';
const DATA_FOLDER = 'db/sync';

class SyncModel {
    constructor() {
        this.partitioner = new Partitioner(DATA_FOLDER);

        this.price = {};
        this.volume = {};
        this.tx = {};
        this.reserves = {};

        this.lastDailySnapshot = 0;
        this.lastHourlySnapshot = 0;
        this.dailyPrice = {};
        this.lastHourPrice = {};

        this.tokenToFetch = new Set();
    }

    async runCrawler() {
        this.crawler = new Crawler("sync", SYNC_TOPIC, async (log) => {
            const values = web3.eth.abi.decodeParameters(['uint256', 'uint256'], log.data)
            await this.onSyncLog(log.blockNumber, log.transactionIndex, log.logIndex, log.address, values[0].toString(10), values[1].toString(10));
        }, 2000);
        await this.crawler.run();
    }

    async warmup() {
        const startMs = Date.now();
        const lastFiles = getLastFiles(`${DATA_FOLDER}/all`).slice(0, 3);
        for (let i = lastFiles.length - 1; i >= 0; i--) {
            const idx = parseInt(lastFiles[i]);
            await this.partitioner.loadLog('all', idx, ([block, , , pair, token0, token1, reserve0, reserve1]) => {
                this.processEvent(block, pair, token0, token1, reserve0, reserve1);
            });
        }
        console.log(`SyncModel warmup (${Date.now() - startMs}ms)`);
    }

    async onSyncLog(block, txIdx, logIdx, pair, reserve0, reserve1) {
        if (reserve0 == '0' || reserve1 == '0') return;
        const tokens = pairModel.getTokens(pair);
        if (!tokens) return;
        const { token0, token1 } = tokens;
        const idx = Math.floor(block / Partitioner.BPF);
        this.partitioner.getWriter('all', idx).write(`${block},${txIdx},${logIdx},${pair},${token0},${token1},${reserve0},${reserve1}\n`);
        this.processEvent(block, pair, token0, token1, reserve0, reserve1);
        this.tokenToFetch.add(token0);
        this.tokenToFetch.add(token1);
        if (this.tokenToFetch.size > 50) {
            await tokenModel.fetchTokens(Array.from(this.tokenToFetch)).catch(console.log);
            this.tokenToFetch.clear();
        }
    }

    processEvent(block, pair, token0, token1, reserve0, reserve1) {
        if (block % 28800 == 0) this.dailySnapshot(block);
        if (block % 1200 == 0) this.hourlySnapshot(block);
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

    dailySnapshot(block) {
        if (this.lastDailySnapshot == block) return;
        this.lastDailySnapshot = block;
        this.dailyPrice[(block / 28800) % 7] = { ...this.price };
        this.volume = {};
        this.tx = {};
    }

    hourlySnapshot(block) {
        if (this.lastHourlySnapshot == block) return;
        this.lastHourlySnapshot = block;
        this.lastHourPrice = { ...this.price };
    }

    getNativePrice() {
        const r = this.reserves[ContractAddress.nativePricePair];
        return r ? calcPrice(r) : 0;
    }

    async getTokenInfo(token) {
        const metadata = tokenModel.getToken(token);
        const pools = pairModel.getPools(token);
        let liquidity = ZERO;
        for (let pair in pools) {
            if (!this.reserves[pair]) continue;
            if (pools[pair].token0 == token) liquidity = liquidity.add(this.reserves[pair][0]);
            else if (pools[pair].token1 == token) liquidity = liquidity.add(this.reserves[pair][1]);
        }
        const p = this.price[token];
        const p1h = this.lastHourPrice[token];
        const lastIdx = (this.lastDailySnapshot / 28800) % 7;
        const p24h = this.dailyPrice[lastIdx][token];
        const p7d = this.dailyPrice[(lastIdx + 1) % 7][token];
        return {
            tx: this.tx[token],
            vol: getNumber(this.volume[token].toString()) * this.price[token],
            lp: getNumber(liquidity.toString()) * this.price[token],
            price: p,
            '1h': ((p - p1h) * 100) / p,
            '24h': ((p - p24h) * 100) / p,
            '7d': ((p - p7d) * 100) / p,
            ...metadata
        };
    }
}

module.exports = SyncModel;