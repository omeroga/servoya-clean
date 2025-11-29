import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Clean text before sending to video renderer
function sanitize(text = "") {
  return String(text)
    .replace(/[\n\r]/g, " ")
    .replace(/"/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

export async function generateCTAV2(product = {}) {
  try {
    const title = product?.title?.trim() || "this product";

    const prompt = `
Generate a single short CTA sentence for a TikTok/Reels product video.

Rules:
- Only 1 sentence.
- No emojis.
- No hashtags.
- No line breaks.
- Must be action-driven and related to: "${title}"
- Keep it sharp, clean, and powerful.
    `;

    const response = await openai.chat.completions.create({
      model: "gpt-5.1",
      messages: [{ role: "user", content: prompt }],
      max_completion_tokens: 25,
      temperature: 0.4,
    });

    let result =
      response?.choices?.[0]?.message?.content?.trim() ||
      "Grab yours now while it's still available.";

    result = sanitize(result);

    return result;
  } catch (err) {
    console.error("❌ CTA V2 Error:", err?.message || err);
    return "Grab yours now while it's still available.";
  }
}