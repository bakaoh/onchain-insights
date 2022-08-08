const PairModel = require("./pair");
const TokenModel = require("./token");

const pairModel = new PairModel();
const tokenModel = new TokenModel();

module.exports = { pairModel, tokenModel };