import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Simple timeout wrapper
function withTimeout(promise, ms = 15000) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("OpenAI timeout exceeded")), ms)
    ),
  ]);
}

// Safe fallback script
const FALLBACK_SCRIPT =
  "Stay focused. Small progress every day leads to massive results.";

export async function generateScript(prompt = "") {
  try {
    if (!prompt || typeof prompt !== "string") return FALLBACK_SCRIPT;

    // Clean unsafe inputs
    const cleaned = prompt.trim();
    if (cleaned.length < 3) return FALLBACK_SCRIPT;

    const response = await withTimeout(
      client.chat.completions.create({
        model: "gpt-5.1-mini",
        messages: [
          {
            role: "system",
            content:
              "You generate short motivational lines for social videos. Format: 1–3 tight sentences.",
          },
          {
            role: "user",
            content: cleaned,
          },
        ],
        max_tokens: 80,
        temperature: 0.7,
      }),
      15000
    );

    const text =
      response?.choices?.[0]?.message?.content?.trim() || FALLBACK_SCRIPT;

    return text;
  } catch (err) {
    console.error("OpenAI Generator Error:", err.message);
    return FALLBACK_SCRIPT;
  }
}