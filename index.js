const { Telegraf, Markup } = require('telegraf');
const express = require('express');
const path = require('path');
const { Low } = require('lowdb');
const { JSONFile } = require('lowdb/node');
const { nanoid } = require('nanoid');

const app = express();
const bot = new Telegraf(process.env.BOT_TOKEN);

const PORT = process.env.PORT || 10000;
const WEBAPP_URL = 'https://dutroux-1.onrender.com'; // твой Render-URL
const ADMIN_ID = 5231766800; // ← замени на свой Telegram ID

// === DATABASE ===
const db = new Low(new JSONFile('db.json'));
db.data ||= { orders: [], balance: 0 };

// === TELEGRAM BOT ===
bot.start((ctx) => {
  ctx.reply(
    'Добро пожаловать в Dutroux Sell! Нажмите кнопку ниже, чтобы открыть магазин:',
    Markup.inlineKeyboard([
      Markup.button.webApp('🛒 Открыть магазин', `${WEBAPP_URL}/`)
    ])
  );
});

app.use(express.json());
app.use(bot.webhookCallback('/bot'));
bot.telegram.setWebhook(`${WEBAPP_URL}/bot`);
app.use('/', express.static(path.join(__dirname)));

// === ЗАКАЗ (покупка) ===
app.post('/order', async (req, res) => {
  const { user, product, price } = req.body;

  if (!user || !product || !price) {
    return res.status(400).json({ error: 'Данные не указаны' });
  }

  await db.read();
  db.data.orders.push({
    id: nanoid(),
    time: new Date().toISOString(),
    user_id: user.id,
    username: user.username || 'нет username',
    first_name: user.first_name || '',
    product,
    price
  });
  db.data.balance += price;
  await db.write();

  res.json({ success: true });
});

// === АДМИН-ПАНЕЛЬ ===
app.get('/admin', async (req, res) => {
  const user_id = req.query.id;
  if (user_id != ADMIN_ID) return res.send('⛔ Доступ запрещён');

  await db.read();
  const orders = db.data.orders;
  const balance = db.data.balance;

  let html = `<h1>🛠 Админ-панель Dutroux</h1>`;
  html += `<p><b>💰 Общий баланс:</b> ${balance} ₽</p>`;
  html += `<hr>`;
  html += orders.reverse().map(order => `
    <div>
      <b>👤 ${order.first_name} (${order.username})</b><br>
      🛍️ ${order.product} — ${order.price} ₽<br>
      📅 ${new Date(order.time).toLocaleString()}<br>
      <a href="tg://user?id=${order.user_id}">🔗 Написать</a>
    </div><hr>
  `).join('');

  res.send(html);
});

// === ЗАПУСК ===
app.listen(PORT, () => {
  console.log(`🌐 WebApp доступен: http://localhost:${PORT}`);
});
