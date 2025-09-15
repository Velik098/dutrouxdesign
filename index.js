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

// URL твоего мини-аппа (например, Render/Vercel URL)
const WEBAPP_URL = process.env.PUBLIC_URL || "https://dutrouxdesign.onrender.com";

// Кнопка при старте
bot.start((ctx) => {
  ctx.reply("Добро пожаловать! 👋\nНажми кнопку ниже, чтобы создать аватарку:", {
    reply_markup: {
      inline_keyboard: [
        [{ text: "Открыть WebApp", web_app: { url: WEBAPP_URL } }]
      ]
    }
  });
});

// Принимаем данные из mini-app (tg.sendData)
bot.on("message", async (ctx) => {
  if (ctx.message?.web_app_data?.data) {
    try {
      const data = JSON.parse(ctx.message.web_app_data.data);
      console.log("📥 Получены данные:", data);

      // Здесь пока просто отвечаем
      await ctx.reply(
        ✅ Твои данные получены!\nСтиль: ${data.style}\nФото: [base64 слишком длинное, не показываю]
      );

      // TODO: тут можно вызвать API для генерации аватарки и отправить картинку
    } catch (err) {
      console.error("Ошибка обработки данных:", err);
      await ctx.reply("❌ Ошибка при обработке данных!");
    }
  }
});

// ---------------- Express -------------------
app.use(express.static(__dirname));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// ---------------- Запуск -------------------
app.listen(PORT, async () => {
  console.log(`🌐 Server running on http://localhost:${PORT}`);
  await bot.launch();
  console.log("🤖 Bot started");
});
