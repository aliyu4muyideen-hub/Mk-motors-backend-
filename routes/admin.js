const express = require("express");
const jwt = require("jsonwebtoken");

const router = express.Router();

// POST /api/admin/login  { password }
// Returns a token to use as: Authorization: Bearer <token>
router.post("/login", (req, res) => {
  const { password } = req.body;

  if (!password || password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: "Incorrect password." });
  }

  const token = jwt.sign({ role: "admin" }, process.env.JWT_SECRET, { expiresIn: "12h" });
  res.json({ token });
});

module.exports = router;
