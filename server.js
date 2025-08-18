import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import fetch from "node-fetch";
import fs from "fs";
import crypto from "crypto";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// ====== CONFIG ======
const TERMINAL_KEY = process.env.TERMINAL_KEY || "1754495953908DEMO";
const PASSWORD = process.env.PASSWORD || "%woQMJBy3fIovnft";
const BASE_URL = process.env.BASE_URL || "https://dutroux-1.onrender.com"; // прод-домен Render
const TINKOFF_API = "https://securepay.tinkoff.ru/v2";
// ====================

// ====== FILE DB ======
const DB_FILE = path.join(__dirname, "db.json.txt");
function readDB() {
  try {
    const raw = fs.readFileSync(DB_FILE, "utf8");
    return JSON.parse(raw);
  } catch (e) {
    return { users: {}, orders: [], balance: 0 };
  }
}
function writeDB(db) {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), "utf8");
}
function getUserState(db, userId) {
  if (!db.users) db.users = {};
  if (!db.users[userId]) db.users[userId] = { balance: 0, orders: [] };
  return db.users[userId];
}
// =====================

// ====== TOKEN ======
// Алгоритм токена: добавить Password, отсортировать ключи, конкатенировать значения (без вложенных объектов), sha256 hex
function makeToken(payload) {
  const flat = { ...payload, Password: PASSWORD };
  const keys = Object.keys(flat).sort();
  let concat = "";
  for (const k of keys) {
    const v = flat[k];
    if (v !== null && typeof v !== "object" && v !== undefined) {
      concat += String(v);
    }
  }
  return crypto.createHash("sha256").update(concat).digest("hex");
}
// ====================

// ====== API: создать платёж и отдать PaymentURL ======
app.post("/api/pay", async (req, res) => {
  try {
    const { amount, userId } = req.body || {};
    const amountKopecks = Math.max(100, Math.floor(Number(amount) * 100)); // минимум 1₽
    const uid = String(userId || "anon");
    const orderId = `${uid}-${Date.now()}`;

    const initPayload = {
      TerminalKey: TERMINAL_KEY,
      Amount: amountKopecks,
      OrderId: orderId,
      Description: `Пополнение баланса пользователя ${uid}`,
      SuccessURL: `${BASE_URL}/success?orderId=${encodeURIComponent(orderId)}`,
      FailURL: `${BASE_URL}/fail?orderId=${encodeURIComponent(orderId)}`,
      // Некоторые терминалы принимают NotificationURL из Init; если нет — возьмут из настроек терминала
      NotificationURL: `${BASE_URL}/webhook`
    };

    const Token = makeToken(initPayload);
    const r = await fetch(`${TINKOFF_API}/Init`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...initPayload, Token })
    });
    const data = await r.json();

    if (!data.Success) {
      return res.status(400).json({
        ok: false,
        error: data.Message || "Не удалось создать платёж",
        details: data.Details || null
      });
    }

    // Сохраним ожидаемый платеж
    const db = readDB();
    db.orders.push({
      orderId,
      userId: uid,
      amount: amountKopecks,
      paymentId: data.PaymentId,
      status: "INIT"
    });
    writeDB(db);

    return res.json({ ok: true, url: data.PaymentURL, paymentId: data.PaymentId });
  } catch (e) {
    console.error("Init error:", e);
    return res.status(500).json({ ok: false, error: "Сбой сервера при создании платежа" });
  }
});

// ====== WEBHOOK от Т-Банка ======
app.post("/webhook", async (req, res) => {
  try {
    const payload = req.body || {};
    // Проверяем подпись
    const receivedToken = payload.Token;
    const check = { ...payload };
    delete check.Token; // токен не участвует в собственной проверке
    const calc = makeToken(check);

    if (receivedToken && calc !== receivedToken) {
      console.warn("⚠️ Неверный токен вебхука");
      return res.sendStatus(400);
    }

    const { OrderId, PaymentId, Status, Success, Amount } = payload;
    if (Success && (Status === "CONFIRMED" || Status === "AUTHORIZED")) {
      const db = readDB();
      // найдём пользователя по orderId
      const order = db.orders?.find(o => o.orderId === OrderId || o.paymentId == PaymentId);
      const userId = order?.userId || (String(OrderId || "").split("-")[0] || "anon");
      const st = getUserState(db, userId);

      // зачтём баланс
      const rub = Math.floor(Number(Amount || 0)) / 100;
      st.balance = Number(st.balance || 0) + rub;
      if (order) order.status = Status;
      db.balance = Number(db.balance || 0) + rub;
      writeDB(db);
      console.log(`✅ Оплата подтверждена. Пользователь ${userId} +${rub}₽`);
    }
    res.sendStatus(200);
  } catch (e) {
    console.error("Webhook error:", e);
    res.sendStatus(500);
  }
});

// ====== Проверка статуса вручную ======
app.get("/api/getstate", async (req, res) => {
  try {
    const { PaymentId } = req.query;
    if (!PaymentId) return res.status(400).json({ ok: false, error: "No PaymentId" });
    const payload = { TerminalKey: TERMINAL_KEY, PaymentId };
    const Token = makeToken(payload);
    const r = await fetch(`${TINKOFF_API}/GetState`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...payload, Token })
    });
    const data = await r.json();
    res.json(data);
  } catch (e) {
    res.status(500).json({ ok: false, error: "GetState error" });
  }
});

// ====== Простейшие страницы успеха/ошибки ======
app.get("/success", (req, res) => {
  res.send(`<!doctype html><meta charset="utf-8"><title>Оплата успешна</title>
  <style>body{font-family:system-ui;margin:40px;}</style>
  <h1>Оплата прошла успешно ✅</h1>
  <p>Заказ: ${req.query.orderId || ""}</p>
  <p>Баланс будет зачислен в течение нескольких секунд.</p>`);
});
app.get("/fail", (req, res) => {
  res.send(`<!doctype html><meta charset="utf-8"><title>Оплата не удалась</title>
  <style>body{font-family:system-ui;margin:40px;}</style>
  <h1>Оплата не удалась ❌</h1>
  <p>Заказ: ${req.query.orderId || ""}</p>
  <p>Попробуйте ещё раз или выберите другой способ оплаты.</p>`);
});

// ====== Стейт юзера для фронта ======
app.get("/api/state/:userId", (req, res) => {
  const userId = String(req.params.userId || "");
  const db = readDB();
  const st = getUserState(db, userId);
  res.json({ ok: true, state: st });
});
app.post("/api/state/:userId", (req, res) => {
  const userId = String(req.params.userId || "");
  const patch = req.body || {};
  const db = readDB();
  const st = getUserState(db, userId);
  if (typeof patch.balance === "number" && Number.isFinite(patch.balance)) st.balance = patch.balance;
  if (patch.cart && typeof patch.cart === "object") st.cart = patch.cart;
  if (Array.isArray(patch.orders)) st.orders = patch.orders;
  writeDB(db);
  res.json({ ok: true });
});

// ====== Раздаём статику (INDEX.HTML.txt => /) ======
app.get("/", (req, res) => {
  const indexPath = path.join(__dirname, "INDEX.HTML.txt");
  res.send(fs.readFileSync(indexPath, "utf8"));
});

// Start server (Render sets PORT)
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server listening on http://localhost:${PORT}`));
