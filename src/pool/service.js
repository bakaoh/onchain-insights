require('../common/network').useAvalanche();
const PairModel = require("./pair");
const SyncModel = require("./sync");

const pairModel = new PairModel();
const syncModel = new SyncModel();

async function start() {
    const startMs = Date.now();

    await pairModel.warmup();
    pairModel.runCrawler();
    syncModel.runCrawler();
    const ms = Date.now() - startMs;
    console.log(`Service start (${ms}ms)`)
}

start();