import { createClient } from "@supabase/supabase-js";

// Supabase Client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE
);

export async function fetchAudioByCategory(category) {
  try {
    console.log("🎧 Fetching audio for category:", category);

    const { data, error } = await supabase.storage
      .from("servoya-audio")
      .list(category + "/", { limit: 50 });

    if (error) {
      console.error("Supabase audio list error:", error);
      throw new Error("Cannot list audio files");
    }

    if (!data || data.length === 0) {
      throw new Error("No audio files found in category: " + category);
    }

    // Pick the first audio file
    const fileName = data[0].name;
    const filePath = `${category}/${fileName}`;

    const { data: audioFile, error: audioError } = await supabase.storage
      .from("servoya-audio")
      .download(filePath);

    if (audioError) {
      console.error("Supabase audio download error:", audioError);
      throw new Error("Cannot download audio");
    }

    const arrayBuffer = await audioFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    console.log("🎧 Audio loaded:", fileName);

    return {
      buffer,
      fileName
    };

  } catch (err) {
    console.error("🔥 Audio fetch error:", err);
    throw err;
  }
}