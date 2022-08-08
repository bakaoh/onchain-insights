const fs = require('fs');
const LineByLine = require('line-by-line');
const Crawler = require("../common/crawler");
const { web3, isSupportFactory } = require('../common/network').getConfig();

const PAIR_CREATED_TOPIC = '0x0d3648bd0f6ba80134a33ba9275ac585d9d315f0ad8355cddefde31afa28d0e9';
const PAIR_DETAIL_FILE = 'db/pair.log';

const opts = { flags: "a" };

class PairModel {
    constructor() {
        this.writer = fs.createWriteStream(PAIR_DETAIL_FILE, opts);
        this.pools = {};
        this.pairs = {};
    }

    async runCrawler() {
        this.crawler = new Crawler("pair", PAIR_CREATED_TOPIC, async (log) => {
            const values = web3.eth.abi.decodeParameters(['address', 'uint256'], log.data)
            const token0 = web3.eth.abi.decodeParameters(['address'], log.topics[1])
            const token1 = web3.eth.abi.decodeParameters(['address'], log.topics[2])
            this.writePairCreatedLog(log.blockNumber, log.transactionIndex, log.logIndex, log.address, token0[0], token1[0], values[0], values[1].toString(10));
        }, 2000);
        await this.crawler.run();
    }

    warmup() {
        const startMs = Date.now();
        const lr = new LineByLine(PAIR_DETAIL_FILE);
        lr.on('line', (line) => {
            this.addPool(line.split(','));
        });
        return new Promise((res, rej) => lr
            .on('end', () => { console.log(`PairModel warmup (${Date.now() - startMs}ms)`); res() })
            .on('error', err => rej(err)));
    }

    getPools(token) {
        return this.pools[token];
    }

    getTokens(pair) {
        return this.pairs[pair];
    }

    addPool([block, txIdx, logIdx, factory, token0, token1, pair, idx]) {
        if (!isSupportFactory(factory)) return;
        this.pairs[pair] = { token0, token1, factory };
        if (!this.pools[token0]) this.pools[token0] = {};
        this.pools[token0][pair] = { token0, token1, factory };
        if (!this.pools[token1]) this.pools[token1] = {};
        this.pools[token1][pair] = { token0, token1, factory };
    }

    writePairCreatedLog(block, txIdx, logIdx, factory, token0, token1, pair, idx) {
        this.writer.write(`${block},${txIdx},${logIdx},${factory},${token0},${token1},${pair},${idx}\n`);
        this.addPool([block, txIdx, logIdx, factory, token0, token1, pair, idx]);
    }
}

module.exports = PairModel;