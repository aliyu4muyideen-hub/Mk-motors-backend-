const express = require("express");
const multer = require("multer");
const path = require("path");
const crypto = require("crypto");
const db = require("../db");
const { requireAdmin } = require("../middleware/auth");

const router = express.Router();

const storage = multer.diskStorage({
  destination: path.join(__dirname, "..", "uploads"),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || ".jpg";
    cb(null, `${crypto.randomUUID()}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) return cb(new Error("Only image files are allowed."));
    cb(null, true);
  },
});

const upsertSetting = db.prepare(`
  INSERT INTO site_settings (key, value) VALUES (?, ?)
  ON CONFLICT(key) DO UPDATE SET value = excluded.value
`);

/* ---- GET /api/settings — returns everything as a flat object, e.g. { heroImage: "/uploads/xyz.jpg" } ---- */
router.get("/", (req, res) => {
  const rows = db.prepare("SELECT key, value FROM site_settings").all();
  const settings = {};
  rows.forEach((r) => { settings[r.key] = r.value; });
  res.json(settings);
});

/* ---- PUT /api/settings/:key  (admin)  body: { value }  — used when pasting a URL ---- */
router.put("/:key", requireAdmin, (req, res) => {
  const { value } = req.body;
  if (typeof value !== "string") return res.status(400).json({ error: "Body must include a string 'value'." });
  upsertSetting.run(req.params.key, value);
  res.json({ key: req.params.key, value });
});

/* ---- POST /api/settings/:key/image  (admin)  multipart field 'photo' — used when uploading a file ---- */
router.post("/:key/image", requireAdmin, upload.single("photo"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No photo uploaded — field name must be 'photo'." });
  const value = `/uploads/${req.file.filename}`;
  upsertSetting.run(req.params.key, value);
  res.json({ key: req.params.key, value });
});

module.exports = router;
