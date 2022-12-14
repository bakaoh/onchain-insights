require('../common/network').useAvalanche();
const { pairModel, syncModel, swapModel } = require('./model');

async function start() {
    const startMs = Date.now();

    await pairModel.warmup();
    pairModel.runCrawler();
    syncModel.runCrawler();
    swapModel.runCrawler();

    console.log(`Service start (${Date.now() - startMs}ms)`)
}

start();