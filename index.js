const { Telegraf, Markup } = require('telegraf');
const express = require('express');
const path = require('path');
const { Low } = require('lowdb');
const { JSONFile } = require('lowdb/node');
const { nanoid } = require('nanoid');
const YooKassa = require('@appigram/yookassa-node').YooKassa;

(async () => {
  const bot = new Telegraf(process.env.BOT_TOKEN);
  const app = express();
  const PORT = process.env.PORT || 10000;
  const WEBAPP_URL = 'https://dutroux-1.onrender.com';

  // === ИНИЦИАЛИЗАЦИЯ lowdb ===
  const adapter = new JSONFile('db.json');
  const db = new Low(adapter, { orders: [], balance: 0 });
  await db.read();
  db.data ||= { orders: [], balance: 0 };
  await db.write();

  // === ОБРАБОТКА КОМАНДЫ /start ===
  bot.start((ctx) => {
    ctx.reply(
      'Добро пожаловать в Dutroux Sell! Нажми кнопку ниже:',
      Markup.inlineKeyboard([
        Markup.button.webApp('🛒 Открыть магазин', `${WEBAPP_URL}/`)
      ])
    );
  });

  // === STATIC + BOT ===
  app.use(bot.webhookCallback('/bot'));
  bot.telegram.setWebhook(`${WEBAPP_URL}/bot`);
  app.use('/', express.static(path.join(__dirname)));

  app.listen(PORT, () => {
    console.log(`🌐 WebApp доступен по адресу: http://localhost:${PORT}`);
  });
})();
