const express = require("express");
const db = require("../db");
const { requireAdmin } = require("../middleware/auth");

const router = express.Router();

/* ---- POST /api/subscribers  (public)  body: { email } ---- */
router.post("/", (req, res) => {
  const { email } = req.body;
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
    return res.status(400).json({ error: "A valid email is required." });
  }
  try {
    db.prepare("INSERT INTO subscribers (email) VALUES (?)").run(email.trim().toLowerCase());
  } catch (err) {
    // duplicate email — treat as success, no need to tell them they already subscribed
    if (!String(err.message).includes("UNIQUE")) throw err;
  }
  res.status(201).json({ ok: true });
});

/* ---- GET /api/subscribers  (admin) ---- */
router.get("/", requireAdmin, (req, res) => {
  const rows = db.prepare("SELECT id, email, createdAt FROM subscribers ORDER BY createdAt DESC").all();
  res.json(rows);
});

module.exports = router;
