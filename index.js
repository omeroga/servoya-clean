import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { exec } from "child_process";
import { generateVideoFFmpeg } from "./src/videoEngine_ffmpeg.js";
import { registerPipelineEndpoint } from "./src/pipelineEndpoint_v1.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log("🟢 Servoya Video Worker — Final Production Index Loaded");

const app = express();
app.use(cors());
app.use(express.json({ limit: "20mb" }));
registerPipelineEndpoint(app);

// HEALTH CHECK
app.get("/health", (req, res) => {
  res.json({ ok: true, ts: new Date().toISOString() });
});

// DEPLOY WEBHOOK (GitHub → VPS)
app.post("/deploy", (req, res) => {
  console.log("📦 Deploy webhook received");

  exec("cd /servoya && git pull", (err, stdout, stderr) => {
    if (err) {
      console.error("Deploy error:", err);
      return res.status(500).send("Deploy failed");
    }

    console.log(stdout);

    exec("pm2 restart servoya", () => {
      console.log("♻️ PM2 restarted");
    });

    res.send("Deploy OK");
  });
});

// VIDEO GENERATION ENDPOINT
app.post("/api/v2/generate/video", async (req, res) => {
  try {
    const { prompt, niche } = req.body;

    if (!prompt || !niche) {
      return res.status(400).json({ error: "Missing prompt or niche" });
    }

    console.log("🎬 Creating video:", prompt, "niche:", niche);

    const imagesDir = path.join(__dirname, "images");
    const audioDir = path.join(__dirname, "audio");
    const outputDir = path.join(__dirname, "output");

    const images = fs.readdirSync(imagesDir).filter(f => f.endsWith(".jpg"));
    if (images.length < 1) {
      return res.status(500).json({ error: "No images found" });
    }

    const audioFiles = fs.readdirSync(audioDir).filter(f => f.endsWith(".mp3"));
    if (audioFiles.length === 0) {
      return res.status(500).json({ error: "No audio files found" });
    }

    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);

    const imagePath = path.join(imagesDir, images[0]);
    const audioPath = path.join(audioDir, audioFiles[0]);
    const outputPath = path.join(outputDir, `video_${Date.now()}.mp4`);

    const result = await generateVideoFFmpeg({
      imagePath,
      audioPath,
      outputPath,
      duration: 12
    });

    res.json({ ok: true, output: outputPath, ffmpeg: result });

  } catch (error) {
    console.error("🔥 Video generation error:", error);
    res.status(500).json({ error: "Video generation failed" });
  }
});

// SERVER
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`🟢 Servoya Worker running on port ${PORT}`);
});