const PairModel = require("./pair");
const SyncModel = require("./sync");

const pairModel = new PairModel();
const syncModel = new SyncModel();

module.exports = { pairModel, syncModel };