import { supabase } from "./supabaseClient.js";

// Cache limits
const CACHE_LIMIT = 200;
const MAX_CACHE_AGE_DAYS = 3;

// Time helper
function daysAgo(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

// ===== Fetch cached trends =====
export async function getCachedTrends() {
  try {
    const { data, error } = await supabase
      .from("daily_trends")
      .select("*")
      .gte("created_at", daysAgo(MAX_CACHE_AGE_DAYS))
      .order("created_at", { ascending: false })
      .limit(CACHE_LIMIT);

    if (error) {
      console.error("Cache fetch error:", error.message);
      return [];
    }

    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.error("Cache fetch fatal:", err.message);
    return [];
  }
}

// ===== Save new trends =====
export async function saveTrendsToCache(rows) {
  try {
    if (!Array.isArray(rows) || rows.length === 0) return;

    const safeRows = rows.map(r => ({
      ...r,
      url: r.url || `trend-${r.title || Date.now()}`
    }));

    const { error } = await supabase
      .from("daily_trends")
      .upsert(safeRows, { onConflict: "url" });

    if (error) {
      console.error("Cache save error:", error.message);
    }
  } catch (err) {
    console.error("Cache save fatal:", err.message);
  }
}

// ===== Prevent duplicate titles =====
export function filterDuplicates(newTrends, cachedTrends) {
  try {
    const seen = new Set(
      cachedTrends
        .map(t => t?.title?.toLowerCase?.().trim())
        .filter(Boolean)
    );

    return newTrends.filter(
      t => t?.title && !seen.has(t.title.toLowerCase().trim())
    );
  } catch (err) {
    console.error("Duplicate filter error:", err.message);
    return newTrends;
  }
}

// ===== Fallback trending list =====
export async function fallbackTrends() {
  try {
    const cache = await getCachedTrends();

    if (!cache.length) {
      console.warn("⚠️ No fallback cache available");
      return [];
    }

    return cache
      .sort((a, b) => (b.score || 0) - (a.score || 0))
      .slice(0, 20);
  } catch (err) {
    console.error("Fallback fatal:", err.message);
    return [];
  }
}

// ===== Cleanup old cache =====
export async function cleanupOldCache() {
  try {
    const { error } = await supabase
      .from("daily_trends")
      .delete()
      .lt("created_at", daysAgo(MAX_CACHE_AGE_DAYS));

    if (error) {
      console.error("Cache cleanup error:", error.message);
    }
  } catch (err) {
    console.error("Cache cleanup fatal:", err.message);
  }
}

// ======================================================
// 🚀 Compatibility Layer for Trend Engine v12
// ======================================================
export async function loadTrendCache() {
  return await getCachedTrends();
}

export async function saveTrendCache(rows) {
  return await saveTrendsToCache(rows);
}