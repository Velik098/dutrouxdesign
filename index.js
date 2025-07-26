const { Telegraf, Markup } = require('telegraf');
const express = require('express');
const path = require('path');

// Используем токен из переменной окружения
const bot = new Telegraf(process.env.BOT_TOKEN);

// Кнопка с мини-приложением
bot.start((ctx) => {
  ctx.reply(
    'Добро пожаловать! Нажмите кнопку ниже, чтобы открыть магазин:',
    Markup.inlineKeyboard([
      Markup.button.webApp('🛒 Открыть магазин', 'https://dutroux.onrender.com/webapp/')
    ])
  );
});

// Запускаем Telegram бота
bot.launch()
  .then(() => console.log('🤖 Бот успешно запущен!'))
  .catch((err) => console.error('Ошибка запуска бота:', err));

// Настраиваем Express для мини-приложения
const app = express();
const PORT = process.env.PORT || 10000;

app.use('/webapp', express.static(path.join(__dirname, 'webapp')));

app.listen(PORT, () => {
  console.log(`🌐 WebApp доступен по адресу: http://localhost:${PORT}/webapp`);
});
