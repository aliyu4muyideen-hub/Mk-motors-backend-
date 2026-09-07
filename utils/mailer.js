const nodemailer = require("nodemailer");
const db = require("../db");

function getTransporter() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) return null; // email not configured — skip quietly

  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === "true",
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
}

// Fire-and-forget: emails every subscriber that a new vehicle just dropped.
// Safe to call even if email isn't configured — it just does nothing in that case.
async function notifyNewArrival(vehicle) {
  const transporter = getTransporter();
  if (!transporter) return;

  const subscribers = db.prepare("SELECT email FROM subscribers").all();
  if (subscribers.length === 0) return;

  const from = process.env.FROM_EMAIL || process.env.SMTP_USER;
  const subject = `New arrival: ${vehicle.year} ${vehicle.make} ${vehicle.model}`;
  const text = `A new vehicle just landed at MK Motors:\n\n${vehicle.year} ${vehicle.make} ${vehicle.model} ${vehicle.trim || ""}\n$${vehicle.price.toLocaleString()} — ${vehicle.mileage.toLocaleString()} miles\n\nCome take a look.`;

  await Promise.allSettled(
    subscribers.map((s) => transporter.sendMail({ from, to: s.email, subject, text }))
  );
}

// Fire-and-forget: emails YOU (the dealer) when a customer submits a chat message,
// test-drive request, trade-in request, or contact form. Safe to call even if email
// isn't configured or ADMIN_NOTIFY_EMAIL isn't set — it just does nothing in that case.
async function notifyAdmin(subject, text) {
  const transporter = getTransporter();
  const to = process.env.ADMIN_NOTIFY_EMAIL || process.env.SMTP_USER;
  if (!transporter || !to) return;

  const from = process.env.FROM_EMAIL || process.env.SMTP_USER;
  await transporter.sendMail({ from, to, subject, text });
}

module.exports = { notifyNewArrival, notifyAdmin };
