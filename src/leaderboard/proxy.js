const express = require("express");
const axios = require("axios");

const cache = {};
const app = express();
app.use(express.json());

app.get('/api/v1/leaderboard', async (req, res) => {
    const orderBy = req.query.orderby || "24h";
    try {
        const rs = await axios.get(`http://localhost:9613/api/v1/leaderboard?orderby=${orderBy}`);
        cache[orderBy] = rs.data;
    } catch (err) { }
    res.json(cache[orderBy]);
})

async function start(port) {
    const startMs = Date.now();
    app.listen(port);
    console.log(`Service start at port ${port} (${Date.now() - startMs}ms)`)
}

start(9614);
