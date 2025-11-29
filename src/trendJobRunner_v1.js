import { runTrendEngine } from "./trendEngine_v13.js";
import { selectProduct } from "./productSelector_v1.js";
import { mapProductToPrompt } from "./productMapper.js";
import { generateScript } from "./scriptEngine_v3.js";
import { fetchAudio } from "./audioFetcher_v1.js";
import { supabase } from "./supabaseClient.js";

export async function runFullJob(options = {}) {
  const trend = await runTrendEngine(options.category);
  const product = await selectProduct(trend);
  const mapped = await mapProductToPrompt(product);
  const script = await generateScript(mapped);
  const audio = await fetchAudio({ niche: mapped.category, script });
  const video = await generateVideo({ audio, product });

  await supabase.from("videos").insert({
    asin: product.asin,
    category: mapped.category,
    script,
    audio_url: audio.url,
    video_url: video.url,
    status: "ready"
  });

  return {
    trend,
    product,
    video: video.url
  };
}