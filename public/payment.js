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
  if (file.size > 5 * 1024 * 1024) return alert("Screenshot too large. Max 5MB.");

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
  } catch (e) {
    alert("Network error. Try again.");
    btn.disabled = false;
    btn.innerText = oldText;
  }
}
