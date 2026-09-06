const visionRouter = require("./routes/vision");
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const path = require("path");
const db = require("./db");

const vehiclesRouter = require("./routes/vehicles");
const leadsRouter = require("./routes/leads");
const adminRouter = require("./routes/admin");
const settingsRouter = require("./routes/settings");
const subscribersRouter = require("./routes/subscribers");

try {
  const count = db.prepare("SELECT COUNT(*) AS n FROM vehicles").get().n;
  if (count === 0) {
    console.log("No vehicles found — seeding sample data...");
    require("./seed");
  }
} catch (err) {
  console.error("Auto-seed check failed:", err.message);
}

const app = express();

const rawOrigins = (process.env.CORS_ORIGIN || "*").split(",").map((s) => s.trim()).filter(Boolean);
const corsOrigin = rawOrigins.includes("*") ? "*" : rawOrigins;
app.use(cors({ origin: corsOrigin }));

app.use(express.json());
app.use(morgan("dev"));

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use("/api/vehicles", vehiclesRouter);
app.use("/api/leads", leadsRouter);
app.use("/api/admin", adminRouter);
app.use("/api/settings", settingsRouter);
app.use("/api/subscribers", subscribersRouter);
app.use("/api/vision", visionRouter);

app.get("/api/health", (req, res) => res.json({ ok: true }));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: err.message || "Something went wrong." });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`MK Motors API running on http://localhost:${PORT}`));
