const tg = window.Telegram.WebApp;
tg.expand();

const sendOrder = async (productName, productPrice) => {
  const user = tg.initDataUnsafe.user;

  // Шаг 1: отправка данных о заказе на сервер
  const res = await fetch("/order", {
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

  const data = await res.json();

  if (data.success) {
    alert("✅ Заказ оформлен! Переход к оплате...");

    // Шаг 2: запрос на создание оплаты
    const payRes = await fetch('/api/pay', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: productPrice, // цена товара в рублях
        username: user.username,
        userId: user.id,
        items: [productName] // можешь заменить на массив объектов, если нужно
      })
    });

    const payData = await payRes.json();

    if (payData.paymentUrl) {
      window.location.href = payData.paymentUrl; // редирект на оплату
    } else {
      alert("❌ Ошибка при создании платежа.");
    }

  } else {
    alert("❌ Ошибка при оформлении заказа.");
  }
};

// Обработчики кнопок
document.getElementById("previewBtn").addEventListener("click", () => {
  sendOrder("Превью", 200);
});

document.getElementById("privatkaBtn").addEventListener("click", () => {
  sendOrder("Приватка", 300);
});
