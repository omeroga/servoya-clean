import { supabase } from "./supabaseClient.js";
import { getGuatemalaTimestamp } from "./timeHelper.js";

export async function logPerformance(status = "ok", message = "none") {
  try {
    const stamp = getGuatemalaTimestamp() || {
      localDate: null,
      localTime: null,
    };

    const entry = {
      status,
      message,
      created_date: stamp.localDate,
      created_time: stamp.localTime,
      created_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from("performance_logs")
      .insert([entry]);

    if (error) throw error;

    console.log(`Performance event logged (${status})`);
  } catch (err) {
    console.error("logPerformance error:", err.message);
  }
}