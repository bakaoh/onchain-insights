const axios = require('axios');

class Api {

    constructor() {
        this.cmc = {};
        this.cgk = {};
    }

    async warmup() {
        await this.initCMC();
        await this.initCGK();
    }

    async initCMC() {
        const rs = await axios.get(
            'https://pro-api.coinmarketcap.com/v1/cryptocurrency/map',
            { headers: { 'X-CMC_PRO_API_KEY': process.env.CMC_API_KEY } });
        let count = 0;
        rs.data.data.forEach(i => {
            if (i.platform.id == 1839) {
                this.cmc[i.platfrom.token_address] = i;
                count++;
            }
        })
        console.log(`Update CMC map. Total ${count} token`);
    }

    async initCGK() {
        const rs = await axios.get(
            'https://api.coingecko.com/api/v3/coins/list?include_platform=true')
        let count = 0;
        rs.data.forEach(i => {
            if (i.platform['binance-smart-chain']) {
                this.cgk[i.platform['binance-smart-chain']] = i;
                count++;
            }
        })
        console.log(`Update CGK map. Total ${count} token`);
    }

    async getDailyHolder(token) {
        const holders = (await axios.get(`http://10.148.0.39:9612/api/v1/holder/${token}`)).data;
        return holders.reverse().map(e => e.num);
    }

    async getBuyHolder(token) {
        return (await axios.get(`http://10.148.0.34:9613/api/v1/buyholder/${token}`)).data.buyHolder;
    }

    async getMetaData(token) {
        return (await axios.get(`http://10.148.0.39:9612/info/token?a=${token}`)).data[0];
    }
}

module.exports = Api;
