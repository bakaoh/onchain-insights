const express = require("express");
const axios = require("axios");

const cache = {};
const app = express();
app.use(express.json());

app.get('/api/v1/leaderboard', async (req, res) => {
    const orderBy = req.query.orderby || "24h";
    const asc = req.query.asc == 'true';
    const page = parseInt(req.query.page || "0");
    const cacheKey = `${orderBy}_${page}_${asc}`;
    try {
        const rs = await axios.get(`http://localhost:9613/api/v1/leaderboard?orderby=${orderBy}&page=${page}&asc=${asc}`);
        cache[cacheKey] = rs.data;
    } catch (err) { }
    res.json(cache[cacheKey]);
})

async function start(port) {
    const startMs = Date.now();
    app.listen(port);
    console.log(`Service start at port ${port} (${Date.now() - startMs}ms)`)
}

start(9614);
