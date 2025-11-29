import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE
);

// פונקציה חדשה כמו שהשרת צריך
export async function getAudioForNiche(niche) {
  try {
    console.log("🎧 Fetching audio for niche:", niche);

    const { data, error } = await supabase
      .storage
      .from("servoya-audio")
      .list(niche + "/", { limit: 50 });

    if (error) {
      console.error("❌ Supabase audio list error:", error);
      return null;
    }

    if (!data || data.length === 0) {
      console.error("❌ No audio files found for niche:", niche);
      return null;
    }

    const fileName = data[0].name;
    const fullPath = `${niche}/${fileName}`;

    const { data: fileData, error: downloadErr } = await supabase
      .storage
      .from("servoya-audio")
      .download(fullPath);

    if (downloadErr) {
      console.error("❌ Supabase audio download error:", downloadErr);
      return null;
    }

    console.log("🎧 Loaded audio:", fullPath);

    return {
      fileName,
      buffer: Buffer.from(await fileData.arrayBuffer())
    };

  } catch (err) {
    console.error("🔥 getAudioForNiche error:", err.message);
    return null;
  }
}