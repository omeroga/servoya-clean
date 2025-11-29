import dotenv from "dotenv";
dotenv.config();

import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function generateScript(productData = {}) {
  try {
    const {
      title = "",
      bullets = [],
      description = "",
      category = "",
      trend_keywords = "",
    } = productData;

    const safeTitle = title || "";
    const safeBullets = Array.isArray(bullets)
      ? bullets.filter(Boolean).join(". ")
      : "";
    const safeDescription = description || "";
    const safeCategory = category || "";
    const safeTrends = trend_keywords || "";

    const prompt = `
Generate a 15-second short-form marketing script.

Product Title: ${safeTitle}
Bullets: ${safeBullets}
Description: ${safeDescription}
Category: ${safeCategory}
Trend Keywords: ${safeTrends}

Rules:
- 15 seconds pacing
- 1 strong hook (max 10 words)
- 3-5 micro benefits
- 1 CTA
- No emojis
- Short sentences
- High retention
    `;

    const response = await client.chat.completions.create({
      model: "gpt-5.1",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
      max_completion_tokens: 150,
    });

    const result = response?.choices?.[0]?.message?.content?.trim();

    return result || "Discover why thousands love this product. Try it now.";

  } catch (err) {
    console.error("❌ Script Engine Error:", err);
    return "Discover why thousands love this product. Try it now.";
  }
}