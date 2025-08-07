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

  // === ИНИЦИАЛИЗАЦИЯ YooKassa ===
  const yookassa = new YooKassa({
    shopId: process.env.YOOKASSA_SHOP_ID,
    secretKey: process.env.YOOKASSA_SECRET_KEY,
  });

  // === Telegram Уведомление владельцу ===
  const OWNER_CHAT_ID = 5231766800;

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
      description: `Покупка товара: ${product} от ${username}`,
      metadata: {
        user_id,
        username,
        product,
      }
    });

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

  // === ОПОВЕЩЕНИЕ О ЗАКАЗЕ (username + корзина) ===
  app.post('/order', async (req, res) => {
    const { user, product, price } = req.body;
    if (!user?.username || !product || !price) {
      return res.json({ success: false });
    }

    db.data.orders.push({
      id: nanoid(),
      user_id: user.id,
      username: user.username,
      product,
      price,
      status: 'ожидает оплаты',
      createdAt: new Date().toISOString()
    });
    await db.write();

    // Уведомление владельцу
    await bot.telegram.sendMessage(OWNER_CHAT_ID, `🆕 Новый заказ (без оплаты)\n👤 @${user.username}\n🛍️ ${product}\n💰 ${price}₽`);

    res.json({ success: true });
  });

  // === Telegram уведомление после оплаты ===
  app.get('/paid/:username', async (req, res) => {
    const user = req.params.username;
    const order = db.data.orders.find(o => o.username === user && o.status === 'ожидает оплаты');
    if (!order) return res.send('Нет неоплаченного заказа.');

    order.status = 'оплачено';
    db.data.balance += order.price;
    await db.write();

    bot.telegram.sendMessage(OWNER_CHAT_ID, `💸 Оплачено!\n👤 @${order.username}\n🛍️ ${order.product}\n💰 ${order.price}₽`);
    res.send('Оплата получена, владелец уведомлен!');
  });

  // === STATIC + BOT ===
  app.use(bot.webhookCallback('/bot'));
  bot.telegram.setWebhook(`${WEBAPP_URL}/bot`);
  app.use('/', express.static(path.join(__dirname)));

  app.listen(PORT, () => {
    console.log(`🌐 WebApp доступен по адресу: http://localhost:${PORT}`);
  });
})();

const express = require('express');
const axios = require('axios');
const crypto = require('crypto');
const bodyParser = require('body-parser');
const app = express();
app.use(bodyParser.json());

const TERMINAL_KEY = '1754495953908DEMO';
const PASSWORD = '%woQMJBy3fIovnft'; // Никому не показывай!
const NOTIFICATION_URL = 'https://dutroux-1.onrender.com'; // Измени на свой Render-URL

function generateToken(data) {
  const tokenStr = Object.entries(data)
    .sort(([a], [b]) => a.localeCompare(b))
    .reduce((acc, [key, value]) => acc + value, '') + PASSWORD;
  return crypto.createHash('sha256').update(tokenStr).digest('hex');
}

// 📦 Создание оплаты
app.post('/create-payment', async (req, res) => {
  const { amount, username, items } = req.body;

  const orderId = 'ORDER-' + Date.now();
  const payload = {
    TerminalKey: TERMINAL_KEY,
    Amount: amount * 100, // в копейках
    OrderId: orderId,
    Description: `Покупка от ${username || 'неизвестно'}`,
    NotificationURL: NOTIFICATION_URL,
    DATA: {
      email: `${username}@tg`, // можно использовать для связи
    },
  };

  payload.Token = generateToken(payload);

  try {
    const { data } = await axios.post('https://securepay.tinkoff.ru/v2/Init', payload);
    res.json({ url: data.PaymentURL, orderId });
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({ error: 'Ошибка при создании оплаты' });
  }
});

// 📬 Webhook от Тинькофф
app.post('/webhook', (req, res) => {
  const { OrderId, Status, Success, Amount } = req.body;
  console.log(`💰 Оплата! Order: ${OrderId}, Статус: ${Status}, Успешно: ${Success}, Сумма: ${Amount / 100} ₽`);
  res.send('OK');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

