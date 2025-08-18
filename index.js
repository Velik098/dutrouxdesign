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

const TERMINAL_KEY = '1754495953908DEMO'; // ⚠️ Замени на боевой из Т-Бизнес
const PASSWORD = '%woQMJBy3fIovnft';     // ⚠️ Замени на боевой из Т-Бизнес
const NOTIFY_URL = 'https://dutroux-1.onrender.com/webhook'; // колбэк

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
  if (!db.data) db.data = { orders: [], balance: 0 };
  await db.write();

  // === BODY PARSER ===
  app.use(bodyParser.json());

  // === Telegram старт ===
  bot.start((ctx) => {
    ctx.reply(
      'Добро пожаловать в Dutroux Sell! Нажми кнопку ниже',
      Markup.inlineKeyboard([
        Markup.button.webApp('🛒 Открыть магазин', `${WEBAPP_URL}`)
      ])
    );
  });

  // === Роут для фронта (создание платежа) ===
  app.post('/create-payment', async (req, res) => {
    try {
      const { amount, userId } = req.body;

      const params = {
        TerminalKey: TERMINAL_KEY,
        Amount: amount * 100, // копейки
        OrderId: nanoid(),
        Description: "Пополнение баланса",
        NotificationURL: NOTIFY_URL
      };

      params.Token = generateToken(params);

      const response = await axios.post("https://securepay.tinkoff.ru/v2/Init", params);
      res.json(response.data);
    } catch (err) {
      console.error("Ошибка при создании платежа:", err.message);
      res.status(500).json({ error: "Ошибка соединения с сервером" });
    }
  });

  // === Колбэк от Тинькофф (после оплаты) ===
  app.post('/webhook', async (req, res) => {
    const { Status, OrderId, Amount } = req.body;

    if (Status === "CONFIRMED") {
      await db.read();
      db.data.balance += Amount / 100; // прибавляем рубли
      await db.write();
      console.log("✅ Баланс пополнен на", Amount / 100, "руб.");
    }

    res.sendStatus(200);
  });

  // === Отдаём фронт (index.html) ===
  app.use(express.static(path.join(__dirname)));

  // === Запуск ===
  bot.launch();
  app.listen(PORT, () => console.log(`Сервер запущен на порту ${PORT}`));
})();
