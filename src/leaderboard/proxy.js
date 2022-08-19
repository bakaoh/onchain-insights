const express = require("express");
const axios = require("axios");

const cache = {};
const app = express();
app.use(express.json());

app.get('/api/v1/leaderboard', async (req, res) => {
    const orderBy = req.query.orderby || "24h";
    const page = parseInt(req.query.page || "0");
    try {
        const rs = await axios.get(`http://localhost:9613/api/v1/leaderboard?orderby=${orderBy}&page=${page}`);
        cache[`${orderBy}_${page}`] = rs.data;
    } catch (err) { }
    res.json(cache[`${orderBy}_${page}`]);
})

async function start(port) {
    const startMs = Date.now();
    app.listen(port);
    console.log(`Service start at port ${port} (${Date.now() - startMs}ms)`)
}

start(9614);
