const fs = require('fs');
const LineByLine = require('line-by-line');

const opts = { flags: "a" };
const createFolder = (path) => {
    if (!fs.existsSync(path)) fs.mkdirSync(path, { recursive: true });
}

class Storage {
    constructor(date) {
        this.folder = `db/shark/${date}`;
        createFolder(`${this.folder}/topholders`);
        createFolder(`${this.folder}/transfers`);
    }

    writeTopTokens(toptokens) {
        const writer = fs.createWriteStream(`${this.folder}/toptokens`, opts);
        for (let token of toptokens) {
            const { address, symbol, marketCap, onchainMarketCap, holders } = token;
            if (address.length != 42) continue;
            writer.write(`${address},${symbol},${marketCap},${onchainMarketCap},${holders}\n`);
        }
        writer.end();
    }

    loadTopTokens() {
        const rs = [];
        const lr = new LineByLine(`${this.folder}/toptokens`);
        lr.on('line', (line) => {
            const [address, symbol, marketCap, onchainMarketCap, holders] = line.split(',');
            rs.push({ address, symbol, marketCap, onchainMarketCap, holders })
        });
        return new Promise((res, rej) => lr.on('end', () => res(rs)).on('error', err => rej(err)));
    }

    writeTopHolders(token, topholders) {
        const writer = fs.createWriteStream(`${this.folder}/topholders/${token}`, opts);
        for (let holder of topholders) {
            const { address, isContract, quantity, value, name } = holder;
            writer.write(`${address},${isContract},${quantity},${value},${name}\n`);
        }
        writer.end();
    }

    loadTopHolders(token) {
        const rs = [];
        const lr = new LineByLine(`${this.folder}/topholders/${token}`);
        lr.on('line', (line) => {
            const [address, isContract, quantity, value, name] = line.split(',');
            rs.push({ address, isContract, quantity, value, name })
        });
        return new Promise((res, rej) => lr.on('end', () => res(rs)).on('error', err => rej(err)));
    }

    writeTokenTransfers(holder, transfers) {
        const writer = fs.createWriteStream(`${this.folder}/transfers/${holder}`, opts);
        for (let transfer of transfers) {
            const { blockNumber, contractAddress, from, to, value } = transfer;
            writer.write(`${blockNumber},${contractAddress},${from},${to},${value}\n`);
        }
        writer.end();
    }

    hasTokenTransfers(holder) {
        return fs.existsSync(`${this.folder}/transfers/${holder}`);
    }

    loadTokenTransfers(holder) {
        const rs = [];
        const lr = new LineByLine(`${this.folder}/transfers/${holder}`);
        lr.on('line', (line) => {
            const [blockNumber, contractAddress, from, to, value] = line.split(',');
            rs.push({ blockNumber, contractAddress, from, to, value })
        });
        return new Promise((res, rej) => lr.on('end', () => res(rs)).on('error', err => rej(err)));
    }
}

module.exports = Storage;