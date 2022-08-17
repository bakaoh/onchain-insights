const LineByLine = require('line-by-line');
const Partitioner = require('../common/partitioner');
const Crawler = require("../common/crawler");
const axios = require("axios");
const { web3, ContractAddress, isUSD } = require('../common/network').getConfig();
const { pairModel, tokenModel } = require('./model');
const { calcPrice, toBN, ZERO, getLastFiles, getNumber } = require('../common/util')

const SYNC_TOPIC = '0x1c411e9a96e071241c2f21f7726b17ae89e3cab4c78be50e062b03a9fffbbad1';
const DATA_FOLDER = 'db/sync';

const MIN_RESERVE = toBN("1000000000000000000");
const isValidPair = (token, reserve) => {
    return (isUSD(token) || token == ContractAddress.wrappedNative) && reserve.gt(MIN_RESERVE);
}

class SyncModel {
    constructor() {
        this.partitioner = new Partitioner(DATA_FOLDER);

        this.price = {};
        this.volume = {};
        this.tx = {};
        this.reserves = {};
        this.holder = {};
        this.sellTx = {};

        this.lastDailySnapshotTs = 0;
        this.lastDailySnapshot = 0;
        this.dailyPrice = {};
        this.dailyVolume = {};
        this.dailyTx = {};

        this.lastHourlySnapshot = 0;
        this.lastHourPrice = {};
        this.hourlyVolume = {};
        this.hourlyTx = {};
        this.volume1h = {};
        this.tx1h = {};

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
        await this.loadHolders();
        const startMs = Date.now();
        const lastFiles = getLastFiles(`${DATA_FOLDER}/all`).slice(0, 3);
        for (let i = lastFiles.length - 1; i >= 0; i--) {
            const idx = parseInt(lastFiles[i]);
            await this.partitioner.loadLog('all', idx, ([block, , , pair, token0, token1, reserve0, reserve1]) => {
                this.processEvent(block, pair, token0, token1, reserve0, reserve1, true);
            });
        }
        console.log(`SyncModel warmup (${Date.now() - startMs}ms)`);
    }

    loadHolders() {
        const lr = new LineByLine('db/holder.log');
        lr.on('line', (line) => {
            const [address, num] = line.split(',');
            this.holder[address] = parseInt(num);
        });
        return new Promise((res, rej) => lr.on('end', () => res()).on('error', err => rej(err)));
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

    botcheck(token) {
        if (isUSD(token)) return;
        if (token == ContractAddress.wrappedNative) return;
        const lp = this.getLP(token);
        const holder = this.holder[token] || 0;
        const volume = this.getVol(token);
        const dailyVolume = [];
        const hourlyVolume = [(getNumber((this.volume1h[token] || '0').toString()) * this.price[token])];
        const price = this.price[token];
        const price1h = this.lastHourPrice[token];
        const dailyPrice = [];
        const tx = this.tx[token];
        const hourlyTx = [(this.tx1h[token] || 0)];
        const sellTx = this.sellTx[token];
        const dailyTx = []
        const firstPool = this.getFirstPool(token);
        const dailyIdx = this.lastDailyIdx();
        for (let i = 0; i < 7; i++) {
            dailyVolume.push(getNumber((this.dailyVolume[(dailyIdx + i) % 7][token] || '0').toString()) * this.price[token])
            dailyPrice.push(this.dailyPrice[(dailyIdx + i) % 7][token] || price);
            dailyTx.push(this.dailyTx[(dailyIdx + i) % 7][token] || 0);
        }
        const houryIdx = this.lastHourlyIdx();
        for (let i = 0; i < 48; i++) {
            hourlyVolume.push(getNumber((this.hourlyVolume[(houryIdx + i) % 48][token] || '0').toString()) * this.price[token])
            hourlyTx.push(this.hourlyTx[(houryIdx + i) % 48][token] || 0);
        }
        axios.post("http://localhost:9615/bot/check", { token, lp, holder, volume, dailyVolume, hourlyVolume, price, price1h, dailyPrice, tx, dailyTx, hourlyTx, sellTx, firstPool }).catch(err => { });
    }

    processEvent(block, pair, token0, token1, reserve0, reserve1, isWarmingUp = false) {
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
            if (!this.volume[token1]) this.volume[token1] = ZERO;
            if (!this.volume1h[token0]) this.volume1h[token0] = ZERO;
            if (!this.volume1h[token1]) this.volume1h[token1] = ZERO;
            const v0 = this.reserves[pair][0].sub(reserve0);
            const v1 = this.reserves[pair][1].sub(reserve1);
            if (v0.mul(v1).lt(ZERO)) { // trade tx
                this.volume[token0] = this.volume[token0].add(v0.abs());
                this.volume[token1] = this.volume[token1].add(v1.abs());
                this.volume1h[token0] = this.volume1h[token0].add(v0.abs());
                this.volume1h[token1] = this.volume1h[token1].add(v1.abs());
                if (v0.gt(ZERO)) { // sell 0 buy 1
                    this.sellTx[token0] = (this.sellTx[token0] || 0) + 1;
                } else { // sell 1 buy 0
                    this.sellTx[token1] = (this.sellTx[token1] || 0) + 1;
                }
            } else { } // lp tx
        }

        // tx
        this.tx[token0] = (this.tx[token0] || 0) + 1;
        this.tx[token1] = (this.tx[token1] || 0) + 1;
        this.tx1h[token0] = (this.tx1h[token0] || 0) + 1;
        this.tx1h[token1] = (this.tx1h[token1] || 0) + 1;

        this.reserves[pair] = [reserve0, reserve1];

        // run bot check
        if (!isWarmingUp) {
            this.botcheck(token0);
            this.botcheck(token1);
        }
    }

