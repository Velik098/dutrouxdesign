const tg = window.Telegram.WebApp;
tg.expand();

document.getElementById("buyBtn").addEventListener("click", () => {
  document.getElementById("buyBtn").style.display = "none";
  document.getElementById("access").classList.remove("hidden");
});