/* Servoya Product Selector v1 – Final 100K/month Edition */

import { getProductData } from "./productIntelligence_v2.js";
import { supabase } from "./supabaseClient.js";

/* Weighting rules */
const WEIGHTS = {
  trendScore: 0.35,
  keepaScore: 0.30,
  roiMemory: 0.25,
  freshness: 0.10
};

/* Normalize any number to 0–100 */
function norm(v) {
  if (!v || isNaN(v)) return 0;
  return Math.max(0, Math.min(100, Number(v)));
}

/* Convert age to freshness score */
function freshness(ts) {
  if (!ts) return 20;
  const diff = Date.now() - Number(ts);
  const days = diff / 86400000;
  if (days <= 1) return 100;
  if (days <= 3) return 80;
  if (days <= 7) return 60;
  if (days <= 14) return 40;
  if (days <= 30) return 20;
  return 10;
}

/* Get trends from DB */
async function loadTrends() {
  const { data } = await supabase
    .from("daily_trends")
    .select("*")
    .order("created_date", { ascending: false })
    .limit(120);
  return data || [];
}

/* Return Keepa score based on history */
function keepaScore(p) {
  if (!p) return 0;
  const jump = norm(p.drops30 || 0) * 3;
  const bsr = p.bsr ? Math.max(0, 100 - p.bsr / 1000) : 0;
  return Math.min(100, (jump + bsr) / 2);
}

/* Get ROI memory for specific ASIN */
async function loadROI(asin) {
  if (!asin) return 0;
  const { data } = await supabase
    .from("analytics_events")
    .select("revenue")
    .eq("asin", asin)
    .order("timestamp", { ascending: false })
    .limit(1);

  if (!data?.length) return 0;
  return Math.min(100, data[0].revenue * 2);
}

/* Fetch Keepa light data for ASIN list */
async function fetchKeepaLight(asins = []) {
  if (!asins.length) return {};
  const key = process.env.KEEPA_KEY?.trim();
  const url = `https://api.keepa.com/product?key=${key}&domain=1&history=0&buybox=1&asin=${asins.join(
    ","
  )}`;

  try {
    const res = await fetch(url);
    const json = await res.json();
    if (!json?.products) return {};

    const out = {};
    for (const p of json.products) {
      out[p.asin] = {
        asin: p.asin,
        drops30: p.drops30 || 0,
        bsr: p.stats?.bsr || 50000
      };
    }
    return out;
  } catch {
    return {};
  }
}

/* ================================
   MAIN SELECTOR
   ================================ */

export async function selectWinningProduct() {
  const trends = await loadTrends();
  if (!trends.length) return null;

  const keepaASINs = trends
    .map(t => t.asin)
    .filter(Boolean)
    .slice(0, 40);

  const keepaData = await fetchKeepaLight(keepaASINs);

  const scored = [];
  for (const t of trends) {
    const k = keepaData[t.asin] || null;
    const kScore = k ? keepaScore(k) : 0;
    const roiScore = await loadROI(t.asin);

    const score =
      WEIGHTS.trendScore * norm(t.score) +
      WEIGHTS.keepaScore * kScore +
      WEIGHTS.roiMemory * roiScore +
      WEIGHTS.freshness * freshness(t.ts || Date.now());

    scored.push({
      asin: t.asin,
      title: t.title,
      score,
      source: t.platform
    });
  }

  scored.sort((a, b) => b.score - a.score);
  const winner = scored[0];
  if (!winner || !winner.asin) return null;

  const product = await getProductData(winner.asin);
  if (!product) return null;

  return {
    ...product,
    selector_score: winner.score,
    selector_source: winner.source
  };
}