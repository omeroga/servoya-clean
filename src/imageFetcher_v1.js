import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import fetch from "node-fetch";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// תיקייה זמנית לשמירת התמונות בתוך ה־VPS
const TMP_ROOT = process.env.IMAGE_TMP_DIR || "/tmp/servoya-images";

// -------------------------------------------
// הורדת תמונות לקבצים
// -------------------------------------------
export async function fetchImagesToFiles(imageUrls = [], options = {}) {
  const maxImages = options.maxImages || 5;
  const timeoutMs = options.timeoutMs || 15000;

  if (!Array.isArray(imageUrls) || imageUrls.length === 0) {
    console.warn("imageFetcher_v1: no image URLs received");
    return [];
  }

  if (!fs.existsSync(TMP_ROOT)) {
    fs.mkdirSync(TMP_ROOT, { recursive: true });
  }

  const selected = imageUrls.slice(0, maxImages);
  const paths = [];

  let idx = 0;
  for (const url of selected) {
    try {
      idx++;
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), timeoutMs);

      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(id);

      if (!res.ok) {
        console.warn(`imageFetcher_v1: failed ${url} status=${res.status}`);
        continue;
      }

      const buffer = Buffer.from(await res.arrayBuffer());
      const outPath = path.join(TMP_ROOT, `img_${Date.now()}_${idx}.jpg`);

      fs.writeFileSync(outPath, buffer);
      paths.push(outPath);
    } catch (err) {
      console.error("imageFetcher_v1 error:", err.message);
    }
  }

  return paths;
}

// -------------------------------------------
// הורדת תמונות ל־Buffer בזיכרון
// -------------------------------------------
export async function fetchImagesToBuffers(imageUrls = [], options = {}) {
  const maxImages = options.maxImages || 5;
  const timeoutMs = options.timeoutMs || 15000;

  if (!Array.isArray(imageUrls) || imageUrls.length === 0) {
    console.warn("imageFetcher_v1: no image URLs received");
    return [];
  }

  const selected = imageUrls.slice(0, maxImages);
  const buffers = [];

  for (const url of selected) {
    try {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), timeoutMs);

      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(id);

      if (!res.ok) {
        console.warn(`imageFetcher_v1: failed ${url} status=${res.status}`);
        continue;
      }

      const arrayBuf = await res.arrayBuffer();
      buffers.push(Buffer.from(arrayBuf));
    } catch (err) {
      console.error("imageFetcher_v1 error:", err.message);
    }
  }

  return buffers;
}

// -------------------------------------------
// פיצ׳ר KEEPPA: מחזיר תמונות לפי ASIN
// -------------------------------------------
export async function fetchImagesForProduct(asin) {
  try {
    const url = `https://api.keepa.com/product?key=${process.env.KEEPA_API_KEY}&domain=1&asin=${asin}`;
    const res = await fetch(url);

    if (!res.ok) {
      console.error("fetchImagesForProduct: keepa error", res.status);
      return [];
    }

    const data = await res.json();
    if (!data?.products?.[0]) {
      console.error("fetchImagesForProduct: no product found");
      return [];
    }

    const product = data.products[0];

    if (!product.imagesCSV) {
      console.error("fetchImagesForProduct: no imagesCSV");
      return [];
    }

    const imageUrls = product.imagesCSV
      .split(",")
      .map(img => `https://images-na.ssl-images-amazon.com/images/I/${img}.jpg`);

    return await fetchImagesToFiles(imageUrls, { maxImages: 5 });

  } catch (err) {
    console.error("fetchImagesForProduct error:", err.message);
    return [];
  }
}