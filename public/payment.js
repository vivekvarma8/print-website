const WHATSAPP_NUMBER = "917396498929";
const order = JSON.parse(localStorage.getItem("order"));

if (!order) {
  alert("No order found. Upload again.");
  window.location.href = "/";
}

document.getElementById("info").innerText =
  `Order #${order.orderNumber} | Pages: ${order.pages} | Price: ₹${order.price}`;

async function submitPayment() {
  const btn = document.getElementById("payBtn");
  const file = document.getElementById("proof").files[0];

  if (!file) return alert("Upload payment screenshot");
  if (file.size > 10 * 1024 * 1024) return alert("Screenshot too large (max 10MB).");

  const fd = new FormData();
  fd.append("screenshot", file);
  fd.append("orderNumber", order.orderNumber);

  btn.disabled = true;
  const oldText = btn.innerText;
  btn.innerText = "Submitting...";

  try {
    const res = await fetch("/pay", { method: "POST", body: fd });
    const data = await res.json();

    if (!res.ok) {
      alert(data.error || "Submit failed");
      btn.disabled = false;
      btn.innerText = oldText;
      return;
    }

    const msg = encodeURIComponent(`Hi, I have submitted payment. My Order Number is ${order.orderNumber}`);
    const link = `https://wa.me/${WHATSAPP_NUMBER}?text=${msg}`;

    document.getElementById("waAfter").href = link;

    document.getElementById("page").classList.add("blurred");
    document.getElementById("waOverlay").style.display = "flex";
    btn.innerText = "Submitted";
  } catch {
    alert("Network error. Try again.");
    btn.disabled = false;
    btn.innerText = oldText;
  }
}

document.getElementById("waAfter").addEventListener("click", () => {
  setTimeout(() => {
    localStorage.removeItem("order");
    window.location.href = "/";
  }, 900);
});
