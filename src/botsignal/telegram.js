const TelegramBot = require("node-telegram-bot-api");
const Storage = require("./storage");

const EMOJI = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣'];

class Controller {
    constructor(telegramToken, portfolio) {
        this.storage = new Storage("db/controller.json");
        this.bot = new TelegramBot(telegramToken, { polling: true });
        this.portfolio = portfolio;
        this.onMessage = this.onMessage.bind(this);

        this.bot.on("polling_error", console.log);
        this.bot.on("message", this.onMessage);
    }

    async printPortfolio(chatId) {
        const table = this.portfolio.table;
        let html = `<b>BOT Portfolio (Buy/Current/Min/Max)</b>\n`;
        for (let token in table) {
            const { data } = table[token];
            if (Date.now() - data.ts > 172800000) continue;
            const win = data.price > table[token].cur;
            html += `\n ${win ? '👍' : '👎'} <a href="https://dextrading.io/${data.token}">${data.symbol}</a>: ${data.price}/${table[token].cur}/${table[token].min}/${table[token].max}`;
        }
        return this.bot.sendMessage(chatId, html, { parse_mode: "HTML" }).catch(console.log);
    }

    async printSetting(chatId) {
        const setting = this.storage.get(chatId);
        let html = `<b>BOT Settings</b>

${EMOJI[0]} ${setting[0] ? '👍' : '👎'} <code>FirstPool &gt 3days, Tx &gt 1.3 Tx[day-1], Vol &gt 1.3 Vol[day-1], Liquidity &gt $50k, Price &lt 1.30 Price[day-1]</code>
${EMOJI[1]} ${setting[1] ? '👍' : '👎'} <code>Vol &gt 1.3 Average[Vol[3day]], Liquidity &gt $50k, Price &lt 1.3 Price[day-1]</code>
${EMOJI[2]} ${setting[2] ? '👍' : '👎'} <code>Vol &gt 1.3 Average[Vol[7day]], Liquidity &gt $200k, Price &gt 1.1 Average[Price[7day]]</code>
${EMOJI[3]} ${setting[3] ? '👍' : '👎'} <code>FirstPool &gt 3days, Holder &gt 1.05 Holder[day-1] &gt 1.05 Holder[day-2], Vol &gt 1.1 Vol[day-1] &gt 1.1 Vol[day-2], Price &gt 1.03 Price[day-1] &gt 1.03 Price[day-2]</code>
${EMOJI[4]} ${setting[4] ? '👍' : '👎'} <code>FirstPool &lt 1day, Liquidity &gt $49.9k, Vol &gt $50k, BuyHolder &gt 50, SellTx &gt 3</code>`
        return this.bot.sendMessage(chatId, html, { parse_mode: "HTML" }).catch(console.log);
    }

    async sendSignal(id, data) {
        let html = `<b>BOT ${EMOJI[id]} Signal</b>

📛 Token: ${data.name} (${data.symbol})
〽️ Address: <a href="https://dextrading.io/${data.token}">${data.token}</a>
✔️ Listed On: ${data.cmc ? `<a href="https://coinmarketcap.com/currencies/${data.cmc.slug}">CoinMarketCap</a> ` : ''}${data.cgk ? `<a href="https://www.coingecko.com/en/coins/${data.cgk.id}">CoinGecko</a>` : ''}
📈 Price: $${data.price}
📢 DEX Volume (24h): $${data.volume24h}
🚀 DEX Txns (24h): ${data.tx24h}
💰 Liquidity: $${data.lp}
📅 First Pool: ${new Date(data.firstPool).toGMTString()}
✋ Holder: ${data.buyHolder ? data.buyHolder : data.dailyHolder[0]}
`
        const all = this.storage.all();
        for (let chatId in all) {
            if (all[chatId][id]) {
                await this.bot.sendMessage(chatId, html, { parse_mode: "HTML" }).catch(console.log);
            }
        }
    }

    async onMessage(msg) {
        console.log(JSON.stringify(msg));
        const chatId = msg.chat.id;
        const userId = msg.from.id;

        if (msg.txt == "/port") {
            return this.printPortfolio(chatId);
        }
        if (msg.text == "/start") {
            this.storage.set(chatId, [true, false, false, false, false]);
        } else if (msg.text.startsWith("/enable")) {
            const id = parseInt(msg.text.substr(8));
            const cur = this.storage.get(chatId);
            cur[id] = true;
            this.storage.set(chatId, cur);
        } else if (msg.text.startsWith("/disable")) {
            const id = parseInt(msg.text.substr(9));
            const cur = this.storage.get(chatId);
            cur[id] = false;
            this.storage.set(chatId, cur);
        } else if (msg.text == "/info") {
        } else return;
        return this.printSetting(chatId);
    }
}

module.exports = Controller;