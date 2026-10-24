/** No external network calls. Adapter returns preview text, worker persists it as an inbox entry. */
export const mockSmsAdapter = Object.freeze({
  channel: 'SMS',
  async send({phone,message}) { if (!/^\+?[1-9]\d{7,14}$/.test(phone)) throw new Error('Missing valid demo phone'); return {preview:`[MOCK SMS to ${phone}] ${message}`}; }
});
export const mockTelegramAdapter = Object.freeze({
  channel: 'TELEGRAM',
  async send({chatId,message}) { if (!chatId) throw new Error('Telegram demo not linked'); return {preview:`[MOCK TELEGRAM] ${message}`}; }
});
