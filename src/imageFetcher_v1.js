// src/imageFetcher_v1.js
// מודול הורדת תמונות מ־URL (Keepa / Amazon וכו') לקבצים זמניים או Buffers

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import fetch from "node-fetch";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// תיקייה זמנית לשמירת התמונות בתוך הקונטיינר / ה־VPS
const TMP_ROOT = process.env.IMAGE_TMP_DIR || "/tmp/servoya-images";

/**
 * מוריד רשימת URLs ושומר אותם כקבצי JPG זמניים.
 * מחזיר מערך של paths לקבצים.
 */
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
    idx++;
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
      const buffer = Buffer.from(arrayBuf);

      const outPath = path.join(
        TMP_ROOT,
        `img_${Date.now()}_${idx}.jpg`
      );

      fs.writeFileSync(outPath, buffer);
      paths.push(outPath);
    } catch (err) {
      console.error("imageFetcher_v1: error for", url, err.message);
    }
  }

  return paths;
}

/**
 * כמו fetchImagesToFiles אבל מחזיר Buffers בזיכרון, בלי לכתוב לדיסק.
 */
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
      console.error("imageFetcher_v1: error for", url, err.message);
    }
  }

  return buffers;
}