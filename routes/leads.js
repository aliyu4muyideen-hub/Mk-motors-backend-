const express = require("express");
const db = require("../db");
const { requireAdmin } = require("../middleware/auth");

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
  res.status(201).json({ ok: true });
});

/* ---- POST /api/leads/trade-in ---- */
router.post("/trade-in", (req, res) => {
  const { make, model, year, mileage, condition, name, contact } = req.body;
  if (!make || !model || !year || !name || !contact) {
    return res.status(400).json({ error: "Make, model, year, name, and contact info are required." });
  }
  saveLead("trade_in", { make, model, year, mileage, condition, name, contact });
  res.status(201).json({ ok: true });
});

/* ---- POST /api/leads/contact ---- */
router.post("/contact", (req, res) => {
  const { name, email, phone, message } = req.body;
  if (!name || !email || !message) {
    return res.status(400).json({ error: "Name, email, and message are required." });
  }
  saveLead("contact", { name, email, phone, message });
  res.status(201).json({ ok: true });
});

/* ---- POST /api/leads/chat ---- */
router.post("/chat", (req, res) => {
  const { name, message, email } = req.body;
  if (!name || !message) {
    return res.status(400).json({ error: "Name and message are required." });
  }
  saveLead("chat", { name, message, email });
  res.status(201).json({ ok: true });
});

/* ---- GET /api/leads  (admin: view all submitted forms) ---- */
router.get("/", requireAdmin, (req, res) => {
  const rows = db.prepare("SELECT * FROM leads ORDER BY createdAt DESC").all();
  res.json(rows.map((r) => ({ ...r, payload: JSON.parse(r.payload) })));
});

module.exports = router;
