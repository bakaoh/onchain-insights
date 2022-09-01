const TelegramBot = require("node-telegram-bot-api");
const Storage = require("./storage");

const EMOJI = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣'];

class Controller {
    constructor(telegramToken) {
        this.storage = new Storage("db/controller1.json");
        this.bot = new TelegramBot(telegramToken, { polling: true });
        this.lastSignal = {};
        this.onMessage = this.onMessage.bind(this);
        this.onCallback = this.onCallback.bind(this);

        this.bot.on("polling_error", (e) => console.log(JSON.stringify(e)));
        this.bot.on("message", this.onMessage);
        this.bot.on("callback_query", this.onCallback);
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
        // const table = this.portfolio.table;
        // let html = `<b>BOT Portfolio [Buy Date] (Buy/Current Price)</b>\n`;
        // for (let token in table) {
        //     const { data } = table[token];
        //     if (Date.now() - data.ts > 172800000) continue;
        //     const win = data.price > table[token].cur;
        //     html += `\n ${win ? '👍' : '👎'} <a href="https://dextrading.io/${data.token}">${data.symbol}</a> [${new Date(data.ts).toGMTString()}] $${data.price} / $${table[token].cur}`;
        // }
        // return this.bot.sendMessage(chatId, html, { parse_mode: "HTML" }).catch(console.log);
    }

    async sendSignal(ids, data) {
        if (ids.length == 0) return;
        const all = this.storage.all();
        for (let chatId in all) {
            let botIds = ids.filter(id => all[chatId][id]);
            if (botIds.length == 0) continue;

            const last = this.lastSignal[chatId] || {};
            if (last[data.token] && Date.now() - last[data.token] < 43200000) continue;
            last[data.token] = Date.now();
            this.lastSignal[chatId] = last;

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
        this.bot.answerCallbackQuery(cb.id, { text: "Ok" }).catch(console.log);
        const option = {
            parse_mode: "HTML",
            chat_id: cb.message.chat.id,
            message_id: cb.message.message_id
        };
        console.log(cb.data, option);
        await this.bot.editMessageReplyMarkup({ inline_keyboard }, option).catch(console.log);
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
            const id = parseInt(msg.text.substr(8));
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