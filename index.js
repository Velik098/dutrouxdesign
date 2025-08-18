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

const TERMINAL_KEY = '1754495953908DEMO'; // ⚠️ Замени на боевой
const PASSWORD = '%woQMJBy3fIovnft';     // ⚠️ Замени на боевой
const NOTIFY_URL = 'https://dutroux-1.onrender.com/webhook';

// === ФУНКЦИЯ ГЕНЕРАЦИИ ТОКЕНА ===
function generateToken(params) {
  const sorted = Object.keys(params)
    .filter(key => key !== 'DATA' && key !== 'Receipt' && key !== 'Token')
    .sort()
    .map(key => `${key}=${params[key]}`)
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

      const amt = Math.floor(Number(amount) || 0);
      if (!amt || amt < 10) {
        return res.status(400).json({ error: "Некорректная сумма (минимум 10 ₽)" });
      }

      const params = {
        TerminalKey: TERMINAL_KEY,
        Amount: amt * 100, // копейки
        OrderId: nanoid(),
        Description: "Пополнение баланса",
        NotificationURL: NOTIFY_URL
      };

      params.Token = generateToken(params);

      console.log("📤 Отправляем в Т-Банк:", params); // Логируем запрос

      const response = await axios.post("https://securepay.tinkoff.ru/v2/Init", params);
      console.log("📥 Ответ от Т-Банк:", response.data); // Логируем ответ

      const d = response.data || {};
      if (d.PaymentURL && !d.paymentUrl) d.paymentUrl = d.PaymentURL;
      res.json(d);
    } catch (err) {
      console.error("❌ Ошибка при создании платежа:", err.message);
      res.status(500).json({ error: "Ошибка соединения с сервером" });
    }
  });

  // === Колбэк от Тинькофф (после оплаты) ===
  app.post('/webhook', async (req, res) => {
    try {
      const body = req.body || {};
      console.log("📩 Вебхук:", body);

      let tokenOk = false;
      if (body.Token) {
        const data = { ...body };
        delete data.Token;
        const localToken = generateToken(data);
        tokenOk = (localToken === body.Token);
      }

      const { Status, Amount } = body;

      if (Status === "CONFIRMED" && tokenOk) {
        await db.read();
        db.data.balance += Amount / 100; // копейки → рубли
        await db.write();
        console.log("✅ Баланс пополнен на", Amount / 100, "руб.");
      } else {
        console.log("❌ Подпись не совпала или статус не CONFIRMED");
      }
    } catch (e) {
      console.error("Ошибка в webhook:", e.message);
    }

    res.sendStatus(200);
  });

  // === Отдаём фронт (index.html) ===
  app.use(express.static(path.join(__dirname)));

  // === Запуск ===
  bot.launch();
  app.listen(PORT, () => console.log(`🚀 Сервер запущен на порту ${PORT}`));
})();
