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

    writeLog(userId, symbol, token, buyTs, buyPrice, sellTs, sellPrice) {
        this.getWriter(userId).write(`${userId},${symbol},${token},${buyTs},${buyPrice},${sellTs},${sellPrice}\n`);
        this.getWriter('all').write(`${userId},${symbol},${token},${buyTs},${buyPrice},${sellTs},${sellPrice}\n`);
    }

    loadLog(userId) {
        const rs = [];
        const lr = new LineByLine(`${HISTORY_FOLDER}/${userId}`);
        lr.on('line', (line) => {
            const [userId, symbol, token, buyTs, buyPrice, sellTs, sellPrice] = line.split(',');
            rs.push({ userId, symbol, token, buyTs, buyPrice, sellTs, sellPrice })
        });
        return new Promise((res, rej) => lr.on('end', () => res(rs)).on('error', err => rej(err)));
    }
}

module.exports = History;