const fs = require('fs');
const Storage = require("./storage");

const USERS_FOLDER = 'db/bot/users';

class Portfolio {
    constructor(chatId) {
        this.storage = new Storage(`${USERS_FOLDER}/${chatId}.json`);
    }

    all() {
        return this.storage.all();
    }

    lastSignal(token) {
        const cur = this.storage.get(token);
        return cur ? cur.lastSignal : 0;
    }

    setLastSignal(token, ts, symbol) {
        const cur = this.storage.get(token) || {};
        cur.lastSignal = ts;
        cur.symbol = symbol;
        this.storage.set(token, cur);
    }

    buy(token, price, ts) {
        const cur = this.storage.get(token) || {};
        if (cur.tx instanceof Array) cur.tx.push({ price, ts });
        else cur.tx = [{ price, ts }];
        this.storage.set(token, cur);
        return { symbol: cur.symbol, token, buyTs: ts, buyPrice: price };
    }

    sell(address, idx) {
        const table = this.all();
        for (let token in table) {
            if (token.substr(37) != address) continue;
            if (!table[token].tx) continue;
            const buyTs = table[token].tx[idx].ts;
            const buyPrice = table[token].tx[idx].price;
            table[token].tx.splice(idx, 1);
            return { symbol: table[token].symbol, token, buyTs, buyPrice };
        }
        return {};
    }
}

module.exports = Portfolio;