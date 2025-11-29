// manualCoreTest_v1.js – Servoya 100K core test

import { runTrendEngineV13 } from "./trendEngine_v13.js";
import { selectWinningProduct } from "./productSelector_v1.js";
import { generateSmartAffiliatePrompt } from "./promptEngineIntegrator_v8.js";

async function main() {
  console.log("🔹 Step 1 – running Trend Engine v13...");
  const trendResult = await runTrendEngineV13();
  console.log("TrendEngine result:", trendResult);

  console.log("🔹 Step 2 – selecting winning product...");
  const product = await selectWinningProduct();
  if (!product) {
    console.log("❌ No winning product found – check daily_trends + Keepa.");
    return;
  }
  console.log("Selected product:", product.asin, "-", product.title);

  console.log("🔹 Step 3 – generating prompt via PromptEngine v8...");
  const prompt = await generateSmartAffiliatePrompt({});
  console.log("Generated prompt:\n", prompt);

  console.log("✅ Core pipeline finished. Check 'videos' table in Supabase.");
}

main().catch(err => {
  console.error("❌ manualCoreTest_v1 failed:", err);
  process.exit(1);
});