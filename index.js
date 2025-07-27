const { Telegraf, Markup } = require('telegraf');
const express = require('express');
const path = require('path');
const bot = new Telegraf(process.env.BOT_TOKEN);
const app = express();
const PORT = process.env.PORT || 10000;
const WEBAPP_URL = 'https://dutroux-1.onrender.com'; // твой render-URL
// Кнопка запуска WebApp
bot.start((ctx) => {
  ctx.reply(
    'Добро пожаловать в Dutroux Sell! Нажмите кнопку ниже, чтобы открыть магазин:',
    Markup.inlineKeyboard([
      Markup.button.webApp('🛒 Открыть магазин', `${WEBAPP_URL}/`)
    ])
  );
});
// Middleware
app.use(bot.webhookCallback('/bot'));
bot.telegram.setWebhook(`${WEBAPP_URL}/bot`);
// Раздача HTML/CSS как WebApp
app.use('/', express.static(path.join(__dirname)));
// Запуск сервера
app.listen(PORT, () => {
  console.log(`🌐 WebApp доступен по адресу: http://localhost:${PORT}`);
});
