import { runTrendEngine } from "./trendEngine_v13.js";
import { selectProduct } from "./productSelector_v1.js";
import { mapProductToPrompt } from "./productMapper.js";
import { generateScriptV3 } from "./scriptEngine_v3.js";
import { getAudioForNiche } from "./audioFetcher_v1.js";
import { generateVideoFFmpeg } from "./videoEngine_ffmpeg.js";
import { supabase } from "./supabaseClient.js";

export async function runFullJob(options = {}) {
  const trend = await runTrendEngine(options.category);

  const product = await selectProduct(trend);

  const mapped = await mapProductToPrompt(product);

  const script = await generateScriptV3(mapped);

  const audio = await getAudioForNiche(mapped.category);
  if (!audio) throw new Error("Audio not found");

  const video = await generateVideoFFmpeg({
    product,
    script,
    audio
  });

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