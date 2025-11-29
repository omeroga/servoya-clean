import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

/**
 * Simple FFmpeg video generator with slight motion (Ken Burns effect)
 * Uses a single image + audio, מייצר וידאו אנכי 1080x1920.
 */
export async function generateVideoFFmpeg({
  imagePath,
  audioPath,
  outputPath,
  duration = 12
}) {
  if (!imagePath || !audioPath || !outputPath) {
    throw new Error("Missing imagePath / audioPath / outputPath");
  }

  // Ken Burns עדין על התמונה במקום סטיל קפוא
  const ffmpegCmd = [
    "ffmpeg -y",
    `-loop 1 -i "${imagePath}"`,
    `-i "${audioPath}"`,
    `-t ${duration}`,
    `-vf "scale=1080:1920,zoompan=z='min(zoom+0.0007,1.12)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)',format=yuv420p"`,
    "-c:v libx264 -preset veryfast",
    "-c:a aac -b:a 128k",
    `"${outputPath}"`
  ].join(" ");

  try {
    const { stdout, stderr } = await execAsync(ffmpegCmd);
    return {
      ok: true,
      output: outputPath,
      stdout,
      stderr
    };
  } catch (err) {
    console.error("FFmpeg error:", err);
    throw err;
  }
}