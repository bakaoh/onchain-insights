const Partitioner = require('../common/partitioner');
const Crawler = require("../common/crawler");
const { web3, ContractAddress, isUSD } = require('../common/network').getConfig();
const { pairModel } = require('./model');
const { calcPrice } = require('../common/util');

const SWAP_TOPIC = '0xd78ad95fa46c994b6551d0da85fc275fe613ce37657fb8d5e3d130840159d822';
const DATA_FOLDER = 'db/swap';

const notZero = (amount0, amount1) => amount0 != "0" ? amount0 : amount1;

class SwapModel {
    constructor() {
        this.partitioner = new Partitioner(DATA_FOLDER);
        this.merger = { block: 0, tx: {} };
        this.nativePrice = 0;
    }

    async runCrawler() {
        this.crawler = new Crawler("swap", SWAP_TOPIC, async (log) => {
            const values = web3.eth.abi.decodeParameters(['uint256', 'uint256', 'uint256', 'uint256'], log.data)
            const from = web3.eth.abi.decodeParameters(['address'], log.topics[1])[0]
            const to = web3.eth.abi.decodeParameters(['address'], log.topics[2])[0]
            this.processSwapLog(log.blockNumber, log.transactionIndex, log.logIndex, log.address, from, to, values[0].toString(10), values[1].toString(10), values[2].toString(10), values[3].toString(10));
        }, 2000);
        await this.crawler.run();
    }

    processSwapLog(block, txIdx, logIdx, pair, from, to, amount0In, amount1In, amount0Out, amount1Out) {
        if (this.merger.block != block) {
            this.mergeSwapLog();
            this.merger.block = block;
            this.merger.tx = {};
        }
        if (!this.merger.tx[txIdx]) this.merger.tx[txIdx] = [];
        this.merger.tx[txIdx].push({ block, logIdx, pair, from, to, amount0In, amount1In, amount0Out, amount1Out });
    }

    mergeSwapLog() {
        for (let txIdx in this.merger.tx) {
            const swapLogs = this.merger.tx[txIdx].sort((a, b) => a.logIdx - b.logIdx);

            const swapIn = swapLogs[0];
            const pairIn = pairModel.getTokens(swapIn.pair);
            if (!pairIn) continue;
            const tokenIn = swapIn.amount0In != "0" ? pairIn.token0 : pairIn.token1;
            const amountIn = notZero(swapIn.amount0In, swapIn.amount1In);

            let usdAmount = '0';
            let swapOut = swapIn;
            for (let i = 0; i < swapLogs.length; i++) {
                const cur = swapLogs[i];
                const curIn = notZero(cur.amount0In, cur.amount1In);
                const curOut = notZero(cur.amount0Out, cur.amount1Out);
                if (swapLogs[i].pair == ContractAddress.nativePricePair) {
                    this.nativePrice = calcPrice()
                }
                const pair = pairModel.getTokens(swapLogs[i].pair);
                const prevOut = notZero(swapOut.amount0Out, swapOut.amount1Out);
                const nextIn = notZero(swapLogs[i].amount0In, swapLogs[i].amount1In);
                if (prevOut != nextIn) break;
                swapOut = swapLogs[i];
            }
            const pairOut = pairModel.getTokens(swapOut.pair);
            if (!pairOut) continue;
            const tokenOut = swapOut.amount0Out != "0" ? pairOut.token0 : pairOut.token1;
            const amountOut = notZero(swapOut.amount0Out, swapOut.amount1Out);

            let bnbAmount = '0';
            for (let s of swap) {
                const pair = this.pairModel.getTokens(s[1]);
                if (!pair) continue;
                if (isUSD(pair.token0)) {
                    usdAmount = s[4] != "0" ? s[4] : s[6];
                } else if (isUSD(pair.token1)) {
                    usdAmount = s[5] != "0" ? s[5] : s[7];
                } else if (pair.token0 == ContractAddress.WBNB) {
                    bnbAmount = s[4] != "0" ? s[4] : s[6];
                } else if (pair.token1 == ContractAddress.WBNB) {
                    bnbAmount = s[5] != "0" ? s[5] : s[7];
                }
            }

            const user = swapOut.to;
            const idx = Math.floor(this.merger.block / Partitioner.BPF);
            this.partitioner.getWriter(tokenIn, idx).write(`${this.merger.block},${txIdx},SELL,${user},${tokenOut},${amountIn},${amountOut},${usdAmount}\n`);
            this.partitioner.getWriter(tokenOut, idx).write(`${this.merger.block},${txIdx},BUY,${user},${tokenIn},${amountOut},${amountIn},${usdAmount}\n`);
        }
    }
}

module.exports = SwapModel;