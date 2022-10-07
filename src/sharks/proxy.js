const axios = require('axios');

let current = 0;
const proxy = [
    "http://157.230.46.214:2960/get",
    "http://206.189.84.48:2960/get",
    // "http://167.99.69.228:2960/get",
    "http://128.199.243.166:2960/get",
    "http://157.230.43.114:2960/get",
    "http://128.199.97.209:2960/get",
    "http://128.199.113.54:2960/get",
    "http://157.230.241.107:2960/get",
    "http://104.248.154.26:2960/get",
    "http://188.166.240.5:2960/get",
    "http://188.166.227.109:2960/get",
    "http://188.166.237.43:2960/get",
    "http://128.199.103.19:2960/get",
    "http://128.199.228.125:2960/get",
    "http://128.199.221.84:2960/get",
    "http://157.230.252.174:2960/get",
    "http://188.166.254.105:2960/get",
    "http://139.59.97.143:2960/get",
    "http://188.166.251.178:2960/get",
    "http://128.199.167.198:2960/get",
    "http://167.71.201.35:2960/get",
    "http://104.248.151.210:2960/get",
    "http://165.22.52.64:2960/get",
    "http://139.59.233.199:2960/get",
    "http://167.71.206.126:2960/get",
    "http://188.166.239.60:2960/get",
    "http://139.59.123.27:2960/get",
    "http://159.65.139.165:2960/get",
];

const proxyGet = async (url) => {
    const rs = await axios.post(proxy[current++ % proxy.length], { url });
    return rs.data.html
}

module.exports = { proxyGet }
