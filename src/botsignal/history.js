const LineByLine = require('line-by-line');
const fs = require('fs');
const opts = { flags: "a" };

const HISTORY_FOLDER = 'db/bot/history';

class History {
    constructor() {
        this.writers = {};
    }

    closeAll() {
        const keys = Object.keys(this.writers);
        keys.forEach(address => { this.writers[address].writer.end(); });
    }

    getWriter(userId) {
        if (!this.writers[userId]) {
            const file = `${HISTORY_FOLDER}/${userId}`;
            this.writers[userId] = fs.createWriteStream(file, opts)
        }
        return this.writers[userId];
    }

    loadLog(userId) {
        const lr = new LineByLine(`${HISTORY_FOLDER}/${userId}`);
        lr.on('line', (line) => { cb(line.split(',')); });
        return new Promise((res, rej) => lr.on('end', () => res()).on('error', err => rej(err)));
    }
}

module.exports = History;