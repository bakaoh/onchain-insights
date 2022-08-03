const Partitioner = require('../common/partitioner');
const Crawler = require("../common/crawler");
const { web3 } = require('../common/network').getConfig();

const SYNC_TOPIC = '0x1c411e9a96e071241c2f21f7726b17ae89e3cab4c78be50e062b03a9fffbbad1';
const BLOCK_FILE = 'db/sync.block';
const DATA_FOLDER = 'db/sync';

class SyncModel {
    constructor() {
        this.partitioner = new Partitioner(DATA_FOLDER);
    }

    async runCrawler() {
        this.crawler = new Crawler("Sync", SYNC_TOPIC, BLOCK_FILE, async (log) => {
            const values = web3.eth.abi.decodeParameters(['uint256', 'uint256'], log.data)
            this.writeSyncLog(log.blockNumber, log.transactionIndex, log.logIndex, log.address, values[0].toString(10), values[1].toString(10));
        }, 2000);
        await this.crawler.run();
    }

    writeSyncLog(block, txIdx, logIdx, pair, reserve0, reserve1) {
        const idx = Math.floor(block / Partitioner.BPF);
        this.partitioner.getWriter(pair, idx).write(`${block},${txIdx},${logIdx},${reserve0},${reserve1}\n`);
    }
}

module.exports = SyncModel;