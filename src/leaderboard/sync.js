const Crawler = require("../common/crawler");
const { web3 } = require('../common/network').getConfig();

const SYNC_TOPIC = '0x1c411e9a96e071241c2f21f7726b17ae89e3cab4c78be50e062b03a9fffbbad1';

class SyncModel {
    constructor() {
    }

    async runCrawler() {
        this.crawler = new Crawler("sync", SYNC_TOPIC, async (log) => {
            const values = web3.eth.abi.decodeParameters(['uint256', 'uint256'], log.data)
            this.writeSyncLog(log.blockNumber, log.transactionIndex, log.logIndex, log.address, values[0].toString(10), values[1].toString(10));
        }, 2000);
        await this.crawler.run();
    }

    writeSyncLog(block, txIdx, logIdx, pair, reserve0, reserve1) {
        console.log(block, txIdx, logIdx, pair, reserve0, reserve1)
    }
}

module.exports = SyncModel;