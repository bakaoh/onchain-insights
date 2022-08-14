require('../common/network').useBSC();
const express = require("express");

const app = express();
app.use(express.json());

const check0 = ({ lp, holder, volume, dailyVolume, price, dailyPrice, tx, dailyTx, firstPool }) => {
    return (
        (Date.now() - firstPool > 259200000) &&
        (tx > 1.3 * dailyTx[0]) &&
        (lp > 50000) &&
        (volume > 1.3 * dailyVolume[0]) &&
        (price < 1.3 * dailyPrice[0])
    )
}
const check1 = ({ lp, holder, volume, dailyVolume, price, dailyPrice, tx, dailyTx, firstPool }) => {
    return (
        (lp > 50000) &&
        (volume > 1.3 * (dailyVolume[0] + dailyVolume[1] + dailyVolume[2]) / 3) &&
        (price < 1.3 * dailyPrice[0])
    )
}
const check2 = ({ lp, holder, volume, dailyVolume, price, dailyPrice, tx, dailyTx, firstPool }) => {
    return (
        (lp > 200000) &&
        (volume > 1.3 * (dailyVolume[0] + dailyVolume[1] + dailyVolume[2] + dailyVolume[3] + dailyVolume[4] + dailyVolume[5] + dailyVolume[6]) / 7) &&
        (price > 1.1 * (dailyPrice[0] + dailyPrice[1] + dailyPrice[2] + dailyPrice[3] + dailyPrice[4] + dailyPrice[5] + dailyPrice[6]) / 7)
    )
}
const check4 = ({ lp, holder, volume, dailyVolume, price, dailyPrice, tx, dailyTx, firstPool }) => {
    return (
        (Date.now() - firstPool < 86400000) &&
        (lp > 50000) &&
        (volume > 50000) &&
        (holder > 50)
    )
}

const Bots = [check0, check1, check2, check4];

app.post('/bot/check', async (req, res) => {
    const data = request.body;
    const { token, lp, holder, volume, dailyVolume, price, dailyPrice, tx, dailyTx, firstPool } = data;
    console.log(`BotCheck run (${token},${lp},${holder},${volume},[${dailyVolume}],${price},[${dailyPrice}],${tx},[${dailyTx}],${firstPool})`);
    for (let id in Bots) {
        if (Bots[id](data)) {
            console.log(`BotCheck [${id}] (${token},${lp},${holder},${volume},[${dailyVolume}],${price},[${dailyPrice}],${tx},[${dailyTx}],${firstPool})`);
        }
    }
    res.json(rs);
})

async function start(port) {
    const startMs = Date.now();

    app.listen(port);
    console.log(`Service start at port ${port} (${Date.now() - startMs}ms)`)
}

start(9615);
