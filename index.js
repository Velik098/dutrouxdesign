const express = require("express");
const path = require("path");
const { Telegraf } = require("telegraf");

const app = express();
const PORT = process.env.PORT || 3000;

// ---------------- Telegram Bot ----------------
const BOT_TOKEN = process.env.BOT_TOKEN;
if (!BOT_TOKEN) {
  console.error("❌ BOT_TOKEN is missing!");
  process.exit(1);
}

const bot = new Telegraf(BOT_TOKEN);

// URL веб-приложения (DesignHub)
const WEBAPP_URL = process.env.PUBLIC_URL || "https://dutrouxdesign.onrender.com";

// Обработка команды /start
bot.start(async (ctx) => {
  try {
    await ctx.reply(
      `Добро пожаловать в DesignHub! 👋\nНажми кнопку ниже, чтобы открыть приложение:`,
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: "Открыть WebApp", web_app: { url: WEBAPP_URL } }],
          ],
        },
      }
    );
  } catch (err) {
    console.error("Ошибка отправки сообщения Telegram:", err.message);
  }
});

// Обработка данных из WebApp
bot.on("message", async (ctx) => {
  if (ctx.message?.web_app_data?.data) {
    try {
      const data = JSON.parse(ctx.message.web_app_data.data);
      console.log("📥 Получены данные:", data);

      await ctx.reply(
        `✅ Данные получены!\nСтиль: ${data.style}\nФото: [base64 скрыт]`
      );

      // Здесь можно добавить генерацию аватарки или другой функционал
    } catch (err) {
      console.error("Ошибка обработки данных:", err.message);
      try {
        await ctx.reply("❌ Ошибка при обработке данных!");
      } catch {}
    }
  }
});

// ---------------- Express -------------------
app.use(express.static(__dirname));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// ---------------- Запуск сервера -------------------
app.listen(PORT, () => {
  console.log(`🌐 Сервер работает на http://localhost:${PORT}`);

  bot.launch()
    .then(() => console.log("🤖 Telegram Bot запущен"))
    .catch((err) => console.error("Ошибка запуска бота:", err.message));
});
