const axios = require('axios');

const headers = {
    'Content-Type': 'application/json',
    'X-API-KEY': process.env.BITQUERY_API_KEY
};

async function getPriceHistory(base, quote) {
    let query = `
{
    ethereum(network: bsc) {
        dexTrades(
            options: {limit: 1000, desc: "t.day"}
            baseCurrency: {is: "${base}"}
            quoteCurrency: {is: "${quote}"}
            tradeAmountUsd: {gt: 10}
        ) {
            p: quotePrice(calculate: average)
            b: minimum(of: block, get: block)
            t: timeInterval {
                day(count: 1)
            }
        }
    }
}
`;
    let variables = {};
    const res = await axios({
        url: "https://graphql.bitquery.io",
        method: 'post',
        data: { query, variables },
        headers
    });
    const rs = res.data.data.ethereum.dexTrades.map(item => ({
        price: parseFloat(item.p),
        block: parseInt(item.b),
        date: Math.round(new Date(item.t['day']) / 1000),

    }));
    return rs;
}

module.exports = { getPriceHistory };