/* Servoya Cloud Video Engine v1
   - Accepts product metadata
   - Fetches images via ImageFetcher
   - Selects audio from Supabase per niche
   - Sends everything to Cloud Render API (Pika or Render Worker)
*/

import { fetchImagesForProduct } from "./imageFetcher_v1.js";
import { getAudioForNiche } from "./audioFetcher_v1.js";
import fetch from "node-fetch";

export async function createCloudVideo({ asin, title, niche, scriptText }) {
  try {
    console.log("🎬 Cloud Video Engine starting:", asin, niche);

    // 1) IMAGES
    const images = await fetchImagesForProduct(asin);
    if (!images || images.length === 0) {
      return { ok: false, error: "No images fetched" };
    }

    // 2) AUDIO
    const audioUrl = await getAudioForNiche(niche);
    if (!audioUrl) {
      return { ok: false, error: "No audio found for niche" };
    }

    // 3) SEND TO CLOUD RENDER WORKER
    const payload = {
      asin,
      title,
      script: scriptText,
      niche,
      images,
      audio: audioUrl
    };

    const res = await fetch(process.env.CLOUD_RENDER_URL + "/render", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      return { ok: false, error: "Cloud render error" };
    }

    const data = await res.json();
    return { ok: true, videoUrl: data.videoUrl };

  } catch (err) {
    console.error("🔥 VideoEngine Cloud error:", err);
    return { ok: false, error: err.message };
  }
}