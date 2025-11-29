import fetch from "node-fetch";

const KEEPA_API_KEY = process.env.KEEPA_API_KEY?.trim();
const KEEPA_BASE = "https://api.keepa.com";

// Convert Keepa timestamp → real date
function keepaTimeToDate(ts) {
  if (!ts) return null;
  const base = new Date("2011-01-01T00:00:00Z").getTime();
  return new Date(base + ts * 60 * 1000).toISOString();
}

// Convert imagesCSV → real URLs
function mapImages(imagesCSV = "") {
  return imagesCSV
    .split(",")
    .filter(Boolean)
    .map(id => `https://m.media-amazon.com/images/I/${id}`);
}

// =========================================================
// getProductByASIN
// =========================================================

export async function getProductByASIN(asin) {
  try {
    const url = `${KEEPA_BASE}/product?key=${KEEPA_API_KEY}&domain=1&buybox=1&history=1&asin=${asin}`;
    const res = await fetch(url);

    if (!res.ok) throw new Error("Keepa request failed");

    const json = await res.json();
    if (!json?.products?.length) return null;

    const p = json.products[0];

    const images = mapImages(p.imagesCSV || "");
    const price = p.buyBoxPrice ? (p.buyBoxPrice / 100).toFixed(2) : null;

    return {
      asin,
      title: p.title || null,
      brand: p.brand || null,
      categoryTree: p.categoryTree || [],
      images,
      bsr: p.stats?.bsr || null,
      drops30: p.drops30 || 0,
      drops90: p.drops90 || 0,
      avg30: p.stats?.avg30 || null,
      price,
      lastUpdate: keepaTimeToDate(p.lastUpdate)
    };
  } catch (err) {
    console.error("❌ Keepa ASIN Error:", asin, err.message);
    return null;
  }
}

// =========================================================
// searchHotProducts
// =========================================================

export async function searchHotProducts({ minDrops30 = 5, maxBSR = 50000 }) {
  try {
    const url = `${KEEPA_BASE}/query?key=${KEEPA_API_KEY}&domain=1&productType=0&stats=1&drops=30-${minDrops30}&bsr_max=${maxBSR}&page=0`;
    const res = await fetch(url);

    if (!res.ok) throw new Error("Keepa hot query failed");

    const json = await res.json();
    if (!json?.products?.length) return [];

    return json.products.map(p => ({
      asin: p.asin,
      title: p.title || "",
      bsr: p.stats?.bsr || null,
      drops30: p.drops30 || 0,
      images: mapImages(p.imagesCSV || "")
    }));
  } catch (err) {
    console.error("❌ Keepa Hot Products Error:", err.message);
    return [];
  }
}

// =========================================================
// getKeepaBestSellers  ← Missing export FIX (Used by Trend Engine v12)
// =========================================================

export async function getKeepaBestSellers() {
  try {
    const key = KEEPA_API_KEY;
    if (!key) throw new Error("Missing KEEPA_API_KEY");

    const url = `${KEEPA_BASE}/bestsellers?key=${key}&domain=1&category=0`;
    const res = await fetch(url);

    if (!res.ok) throw new Error("Keepa best sellers request failed");

    const json = await res.json();
    if (!json?.categories?.length) return [];

    // ASIN list from category 0 (general Amazon best sellers)
    const list = json.categories[0].asinList?.slice(0, 50) || [];

    // Convert ASINs → Trend Engine format (light mode)
    return list.map(asin => ({
      platform: "keepa",
      title: `ASIN ${asin}`,
      score: 60,
      url: `https://amazon.com/dp/${asin}`,
      asin
    }));

  } catch (err) {
    console.error("❌ Keepa Best Sellers Error:", err.message);
    return [];
  }
}