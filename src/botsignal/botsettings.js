const fs = require('fs');
const { generateRandom } = require('../common/util');

const SETTINGS_FOLDER = 'db/bot/settings';
const VERSION = 1;

const isValidMMID = (s, d) => {
    const calc = () => {
        if (s == undefined || d == undefined) return true;
        if (s.min != undefined && s.min > d[0]) return false;
        if (s.max != undefined && s.max < d[0]) return false;
        if (d[1] == undefined) return true;
        if (s.inc != undefined && (100 + s.inc) * d[1] > d[0]) return false;
        if (s.dec != undefined && (100 - s.dec) * d[1] < d[0]) return false;
        return true;
    };
    const rs = calc();
    if (!rs) console.log(s, d)
    return rs;
}

class BotSettings {
    constructor() {
        this.metadata = {};
    }

    warmup() {
        fs.readdirSync(SETTINGS_FOLDER).forEach(id => {
            const data = fs.readFileSync(`${SETTINGS_FOLDER}/${id}`);
            this.metadata[id] = JSON.parse(data);
        });
    }

    create(settings, creator = '0x') {
        const id = generateRandom(8);
        const data = {
            id, settings, creator,
            version: VERSION,
        };
        fs.writeFileSync(`${SETTINGS_FOLDER}/${id}`, JSON.stringify(data, null, 2));
        this.metadata[id] = data;
        return id;
    }

    checkAll(data) {
        let ids = [];
        for (let id in this.metadata) {
            if (this.check(this.metadata[id].settings, data)) ids.push(id);
        }
        return ids;
    }

    check(settings, data) {
        if (settings.exchange == 'dex/cex') {
            // TODO:
        }
        if (settings.cmcOrCgk && !data.cmc && !data.cgk) return false;
        if (settings.firstPool) {
            const elapsed = Date.now() - data.firstPool;
            if (settings.firstPool.min && elapsed < settings.firstPool.min) return false;
            if (settings.firstPool.max && elapsed > settings.firstPool.max) return false;
        }
        if (!isValidMMID(settings.liquidity, data.liquidity)) return false;
        if (!isValidMMID(settings.price1h, data.price1h)) return false;
        if (!isValidMMID(settings.price24h, data.price24h)) return false;
        if (!isValidMMID(settings.volume, data.volume)) return false;
        if (!isValidMMID(settings.tx, data.tx)) return false;
        if (!isValidMMID(settings.holder, data.holder)) return false;
        return true;
    }
}

module.exports = BotSettings;