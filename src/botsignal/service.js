require('dotenv').config({ path: '/home/bakaking/bscchain/.env' });
require('../common/network').useBSC();
const fs = require('fs');
const express = require("express");
const axios = require("axios");
const app = express();
const Controller = require("./telegram");
const Api = require("./api");

const telegram = new Controller(process.env.TELEGRAM_TOKEN);
const api = new Api();

app.use(express.json());

const average3 = (d) => (d[0] + d[1] + d[2]) / 3;
const average7 = (d) => (d[0] + d[1] + d[2] + d[3] + d[4] + d[5] + d[6]) / 7;
const get24h = (d) => {
    let rs = 0;
    for (let i = 0; i < 24; i++) rs += d[i] || 0;
}

const check0 = ({ lp, volume, dailyVolume, price, dailyPrice, tx, dailyTx, firstPool }) => {
    return (
        (Date.now() - firstPool > 259200000) &&
        (tx > 1.3 * dailyTx[0]) &&
        (lp > 50000) &&
        (volume > 1.3 * dailyVolume[0]) &&
        (price < 1.3 * dailyPrice[0])
    )
}
const check1 = ({ lp, volume, dailyVolume, price, dailyPrice }) => {
    return (
        (lp > 50000) &&
        (volume > 1.3 * average3(dailyVolume)) &&
        (price < 1.3 * dailyPrice[0])
    )
}
const check2 = ({ lp, volume, dailyVolume, price, dailyPrice }) => {
    return (
        (lp > 200000) &&
        (volume > 1.3 * average7(dailyVolume)) &&
        (price > 1.1 * average7(dailyPrice))
    )
}
const check3 = ({ dailyHolder, volume, dailyVolume, price, dailyPrice, firstPool }) => {
    return (
        (Date.now() - firstPool > 259200000) &&
        (dailyHolder[0] > 1.05 * dailyHolder[1]) &&
        (dailyHolder[1] > 1.05 * dailyHolder[2]) &&
        (dailyHolder[2] > 1.05 * dailyHolder[3]) &&
        (volume > 1.1 * dailyVolume[0]) &&
        (dailyVolume[0] > 1.1 * dailyVolume[1]) &&
        (dailyVolume[1] > 1.1 * dailyVolume[2]) &&
        (price > 1.03 * dailyPrice[0]) &&
        (dailyPrice[0] > 1.03 * dailyPrice[1]) &&
        (dailyPrice[1] > 1.03 * dailyPrice[2])
    )
}
const check4 = ({ lp, buyHolder, volume, sellTx, firstPool }) => {
    return (
        (Date.now() - firstPool < 86400000) &&
        (lp > 50000) &&
        (volume > 50000) &&
        (buyHolder > 50) &&
        (sellTx > 3)
    )
}

const check5 = ({ cmc, cgk, lp, volume24h, tx24h }) => {
    return (
        (cmc || cgk) &&
        (lp > 50000) &&
        (volume24h > lp) &&
        (tx24h > 50)
    )
}

const Bots = {
    bot0: { checker: check5, logger: fs.createWriteStream(`logs/bot5.log`, { flags: "a" }) },
    // bot0: { checker: check0, logger: fs.createWriteStream(`logs/bot0.log`, { flags: "a" }) },
    // bot1: { checker: check1, logger: fs.createWriteStream(`logs/bot1.log`, { flags: "a" }) },
    // bot2: { checker: check2, logger: fs.createWriteStream(`logs/bot2.log`, { flags: "a" }) },
    // bot3: { checker: check3, logger: fs.createWriteStream(`logs/bot3.log`, { flags: "a" }) },
    // bot4: { checker: check4, logger: fs.createWriteStream(`logs/bot4.log`, { flags: "a" }) }
};
const lastSignal = {};

app.post('/bot/check', async (req, res) => {
    const data = req.body;
    const { token } = data;
    const last = lastSignal[token]
    if (!last || Date.now() - last > 43200000) {
        lastSignal[token] = Date.now();

        // data.dailyHolder = await api.getDailyHolder(token);
        // data.buyHolder = await api.getBuyHolder(token);
        const metadata = await api.getMetaData(token);
        const newdata = {};
        newdata.token = data.token;
        newdata.lp = data.lp;
        newdata.symbol = metadata.symbol;
        newdata.name = metadata.name;
        newdata.cmc = api.cmc[token];
        newdata.cgk = api.cgk[token];
        newdata.volume24h = get24h(data.hourlyVolume);
        newdata.tx24h = get24h(data.hourlyTx)
        console.log(JSON.stringify(newdata));
        let sendSignal = false;
        for (let id in Bots) {
            if (Bots[id].checker(newdata)) {
                Bots[id].logger.write(`${JSON.stringify(data)}\n`);
                sendSignal = true;
                await telegram.sendSignal(id.substr(3), data);
            }
        }
        if (!sendSignal) lastSignal[token] = last;
    }
    res.json({ "status": "ok" });
})

async function start(port) {
    const startMs = Date.now();

    await api.warmup();

    app.listen(port);
    console.log(`Service start at port ${port} (${Date.now() - startMs}ms)`)
}

start(9615);
