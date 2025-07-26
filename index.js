const express = require('express');
const { Telegraf } = require('telegraf');
const path = require('path');

const bot = new Telegraf('YOUR_TELEGRAM_BOT_TOKEN');

const app = express();
const PORT = process.env.PORT || 3000;

app.use('/webapp', express.static(path.join(__dirname, 'webapp')));
app.get("/", (req, res) => {
  res.send("Бот работает. Открой через Telegram.");
});

app.listen(PORT, () => {
  console.log(`WebApp доступен по адресу: http://localhost:${PORT}/webapp`);
});

bot.start((ctx) => {
  ctx.reply("👋 Добро пожаловать! Получи доступ к приватному контенту по кнопке ниже:", {
    reply_markup: {
      inline_keyboard: [[{
        text: "🔓 Открыть магазин",
        web_app: { url: "https://YOUR_RENDER_URL.onrender.com/webapp" }
      }]]
    }
  });
});

bot.launch();