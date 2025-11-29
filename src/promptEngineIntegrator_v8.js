/* Servoya Prompt Engine Integrator v8 — 100K Upgrade */

import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { getGuatemalaTimestamp } from "./timeHelper.js";
import { selectWinningProduct } from "./productSelector_v1.js";

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL?.trim(),
  process.env.SUPABASE_SERVICE_ROLE_KEY?.trim(),
  { auth: { persistSession: false } }
);

// Clean safe text
function clean(text = "") {
  return String(text)
    .replace(/[\n\r]+/g, " ")
    .replace(/"/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

export async function generateSmartAffiliatePrompt(input = {}) {
  console.log("🎯 Prompt Engine v8 – generating...");

  const { localDate: date, localTime: time } = getGuatemalaTimestamp();

  // 1) Pick winning product of the day
  const product = await selectWinningProduct();

  if (!product) {
    console.warn("⚠️ No product found. Using fallback prompt.");
    return "Create a fast 15-second viral script about a trending Amazon gadget. Use curiosity, emotional hooks and rapid pacing.";
  }

  const title = clean(product.title || "Amazon product");
  const bullets = product.bullets?.slice(0, 3) || [];
  const url = product.affiliate_url || "";
  const img = product.mainImage || "";

  // 2) Build the actual prompt
  const promptText = `
Create a viral 15-second script promoting "${title}".
Rules:
- Hook in the first 1.5 seconds.
- Highlight 2–3 benefits quickly.
- Speak in second person.
- Make the viewer feel urgency + curiosity.
- Add emotional twist.
- Keep pacing fast.
- Never mention Amazon directly.
Product Highlights:
- ${bullets.join("\n- ")}

Output style:
Short lines, punchy, perfect for TikTok/Reels.
  `.trim();

  // 3) Save to DB
  try {
    const { error } = await supabase.from("videos").insert([
      {
        trend_name: title,
        category: clean(product.category || "general"),
        platform: "servoya",
        stage: "active",
        prompt_text: promptText,
        affiliate_url: url,
        created_date: date,
        created_time: time,
        created_at: new Date().toISOString(),
        status: "generated",
        context: "prompt_engine_v8",
        image_url: img
      }
    ]);

    if (error) throw new Error(error.message);

    console.log("✅ Prompt saved successfully.");
    return promptText;
  } catch (err) {
    console.error("❌ Prompt Engine Error:", err?.message || err);
    return `Create a short, emotional, trending 15-second script.`;
  }
}