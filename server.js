// server.js
import express from "express";
import bodyParser from "body-parser";
import fetch from "node-fetch";

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// демо база "балансов" (обычно тут БД)
let balances = {};

// ==== КОНФИГ ТИНЬКОФФ ====
const TINKOFF_TERMINAL_KEY = "1754495953908DEMO";
const TINKOFF_PASSWORD = "%woQMJBy3fIovnft";
const TINKOFF_API = "https://securepay.tinkoff.ru/v2";

// === ИНИЦИАЛИЗАЦИЯ ПЛАТЕЖА ===
// фронт будет стучаться сюда, когда юзер жмёт "Пополнить"
app.post("/api/create-payment", async (req, res) => {
  try {
    const { userId, amount } = req.body; // amount в рублях
    if (!userId || !amount) {
      return res.status(400).json({ error: "userId и amount обязательны" });
    }

    const orderId = `order_${userId}_${Date.now()}`;
    const data = {
      TerminalKey: TINKOFF_TERMINAL_KEY,
      Amount: Math.round(amount * 100), // копейки
      OrderId: orderId,
      Description: "Пополнение баланса",
      NotificationURL: "https://yourdomain.com/api/payment-callback"
    };

    const response = await fetch(`${TINKOFF_API}/Init`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });

    const result = await response.json();
    console.log("Init response:", result);

    if (result.Success) {
      res.json({ paymentUrl: result.PaymentURL, orderId });
    } else {
      res.status(500).json({ error: "Не удалось создать платёж", details: result });
    }
  } catch (err) {
    console.error("create-payment error:", err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

// === CALLBACK ОТ ТИНЬКОФФ ===
app.post("/api/payment-callback", (req, res) => {
  const data = req.body;
  console.log("Tinkoff callback:", data);

  if (data.Status === "CONFIRMED") {
    // OrderId = order_userId_timestamp
    const userId = data.OrderId.split("_")[1];
    const amount = parseFloat(data.Amount) / 100;
    balances[userId] = (balances[userId] || 0) + amount;
    console.log(`✅ Баланс пользователя ${userId} пополнен на ${amoun

