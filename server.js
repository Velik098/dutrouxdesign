import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import fetch from "node-fetch";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files (index.html, assets) if you deploy a single service on Render
app.use(express.static(__dirname));

// === Simple JSON "DB" persisted to db.json ===
const DB_PATH = path.join(__dirname, "db.json");
function readDB() {
  try {
    const raw = fs.readFileSync(DB_PATH, "utf-8");
    return JSON.parse(raw);
  } catch {
    return { users: {} };
  }
}
function writeDB(db) {
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), "utf-8");
}

function getUserState(db, userId) {
  if (!db.users[userId]) {
    db.users[userId] = { balance: 0, cart: {}, orders: [] };
  }
  return db.users[userId];
}

// ==== Tinkoff demo config (replace with real in prod) ====
const TINKOFF_TERMINAL_KEY = process.env.TINKOFF_TERMINAL_KEY || "1754495953908DEMO";
const TINKOFF_PASSWORD = process.env.TINKOFF_PASSWORD || "%woQMJBy3fIovnft";
const TINKOFF_API = "https://securepay.tinkoff.ru/v2";

// Healthcheck
app.get("/api/health", (_req, res) => res.json({ ok: true }));

// Create payment for top-up
app.post("/api/create-payment", async (req, res) => {
  try {
    const { userId, amount } = req.body || {};
    const val = parseFloat(amount);
    if (!userId || !Number.isFinite(val) || val <= 0) {
      return res.status(400).json({ error: "Неверные параметры" });
    }
    const orderId = `order_${userId}_${Date.now()}`;
    const payload = {
      TerminalKey: TINKOFF_TERMINAL_KEY,
      Amount: Math.round(val * 100), // kopecks
      OrderId: orderId,
      Description: "Пополнение баланса",
      NotificationURL: process.env.NOTIFICATION_URL || `${req.protocol}://${req.get("host")}/api/payment-callback`
    };
    const response = await fetch(`${TINKOFF_API}/Init`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await response.json();
    if (data?.Success && data?.PaymentURL) {
      return res.json({ ok: true, paymentUrl: data.PaymentURL, orderId });
    } else {
      return res.status(502).json({ error: "Tinkoff Init failed", data });
    }
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

// Tinkoff callback (webhook)
app.post("/api/payment-callback", (req, res) => {
  try {
    const data = req.body || {};
    console.log("Tinkoff callback:", data);
    if (data.Status === "CONFIRMED" && typeof data.OrderId === "string") {
      const parts = data.OrderId.split("_");
      const userId = parts[1];
      const amount = parseFloat(data.Amount) / 100;
      const db = readDB();
      const st = getUserState(db, userId);
      st.balance = (st.balance || 0) + (Number.isFinite(amount) ? amount : 0);
      writeDB(db);
      console.log(`✅ Баланс пользователя ${userId} пополнен на ${amount} ₽`);
    }
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false });
  }
});

// Get user state
app.get("/api/state/:userId", (req, res) => {
  const userId = String(req.params.userId || "");
  const db = readDB();
  const st = getUserState(db, userId);
  res.json(st);
});

// Update user state (partial)
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

// Start server (Render sets PORT)
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server listening on http://localhost:${PORT}`));
