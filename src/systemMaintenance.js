import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { getGuatemalaTimestamp } from "./timeHelper.js";

dotenv.config();

// Use SERVICE ROLE – required for deletes & RPC
const SUPABASE_URL = process.env.SUPABASE_URL?.trim();
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

if (!SUPABASE_URL) throw new Error("❌ Missing SUPABASE_URL");
if (!SERVICE_KEY) throw new Error("❌ Missing SUPABASE_SERVICE_ROLE_KEY");

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false }
});

export async function runSystemMaintenance() {
  const { localDate, localTime } = getGuatemalaTimestamp();
  console.log(`🧹 Running Servoya System Maintenance... (${localDate} ${localTime})`);

  // 1️⃣ Clean records older than 90 days
  const tables = [
    "flow_activity_log",
    "performance_logs",
    "feedback_logs",
    "daily_trends",
    "trend_intelligence",
  ];

  const ninetyDaysAgoISO = new Date(Date.now() - (90 * 24 * 60 * 60 * 1000)).toISOString();

  for (const t of tables) {
    const { error } = await supabase
      .from(t)
      .delete()
      .lt("created_at", ninetyDaysAgoISO);  // FIX: created_at is the consistent column

    if (error) {
      console.error(`⚠️ Error cleaning ${t}:`, error.message);
    } else {
      const { localDate: d, localTime: tm } = getGuatemalaTimestamp();
      console.log(`✅ Cleaned old records from ${t} (${d} ${tm})`);
    }
  }

  // 2️⃣ Aggregate ROI data via RPC
  try {
    const { error: rpcError } = await supabase.rpc("aggregate_old_roi");

    if (rpcError) {
      console.warn(`⚠️ ROI aggregation skipped: ${rpcError.message}`);
    } else {
      const { localDate: d, localTime: tm } = getGuatemalaTimestamp();
      console.log(`📈 ROI aggregation completed (${d} ${tm})`);
    }
  } catch (rpcFatal) {
    console.warn("⚠️ ROI aggregation fatal error:", rpcFatal.message);
  }

  // 3️⃣ Bucket health check (placeholder only)
  const buckets = ["servoya-videos", "servoya-audio"];
  for (const b of buckets) {
    const { localDate: d, localTime: tm } = getGuatemalaTimestamp();
    console.log(`🗂️ Bucket ${b} check logged (${d} ${tm})`);
  }

  const { localDate: dFinal, localTime: tFinal } = getGuatemalaTimestamp();
  console.log(`✅ System Maintenance completed at ${dFinal} ${tFinal}`);
}

// ❌ Removed auto-run block – NOT SAFE for production