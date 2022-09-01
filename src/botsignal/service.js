require('dotenv').config({ path: '/home/bakaking/bscchain/.env' });
require('../common/network').useBSC();
const express = require("express");
const app = express();
const Controller = require("./telegram");
const Api = require("./api");
const BotSettings = require('./botsettings');

const telegram = new Controller(process.env.TELEGRAM_TOKEN);
const api = new Api();
const settings = new BotSettings();

app.use(express.json());

const get24h = (d) => {
    let rs = 0;
    for (let i = 0; i < 24; i++) rs += (d[i] || 0);
    return rs;
}
const getPrev24h = (d) => {
    let rs = 0;
    for (let i = 24; i < 48; i++) rs += (d[i] || 0);
    return rs;
}

app.post('/bot/create', async (req, res) => {
    const data = req.body;
    const id = settings.create(data);
    res.json({ status: "ok", id });
})

app.post('/bot/check', async (req, res) => {
    const data = req.body;
    const { token } = data;

    const metadata = await api.getMetaData(token);
    data.symbol = metadata.symbol;
    data.name = metadata.name;
    data.holder = await api.getDailyHolder(token);
    data.liquidity = data.lp;
    data.cmc = api.cmc[token];
    data.cgk = api.cgk[token.toLowerCase()];
    data.price1h = [data.price, data.price1h];
    data.price24h = [data.price, data.dailyPrice[0]];
    data.volume = [get24h(data.hourlyVolume), getPrev24h(data.hourlyVolume)];
    data.tx = [get24h(data.hourlyTx), getPrev24h(data.hourlyTx)];
    data.ts = Date.now();

    const botIds = settings.checkAll(data);
    console.log(data, botIds)
    await telegram.sendSignal(botIds, data);

    res.json({ status: "ok" });
})

async function start(port) {
    const startMs = Date.now();

    await api.warmup();
    settings.warmup();

    app.listen(port);
    console.log(`Service start at port ${port} (${Date.now() - startMs}ms)`)
}

start(9615);
