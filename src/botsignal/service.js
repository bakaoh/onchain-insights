require('dotenv').config({ path: '/home/bakaking/bscchain/.env' });
require('../common/network').useBSC();
const fs = require('fs');
const express = require("express");
const axios = require("axios");
const app = express();
const Controller = require("./telegram");
const Api = require("./api");
const Portfolio = require("./portfolio");

const portfolio = new Portfolio(`logs/portfolio0.log`);
const telegram = new Controller(process.env.TELEGRAM_TOKEN, portfolio);
const api = new Api();

app.use(express.json());

const average3 = (d) => (d[0] + d[1] + d[2]) / 3;
const average7 = (d) => (d[0] + d[1] + d[2] + d[3] + d[4] + d[5] + d[6]) / 7;
const get24h = (d) => {
    let rs = 0;
    for (let i = 0; i < 24; i++) rs += (d[i] || 0);
    return rs;
}

// const check0 = ({ lp, volume, dailyVolume, price, dailyPrice, tx, dailyTx, firstPool }) => {
//     return (
//         (Date.now() - firstPool > 259200000) &&
//         (tx > 1.3 * dailyTx[0]) &&
//         (lp > 50000) &&
//         (volume > 1.3 * dailyVolume[0]) &&
//         (price < 1.3 * dailyPrice[0])
//     )
// }
// const check1 = ({ lp, volume, dailyVolume, price, dailyPrice }) => {
//     return (
//         (lp > 50000) &&
//         (volume > 1.3 * average3(dailyVolume)) &&
//         (price < 1.3 * dailyPrice[0])
//     )
// }
// const check2 = ({ lp, volume, dailyVolume, price, dailyPrice }) => {
//     return (
//         (lp > 200000) &&
//         (volume > 1.3 * average7(dailyVolume)) &&
//         (price > 1.1 * average7(dailyPrice))
//     )
// }
// const check3 = ({ dailyHolder, volume, dailyVolume, price, dailyPrice, firstPool }) => {
//     return (
//         (Date.now() - firstPool > 259200000) &&
//         (dailyHolder[0] > 1.05 * dailyHolder[1]) &&
//         (dailyHolder[1] > 1.05 * dailyHolder[2]) &&
//         (dailyHolder[2] > 1.05 * dailyHolder[3]) &&
//         (volume > 1.1 * dailyVolume[0]) &&
//         (dailyVolume[0] > 1.1 * dailyVolume[1]) &&
//         (dailyVolume[1] > 1.1 * dailyVolume[2]) &&
//         (price > 1.03 * dailyPrice[0]) &&
//         (dailyPrice[0] > 1.03 * dailyPrice[1]) &&
//         (dailyPrice[1] > 1.03 * dailyPrice[2])
//     )
// }
// const check4 = ({ lp, buyHolder, volume, sellTx, firstPool }) => {
//     return (
//         (Date.now() - firstPool < 86400000) &&
//         (lp > 50000) &&
//         (volume > 50000) &&
//         (buyHolder > 50) &&
//         (sellTx > 3)
//     )
// }

const check0 = ({ cmc, cgk, lp, volume24h, tx24h, sellTx }) => {
    return (
        (cmc || cgk) &&
        (lp > 50000) &&
        (volume24h > lp) &&
        (tx24h > 50) &&
        (sellTx > 10)
    )
}

const Bots = {
    bot0: { checker: check0 },
};

app.post('/bot/check', async (req, res) => {
    const data = req.body;
    const { token } = data;

    const metadata = await api.getMetaData(token);
    data.symbol = metadata.symbol;
    data.name = metadata.name;
    data.dailyHolder = await api.getDailyHolder(token);
    data.buyHolder = await api.getBuyHolder(token);
    data.token = data.token;
    data.lp = data.lp;
    data.cmc = api.cmc[token];
    data.cgk = api.cgk[token.toLowerCase()];
    data.volume24h = get24h(data.hourlyVolume);
    data.tx24h = get24h(data.hourlyTx)
    data.ts = Date.now();

    for (let id in Bots) {
        if (Bots[id].checker(data) && portfolio.add(data)) {
            await telegram.sendSignal(id.substr(3), data);
        }
    }
    portfolio.updatePrice(data);
    res.json({ "status": "ok" });
})

async function start(port) {
    const startMs = Date.now();

    await api.warmup();
    await portfolio.warmup();

    app.listen(port);
    console.log(`Service start at port ${port} (${Date.now() - startMs}ms)`)
}

start(9615);
