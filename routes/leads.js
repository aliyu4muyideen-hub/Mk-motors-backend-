const express = require("express");
const db = require("../db");
const { requireAdmin } = require("../middleware/auth");
const { notifyAdmin, sendReply } = require("../utils/mailer");

const router = express.Router();

function saveLead(type, payload) {
  db.prepare("INSERT INTO leads (type, payload) VALUES (?, ?)").run(type, JSON.stringify(payload));
}

/* ---- POST /api/leads/test-drive ---- */
router.post("/test-drive", (req, res) => {
  const { name, email, phone, date, time, vehicleId, message } = req.body;
  if (!name || !email || !phone || !date || !time) {
    return res.status(400).json({ error: "Name, email, phone, date, and time are required." });
  }
  saveLead("test_drive", { name, email, phone, date, time, vehicleId, message });
  notifyAdmin(
    `New test drive request — ${name}`,
    `${name} wants to test drive vehicle ${vehicleId || "(not specified)"} on ${date} at ${time}.\n\nPhone: ${phone}\nEmail: ${email}\nMessage: ${message || "(none)"}`
  ).catch((err) => console.error("Admin notify failed:", err.message));
  res.status(201).json({ ok: true });
});

/* ---- POST /api/leads/trade-in ---- */
router.post("/trade-in", (req, res) => {
  const { make, model, year, mileage, condition, name, contact } = req.body;
  if (!make || !model || !year || !name || !contact) {
    return res.status(400).json({ error: "Make, model, year, name, and contact info are required." });
  }
  saveLead("trade_in", { make, model, year, mileage, condition, name, contact });
  notifyAdmin(
    `New trade-in request — ${name}`,
    `${name} wants a trade-in estimate for a ${year} ${make} ${model} (${mileage || "?"} mi, ${condition || "condition not given"}).\n\nContact: ${contact}`
  ).catch((err) => console.error("Admin notify failed:", err.message));
  res.status(201).json({ ok: true });
});

/* ---- POST /api/leads/contact ---- */
router.post("/contact", (req, res) => {
  const { name, email, phone, message } = req.body;
  if (!name || !email || !message) {
    return res.status(400).json({ error: "Name, email, and message are required." });
  }
  saveLead("contact", { name, email, phone, message });
  notifyAdmin(
    `New contact message — ${name}`,
    `${name} sent a message:\n\n"${message}"\n\nEmail: ${email}\nPhone: ${phone || "(none)"}`
  ).catch((err) => console.error("Admin notify failed:", err.message));
  res.status(201).json({ ok: true });
});

/* ---- POST /api/leads/chat ---- */
router.post("/chat", (req, res) => {
  const { name, message, email } = req.body;
  if (!name || !message) {
    return res.status(400).json({ error: "Name and message are required." });
  }
  saveLead("chat", { name, message, email });
  notifyAdmin(
    `New chat message — ${name}`,
    `${name} sent a chat message:\n\n"${message}"${email ? `\n\nEmail: ${email}` : ""}`
  ).catch((err) => console.error("Admin notify failed:", err.message));
  res.status(201).json({ ok: true });
});

/* ---- GET /api/leads  (admin: view all submitted forms) ---- */
router.get("/", requireAdmin, (req, res) => {
  const rows = db.prepare("SELECT * FROM leads ORDER BY createdAt DESC").all();
  res.json(rows.map((r) => ({ ...r, payload: JSON.parse(r.payload) })));
});

/* ---- POST /api/leads/:id/reply  (admin)  body: { message } ----
   Emails the customer directly using the email they left on the message.
   Fails clearly if they didn't leave one, or if SMTP isn't configured. */
router.post("/:id/reply", requireAdmin, async (req, res) => {
  const { message } = req.body;
  if (!message || !message.trim()) {
    return res.status(400).json({ error: "Reply message is required." });
  }

  const row = db.prepare("SELECT * FROM leads WHERE id = ?").get(req.params.id);
  if (!row) return res.status(404).json({ error: "Message not found." });

  const payload = JSON.parse(row.payload);
  if (!payload.email) {
    return res.status(400).json({ error: "This message doesn't have an email address to reply to." });
  }

  try {
    await sendReply(payload.email, message.trim());
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }

  const replies = Array.isArray(payload.replies) ? payload.replies : [];
  replies.push({ message: message.trim(), sentAt: new Date().toISOString() });
  db.prepare("UPDATE leads SET payload = ? WHERE id = ?").run(JSON.stringify({ ...payload, replies }), row.id);

  res.json({ ok: true });
});

module.exports = router;
