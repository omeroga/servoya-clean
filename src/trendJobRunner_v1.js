import { runTrendEngine } from "./trendEngine_v13.js";
import { selectProduct } from "./productSelector_v1.js";
import { mapProductToPrompt } from "./productMapper.js";
import { generateScriptV3 } from "./scriptEngine_v3.js";
import { getAudioForNiche } from "./audioFetcher_v1.js";
import { generateVideoFFmpeg } from "./videoEngine_ffmpeg.js";
import { supabase } from "./supabaseClient.js";

export async function runFullJob(options = {}) {
  // 1. trend
  const trend = await runTrendEngine(options.category);

  // 2. product
  const product = await selectProduct(trend);

  // 3. mapped
  const mapped = await mapProductToPrompt(product);

  // 4. script
  const script = await generateScriptV3(mapped);

  // 5. audio
  const audio = await getAudioForNiche(mapped.category);
  if (!audio) throw new Error("Audio not found");

  // 6. video
  const video = await generateVideoFFmpeg({
    product,
    script,
    audio
  });

  // 7. save
  await supabase.from("videos").insert({
    asin: product.asin,
    category: mapped.category,
    script,
    status: "ready"
  });

  return { trend, product, video };
}

// fallback for pipeline
export const runPipeline = runFullJob;