require('../common/network').useBSC();
const { pairModel, syncModel } = require('./model');

async function start() {
    const startMs = Date.now();

    await pairModel.warmup();
    pairModel.runCrawler();
    syncModel.runCrawler();

    console.log(`Service start (${Date.now() - startMs}ms)`)
}

start();