require("dotenv").config();
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const path = require("path");

const vehiclesRouter = require("./routes/vehicles");
const leadsRouter = require("./routes/leads");
const adminRouter = require("./routes/admin");
const settingsRouter = require("./routes/settings");
const subscribersRouter = require("./routes/subscribers");

const app = express();

const allowedOrigins = (process.env.CORS_ORIGIN || "").split(",").map((s) => s.trim()).filter(Boolean);
app.use(cors({ origin: allowedOrigins.length ? allowedOrigins : "*" }));
app.use(express.json());
app.use(morgan("dev"));

// Uploaded vehicle photos are served from here, e.g. GET /uploads/<filename>
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use("/api/vehicles", vehiclesRouter);
app.use("/api/leads", leadsRouter);
app.use("/api/admin", adminRouter);
app.use("/api/settings", settingsRouter);
app.use("/api/subscribers", subscribersRouter);

app.get("/api/health", (req, res) => res.json({ ok: true }));

// centralized error handler (catches multer file errors, etc.)
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: err.message || "Something went wrong." });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`MK Motors API running on http://localhost:${PORT}`));
