const express = require("express");
const multer = require("multer");
const path = require("path");
const crypto = require("crypto");
const db = require("../db");
const { requireAdmin } = require("../middleware/auth");
const { notifyNewArrival } = require("../utils/mailer");

const router = express.Router();

/* ---- multer setup: stores uploaded photos in /uploads ---- */
const storage = multer.diskStorage({
  destination: path.join(__dirname, "..", "uploads"),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || ".jpg";
    cb(null, `${crypto.randomUUID()}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 }, // 8MB per photo
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) return cb(new Error("Only image files are allowed."));
    cb(null, true);
  },
});

const MAX_IMAGES_PER_VEHICLE = 5;

function attachImages(vehicle) {
  const rows = db.prepare("SELECT id, url FROM vehicle_images WHERE vehicleId = ? ORDER BY position ASC, id ASC").all(vehicle.id);
  return { ...vehicle, images: rows.map((r) => ({ id: r.id, url: r.url })) };
}

/* ---- GET /api/vehicles  (supports ?make=&bodyType=&transmission=&maxPrice=&minYear=&search=&sort=) ---- */
router.get("/", (req, res) => {
  const { make, bodyType, transmission, maxPrice, minYear, search, sort } = req.query;

  let sql = "SELECT * FROM vehicles WHERE 1=1";
  const params = [];

  if (make) { sql += " AND make = ?"; params.push(make); }
  if (bodyType) { sql += " AND bodyType = ?"; params.push(bodyType); }
  if (transmission) { sql += " AND transmission = ?"; params.push(transmission); }
  if (maxPrice) { sql += " AND price <= ?"; params.push(Number(maxPrice)); }
  if (minYear) { sql += " AND year >= ?"; params.push(Number(minYear)); }
  if (search) { sql += " AND (make LIKE ? OR model LIKE ? OR trim LIKE ?)"; const q = `%${search}%`; params.push(q, q, q); }

  if (sort === "priceAsc") sql += " ORDER BY price ASC";
  else if (sort === "priceDesc") sql += " ORDER BY price DESC";
  else if (sort === "mileageAsc") sql += " ORDER BY mileage ASC";
  else sql += " ORDER BY year DESC";

  const rows = db.prepare(sql).all(...params);
  res.json(rows.map(attachImages));
});

/* ---- GET /api/vehicles/:id ---- */
router.get("/:id", (req, res) => {
  const vehicle = db.prepare("SELECT * FROM vehicles WHERE id = ?").get(req.params.id);
  if (!vehicle) return res.status(404).json({ error: "Vehicle not found." });
  res.json(attachImages(vehicle));
});

/* ---- POST /api/vehicles  (admin: create a new listing) ---- */
router.post("/", requireAdmin, (req, res) => {
  const b = req.body;
  const id = b.id || crypto.randomUUID();
  db.prepare(`
    INSERT INTO vehicles (id, year, make, model, trim, bodyType, price, mileage, engine, transmission, fuelType, exteriorColor, interiorColor, description)
    VALUES (@id, @year, @make, @model, @trim, @bodyType, @price, @mileage, @engine, @transmission, @fuelType, @exteriorColor, @interiorColor, @description)
  `).run({ ...b, id });
  const vehicle = db.prepare("SELECT * FROM vehicles WHERE id = ?").get(id);

  notifyNewArrival(vehicle).catch((err) => console.error("New-arrival email failed:", err.message));

  res.status(201).json(attachImages(vehicle));
});

/* ---- PUT /api/vehicles/:id  (admin: update price or any field) ---- */
router.put("/:id", requireAdmin, (req, res) => {
  const existing = db.prepare("SELECT * FROM vehicles WHERE id = ?").get(req.params.id);
  if (!existing) return res.status(404).json({ error: "Vehicle not found." });

  const merged = { ...existing, ...req.body, id: req.params.id };
  db.prepare(`
    UPDATE vehicles SET year=@year, make=@make, model=@model, trim=@trim, bodyType=@bodyType,
      price=@price, mileage=@mileage, engine=@engine, transmission=@transmission, fuelType=@fuelType,
      exteriorColor=@exteriorColor, interiorColor=@interiorColor, description=@description
    WHERE id=@id
  `).run(merged);

  res.json(attachImages(db.prepare("SELECT * FROM vehicles WHERE id = ?").get(req.params.id)));
});

/* ---- DELETE /api/vehicles/:id  (admin) ---- */
router.delete("/:id", requireAdmin, (req, res) => {
  db.prepare("DELETE FROM vehicles WHERE id = ?").run(req.params.id);
  res.status(204).end();
});

/* ---- POST /api/vehicles/:id/images  (admin: upload a real photo file) ---- */
router.post("/:id/images", requireAdmin, upload.single("photo"), (req, res) => {
  const vehicle = db.prepare("SELECT * FROM vehicles WHERE id = ?").get(req.params.id);
  if (!vehicle) return res.status(404).json({ error: "Vehicle not found." });
  if (!req.file) return res.status(400).json({ error: "No photo uploaded — field name must be 'photo'." });

  const count = db.prepare("SELECT COUNT(*) AS n FROM vehicle_images WHERE vehicleId = ?").get(vehicle.id).n;
  if (count >= MAX_IMAGES_PER_VEHICLE) {
    return res.status(400).json({ error: `Maximum of ${MAX_IMAGES_PER_VEHICLE} photos per vehicle.` });
  }

  const url = `/uploads/${req.file.filename}`;
  db.prepare("INSERT INTO vehicle_images (vehicleId, url) VALUES (?, ?)").run(vehicle.id, url);
  res.status(201).json({ url });
});

/* ---- POST /api/vehicles/:id/images/url  (admin: add an image by pasted URL, no file upload) ---- */
router.post("/:id/images/url", requireAdmin, (req, res) => {
  const vehicle = db.prepare("SELECT * FROM vehicles WHERE id = ?").get(req.params.id);
  if (!vehicle) return res.status(404).json({ error: "Vehicle not found." });
  const { url } = req.body;
  if (!url || typeof url !== "string") return res.status(400).json({ error: "Body must include a string 'url'." });

  const count = db.prepare("SELECT COUNT(*) AS n FROM vehicle_images WHERE vehicleId = ?").get(vehicle.id).n;
  if (count >= MAX_IMAGES_PER_VEHICLE) {
    return res.status(400).json({ error: `Maximum of ${MAX_IMAGES_PER_VEHICLE} photos per vehicle.` });
  }

  db.prepare("INSERT INTO vehicle_images (vehicleId, url) VALUES (?, ?)").run(vehicle.id, url);
  res.status(201).json({ url });
});

/* ---- DELETE /api/vehicles/:id/images/:imageId  (admin) ---- */
router.delete("/:id/images/:imageId", requireAdmin, (req, res) => {
  db.prepare("DELETE FROM vehicle_images WHERE id = ? AND vehicleId = ?").run(req.params.imageId, req.params.id);
  res.status(204).end();
});

module.exports = router;
