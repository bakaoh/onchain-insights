const TelegramBot = require("node-telegram-bot-api");
const Storage = require("./storage");
const Portfolio = require("./portfolio");
const EngScript = require("./script/eng");
const VieScript = require("./script/vie");

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

    getScript(chatId) {
        const userConfig = this.storage.get(chatId + "_config");
        if (userConfig && userConfig.lang == "VIE") return VieScript;
        return EngScript;
    }

    async sendLanguage(chatId) {
        let html = `Choose your preferred language: ✨✨✨`
        await this.bot.sendMessage(chatId, html, {
            parse_mode: "HTML",
            reply_markup: {
                inline_keyboard: [
                    [{ text: "🇺🇸 English", callback_data: `LANG_ENG` }],
                    [{ text: "🇻🇳 Vietnamese", callback_data: `LANG_VIE` },]
                ]
            },
        }).catch(console.log);
    }

    async printHelp(chatId, withFooter = false) {
        const lang = this.getScript(chatId);
        let html = lang.helpMsg;
        if (withFooter) { html += lang.pasteMsg; }
        this.bot.sendMessage(chatId, html, { parse_mode: "HTML" }).catch(console.log);
    }

    async printList(chatId, cmd, botId = undefined) {
        const lang = this.getScript(chatId);
        const settings = this.storage.get(chatId);
        let html = `<b>${lang.botListHeader}</b>\n`
        let list = '';
        for (let i in settings) {
            if (!settings[i]) continue;
            if (cmd == "remove") {
                list += `\n🗑 /remove_${i}`;
            } else {
                list += `\n🤖 <a href="https://spiritx.org/spiritx-bots/signal-bot/${i}">${i}</a>`;
            }
        }
        if (cmd == "add") {
            html += `\n` + (botId ? `Bot <b>#${botId}</b> ${lang.botAdded}` : '');
            html += list ? (lang.botAddList + list) : lang.botListEmpty;
        } else if (cmd == "remove") {
            html += `\n` + (botId ? `${lang.botRemoved} bot <b>#${botId}</b>. ` : '');
            html += list ? (lang.botRemoveList + list) : lang.botRemoveEmpty;
        } else if (cmd == "list") {
            html += `\n` + (list ? (lang.botList + list) : lang.botListEmpty);
        }
        return this.bot.sendMessage(chatId, html, { parse_mode: "HTML" }).catch(console.log);
    }

    async printPortfolio(chatId, cmd, txInfo = undefined) {
        const lang = this.getScript(chatId);
        const user = this.getUser(chatId);
        const table = user.all();
        let html = `<b>${lang.portfolioHeader}</b>\n`;
        let list = '';
        for (let token in table) {
            if (!table[token].tx) continue;
            for (let i in table[token].tx) {
                if (cmd == "sell") {
                    const orderId = `${token.substr(37)}${i}`
                    list += `\n✂ ${table[token].symbol} /sell_${orderId}`;
                } else {
                    const data = table[token].tx[i];
                    const diff = this.prices[token] ? 100 * (this.prices[token] - data.price) / data.price : 0;
                    list += `\n💎 <a href="https://spiritx.org/trade/${token}">${table[token].symbol}</a> ${lang.buyAt} [${new Date(data.ts).toLocaleString()}] ${lang.price}: $${data.price} ${diff ? `(${diff.toFixed(2)}%)` : ''}`;
                }
            }
        }
        if (cmd == "wallet") {
            html += `\n` + (list ? (lang.portfolioList + list) : lang.portfolioEmpty);
        } else if (cmd == "buy") {
            html += `\n` + (txInfo ? `${lang.portfolioBought} <b>#${txInfo.symbol}</b>. ` : '');
            html += list ? (lang.portfolioList + list) : lang.portfolioEmpty;
        } else if (cmd == "sell") {
            if (txInfo) {
                html += `\n${lang.portfolioSold} <b>#${txInfo.symbol}</b>. `;
                const diff = this.prices[txInfo.token] ? 100 * (this.prices[txInfo.token] - txInfo.buyPrice) / txInfo.buyPrice : 0;
                html += `\n${diff > 0 ? '💸' : '💣'} Token <b>#${txInfo.symbol}</b> ${diff > 0 ? lang.profit : lang.loss}: ${diff.toFixed(2)}%\n`
            }
            html += `\n` + (list ? (lang.portfolioListSell + list) : lang.portfolioEmptySell);
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
〽️ Address: <a href="https://spiritx.org/trade/${data.token}">${data.token}</a>
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
        if (cb.data.startsWith("LANG_")) {
            const lang = cb.data.substr(5);
            const chatId = cb.from.id;
            this.storage.set(chatId + "_config", { lang });
            await this.printHelp(chatId, true);
        } else if (cb.data.startsWith("BUY_")) {
            const token = cb.data.substr(4);
            if (!this.prices[token]) {
                await this.bot.answerCallbackQuery(cb.id, { text: "Too late!" }).catch(console.log);
            } else {
                const user = this.getUser(cb.message.chat.id);
                const txInfo = user.buy(token, this.prices[token], Date.now());
                await this.printPortfolio(cb.from.id, "buy", txInfo);
            }
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
            return this.sendLanguage(chatId);
        } else if (msg.text == "/language") {
            return this.sendLanguage(chatId);
        } else if (msg.text == "/help") {
            return this.printHelp(chatId);
        } else if (msg.text == "/add") {
            return this.printList(chatId, "add");
        } else if (msg.text.startsWith("/add")) {
            const id = msg.text.substr(5).trim();
            const cur = this.storage.get(chatId);
            cur[id] = true;
            this.storage.set(chatId, cur);
            return this.printList(chatId, "add", id);
        } else if (msg.text == "/remove") {
            return this.printList(chatId, "remove");
        } else if (msg.text.startsWith("/remove")) {
            const id = msg.text.substr(8).trim();
            const cur = this.storage.get(chatId);
            cur[id] = false;
            this.storage.set(chatId, cur);
            return this.printList(chatId, "remove", id);
        } else if (msg.text == "/list") {
            return this.printList(chatId, "list");
        } else if (msg.text == "/wallet") {
            return this.printPortfolio(chatId, "wallet");
        } else if (msg.text == "/sell") {
            return this.printPortfolio(chatId, "sell");
        } else if (msg.text.startsWith("/sell")) {
            const orderId = msg.text.substr(6).trim();
            const address = orderId.substr(0, 5);
            const idx = orderId.substr(5);
            const user = this.getUser(chatId);
            const txInfo = user.sell(address, idx);
            return this.printPortfolio(chatId, "sell", txInfo);
        }
    }
}

module.exports = Controller;