const tg = window.Telegram.WebApp;
tg.expand();

// Проверка наличия кнопок
const previewBtn = document.getElementById("previewBtn");
const privatkaBtn = document.getElementById("privatkaBtn");
const accessElement = document.getElementById("access");

// Проверка: Telegram user доступен?
const getTelegramUser = () => {
  const user = tg.initDataUnsafe?.user;
  if (!user) {
    alert("❌ Не удалось получить данные пользователя Telegram.");
    throw new Error("Telegram user not available");
  }
  return user;
};

// Отправка заказа на сервер
const sendOrder = async (productName, productPrice) => {
  try {
    const user = getTelegramUser();

    const response = await fetch("/order", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        user: {
          id: user.id,
          username: user.username,
          first_name: user.first_name
        },
        product: productName,
        price: productPrice
      })
    });

    const data = await response.json();

    if (data.success) {
      alert("✅ Заказ оформлен! Владелец уведомлен.");
      if (accessElement) {
        accessElement.classList.remove("hidden");
      }
    } else {
      alert("❌ Ошибка при оформлении заказа. Попробуйте позже.");
    }

  } catch (error) {
    console.error("Ошибка при отправке заказа:", error);
    alert("❌ Произошла ошибка при отправке заказа. Проверьте соединение или перезапустите бота.");
  }
};

// Назначаем обработчики кнопкам, если они есть
if (previewBtn) {
  previewBtn.addEventListener("click", () => {
    sendOrder("Превью", 200);
  });
} else {
  console.warn("Кнопка #previewBtn не найдена в HTML.");
}

if (privatkaBtn) {
  privatkaBtn.addEventListener("click", () => {
    sendOrder("Приватка", 300);
  });
} else {
  console.warn("Кнопка #privatkaBtn не найдена в HTML.");
}
