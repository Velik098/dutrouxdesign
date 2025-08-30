const express = require('express');
const path = require('path');
const fs = require('fs');
const { Telegraf } = require('telegraf');

const app = express();
const PORT = process.env.PORT || 3000;
const BOT_TOKEN = process.env.BOT_TOKEN;
const SHORT_DOMAIN = process.env.PUBLIC_URL || `http://localhost:${PORT}`;

// Telegram Bot
if (!BOT_TOKEN) {
  console.error('❌ BOT_TOKEN is missing!');
  process.exit(1);
}
const bot = new Telegraf(BOT_TOKEN);

// ---------------- Webhook ----------------
const WEBHOOK_PATH = `/tg-webhook/${BOT_TOKEN}`;
const WEBHOOK_URL = `${SHORT_DOMAIN}${WEBHOOK_PATH}`;

bot.start((ctx) => {
  ctx.reply('Добро пожаловать в Cutly! 🔗', {
    reply_markup: {
      inline_keyboard: [
        [{ text: 'Открыть WebApp', web_app: { url: SHORT_DOMAIN } }]
      ]
    }
  });
});

// Включаем парсинг JSON для вебхука
app.use(express.json());
app.use(bot.webhookCallback(WEBHOOK_PATH));

// Устанавливаем webhook Telegram
bot.telegram.setWebhook(WEBHOOK_URL).then(() => {
  console.log(`✅ Webhook установлен: ${WEBHOOK_URL}`);
});

// ---------------- Express ----------------
app.use(express.static(__dirname));

const dbPath = path.join(__dirname, 'db.json');
if (!fs.existsSync(dbPath)) fs.writeFileSync(dbPath, '{}');

function generateCode(length = 5) {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

app.post('/shorten', (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'URL required' });

  const db = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));

  let code;
  do { code = generateCode(5); } while (db[code]);

  db[code] = { original: url, clicks: 0 };
  fs.writeFileSync(dbPath, JSON.stringify(db));

  res.json({ shortUrl: `${SHORT_DOMAIN}/${code}` });
});

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
