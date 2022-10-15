require('dotenv').config({ path: '/home/bakaking/bscchain/.env' });
require('../common/network').useBSC();
const express = require("express");
const Storage = require('./storage');
const { getPriceHistory } = require('./bitquery');
const { toBN } = require('../common/util');

const BUSD = '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56';
const storage = new Storage('20221007');
const app = express();

const topTokens = {};
const initTopTokens = async () => {
    const tokens = await storage.loadTopTokens()
    for (let i = 0; i < 200; i++) topTokens[tokens[i].address] = tokens[i];
}
const countTransfer = (transfers) => {
    const currentBN = 21994385;
    const dayBN = currentBN - 28800;
    const weekBN = currentBN - 28800 * 7;
    const monthBN = currentBN - 28800 * 30;
    const count = { D: 0, W: 0, M: 0 };
    transfers.forEach(t => {
        const bn = parseInt(t.blockNumber);
        if (bn > dayBN) count.D++;
        if (bn > weekBN) count.W++;
        if (bn > monthBN) count.M++;
    });
    return count;
}
const lastTokenTransfer = (holder, transfers) => {
    for (let transfer of transfers) {
        const token = topTokens[transfer.contractAddress];
        if (transfer.to == holder && token) {
            return { address: token.address, symbol: token.symbol };
        }
    }
    return {};
}

app.use(express.json());

app.get('/api/v2/sharks', async (req, res) => {
    const tokens = await storage.loadTopTokens()
    res.json({ status: "ok", tokens: tokens.slice(0, 200) });
});

app.get('/api/v2/sharks/:token', async (req, res) => {
    const token = req.params.token;
    if (!topTokens[token]) {
        return res.json({ status: "error", message: "not found" });
    }

    const priceHistory = await getPriceHistory(token, BUSD);
    const getPrice = (block) => {
        let p;
        for (p of priceHistory) if (p.block < block) return p.price;
        return p.price;
    }

    const TEN18 = toBN(10).pow(toBN(18));
    const getPNL = (holder, balance, transfers) => {
        let vin = toBN(0);
        let vout = toBN(0);
        for (let transfer of transfers) {
            if (transfer.contractAddress != token) continue;
            const value = toBN(transfer.value);
            const price = toBN(Math.round(1000000 * getPrice(parseInt(transfer.blockNumber))));
            const v = value.mul(price).div(TEN18).divn(1000000);
            if (transfer.from == holder) vout = vout.add(v)
            else if (transfer.to == holder) vin = vin.add(v)
        }
        const price = toBN(Math.round(1000000 * priceHistory[0].price));
        const hold = toBN(Math.round(balance)).mul(price).divn(1000000);
        if (vin.isZero()) return 0;
        return parseInt(vout.add(hold).muln(1000).div(vin)) / 1000;
    }

    const topHolders = await storage.loadTopHolders(token);
    const rs = [];
    for (let holder of topHolders) {
        const { address, quantity, value } = holder;
        if (rs.length > 20) break;
        if (!storage.hasTokenTransfers(address)) continue;
        const transfers = await storage.loadTokenTransfers(address);
        if (transfers.length > 2000) continue;
        const activity = countTransfer(transfers);
        const pnl = getPNL(address, quantity, transfers) * 100;
        const lastToken = lastTokenTransfer(address, transfers);
        rs.push({ address, quantity, activity, pnl, value, lastToken });
    }
    res.json({ status: "ok", holders: rs });
})

async function start(port) {
    const startMs = Date.now();

    await initTopTokens();
    app.listen(port);
    console.log(`Service start at port ${port} (${Date.now() - startMs}ms)`)
}

start(9616);
