require('../common/network').useBSC();
const express = require("express");
const axios = require("axios");
const app = express();
app.use(express.json());

const average3 = (d) => (d[0] + d[1] + d[2]) / 3;
const average7 = (d) => (d[0] + d[1] + d[2] + d[3] + d[4] + d[5] + d[6]) / 7;

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
const check4 = ({ lp, holder, volume, sellTx, firstPool }) => {
    return (
        (Date.now() - firstPool < 86400000) &&
        (lp > 50000) &&
        (volume > 50000) &&
        (holder > 50) &&
        (sellTx > 3)
    )
}

const Bots = [check0, check1, check2, check3, check4];

app.post('/bot/check', async (req, res) => {
    const data = req.body;
    const holders = (await axios.get(`http://10.148.0.39:9612/api/v1/holder/${data.token}`)).data;
    const dailyHolder = holders.reverse().map(e => e.num);
    for (let id in Bots) {
        if (Bots[id]({ dailyHolder, ...data })) {
            console.log(`BotCheck [${id}] (${JSON.stringify(data)})`);
        }
    }
    res.json({ "status": "ok" });
})

async function start(port) {
    const startMs = Date.now();

    app.listen(port);
    console.log(`Service start at port ${port} (${Date.now() - startMs}ms)`)
}

start(9615);
