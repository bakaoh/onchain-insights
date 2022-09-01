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
    }
}

module.exports = Portfolio;