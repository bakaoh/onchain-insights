const Web3 = require("web3");

let current = {
    web3: undefined,
    isSupportFactory: () => true,
    isUSD: () => false,
    ContractAddress: {},
    cacheBlockNumber: 0,
    lastCacheTs: 0,
    getBlockNumber: async () => {
        if (current.lastCacheTs < Date.now() + 3000) {
            current.cacheBlockNumber = await current.web3.eth.getBlockNumber();
            current.lastCacheTs = Date.now();
        }
        return current.cacheBlockNumber;
    }
}

const getConfig = () => current;

const useAvalanche = () => {
    const usd = [
        '0xc7198437980c041c805A1EDcbA50c1Ce5db95118', // USDT.e
        '0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7', // USDt
        '0xA7D7079b0FEaD91F3e65f86E8915Cb59c1a4C664', // USDC.e
        '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E', // USDC
        '0x19860CCB0A68fd4213aB9D8266F7bBf05A8dDe98', // BUSD.e
        '0xd586E7F844cEa2F87f50152665BCbc2C279D8d70', // DAI.e
    ]
    current.web3 = new Web3("https://api.avax.network/ext/bc/C/rpc");
    current.ContractAddress.common = '0xA8421D936FB34b6aA69Dc2249683303bc457c9E4';
    current.ContractAddress.wrappedNative = '0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7';
    current.ContractAddress.nativePricePair = '0xf4003F4efBE8691B60249E6afbD307aBE7758adb'; // JOE USDC-WAVAX 
    current.isUSD = (token) => usd.includes(token);
}

const useBSC = () => {
    const usd = [
        '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56', // BUSD
        '0x55d398326f99059fF775485246999027B3197955', // USDT
    ]
    const supportFactory = [
        '0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73', // Pancake
        '0x0841BD0B734E4F5853f0dD8d7Ea041c241fb0Da6', // Apeswap
        '0x858E3312ed3A876947EA49d572A7C42DE08af7EE', // Biswap
    ]
    current.web3 = new Web3("https://bsc-dataseed3.ninicoin.io/");
    current.ContractAddress.common = '0x3E694aCF551425A657A7F974ab6F876E3b0822Fe';
    current.ContractAddress.wrappedNative = '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c';
    current.ContractAddress.nativePricePair = '0x58F876857a02D6762E0101bb5C46A8c1ED44Dc16'; // Pancake WBNB-BUSD 
    current.isUSD = (token) => usd.includes(token);
    current.isSupportFactory = (factory) => supportFactory.includes(factory);
}

module.exports = { getConfig, useAvalanche, useBSC };