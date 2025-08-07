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
    alert("✅ Заказ оформлен! Владелец уведомлен.");
    document.getElementById("access").classList.remove("hidden");
  } else {
    alert("❌ Ошибка при оформлении заказа.");
  }
};

document.getElementById("previewBtn").addEventListener("click", () => {
  sendOrder("Превью", 200);
});

document.getElementById("privatkaBtn").addEventListener("click", () => {
  sendOrder("Приватка", 300);
});

document.getElementById('paidButton').onclick = async () => {
  const itemsList = Object.values(cart).map(i => `${i.name} ×${i.count}`).join(', ');
  const amount = total;

  try {
    const res = await fetch('/create-payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount,
        username: telegramUser?.username || 'неизвестно',
        items: itemsList
      })
    });

    const data = await res.json();
    if (data.url) {
      window.open(data.url, '_blank'); // или Telegram.WebApp.openLink(data.url);
    } else {
      alert('Ошибка при получении ссылки на оплату');
    }
  } catch (err) {
    console.error(err);
    alert('Ошибка при создании оплаты');
  }
};

