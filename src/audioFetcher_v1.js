import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE
);

// ---------------------------------------------------
// MAIN FUNCTION EXPECTED BY THE SERVER:
// getAudioForNiche(niche)
// ---------------------------------------------------
export async function getAudioForNiche(niche) {
  try {
    console.log("🎧 Fetching audio for niche:", niche);

    const { data, error } = await supabase.storage
      .from("servoya-audio")
      .list(niche + "/", { limit: 50 });

    if (error) {
      console.error("Supabase audio list error:", error);
      return null;
    }

    if (!data || data.length === 0) {
      console.error("No audio in niche:", niche);
      return null;
    }

    const fileName = data[0].name;
    const filePath = `${niche}/${fileName}`;

    const { data: audioFile, error: audioError } = await supabase.storage
      .from("servoya-audio")
      .download(filePath);

    if (audioError) {
      console.error("Supabase audio download error:", audioError);
      return null;
    }

    const arrayBuffer = await audioFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    console.log("🎧 Audio loaded:", fileName);

    return {
      buffer,
      fileName
    };

  } catch (err) {
    console.error("🔥 Audio fetch error:", err.message);
    return null;
  }
}