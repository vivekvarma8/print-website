const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const { Resend } = require("resend");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

if (!fs.existsSync("uploads")) fs.mkdirSync("uploads");
if (!fs.existsSync("payments")) fs.mkdirSync("payments");

app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use("/payments", express.static(path.join(__dirname, "payments")));

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

const printStorage = multer.diskStorage({
  destination: "uploads",
  filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname)
});

const paymentStorage = multer.diskStorage({
  destination: "payments",
  filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname)
});

const uploadPrint = multer({ storage: printStorage });
const uploadPayment = multer({ storage: paymentStorage });

const resend = new Resend(process.env.RESEND_API_KEY);

app.get("/ping", (req, res) => res.send("pong"));

app.post("/upload", uploadPrint.single("printFile"), (req, res) => {
  try {
    const pages = Number(req.body.pages);
    if (!pages || pages <= 0) return res.status(400).json({ error: "Invalid pages" });

    const orderNumber = nextOrderNumber();
    const price = calcPrice(pages);

    const data = readOrders();

    const order = {
      orderNumber,
      pages,
      price,
      printFileName: req.file.filename,
      printOriginalName: req.file.originalname,
      paymentScreenshotName: null,
      status: "PENDING_PAYMENT",
      createdAt: new Date().toISOString(),
      paidAt: null
    };

    data.orders.unshift(order);
    writeOrders(data);

    res.json({ orderNumber, pages, price });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Upload failed" });
  }
});

app.post("/pay", uploadPayment.single("screenshot"), async (req, res) => {
  try {
    const orderNumber = Number(req.body.orderNumber);
    if (!orderNumber) return res.status(400).json({ error: "Missing order number" });

    const data = readOrders();
    const order = data.orders.find(o => o.orderNumber === orderNumber);
    if (!order) return res.status(404).json({ error: "Order not found" });

    order.paymentScreenshotName = req.file.filename;
    order.status = "PAID";
    order.paidAt = new Date().toISOString();
    writeOrders(data);

    const printPath = path.join(__dirname, "uploads", order.printFileName);
    const payPath = path.join(__dirname, "payments", order.paymentScreenshotName);

    const printB64 = fs.readFileSync(printPath).toString("base64");
    const payB64 = fs.readFileSync(payPath).toString("base64");

    // IMPORTANT:
    // In Resend free testing mode, you can only send to YOUR Resend account email.
    // Put the same email you used to sign up on Resend here.
    const toEmail = process.env.ADMIN_EMAIL;

    if (!process.env.RESEND_API_KEY) {
      return res.status(500).json({ error: "Missing RESEND_API_KEY in Render env" });
    }

    if (!toEmail) {
      return res.status(500).json({ error: "Missing ADMIN_EMAIL in Render env" });
    }

    await resend.emails.send({
      from: "Print Website <onboarding@resend.dev>",
      to: [toEmail],
      subject: `New Print Order #${order.orderNumber}`,
      text:
        `Order #${order.orderNumber}\n` +
        `Pages: ${order.pages}\n` +
        `Price: ₹${order.price}\n` +
        `Status: ${order.status}\n`,
      attachments: [
        { filename: order.printOriginalName, content: printB64 },
        { filename: req.file.originalname, content: payB64 }
      ]
    });

    res.json({ success: true, message: "Payment submitted and email sent." });
  } catch (err) {
    console.error("Resend error:", err);
    res.status(500).json({ error: "Payment saved, but email failed", details: String(err) });
  }
});

app.get("/admin-data", (req, res) => {
  try {
    const data = readOrders();
    res.json(data.orders);
  } catch (err) {
    res.status(500).json({ error: "Failed to load orders" });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
