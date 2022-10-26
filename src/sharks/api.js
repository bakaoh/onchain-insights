const axios = require('axios');

class Api {

    constructor() {
        this.cmc = {};
    }

    async initCMC() {
        const rs = await axios.get(
            'https://pro-api.coinmarketcap.com/v1/cryptocurrency/map',
            { headers: { 'X-CMC_PRO_API_KEY': process.env.CMC_API_KEY } });
        let count = 0;
        rs.data.data.forEach(i => {
            if (i.platform && i.platform.id == 1839) {
                this.cmc[i.id] = i.platform.token_address;
                count++;
            }
        })
        console.log(`Update CMC map. Total ${count} token`);
    }

    async getTopToken() {
        const rs = await axios.get(
            'https://pro-api.coinmarketcap.com/v1/cryptocurrency/listings/latest?limit=60',
            { headers: { 'X-CMC_PRO_API_KEY': process.env.CMC_API_KEY } });
        return rs.data.data;
    }

    async getTokenOHLCV(id) {
        const rs = await axios.get(
            `https://pro-api.coinmarketcap.com/v2/cryptocurrency/ohlcv/historical?id=${id}&count=30`,
            { headers: { 'X-CMC_PRO_API_KEY': process.env.CMC_API_KEY } });
        return rs.data.data;
    }

    async cgk_getToken() {
        const rs = await axios.get(
            'https://pro-api.coingecko.com/api/v3/coins/list',
            { headers: { 'x-cg-pro-api-key': process.env.CGK_API_KEY } });
        return rs.data;
    }

    async cgk_getTokenChart(id) {
        const rs = await axios.get(
            `https://pro-api.coingecko.com/api/v3/coins/${id}/market_chart?vs_currency=usd&days=200&interval=daily`,
            { headers: { 'x-cg-pro-api-key': process.env.CGK_API_KEY } });
        return rs.data;
    }

    async getTopHolder(tokenAddress) {
        const rs = await axios.get(
            `https://api.bscscan.com/api?contractaddress=${tokenAddress}&module=token&action=tokenholderlist&page=1&offset=1000&apikey=${process.env.BSCSCAN_API_KEY}`);
        return rs.data;
    }
}

module.exports = Api;
