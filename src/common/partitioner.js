const LineByLine = require('line-by-line');
const fs = require('fs');
const opts = { flags: "a" };

class Partitioner {
    static BPF = 100000; // BLOCK_PER_FILE

    constructor(prefix, suffix = "") {
        this.prefix = prefix;
        this.suffix = suffix;
        this.writers = {};
    }

    closeAll() {
        const keys = Object.keys(this.writers);
        keys.forEach(address => { this.writers[address].writer.end(); });
    }

    getWriter(token, idx) {
        if (!this.writers[token] || this.writers[token].idx != idx) {
            if (this.writers[token]) this.writers[token].writer.end();
            const dir = `${this.prefix}/${token}`;
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
            this.writers[token] = {
                idx,
                writer: fs.createWriteStream(`${dir}/${idx}${this.suffix}`, opts)
            }
        }
        return this.writers[token].writer;
    }

    loadLog(token, idx, cb) {
        const lr = new LineByLine(`${this.prefix}/${token}/${idx}${this.suffix}`);
        lr.on('line', (line) => { cb(line.split(',')); });
        return new Promise((res, rej) => lr.on('end', () => res()).on('error', err => rej(err)));
    }
}

module.exports = Partitioner;