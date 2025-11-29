import express from "express";
import dotenv from "dotenv";

// Core engines
import { runTrendJob } from "./src/trendJobRunner_v1.js";
import { runScriptEngine } from "./src/scriptEngine_v3.js";
import { runVideoEngine } from "./src/videoEngine_ffmpeg.js";

// Fetchers
import { fetchImages } from "./src/imageFetcher_v1.js";
import { fetchAudio } from "./src/audioFetcher_v1.js";

// Intelligence
import { mapProduct } from "./src/productMapper.js";
import { runProductIntelligence } from "./src/productIntelligence_v2.js";

// Supabase
import { supabase } from "./src/supabaseClient.js";

// Misc
import { logPerformance } from "./src/performanceLogger.js";

dotenv.config();

const app = express();
app.use(express.json());

// Healthcheck
app.get("/health", (req, res) => {
  res.json({ ok: true, status: "Servoya Cloud Worker Online" });
});

/**
 * MAIN GENERATION ENDPOINT
 * This is the unified Cloud Worker pipeline:
 * 1. Fetch Trend → 2. Intelligence → 3. Map Product
 * 4. Fetch Images → 5. Script Engine → 6. Audio → 7. Video
 */
app.post("/api/v2/generate/video", async (req, res) => {
  try {
    const niche = req.body.niche || "beauty";

    console.log("⚡ Starting unified pipeline for niche:", niche);

    // Step 1: Trend Job (latest trend)
    const trend = await runTrendJob(niche);

    // Step 2: Product Intelligence
    const productData = await runProductIntelligence(trend);

    // Step 3: Product Mapping
    const mapped = await mapProduct(productData);

    // Step 4: Image Fetching
    const images = await fetchImages(mapped);

    // Step 5: Script
    const script = await runScriptEngine({
      trend,
      product: mapped,
      images
    });

    // Step 6: Audio
    const audio = await fetchAudio(script);

    // Step 7: Video (final output)
    const videoPath = await runVideoEngine({
      images,
      audio,
      script
    });

    // Log performance (non blocking)
    logPerformance("video_generation", {
      niche,
      trend: trend?.title || "",
    });

    res.json({
      ok: true,
      video: videoPath,
      trend,
      product: mapped,
    });

  } catch (err) {
    console.error("❌ Pipeline Fatal Error:", err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Start server
app.listen(8080, () => {
  console.log("🚀 Servoya Cloud Worker running on port 8080");
});