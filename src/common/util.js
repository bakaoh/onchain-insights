const fs = require('fs');
const crypto = require('crypto')
const LineByLine = require('line-by-line');
const { web3, ContractAddress } = require("./network").getConfig();
const CommonAbi = require('../abis/Common.json');

const generateRandom = (
    length = 20,
    wishlist = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'
) => Array.from(crypto.randomFillSync(new Uint32Array(length))).map((x) => wishlist[x % wishlist.length]).join('')

const sleep = (ms) => new Promise(res => setTimeout(res, ms));

// contract utils
const common = new web3.eth.Contract(CommonAbi, ContractAddress.common);

async function getTokenMetadata(addresses) {
    const { names, symbols, decimals } = await common.methods.getMultiMetadata(addresses).call();
    const rs = [];
    for (let i = 0; i < addresses.length; i++) {
        rs.push([addresses[i], names[i], symbols[i], decimals[i]]);
    }
    return rs;
}

async function checkIsContract(addresses) {
    const areContracts = await common.methods.areContracts(addresses).call();
    const rs = [];
    for (let i = 0; i < addresses.length; i++) {
        if (!areContracts[i]) rs.push(addresses[i]);
    }
    return rs;
}

// io utils
function getLastLine(file, minLen = 3) {
    const lr = new LineByLine(file);
    let lastLine = "";
    lr.on('line', (line) => {
        if (line.length >= minLen) lastLine = line;
    });
    return new Promise((res, rej) =>
        lr.on('end', () => res(lastLine))
            .on('error', err => rej(err)));
}

function getLastFile(dir) {
    let files = fs.readdirSync(dir);
    if (files.length == 0) return "";
    return files.sort((a, b) => parseInt(b) - parseInt(a))[0];
}

function getLastFiles(dir) {
    let files = fs.readdirSync(dir);
    return files.sort((a, b) => parseInt(b) - parseInt(a));
}

// format utils
const toBN = (s) => web3.utils.toBN(s);
const ZERO = toBN(0);

const calcPrice = ([reserve0, reserve1]) => {
    if (reserve0 == ZERO || reserve1 == ZERO) return 0;
    return parseInt(reserve1.mul(toBN("100000000")).div(reserve0)) / 100000000;
}

const getNumber = (bn, n = 0, decimals = 18) => parseInt(bn.substr(0, bn.length + n - decimals) || '0') / (10 ** n);

module.exports = {
    sleep, generateRandom,
    getTokenMetadata, checkIsContract,
    ZERO, toBN, calcPrice, getNumber,
    getLastLine, getLastFile, getLastFiles
}