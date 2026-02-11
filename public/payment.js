const WHATSAPP_NUMBER = "YOUR_WHATSAPP_NUMBER";

const order = JSON.parse(localStorage.getItem("order"));

if (!order) {
  alert("No order found. Upload again.");
  window.location.href = "/";
}

document.getElementById("info").innerText =
  `Order #${order.orderNumber} | Pages: ${order.pages} | Price: ₹${order.price}`;

const msg = encodeURIComponent(`Hi, I want to check my order. Order Number: ${order.orderNumber}`);
document.getElementById("waLink").href = `https://wa.me/${WHATSAPP_NUMBER}?text=${msg}`;

async function submitPayment() {
  const btn = document.getElementById("payBtn");
  const file = document.getElementById("proof").files[0];

  if (!file) return alert("Upload payment screenshot");
  if (file.size > 10 * 1024 * 1024) return alert("Screenshot too large. Max 10MB.");

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

    alert("Payment submitted. We will verify and print.");
    localStorage.removeItem("order");
    window.location.href = "/";
  } catch {
    alert("Network error. Try again.");
    btn.disabled = false;
    btn.innerText = oldText;
  }
}
