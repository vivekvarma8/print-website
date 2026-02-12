async function load() {
  const list = document.getElementById("list");
  list.innerHTML = "Loading...";

  const res = await fetch("/admin-data");
  const orders = await res.json();

  if (!Array.isArray(orders)) {
    list.innerHTML = "Failed to load orders.";
    return;
  }

  list.innerHTML = "";

  orders.forEach(o => {
    const wrap = document.createElement("div");
    wrap.style.border = "1px solid rgba(42,42,53,.9)";
    wrap.style.borderRadius = "14px";
    wrap.style.padding = "12px";
    wrap.style.margin = "12px 0";
    wrap.style.background = "rgba(0,0,0,0.16)";

    const title = document.createElement("div");
    title.style.fontWeight = "900";
    title.style.marginBottom = "6px";
    title.textContent = `Order #${o.orderNumber} • Pages: ${o.pages} • ₹${o.price} • ${o.status}`;
    wrap.appendChild(title);

    const info = document.createElement("div");
    info.style.fontSize = "12px";
    info.style.color = "#b8b8c7";
    info.style.marginBottom = "8px";
    info.textContent = `Files: ${(o.printFileNames || []).length} • Sides: ${o.printSides || "Single side"}`;
    wrap.appendChild(info);

    const linksBox = document.createElement("div");
    linksBox.style.fontSize = "13px";
    linksBox.style.marginTop = "8px";

    (o.printFileNames || []).forEach((f, idx) => {
      const a = document.createElement("a");
      a.href = `/uploads/${f}`;
      a.textContent = `Download File ${idx + 1}`;
      a.style.display = "block";
      a.style.marginTop = "6px";
      a.style.color = "#8ab4ff";
      a.target = "_blank";
      linksBox.appendChild(a);
    });

    if (o.paymentScreenshotName) {
      const a2 = document.createElement("a");
      a2.href = `/payments/${o.paymentScreenshotName}`;
      a2.textContent = "Open Payment Screenshot";
      a2.style.display = "block";
      a2.style.marginTop = "10px";
      a2.style.color = "#8ab4ff";
      a2.target = "_blank";
      linksBox.appendChild(a2);
    }

    wrap.appendChild(linksBox);
    list.appendChild(wrap);
  });
}

load();
setInterval(load, 10000);
