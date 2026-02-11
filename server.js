const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const { Resend } = require("resend");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

if (!fs.existsSync("uploads")) fs.mkdirSync("uploads");
if (!fs.existsSync("payments")) fs.mkdirSync("payments");

if (!fs.existsSync("orders.json")) {
  fs.writeFileSync(
    "orders.json",
    JSON.stringify({ date: "", lastOrder: 0, orders: [] }, null, 2)
  );
}

function readOrders() {
  return JSON.parse(fs.readFileSync("orders.json", "utf8"));
}

function writeOrders(data) {
  fs.writeFileSync("orders.json", JSON.stringify(data, null, 2));
}

function nextOrderNumber() {
  const today = new Date().toISOString().split("T")[0];
  const data = readOrders();
  if (data.date !== today) {
    data.date = today;
    data.lastOrder = 1;
  } else {
    data.lastOrder += 1;
  }
  writeOrders(data);
  return data.lastOrder;
}

function calcPrice(pages) {
  if (pages <= 2) return 5;
  if (pages <= 10) return pages * 3;
  return pages * 2.5;
}

function adminAuth(req, res, next) {
  const user = process.env.ADMIN_USER;
  const pass = process.env.ADMIN_PASS;

  if (!user || !pass) return res.status(500).send("Admin env not set.");

  const header = req.headers.authorization || "";
  const [type, token] = header.split(" ");

  if (type !== "Basic" || !token) {
    res.setHeader("WWW-Authenticate", 'Basic realm="Admin"');
    return res.status(401).send("Login required.");
  }

  const decoded = Buffer.from(token, "base64").toString("utf8");
  const [u, p] = decoded.split(":");

  if (u === user && p === pass) return next();

  res.setHeader("WWW-Authenticate", 'Basic realm="Admin"');
  return res.status(401).send("Invalid login.");
}

const printStorage = multer.diskStorage({
  destination: "uploads",
  filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname)
});

const paymentStorage = multer.diskStorage({
  destination: "payments",
  filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname)
});

const uploadPrint = multer({
  storage: printStorage,
  limits: { fileSize: 10 * 1024 * 1024 }
});

const uploadPayment = multer({
  storage: paymentStorage,
  limits: { fileSize: 5 * 1024 * 1024 }
});

const resend = new Resend(process.env.RESEND_API_KEY);

app.use(express.static("public"));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use("/payments", express.static(path.join(__dirname, "payments")));

app.get("/ping", (req, res) => res.send("pong"));

app.get("/admin", adminAuth, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "admin.html"));
});
app.get("/admin.js", adminAuth, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "admin.js"));
});
app.get("/admin-data", adminAuth, (req, res) => {
  try {
    res.json(readOrders().orders);
  } catch {
    res.status(500).json({ error: "Failed to load orders" });
  }
});

app.post("/upload", uploadPrint.single("printFile"), (req, res) => {
  try {
    const pages = Number(req.body.pages);
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    if (!pages || pages <= 0) return res.status(400).json({ error: "Invalid pages" });

    const orderNumber = nextOrderNumber();
    const price = calcPrice(pages);

    const data = readOrders();
    data.orders.unshift({
      orderNumber,
      pages,
      price,
      printFileName: req.file.filename,
      printOriginalName: req.file.originalname,
      paymentScreenshotName: null,
      status: "PENDING_PAYMENT",
      createdAt: new Date().toISOString(),
      paidAt: null
    });
    writeOrders(data);

    res.json({ orderNumber, pages, price });
  } catch (err) {
    if (err.code === "LIMIT_FILE_SIZE") return res.status(400).json({ error: "File too large. Max 10MB." });
    res.status(500).json({ error: "Upload failed" });
  }
});

app.post("/pay", uploadPayment.single("screenshot"), async (req, res) => {
  try {
    const orderNumber = Number(req.body.orderNumber);
    if (!orderNumber) return res.status(400).json({ error: "Missing order number" });
    if (!req.file) return res.status(400).json({ error: "No screenshot uploaded" });

    const data = readOrders();
    const order = data.orders.find(o => o.orderNumber === orderNumber);
    if (!order) return res.status(404).json({ error: "Order not found" });

    order.paymentScreenshotName = req.file.filename;
    order.status = "PAID";
    order.paidAt = new Date().toISOString();
    writeOrders(data);

    const toEmail = process.env.ADMIN_EMAIL;
    if (!process.env.RESEND_API_KEY) return res.status(500).json({ error: "Missing RESEND_API_KEY" });
    if (!toEmail) return res.status(500).json({ error: "Missing ADMIN_EMAIL" });

    const printPath = path.join(__dirname, "uploads", order.printFileName);
    const payPath = path.join(__dirname, "payments", order.paymentScreenshotName);

    const printB64 = fs.readFileSync(printPath).toString("base64");
    const payB64 = fs.readFileSync(payPath).toString("base64");

    await resend.emails.send({
      from: "Print Website <onboarding@resend.dev>",
      to: [toEmail],
      subject: `New Print Order #${order.orderNumber}`,
      text: `Order #${order.orderNumber}\nPages: ${order.pages}\nPrice: ₹${order.price}\nStatus: ${order.status}\n`,
      attachments: [
        { filename: order.printOriginalName, content: printB64 },
        { filename: req.file.originalname, content: payB64 }
      ]
    });

    res.json({ success: true });
  } catch (err) {
    if (err.code === "LIMIT_FILE_SIZE") return res.status(400).json({ error: "Screenshot too large. Max 5MB." });
    res.status(500).json({ error: "Payment saved, but email failed" });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
