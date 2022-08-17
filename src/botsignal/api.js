const axios = require('axios');

const cgk = async () => {
    const rs = await axios.get('https://api.coingecko.com/api/v3/coins/list?include_platform=true')
    const { data } = rs
    for (let i of data) {
        console.log(i)
    }
    console.log(data.length)
}

const cmc = async () => {
    const rs = await axios.get('https://pro-api.coinmarketcap.com/v1/cryptocurrency/map', {
        headers: {
            'X-CMC_PRO_API_KEY': process.env.CMC_API_KEY,
        },
    });
    const { data } = rs.data
    for (let i of data) {
        console.log(i)
    }
    console.log(data.length)
}
