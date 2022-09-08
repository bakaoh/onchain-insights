const TelegramBot = require("node-telegram-bot-api");
const Storage = require("./storage");
const Portfolio = require("./portfolio");

const EMOJI = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣'];

class Controller {
    constructor(telegramToken) {
        this.storage = new Storage("db/controller1.json");
        this.bot = new TelegramBot(telegramToken, { polling: true });
        this.users = {};
        this.onMessage = this.onMessage.bind(this);
        this.onCallback = this.onCallback.bind(this);
        this.prices = {};

        this.bot.on("polling_error", (e) => console.log(JSON.stringify(e)));
        this.bot.on("message", this.onMessage);
        this.bot.on("callback_query", this.onCallback);
    }

    getUser(chatId) {
        if (!this.users[chatId]) this.users[chatId] = new Portfolio(chatId);
        return this.users[chatId];
    }

    updatePrice(token, price) {
        this.prices[token] = price;
    }

    async printWelcome(chatId) {
        let html = `<b>✨✨✨Welcome to Dextrading BOT✨✨✨</b>

Please go <a href="https://dextrading.io/bot">here</a> to create your first bot 🤖`
        return this.bot.sendMessage(chatId, html, { parse_mode: "HTML" }).catch(console.log);
    }

    async printList(chatId) {
        const settings = this.storage.get(chatId);
        let html = `<b>BOT List</b>\n`
        for (let i in settings) {
            if (settings[i]) html += `\n🤖 <a href="https://dextrading.io/bot/${i}">${i}</a>`
        }
        return this.bot.sendMessage(chatId, html, { parse_mode: "HTML" }).catch(console.log);
    }

    async printPortfolio(chatId) {
        const user = this.getUser(chatId);
        const table = user.all();
        let html = `<b>BOT Portfolio</b>\n`;
        for (let token in table) {
            if (table[token].tx) {
                const data = table[token].tx[table[token].tx.length - 1];
                const diff = this.prices[token] ? 100 * (this.prices[token] - data.price) / data.price : 0;
                html += `\n <a href="https://dextrading.io/${token}">${table[token].symbol}</a> [${new Date(data.ts).toGMTString()}] $${data.price} ${diff ? `(${diff.toFixed(2)}%)` : ''}`;
            }
        }
        return this.bot.sendMessage(chatId, html, { parse_mode: "HTML" }).catch(console.log);
    }

    async sendSignal(ids, data) {
        if (ids.length == 0) return;
        const all = this.storage.all();
        for (let chatId in all) {
            let botIds = ids.filter(id => all[chatId][id]);
            if (botIds.length == 0) continue;
            const user = this.getUser(chatId);
            if (Date.now() - user.lastSignal(data.token) < 43200000) continue;
            user.setLastSignal(data.token, Date.now(), data.symbol);

            let html = `<b>BOT [${botIds.join()}] Signal</b>

📛 Token: ${data.name} (${data.symbol})
〽️ Address: <a href="https://dextrading.io/${data.token}">${data.token}</a>
✔️ Listed On: ${data.cmc ? `<a href="https://coinmarketcap.com/currencies/${data.cmc.slug}">CoinMarketCap</a> ` : ''}${data.cgk ? `<a href="https://www.coingecko.com/en/coins/${data.cgk.id}">CoinGecko</a>` : ''}
📈 Price: $${data.price1h[0]}
📢 DEX Volume (24h): $${data.volume[0]}
🚀 DEX Txns (24h): ${data.tx[0]}
💰 Liquidity: $${data.liquidity[0]}
📅 First Pool: ${new Date(data.firstPool).toGMTString()}
✋ Holder: ${data.holder[0]}
`
            await this.bot.sendMessage(chatId, html, {
                parse_mode: "HTML",
                reply_markup: {
                    inline_keyboard: [[
                        { text: "BUY NOW", callback_data: `BUY_${data.token}` },
                    ]]
                },
            }).catch(console.log);
        }
    }

    async onCallback(cb) {
        if (cb.data.startsWith("BUY_")) {
            const token = cb.data.substr(4);
            let answer = ""
            if (!this.prices[token]) {
                answer = "Too late!";
            } else {
                const user = this.getUser(cb.message.chat.id);
                user.buy(token, this.prices[token], Date.now());
                answer = "Succeed!";
            }
            this.bot.answerCallbackQuery(cb.id, { text: answer }).catch(console.log);
            const option = {
                parse_mode: "HTML",
                chat_id: cb.message.chat.id,
                message_id: cb.message.message_id
            };
            await this.bot.editMessageReplyMarkup({ inline_keyboard: [] }, option).catch(console.log);
        }
    }

    async onMessage(msg) {
        console.log(JSON.stringify(msg));
        const chatId = msg.chat.id;
        const userId = msg.from.id;

        if (msg.text == "/start") {
            this.storage.set(chatId, {});
            return this.printWelcome(chatId);
        } else if (msg.text.startsWith("/add")) {
            const id = msg.text.substr(5);
            const cur = this.storage.get(chatId);
            cur[id] = true;
            this.storage.set(chatId, cur);
            return this.printList(chatId);
        } else if (msg.text.startsWith("/remove")) {
            const id = msg.text.substr(8);
            const cur = this.storage.get(chatId);
            cur[id] = false;
            this.storage.set(chatId, cur);
            return this.printList(chatId);
        } else if (msg.text == "/list") {
            return this.printList(chatId);
        } else if (msg.text == "/wallet") {
            return this.printPortfolio(chatId);
        }
    }
}

module.exports = Controller;