    lastDailyIdx() {
        return (this.lastDailySnapshot / 28800) % 7;
    }

    lastHourlyIdx() {
        return (this.lastHourlySnapshot / 1200) % 48;
    }

    dailySnapshot(block) {
        if (this.lastDailySnapshot == block) return;
        this.lastDailySnapshotTs = Date.now();
        this.lastDailySnapshot = block;
        const lastIdx = this.lastDailyIdx();
        this.dailyPrice[lastIdx] = { ...this.price };
        this.dailyVolume[lastIdx] = this.volume;
        this.dailyTx[lastIdx] = this.tx;
        this.volume = {};
        this.tx = {};
    }

    hourlySnapshot(block) {
        if (this.lastHourlySnapshot == block) return;
        this.lastHourlySnapshot = block;
        this.lastHourPrice = { ...this.price };
        const lastIdx = this.lastHourlyIdx();
        this.hourlyVolume[lastIdx] = this.volume1h;
        this.hourlyTx[lastIdx] = this.tx1h;
        this.volume1h = {};
        this.tx1h = {};
    }

    getNativePrice() {
        const r = this.reserves[ContractAddress.nativePricePair];
        return r ? calcPrice(r) : 0;
    }

    getLP(token) {
        const pools = pairModel.getPools(token);
        let liquidity = ZERO;
        for (let pair in pools) {
            if (!this.reserves[pair]) continue;
            if (pools[pair].token0 == token && isValidPair(pools[pair].token1, this.reserves[pair][1])) liquidity = liquidity.add(this.reserves[pair][0]);
            else if (pools[pair].token1 == token && isValidPair(pools[pair].token0, this.reserves[pair][0])) liquidity = liquidity.add(this.reserves[pair][1]);
        }
        return getNumber(liquidity.toString()) * this.price[token];
    }

    getVol(token) {
        return getNumber((this.volume[token] || '0').toString()) * this.price[token];
    }

    getFirstPool(token) {
        return this.lastDailySnapshotTs - (this.lastDailySnapshot - pairModel.firstPool[token]) * 3000;
    }

    getOrderByFunc(orderBy) {
        const lastIdx = this.lastDailyIdx();
        switch (orderBy) {
            case "lp": return (token) => this.getLP(token);
            case "vol": return (token) => this.getVol(token);
            case "tx": return (token) => this.tx[token] || 0;
            case "holder": return (token) => this.holder[token] || 0;
            case "1h": return (token) => this.lastHourPrice[token] ? (this.price[token] - this.lastHourPrice[token]) * 100 / this.price[token] : 0;
            case "24h": return (token) => this.dailyPrice[lastIdx][token] ? (this.price[token] - this.dailyPrice[lastIdx][token]) * 100 / this.price[token] : 0;
            case "7d": return (token) => this.dailyPrice[(lastIdx + 1) % 7][token] ? (this.price[token] - this.dailyPrice[(lastIdx + 1) % 7][token]) * 100 / this.price[token] : 0;
        }
    }

    async getTopToken(orderBy) {
        const orderByFunc = this.getOrderByFunc(orderBy);
        let all = [];
        for (let token in this.price) {
            if (this.price[token] == 0) continue;
            if (this.getLP(token) < 1000) continue;
            const value = orderByFunc(token);
            if (value) all.push([token, value]);
        }
        const top = all.sort((a, b) => (a[1] > b[1]) ? -1 : 1).slice(0, 200);
        const rs = [];
        for (let i of top) {
            const token = i[0];
            if (!this.holder[token]) {
                const holders = (await axios.get(`http://10.148.0.39:9612/api/v1/holder/${token}`)).data;
                this.holder[token] = holders.length > 0 ? holders.reverse()[0].num : (await axios.get(`http://10.148.0.34:9613/api/v1/buyholder/${token}`)).data.buyHolder;
            }
            if (this.holder[token]) rs.push(this.getTokenInfo(token));
            if (rs.length >= 100) break;
        }
        return rs;
    }

    getTokenInfo(token) {
        const metadata = tokenModel.getToken(token);
        const p = this.price[token];
        const p1h = this.lastHourPrice[token] || p;
        const lastIdx = this.lastDailyIdx();
        const p24h = this.dailyPrice[lastIdx][token] || p;
        const p7d = this.dailyPrice[(lastIdx + 1) % 7][token] || p;
        const lp = this.getLP(token);
        const recently = lp > 49900 && (this.lastDailySnapshot - pairModel.firstPool[token] < 7 * 28800)
            ? new Date(this.getFirstPool(token))
            : "N/A";
        return {
            tx: this.tx[token] || 0,
            vol: this.getVol(token),
            lp,
            price: p,
            holder: this.holder[token] || 0,
            '1h': ((p - p1h) * 100) / p,
            '24h': ((p - p24h) * 100) / p,
            '7d': ((p - p7d) * 100) / p,
            recently,
            ...metadata
        };
    }
}

module.exports = SyncModel;