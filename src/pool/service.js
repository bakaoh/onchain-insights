const PairModel = require("./pair");

const pairModel = new PairModel();

async function start(port) {
    const startMs = Date.now();

    await pairModel.warmup();
    await pairModel.runCrawler();
    const ms = Date.now() - startMs;
    console.log(`Service start at port ${port} (${ms}ms)`)
}

start(9613);