const Web3 = require("web3");

let current = {
    web3: undefined,
    isSupportFactory: () => true,
    address: {}
}

const getConfig = () => current;

const useAvalanche = () => {
    const web3 = new Web3("https://api.avax.network/ext/bc/C/rpc");
    web3.eth.handleRevert = true;
    current.address.common = '0xA8421D936FB34b6aA69Dc2249683303bc457c9E4';
}

module.exports = { getConfig, useAvalanche };