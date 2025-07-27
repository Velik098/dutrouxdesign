const { Telegraf, Markup } = require('telegraf');
const express = require('express');
const path = require('path');
const { Low } = require('lowdb');
const { JSONFile } = require('lowdb/node');
const { nanoid } = require('nanoid');
const YooKassa = require('@appigram/yookassa-node').YooKassa;

const bot = new Telegraf(process.env.BOT_TOKEN);
const app = express();
const PORT = process.env.PORT || 10000;
const WEBAPP_URL = 'https://dutroux-1.onrender.com'; // твой render URL

// === ИНИЦИАЛИЗАЦИЯ lowdb ===
const adapter = new JSONFile('db.json');
const db = new Low(adapter);
await db.read();
db.data ||= { orders: [], balance: 0 };
await db.write();

// === ИНИЦИАЛИЗАЦИЯ YooKassa ===
const yookassa = new YooKassa({
  shopId: process.env.YOOKASSA_SHOP_ID,
  secretKey: process.env.YOOKASSA_SECRET_KEY,
});

// === ОБРАБОТКА КОМАНДЫ /start ===
bot.start((ctx) => {
  ctx.reply(
    'Добро пожаловать в Dutroux Sell! Нажми кнопку ниже:',
    Markup.inlineKeyboard([
      Markup.button.webApp('🛒 Открыть магазин', `${WEBAPP_URL}/`)
    ])
  );
});

// === ПРИЁМ ПОКУПКИ С ФРОНТА ===
app.use(express.json());

app.post('/create-payment', async (req, res) => {
  const { user_id, username, product } = req.body;

  const price = product === 'Превью' ? 200 : product === 'Приватка' ? 300 : null;
  if (!price) return res.status(400).json({ error: 'Неизвестный товар' });

  const payment = await yookassa.createPayment({
    amount: {
      value: price.toFixed(2),
      currency: 'RUB',
    },
    confirmation: {
      type: 'redirect',
      return_url: WEBAPP_URL,
    },
    description: Покупка товара: ${product} от ${username},
    metadata: {
      user_id,
      username,
      product,
    }
  });

  // Сохраняем в базу
  db.data.orders.push({
    id: nanoid(),
    user_id,
    username,
    product,
    price,
    status: 'ожидает оплаты',
    createdAt: new Date().toISOString()
  });
  await db.write();

  res.json({ confirmation_url: payment.confirmation.confirmation_url });
});

// === Telegram Уведомление владельцу ===
const OWNER_CHAT_ID = 5231766800; // твой Telegram ID

// Пример ручного endpoint после оплаты (в будущем можно Webhook)
app.get('/paid/:username', async (req, res) => {
  const user = req.params.username;
  const order = db.data.orders.find(o => o.username === user && o.status === 'ожидает оплаты');
  if (!order) return res.send('Нет неоплаченного заказа.');

  order.status = 'оплачено';
  db.data.balance += order.price;
  await db.write();

  bot.telegram.sendMessage(OWNER_CHAT_ID, `💸 Новый заказ: ${order.product}\n👤 @${order.username}\n💰 ${order.price}₽`);
  res.send('Оплата получена, владелец уведомлен!');
});

// === STATIC + BOT ===
app.use(bot.webhookCallback('/bot'));
bot.telegram.setWebhook(`${WEBAPP_URL}/bot`);
app.use('/', express.static(path.join(__dirname)));

app.listen(PORT, () => {
  console.log(`🌐 WebApp доступен по адресу: http://localhost:${PORT}`);
});
