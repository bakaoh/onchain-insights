const TelegramBot = require("node-telegram-bot-api");
const Storage = require("./storage");

class Controller {
    constructor(telegramToken) {
        this.storage = new Storage("db/controller.json");
        this.bot = new TelegramBot(telegramToken, { polling: true });
        this.onMessage = this.onMessage.bind(this);
        this.onCallback = this.onCallback.bind(this);

        this.bot.on("polling_error", console.log);
        this.bot.on("message", this.onMessage);
        this.bot.on("callback_query", this.onCallback);
    }

    async printSetting(chatId) {
        const setting = this.storage.get(chatId);
        let html = `<b>BOT LIST</b>`
        for (let i = 0; i < setting.length; i++) {
            html += `- <b>Bot ${i}</b>: ${setting[i] ? 'enabled' : 'disabled'}`
        }
        return this.bot.sendMessage(chatId, html, { parse_mode: "HTML" }).catch(console.log);
    }

    async printInfo(chatId) {
        let html = `<b>BOT CONFIG</b>`
        html += `- <b>Bot 0</b>: Đã tạo pool đầu tiên >3 ngày, TXNS >30% ngày trước đó, Volume > 30% ngày trước đó, Liquidity Pool  >50k, giá Tăng <30% (so với ngày trước đó)`
        html += `- <b>Bot 1</b>: Volume > 30% so với volume trung bình của 3 ngày trước đó, Liquidity Pool >50k, giá Tăng <30% (so với ngày trước đó)`
        html += `- <b>Bot 2</b>: Volume > 30% so với volume trung bình của 7 ngày trước đó, Liquidity Pool >200k, giá Tăng >10% (so với giá trung bình 7 ngày trước đó)`
        html += `- <b>Bot 3</b>: Đã tạo pool >3 ngày, Holder tăng >5% liên tục 3 ngày đều tăng, Volume tăng >10% liên tục 3 ngày, giá tăng >3% liên tục 3 ngày`
        html += `- <b>Bot 4</b>: Token tạo pool <24h, Liquidity Pool >49,9k, Volume từ lúc tạo pool đầu tiên >50k, Holder >50 (Holder mua từ lệnh swap), >3 lệnh sell (3 ví khác nhau, khác volume nhau)`
        return this.bot.sendMessage(chatId, html, { parse_mode: "HTML" }).catch(console.log);
    }

    async sendSignal(id, data) {
        let html = `<b>BOT ${id} SIGNAL</b>`
        html += `- <b>Token</b>: ${data.token}`
        html += `- <b>Price</b>: $${data.price}`
        html += `- <b>Total LP</b>: $${data.lp}`
        html += `- <b>Volume (24h)</b>: ${data.volume}`
        html += `- <b>Tx Count (24h)</b>: ${data.tx}`
        html += `- <b>First Pool</b>: ${new Date(data.firstPool)}`
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
        if (msg.text == "/info") {
            return this.printInfo(chatId);
        }
        if (msg.text == "/start") {
            this.storage.set(chatId, [true, true, true, true, true]);
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
        }
        return this.printSetting(chatId);
    }
}

module.exports = Controller;