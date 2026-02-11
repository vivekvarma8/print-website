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

  if (!file) {
    alert("Upload payment screenshot");
    return;
  }

  const fd = new FormData();
  fd.append("screenshot", file);
  fd.append("orderNumber", order.orderNumber);

  btn.disabled = true;
  const oldText = btn.innerText;
  btn.innerText = "Submitting...";

  try {
    const res = await fetch("/pay", { method: "POST", body: fd });
    const data = await res.json();

    if (data.success) {
      alert("Payment submitted. We will verify and print your order.");
      localStorage.removeItem("order");
      window.location.href = "/";
      return;
    }

    alert(data.error || "Something went wrong");
    btn.disabled = false;
    btn.innerText = oldText;
  } catch (e) {
    alert("Network error. Try again.");
    btn.disabled = false;
    btn.innerText = oldText;
  }
}
