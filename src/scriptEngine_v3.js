import dotenv from "dotenv";
dotenv.config();

import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ✔ Script Engine – דינמי לחלוטין, עובד לכל נישה, בנוי ל־15 שניות, מותאם לחוות תוכן ברמה של 100K$ בחודש
export async function generateScriptV3(productData = {}) {
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
You are Servoya Script Engine V3.
Your job: produce a **high-converting short-form script** for 12–15 second product videos.
The script must work for TikTok, Reels, and YouTube Shorts.

Rules:
- ALWAYS 15 seconds structure.
- 1 punch opening hook (max 10 words)
- 3–5 micro-benefits (each 4–7 words)
- 1 strong CTA
- No emojis
- No bullet lists
- No long sentences
- Write in marketing style that increases retention.
- Fit ANY category dynamically (beauty, gadgets, home, pets, tools, fitness, etc.)

Product Title: ${safeTitle}
Bullets: ${safeBullets}
Description: ${safeDescription}
Category: ${safeCategory}
Trend Keywords: ${safeTrends}

Write the script as 1 paragraph with line breaks between sentences.
Make sure the pacing fits 15 seconds exactly.
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
    console.error("❌ Script Engine V3 Error:", err);
    return "Discover why thousands love this product. Try it now.";
  }
}