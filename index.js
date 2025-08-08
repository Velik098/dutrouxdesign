const { Telegraf, Markup } = require('telegraf');
const express = require('express');
const path = require('path');
const { Low } = require('lowdb');
const { JSONFile } = require('lowdb/node');
const { nanoid } = require('nanoid');
const axios = require('axios');
const crypto = require('crypto');
const bodyParser = require('body-parser');
require('dotenv').config();

const TERMINAL_KEY = '1754495953908DEMO';
const PASSWORD = '%woQMJBy3fIovnft';
const NOTIFY_URL = 'https://dutroux-1.onrender.com/webhook'; // твой Notify URL

// === ФУНКЦИЯ ГЕНЕРАЦИИ ТОКЕНА ===
function generateToken(params) {
  const sorted = Object.keys(params)
    .filter(key => key !== 'DATA' && key !== 'Receipt')
    .sort()
    .map(key => params[key])
    .join('') + PASSWORD;
  return crypto.createHash('sha256').update(sorted).digest('hex');
}

(async () => {
  const bot = new Telegraf(process.env.BOT_TOKEN);
  const app = express();
  const PORT = process.env.PORT || 10000;
  const WEBAPP_URL = 'https://dutroux-1.onrender.com';

  // === ИНИЦИАЛИЗАЦИЯ DB ===
  const adapter = new JSONFile('db.json');
  const db = new Low(adapter, { orders: [], balance: 0 });
  await db.read();
  db.data ||= { orders: [], balance: 0 };
  await db.write();

  // === BODY PARSER ===
  app.use(bodyParser.json());

  // === /start ===
  bot.start((ctx) => {
    ctx.reply(
      'Добро пожаловать в Dutroux Sell! Нажми кнопку ниже:',
      Markup.inlineKeyboard([
        Markup.button.webApp('🛒 Открыть магазин', `${WEBAPP_URL}/`)
      ])
    );
  });

  // === МАРШРУТ ДЛЯ ОПЛАТЫ ===
  app.post('/api/pay', async (req, res) => {
    const { amount, username, userId, items } = req.body;

    const orderId = 'ORD-' + Date.now();

    const requestData = {
      TerminalKey: TERMINAL_KEY,
      Amount: amount * 100,
      OrderId: orderId,
      Description: `Покупка от ${username || 'гость'} (Telegram ID: ${userId})`,
      SuccessURL: 'https://securepay.tinkoff.ru/html/payForm/success.html',
      FailURL: 'https://securepay.tinkoff.ru/html/payForm/fail.html',
      NotificationURL: NOTIFY_URL,
    };

    requestData.Token = generateToken(requestData);

    try {
      const response = await axios.post('https://securepay.tinkoff.ru/v2/Init', requestData);
      return res.json({ paymentUrl: response.data.PaymentURL, orderId });
    } catch (err) {
      console.error(err.response?.data || err.message);
      return res.status(500).json({ error: 'Ошибка при создании платежа' });
    }
  });

  // === ОБРАБОТКА WEBHOOK (если будешь использовать) ===
  app.post('/webhook', async (req, res) => {
    console.log('📥 Webhook получен:', req.body);
    res.sendStatus(200);
    // Здесь можно обновить статус заказа в БД
  });

  // === STATIC + BOT ===
  app.use(bot.webhookCallback('/bot'));
  bot.telegram.setWebhook(`${WEBAPP_URL}/bot`);
  app.use('/', express.static(path.join(__dirname)));

  app.listen(PORT, () => {
    console.log(`✅ WebApp доступен: http://localhost:${PORT}`);
  });
})();
