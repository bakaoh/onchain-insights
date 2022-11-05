const axios = require('axios');
const { parse } = require('node-html-parser')
const { proxyGet } = require('./proxy');

const toInt = (childNodes) => parseInt(childNodes.toString().replace(/(&nbsp;|\$|,)/g, ''))
const toFloat = (childNodes) => parseFloat(childNodes.toString().replace(/(&nbsp;|\$|,)/g, ''))

const getTopTokens = async () => {
    const rs = [];
    for (let page = 1; page <= 3; page++) {
        const html = await proxyGet(`https://bscscan.com/tokens?sort=marketcap&order=desc&p=${page}&ps=100`);
        const root = parse(html);
        const tr_list = root.querySelectorAll('#tblResult tbody tr');
        for (let i in tr_list) {
            const tr = tr_list[i]
            const td_list = tr.querySelectorAll('td');

            const marketCap = toInt(td_list[5].childNodes);
            const onchainMarketCap = toInt(td_list[6].childNodes);
            const holders = toInt(td_list[7].childNodes);

            const text = tr.querySelector('.text-primary');
            const name = text.childNodes.toString();
            const address = text._attrs['href'].substr(7);
            const symbol = name.match(/\((.*)\)/)[1]
            rs.push({ name, address, symbol, marketCap, onchainMarketCap, holders });
        }
    }
    return rs;
}

const getTopHolders = async (token) => {
    const rs = [];
    for (let page = 1; page <= 4; page++) {
        const html = await proxyGet(`https://bscscan.com/token/generic-tokenholders2?m=normal&a=${token}&p=${page}`);
        const root = parse(html);
        const tr_list = root.querySelectorAll('table tbody tr');
        for (let i in tr_list) {
            const tr = tr_list[i]
            const td_list = tr.querySelectorAll('td');

            const quantity = toFloat(td_list[2].childNodes);
            const value = toFloat(td_list[4].childNodes);

            const isContract = td_list[1].querySelector('span i') != null;
            const text = td_list[1].querySelector('span a');
            const name = text.childNodes.toString();
            const address = text.rawAttrs.substr(58, 42);
            rs.push({ name, address, isContract, quantity, value });
        }
    }
    return rs;
}

const getTokenTransfers = async (holder) => {
    const rs = await proxyGet(`https://api.bscscan.com/api?module=account&action=tokentx&address=${holder}&page=1&offset=5000&sort=desc&apikey=${process.env.BSCSCAN_API_KEY}`)
    return rs.result;
}

module.exports = { getTopHolders, getTopTokens, getTokenTransfers };