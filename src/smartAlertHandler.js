import dotenv from "dotenv";
import nodemailer from "nodemailer";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

// Use SERVICE ROLE key
const SUPABASE_URL = process.env.SUPABASE_URL?.trim();
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

if (!SUPABASE_URL) throw new Error("❌ Missing SUPABASE_URL");
if (!SERVICE_KEY) throw new Error("❌ Missing SUPABASE_SERVICE_ROLE_KEY");

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false }
});

// Convert UTC → Guatemala Time
function toGuatemalaTime(utcString) {
  try {
    if (!utcString) return "N/A";
    const date = new Date(utcString);
    return date.toLocaleString("en-GB", { timeZone: "America/Guatemala" });
  } catch {
    return "N/A";
  }
}

async function runSmartAlertHandler() {
  console.log("🚨 Running Smart Alert Handler...");

  try {
    const { data: statuses, error } = await supabase
      .from("health_status")
      .select("component, status, message, last_checked");

    if (error) throw error;

    if (!Array.isArray(statuses) || statuses.length === 0) {
      console.log("ℹ️ No health data found.");
      return;
    }

    const failed = statuses.filter(s => s.status !== "ok");

    if (failed.length === 0) {
      console.log("✅ All systems operational.");
      return;
    }

    const subject = `⚠️ Servoya Alert: ${failed.length} component(s) down`;

    const body = failed
      .map(f => {
        const comp = f.component?.toUpperCase() || "UNKNOWN";
        const st = f.status || "unknown";
        const msg = f.message || "No message";
        const ts = toGuatemalaTime(f.last_checked);
        return `❌ ${comp}\nStatus: ${st}\nMessage: ${msg}\nChecked: ${ts}`;
      })
      .join("\n\n");

    // Gmail App Password required (not regular password)
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.ALERT_EMAIL_FROM,
        pass: process.env.ALERT_EMAIL_APP_PASSWORD
      }
    });

    await transporter.sendMail({
      from: `"Servoya Monitor" <${process.env.ALERT_EMAIL_FROM}>`,
      to: process.env.ALERT_EMAIL_TO,
      subject,
      text: body
    });

    console.log(`🚨 Alert email sent for ${failed.length} component(s).`);
  } catch (err) {
    console.error("❌ Smart Alert Handler Error:", err.message);
  }
}

// SAFE: Removed auto-run on import
if (process.argv[1]?.includes("smartAlertHandler.js")) {
  runSmartAlertHandler();
}