const { Telegraf, Markup } = require('telegraf');
const express = require('express');
const path = require('path');

const bot = new Telegraf(process.env.BOT_TOKEN);

bot.start((ctx) => {
  ctx.reply(
    'Добро пожаловать! Нажмите кнопку ниже, чтобы открыть магазин:',
    Markup.inlineKeyboard([
      Markup.button.webApp('🛒 Открыть магазин', 'https://dutroux.onrender.com/')
    ])
  );
});

bot.launch().then(() => console.log('🤖 Бот запущен!'));

const app = express();
const PORT = process.env.PORT || 10000;

// Раздача статики из корня
app.use('/', express.static(path.join(__dirname)));

app.listen(PORT, () => {
  console.log(`🌐 WebApp доступен по адресу: http://localhost:${PORT}`);
});
