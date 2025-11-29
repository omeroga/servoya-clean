import { supabase } from "./supabaseClient.js";
import nodemailer from "nodemailer";

let lastAlertTimes = {};

const ALERT_COOLDOWN_MINUTES = 60;

// Clean text to avoid Supabase/JSON issues
function clean(text = "") {
  return String(text)
    .replace(/[\n\r]/g, " ")
    .replace(/"/g, "'")
    .trim();
}

export async function sendSmartAlert(type, message, details = {}) {
  const now = Date.now();
  const last = lastAlertTimes[type] || 0;

  // Cooldown window
  if (now - last < ALERT_COOLDOWN_MINUTES * 60 * 1000) {
    console.log(`⏳ Skipping duplicate alert: ${type}`);
    return;
  }

  lastAlertTimes[type] = now;

  // Clean strings
  const msg = clean(message);
  const dt = clean(JSON.stringify(details || {}, null, 2));

  try {
    // Insert into performance_logs using valid columns only
    const { error } = await supabase.from("performance_logs").insert([
      {
        status: "error",
        message: msg,
        created_at: new Date().toISOString(),
        context: type,
        extra: dt
      }
    ]);

    if (error) {
      console.error("❌ Failed to log alert:", error.message);
    } else {
      console.log(`🚨 Logged alert to Supabase: ${type}`);
    }
  } catch (err) {
    console.error("❌ Failed inserting alert:", err.message);
  }

  // Email alert (App Password only)
  if (process.env.ALERT_EMAIL_FROM && process.env.ALERT_EMAIL_APP_PASSWORD) {
    try {
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: process.env.ALERT_EMAIL_FROM,
          pass: process.env.ALERT_EMAIL_APP_PASSWORD,
        },
      });

      await transporter.sendMail({
        from: `"Servoya Alerts" <${process.env.ALERT_EMAIL_FROM}>`,
        to: process.env.ALERT_EMAIL_TO,
        subject: `⚠️ Servoya Alert: ${type}`,
        text: `${msg}\n\nDetails:\n${dt}`,
      });

      console.log(`📧 Alert email sent: ${type}`);
    } catch (err) {
      console.error("❌ Email send failed:", err.message);
    }
  } else {
    console.log("ℹ️ Email alerts disabled (missing env vars)");
  }
}