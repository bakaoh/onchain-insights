const fs = require('fs');
const LineByLine = require('line-by-line');
const { getTokenMetadata } = require('../common/util');

const TOKEN_DETAIL_FILE = `db/token.log`;
const opts = { flags: "a" };

class TokenModel {
    constructor() {
        this.token = {};
    }

    getToken(address) {
        if (this.token[address]) {
            return {
                address,
                decimals: this.token[address][0],
                symbol: this.token[address][1],
                name: this.token[address][2],
                logo: `https://assets-cdn.trustwallet.com/blockchains/smartchain/assets/${address}/logo.png`
            };
        }
        return { address }
    }

    async fetchTokens(addresses) {
        addresses = addresses.filter(a => !this.token[a]);
        if (addresses.length == 0) return;
        const tokens = await getTokenMetadata(addresses)
        const writer = fs.createWriteStream(TOKEN_DETAIL_FILE, opts);
        for (let i = 0; i < tokens.length; i++) {
            this.token[tokens[i][0]] = [tokens[i][3], tokens[i][2], tokens[i][1]];
            writer.write(`${tokens[i][0]},${tokens[i][3]},${tokens[i][2]},${tokens[i][1]}\n`);
        }
        writer.end();
    }

    warmup() {
        const startMs = Date.now();
        const lr = new LineByLine(TOKEN_DETAIL_FILE);
        lr.on('line', (line) => {
            const p = line.split(',', 4);
            if (p.length != 4) return;
            this.token[p[0]] = [p[1], p[2], p[3]];
        });
        return new Promise((res, rej) => lr
            .on('end', () => { console.log(`TokenModel warmup (${Date.now() - startMs}ms)`); res() })
            .on('error', err => rej(err)));
    }
}

module.exports = TokenModel;