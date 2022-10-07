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
            'https://pro-api.coinmarketcap.com/v1/cryptocurrency/listings/latest?limit=5000',
            { headers: { 'X-CMC_PRO_API_KEY': process.env.CMC_API_KEY } });
        return rs.data.data;
    }

    async getTopHolder(tokenAddress) {
        const rs = await axios.get(
            `https://api.bscscan.com/api?contractaddress=${tokenAddress}&module=token&action=tokenholderlist&page=1&offset=1000&apikey=${process.env.BSCSCAN_API_KEY}`);
        return rs.data;
    }
}

module.exports = Api;
