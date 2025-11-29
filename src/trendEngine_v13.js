import fetch from "node-fetch";
import { supabase } from "./supabaseClient.js";
import { mapTrendToProduct } from "./productMapper.js";
import { getKeepaBestSellers } from "./keepaClient_v2.js";

// =============================
// TIME HELPERS
// =============================
function gtNow() {
  const tz = "America/Guatemala";
  const d = new Date();
  const date = d.toLocaleDateString("en-GB", { timeZone: tz }).split("/").reverse().join("-");
  const time = d.toLocaleTimeString("en-GB", { timeZone: tz });
  return { date, time };
}

// =============================
// LOGGING
// =============================
async function logPerf(level, msg, extra = {}) {
  try {
    await supabase.from("performance_logs").insert([{
      level,
      message: msg,
      created_at: new Date().toISOString(),
      context: "trend_engine_v13",
      extra
    }]);
  } catch {}
}

// =============================
// FILTERS
// =============================
const STRICT_EXCLUDE = [
  "news","election","politics","war","gaza","israel","shooting",
  "nba","nfl","soccer","rapper","album","song","music","movie",
  "storm","hurricane","earthquake"
];

function isNoise(title = "") {
  const t = title.toLowerCase();
  return STRICT_EXCLUDE.some(k => t.includes(k));
}

function isBuyable(title = "") {
  const t = title.toLowerCase();
  return (
    t.includes("serum") ||
    t.includes("oil") ||
    t.includes("device") ||
    t.includes("projector") ||
    t.includes("gadget") ||
    t.includes("massage") ||
    t.includes("lamp") ||
    t.includes("korean") ||
    t.includes("cleaner") ||
    t.includes("air fryer") ||
    t.includes("security") ||
    t.includes("camera") ||
    t.includes("home") ||
    t.includes("fitness") ||
    t.includes("anti") ||
    t.includes("beauty") ||
    t.includes("smart") ||
    t.includes("best")
  );
}

// =============================
// ROI MEMORY
// =============================
async function loadROIMemory() {
  const { data } = await supabase
    .from("analytics_events")
    .select("asin, click_rate, revenue")
    .order("timestamp", { ascending: false })
    .limit(200);

  if (!data) return [];

  return data
    .filter(r => r.revenue > 5)
    .map(r => ({
      platform: "amazon",
      title: "ROI Winner " + r.asin,
      score: Math.min(100, r.revenue * 2),
      url: `https://amazon.com/dp/${r.asin}`
    }));
}

// =============================
// SOURCES
// =============================

// CLICKBANK
async function fetchClickbank() {
  try {
    const res = await fetch("https://api.clickbank.com/rest/1.3/products/topgravity");
    const json = await res.json();
    if (!json?.topgravity) return [];
    return json.topgravity.map(item => ({
      platform: "clickbank",
      title: item.title || "",
      score: item.gravity || 0,
      url: item.pitchPage || null
    }));
  } catch {
    return [];
  }
}

// REDDIT AFFILIATE
async function fetchRedditAffiliate() {
  try {
    const res = await fetch("https://www.reddit.com/r/affiliatemarketing/hot.json?limit=40");
    const json = await res.json();
    if (!json?.data?.children) return [];
    return json.data.children.map(p => ({
      platform: "reddit",
      title: p.data.title || "",
      score: p.data.ups || 0,
      url: p.data.url || null
    }));
  } catch {
    return [];
  }
}

// GOOGLE TRENDS
async function fetchGoogleTrendsUS() {
  try {
    const res = await fetch("https://trends.google.com/trending/rss?geo=US");
    const text = await res.text();
    const matches = [...text.matchAll(/<title>(.*?)<\/title>/g)];
    if (!matches.length) return [];
    return matches
      .map(m => m[1])
      .filter(t => t && !t.includes("Daily Search Trends"))
      .map(t => ({
        platform: "google",
        title: t,
        score: 45,
        url: null
      }));
  } catch {
    return [];
  }
}

// =============================
// NORMALIZATION
// =============================
function normalizeTrend(t) {
  const mapped = mapTrendToProduct(t.title || "");
  const { date, time } = gtNow();

  return {
    title: t.title || "",
    platform: t.platform || "",
    score: Math.min(100, t.score || 0),
    url: t.url || null,
    category: mapped.category || "general",
    suggested_product: mapped.suggested_product || null,
    product_intent: mapped.intent || null,
    created_date: date,
    created_time: time
  };
}

function dedupe(arr) {
  const out = [];
  const seen = new Set();

  for (const r of arr) {
    const k = (r.title || "").toLowerCase() + "|" + r.platform;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(r);
  }
  return out;
}

// =============================
// MAIN ENGINE
// =============================
export async function runTrendEngineV13() {
  console.log("🚀 Trend Engine V13 Running…");
  await logPerf("start", "trend_engine_v13_start");

  try {
    const roi = await loadROIMemory();
    const keepa = await getKeepaBestSellers();

    const [cb, rd, gt] = await Promise.all([
      fetchClickbank(),
      fetchRedditAffiliate(),
      fetchGoogleTrendsUS()
    ]);

    let merged = [...keepa, ...roi, ...cb, ...rd, ...gt];

    merged = merged.filter(t => t.title);
    merged = merged.filter(t => !isNoise(t.title));
    merged = merged.filter(t => isBuyable(t.title));
    merged = merged.filter(t => t.score >= 35);

    const final = dedupe(merged.map(normalizeTrend));

    const { error } = await supabase
      .from("daily_trends")
      .upsert(final, { onConflict: "title" });

    if (error) throw error;

    await logPerf("success", "trend_engine_v13_success", {
      trends: final.length
    });

    return { ok: true, trends_added: final.length };
  } catch (err) {
    await logPerf("error", "trend_engine_v13_fail", { err: err.message });
    return { ok: false, error: err.message };
  }
}