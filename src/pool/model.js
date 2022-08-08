const PairModel = require("./pair");
const SyncModel = require("./sync");
const SwapModel = require("./swap");

const pairModel = new PairModel();
const syncModel = new SyncModel();
const swapModel = new SwapModel();

module.exports = { pairModel, syncModel, swapModel };