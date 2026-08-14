export class TelegramClient {
    token;
    fetchImpl;
    baseUrl;
    pollingTimeoutSec;
    constructor(token, options = {}) {
        if (!token) {
            throw new Error('bot token is required');
        }
        this.token = token;
        this.fetchImpl = options.fetch ?? fetch;
        this.baseUrl = options.baseUrl ?? 'https://api.telegram.org';
        this.pollingTimeoutSec = options.pollingTimeoutSec ?? 30;
    }
    redact(message) {
        return message.split(this.token).join('***');
    }
    async call(method, body) {
        const url = `${this.baseUrl}/bot${this.token}/${method}`;
        try {
            const init = {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
            };
            if (body !== undefined) {
                init.body = JSON.stringify(body);
            }
            const response = await this.fetchImpl(url, init);
            const json = (await response.json());
            if (!json.ok) {
                throw new Error(json.description ?? 'Telegram API error');
            }
            return json.result;
        }
        catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            throw new Error(this.redact(message));
        }
    }
    async getMe() {
        return this.call('getMe');
    }
    async getUpdates(offset) {
        const body = {
            timeout: this.pollingTimeoutSec,
            allowed_updates: ['message', 'callback_query'],
        };
        if (offset !== undefined) {
            body.offset = offset;
        }
        return this.call('getUpdates', body);
    }
    async sendMessage(chatId, text, parseMode, replyMarkup) {
        const body = { chat_id: chatId, text };
        if (parseMode !== undefined) {
            body.parse_mode = parseMode;
        }
        if (replyMarkup !== undefined) {
            body.reply_markup = replyMarkup;
        }
        return this.call('sendMessage', body);
    }
    async sendChatAction(chatId, action) {
        return this.call('sendChatAction', { chat_id: chatId, action });
    }
    async answerCallbackQuery(callbackQueryId, text) {
        const body = { callback_query_id: callbackQueryId };
        if (text !== undefined)
            body.text = text;
        return this.call('answerCallbackQuery', body);
    }
}
