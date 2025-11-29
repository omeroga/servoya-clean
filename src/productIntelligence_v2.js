import fetch from "node-fetch";

// === Helpers ===
async function safeJson(res) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

function cleanText(str = "") {
  return str
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// === Google Trends indicator ===
async function getGoogleTrendScore(keyword = "") {
  try {
    if (!keyword) return 0;

    const url = `https://trends.google.com/trends/api/widgetdata/multiline?hl=en-US&tz=-180&req={"time":"now 7-d","resolution":"HOUR","locale":"en-US","comparisonItem":[{"keyword":"${encodeURIComponent(
      keyword
    )}","geo":"US"}],"requestOptions":{"property":"","backend":"IZG","category":0}}&token=APP6_UEAAAAAZx`;

    const res = await fetch(url);
    const raw = await res.text();

    const clean = raw.replace(")]}',", "");
    const data = JSON.parse(clean);

    const values = data.default?.timelineData || [];
    if (!values.length) return 0;

    const scores = values.map(v => Number(v.value?.[0] || 0));
    return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  } catch {
    return 0;
  }
}

// === Keepa base ===
async function fetchKeepa(asin = "") {
  try {
    const key = process.env.KEEPA_KEY?.trim();
    if (!key) return null;

    const url = `https://api.keepa.com/product?key=${key}&domain=1&asin=${asin}`;
    const res = await fetch(url);
    const data = await safeJson(res);

    if (!data?.products?.length) return null;
    return data.products[0];
  } catch {
    return null;
  }
}

// === Amazon Fallback Scraper ===
async function fallbackAmazonScraper(asin = "") {
  try {
    const url = `https://www.amazon.com/dp/${asin}`;
    const html = await fetch(url).then(r => r.text());

    const title = html.match(/<span id="productTitle"[^>]*>(.*?)<\/span>/s);
    const img = html.match(/"hiRes":"(.*?)"/);
    const bullets = Array.from(html.matchAll(/<li><span class="a-list-item">(.*?)<\/span>/g)).map(
      x => cleanText(x[1])
    );

    return {
      title: title ? cleanText(title[1]) : "Amazon Product",
      images: img ? [img[1]] : [],
      bullets: bullets.slice(0, 5),
      description: "",
      price: null,
    };
  } catch {
    return null;
  }
}

// === Final Function ===

export async function getProductData(asin = "") {
  try {
    if (!asin) throw new Error("Missing ASIN");

    // 1) Try Keepa first
    const keepa = await fetchKeepa(asin);

    // 2) fallback if needed
    const fallback = !keepa ? await fallbackAmazonScraper(asin) : null;

    const p = keepa || fallback;
    if (!p) throw new Error("No product data found");

    const title = cleanText(p.title || "Amazon Product");
    const bullets = Array.isArray(p.features)
      ? p.features.filter(Boolean).slice(0, 5)
      : p.bullets || [];

    let images = [];
    if (keepa?.imagesCSV) {
      images = keepa.imagesCSV
        .split(",")
        .map(x => `https://m.media-amazon.com/images/I/${x}`)
        .slice(0, 7);
    } else if (fallback?.images?.length) {
      images = fallback.images.slice(0, 7);
    }

    if (!images.length) {
      images = ["https://m.media-amazon.com/images/I/placeholder-image.jpg"];
    }

    const description = cleanText(keepa?.description || fallback?.description || "");

    const price =
      keepa?.buyBoxPrice > 0
        ? (keepa.buyBoxPrice / 100).toFixed(2)
        : fallback?.price || null;

    // === Google Trend score based on product title ===
    const googleTrendScore = await getGoogleTrendScore(title);

    return {
      asin,
      title,
      bullets,
      description,
      price,
      images,
      mainImage: images[0],
      affiliate_url: `https://www.amazon.com/dp/${asin}?tag=servoya-20`,

      // New fields for scaling:
      trend_score: googleTrendScore,
      source: keepa ? "keepa" : "fallback",
      ts: Date.now(),
    };
  } catch (err) {
    console.error("❌ Product Intelligence Error:", err);
    return null;
  }
}