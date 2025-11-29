import { runTrendEngine } from "./trendEngine_v13.js";
import { selectProduct } from "./productSelector_v1.js";
import { mapProductToPrompt } from "./productMapper.js";
import { generateScript } from "./scriptEngine_v3.js";
import { getAudioForNiche } from "./audioFetcher_v1.js";
import { generateVideoFFmpeg } from "./videoEngine_ffmpeg.js";
import { supabase } from "./supabaseClient.js";

export async function runFullJob(options = {}) {
  // 1. Get trending topic
  const trend = await runTrendEngine(options.category);

  // 2. Pick product
  const product = await selectProduct(trend);

  // 3. Convert product to prompt
  const mapped = await mapProductToPrompt(product);

  // 4. Generate script
  const script = await generateScript(mapped);

  // 5. Fetch audio from Supabase
  const audio = await getAudioForNiche(mapped.category);
  if (!audio) throw new Error("Audio not found");

  // 6. Generate video locally with FFmpeg
  const video = await generateVideoFFmpeg({
    product,
    script,
    audio
  });

  // 7. Save to Supabase
  await supabase.from("videos").insert({
    asin: product.asin,
    category: mapped.category,
    script,
    status: "ready"
  });

  return {
    trend,
    product,
    video
  };
}