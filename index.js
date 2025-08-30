const express = require('express');
const path = require('path');
const fs = require('fs');
const { Telegraf } = require('telegraf');

const app = express();
const PORT = process.env.PORT || 3000;
const BOT_TOKEN = process.env.BOT_TOKEN;
const SHORT_DOMAIN = process.env.PUBLIC_URL || `http://localhost:${PORT}`;

// ---------------- Telegram Bot ----------------
if (!BOT_TOKEN) {
  console.error('❌ BOT_TOKEN is missing!');
  process.exit(1);
}
const bot = new Telegraf(BOT_TOKEN);

bot.start((ctx) => {
  ctx.reply('Добро пожаловать в Cutly! 🔗', {
    reply_markup: {
      inline_keyboard: [
        [{ text: 'Открыть WebApp', web_app: { url: SHORT_DOMAIN } }]
      ]
    }
  });
});

bot.launch().then(() => console.log('✅ Telegram bot запущен'));

// ---------------- Express ----------------
app.use(express.json());
app.use(express.static(__dirname));

const dbPath = path.join(__dirname, 'db.json');
if (!fs.existsSync(dbPath)) fs.writeFileSync(dbPath, '{}');

// Генерация короткого кода
function generateCode(length = 5) {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Главная страница
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

// Сокращение ссылки
app.post('/shorten', (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'URL required' });

  const db = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));

  // Генерируем уникальный короткий код
  let code;
  do { code = generateCode(5); } while (db[code]);

  db[code] = { original: url, clicks: 0 };
  fs.writeFileSync(dbPath, JSON.stringify(db));

  const shortUrl = `${SHORT_DOMAIN}/${code}`;
  res.json({ shortUrl });
});

// Редирект по короткой ссылке
app.get('/:code', (req, res) => {
  const db = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
  const entry = db[req.params.code];

  if (entry) {
    entry.clicks++;
    fs.writeFileSync(dbPath, JSON.stringify(db));
    return res.redirect(entry.original);
  }
  res.status(404).send('Ссылка не найдена');
});

app.listen(PORT, () => console.log(`🌐 Server running on port ${PORT}`));
