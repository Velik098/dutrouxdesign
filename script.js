const tg = window.Telegram.WebApp;
tg.expand();

const sendOrder = async (productName, productPrice) => {
  const user = tg.initDataUnsafe.user;
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
    alert("✅ Заказ оформлен!");
    document.getElementById("access").classList.remove("hidden");
  } else {
    alert("❌ Ошибка при заказе");
  }
};

// Обработчики для кнопок
document.getElementById("previewBtn").addEventListener("click", () => {
  sendOrder("Превью", 200);
});

document.getElementById("privatkaBtn").addEventListener("click", () => {
  sendOrder("Приватка", 300);
});
