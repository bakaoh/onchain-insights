require('../common/network').useBSC();
const express = require("express");
const SyncModel = require("./sync");
const { pairModel } = require('./model');

const syncModel = new SyncModel();

const app = express();
app.use(express.json());

app.get('/api/:token', async (req, res) => {
    const token = req.params.token;
    const rs = await syncModel.get(token);
    res.json(rs);
})

async function start(port) {
    const startMs = Date.now();

    await pairModel.warmup();
    pairModel.runCrawler();
    syncModel.runCrawler();

    app.listen(port);
    console.log(`Service start at port ${port} (${Date.now() - startMs}ms)`)
}

start(9613);

// curl http://localhost:9613/api/0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82