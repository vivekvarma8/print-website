const statusEl = document.getElementById("status");
const gridEl = document.getElementById("grid");
const searchEl = document.getElementById("search");
const filterEl = document.getElementById("filter");
const refreshBtn = document.getElementById("refreshBtn");

const kpiTotal = document.getElementById("kpiTotal");
const kpiPaid = document.getElementById("kpiPaid");
const kpiPending = document.getElementById("kpiPending");
const kpiCompleted = document.getElementById("kpiCompleted");

let allOrders = [];
let isUpdating = false;

function badgeClass(s) {
  if (s === "PAID") return "badge paid";
  if (s === "PENDING_PAYMENT") return "badge pending";
  if (s === "PRINTED") return "badge printed";
  if (s === "COMPLETED") return "badge completed";
  return "badge";
}

function formatTime(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleString();
}

async function updateStatus(orderNumber, status) {
  if (isUpdating) return;
  isUpdating = true;

  try {
    const res = await fetch("/admin-status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderNumber, status })
    });

    const data = await res.json();

    if (data.success) {
      await loadOrders(false);
    } else {
      alert(data.error || "Failed to update status");
    }
  } catch (err) {
    alert("Network error updating status");
  } finally {
    isUpdating = false;
  }
}

function applyFilters() {
  const q = (searchEl.value || "").trim().toLowerCase();
  const f = filterEl.value;

  let orders = allOrders.slice();

  if (f !== "ALL") {
    orders = orders.filter(o => (o.status || "") === f);
  }

  if (q) {
    orders = orders.filter(o => {
      const s = `${o.orderNumber} ${o.pages} ${o.price} ${o.status} ${o.printOriginalName || ""}`.toLowerCase();
      return s.includes(q);
    });
  }

  render(orders);
}

function render(orders) {
  gridEl.innerHTML = "";

  if (!orders.length) {
    statusEl.innerText = "No matching orders.";
    return;
  }

  statusEl.innerText = `Showing ${orders.length} order(s).`;

  orders.forEach(o => {
    const card = document.createElement("div");
    card.className = "card";

    const printLink = o.printFileName ? `/uploads/${o.printFileName}` : null;
    const payImg = o.paymentScreenshotName ? `/payments/${o.paymentScreenshotName}` : null;

    card.innerHTML = `
      <div class="row">
        <div><b>Order #${o.orderNumber}</b></div>
        <div class="${badgeClass(o.status)}">${o.status || "UNKNOWN"}</div>
      </div>

      <div class="meta">
        Pages: <b>${o.pages}</b> &nbsp; • &nbsp; Price: <b>₹${o.price}</b>
      </div>

      <div class="meta">
        Created: ${formatTime(o.createdAt)}
        ${o.paidAt ? `&nbsp; • &nbsp; Paid: ${formatTime(o.paidAt)}` : ""}
        ${o.printedAt ? `&nbsp; • &nbsp; Printed: ${formatTime(o.printedAt)}` : ""}
        ${o.completedAt ? `&nbsp; • &nbsp; Completed: ${formatTime(o.completedAt)}` : ""}
      </div>

      <div class="actions">
        ${printLink ? `<a class="button" href="${printLink}" target="_blank">Download File</a>` : `<span class="small">Print file missing</span>`}
        ${payImg ? `<a class="button" href="${payImg}" target="_blank">Open Screenshot</a>` : `<span class="small">No screenshot yet</span>`}
      </div>

      <div class="actions">
        <button class="button" data-action="pending" data-order="${o.orderNumber}">Set Pending</button>
        <button class="button" data-action="paid" data-order="${o.orderNumber}">Set Paid</button>
        <button class="button" data-action="printed" data-order="${o.orderNumber}">Mark Printed</button>
        <button class="button" data-action="completed" data-order="${o.orderNumber}">Mark Completed</button>
      </div>

      ${payImg ? `<img class="thumb" src="${payImg}" alt="Payment Screenshot">` : ""}
    `;

    card.addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-action]");
      if (!btn) return;

      const orderNumber = Number(btn.getAttribute("data-order"));
      const action = btn.getAttribute("data-action");

      if (action === "pending") updateStatus(orderNumber, "PENDING_PAYMENT");
      if (action === "paid") updateStatus(orderNumber, "PAID");
      if (action === "printed") updateStatus(orderNumber, "PRINTED");
      if (action === "completed") updateStatus(orderNumber, "COMPLETED");
    });

    gridEl.appendChild(card);
  });
}

async function loadOrders(showLoading = true) {
  if (showLoading) statusEl.innerText = "Loading...";

  const res = await fetch("/admin-data");
  const orders = await res.json();

  if (!Array.isArray(orders)) {
    statusEl.innerText = "Admin-data returned invalid data.";
    return;
  }

  allOrders = orders;

  const total = orders.length;
  const paid = orders.filter(o => o.status === "PAID").length;
  const pending = orders.filter(o => o.status === "PENDING_PAYMENT").length;
  const completed = orders.filter(o => o.status === "COMPLETED").length;

  kpiTotal.innerText = total;
  kpiPaid.innerText = paid;
  kpiPending.innerText = pending;
  kpiCompleted.innerText = completed;

  applyFilters();
}

searchEl.addEventListener("input", applyFilters);
filterEl.addEventListener("change", applyFilters);
refreshBtn.addEventListener("click", () => loadOrders(true));

loadOrders(true);
setInterval(() => loadOrders(false), 10000);
