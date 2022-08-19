const fs = require('fs');
const LineByLine = require('line-by-line');

class Portfolio {
    constructor(filename) {
        this.filename = filename;
        this.lastSignal = {};
        this.logger = undefined;
        this.table = {};
    }

    warmup() {
        const lr = new LineByLine(this.filename);
        lr.on('line', (line) => {
            const data = JSON.parse(line);
            this.lastSignal[data.token] = parseInt(data.ts);
            this.table[data.token] = { data };
        });
        return new Promise((res, rej) => lr.on('end', () => {
            this.logger = fs.createWriteStream(this.filename, { flags: "a" });
            res();
        }).on('error', err => rej(err)));
    }

    updatePrice(data) {
        if (!data.price) return;
        const row = this.table[data.token]
        if (!row) return;
        row.cur = data.price;
        if (!row.max || row.max < data.price) row.max = data.price;
        if (!row.min || row.min > data.price) row.min = data.price;
    }

    add(data) {
        this.logger.write(`${JSON.stringify(data)}\n`);
        const ts = parseInt(data.ts);
        if (this.lastSignal[data.token] && ts - this.lastSignal[data.token] < 43200000) return fasle;
        this.lastSignal[data.token] = ts;
        this.table[data.token] = { data };
        return true;
    }
}

module.exports = Portfolio;