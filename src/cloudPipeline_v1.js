import { runTrendFetch } from "./trendFetcher_v1.js";
import { fetchAudioForNiche } from "./audioFetcher_v1.js";
import { generateCloudVideo } from "./videoEngine_cloud_v1.js";
import { supabase } from "./supabaseClient.js";
import { createPrompt } from "./promptEngine_v8.js";

export async function runFullPipeline(niche = "beauty") {
  try {
    console.log("🔵 Starting full pipeline for niche:", niche);

    // 1. Fetch trend/product
    const trend = await runTrendFetch(niche);
    if (!trend || !trend.asin) {
      throw new Error("No product found");
    }

    console.log("📌 Product:", trend.asin);

    // 2. Create script
    const prompt = await createPrompt(trend.title, trend.asin, niche);

    console.log("📝 Prompt created");

    // 3. Fetch audio
    const audioUrl = await fetchAudioForNiche(niche);

    console.log("🎧 Audio selected:", audioUrl);

    // 4. Generate video via cloud engine
    const videoUrl = await generateCloudVideo({
      asin: trend.asin,
      prompt,
      audioUrl
    });

    console.log("🎬 Video created:", videoUrl);

    // 5. Save record in Supabase
    await supabase.from("videos").insert({
      asin: trend.asin,
      niche,
      prompt_text: prompt,
      video_url: videoUrl,
    });

    console.log("💾 Saved into Supabase");

    return {
      ok: true,
      asin: trend.asin,
      video_url: videoUrl,
    };

  } catch (err) {
    console.error("🔥 Pipeline failed:", err);
    return { ok: false, error: err.message };
  }
}