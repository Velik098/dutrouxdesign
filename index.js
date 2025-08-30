const express = require('express');
const path = require('path');
const fs = require('fs');
const shortid = require('shortid');
const { Telegraf } = require('telegraf');

const app = express();
const PORT = process.env.PORT || 3000;

// Telegram bot
const BOT_TOKEN = process.env.BOT_TOKEN;
if (!BOT_TOKEN) {
  console.error('❌ BOT_TOKEN is missing!');
  process.exit(1);
}
const bot = new Telegraf(BOT_TOKEN);

const WEBAPP_URL = process.env.PUBLIC_URL || `http://localhost:${PORT}`;

// Кнопка при старте
bot.start((ctx) => {
  ctx.reply('Добро пожаловать в Cutly! 🔗', {
    reply_markup: {
      inline_keyboard: [
        [{ text: 'Открыть WebApp', web_app: { url: WEBAPP_URL } }]
      ]
    }
  });
});

// Запуск бота
bot.launch().then(() => console.log('✅ Telegram bot запущен'));

// ------------------- Express -------------------

const dbPath = path.join(__dirname, 'db.json');
if (!fs.existsSync(dbPath)) fs.writeFileSync(dbPath, '{}');

app.use(express.json());
app.use(express.static(__dirname));

// Главная страница
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Генерация короткой ссылки
app.post('/shorten', (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'URL required' });

  const db = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
  const code = shortid.generate();
  db[code] = url;
  fs.writeFileSync(dbPath, JSON.stringify(db));

  res.json({ shortUrl: `${WEBAPP_URL}/r/${code}` });
});

// Редирект
app.get('/r/:code', (req, res) => {
  const db = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
  const url = db[req.params.code];
  if (url) {
    return res.redirect(url);
  }
  res.status(404).send('Link not found');
});

app.listen(PORT, () => console.log(`🌐 Server running on port ${PORT}`));
