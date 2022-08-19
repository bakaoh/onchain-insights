require('../common/network').useBSC();
const express = require("express");
const SyncModel = require("./sync");
const { pairModel, tokenModel } = require('./model');

const syncModel = new SyncModel();

const app = express();
app.use(express.json());

app.get('/api/v1/leaderboard', async (req, res) => {
    const orderBy = req.query.orderby || "24h";
    const page = parseInt(req.query.page || "0");
    const rs = await syncModel.getTopToken(orderBy, page);
    res.json(rs);
})

async function start(port) {
    const startMs = Date.now();

    await tokenModel.warmup();
    await pairModel.warmup();
    await syncModel.warmup();
    await pairModel.runCrawler();
    await syncModel.runCrawler();

    app.listen(port);
    console.log(`Service start at port ${port} (${Date.now() - startMs}ms)`)
}

start(9613);
