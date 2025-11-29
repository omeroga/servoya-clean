/**
 * Servoya VPS Renderer – FINAL STABLE VERSION
 */

const express = require("express");
const fs = require("fs");
const https = require("https");
const path = require("path");
const { exec } = require("child_process");

const app = express();
app.use(express.json({ limit: "80mb" }));

// ------------------------------------------------------
// 下载 תמונה
// ------------------------------------------------------
function downloadImage(url, filepath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(filepath);
    https
      .get(url, (res) => {
        if (res.statusCode !== 200) {
          return reject(new Error("Failed to download image"));
        }
        res.pipe(file);
        file.on("finish", () => file.close(() => resolve(filepath)));
      })
      .on("error", reject);
  });
}

// ------------------------------------------------------
//  FFmpeg Renderer API
// ------------------------------------------------------
app.post("/", async (req, res) => {
  try {
    const { product, scriptText, ctaText } = req.body;

    if (!product?.images || product.images.length < 7) {
      return res.status(400).json({ ok: false, error: "Need at least 7 images" });
    }

    const tmp = `/tmp/sr_${Date.now()}`;
    fs.mkdirSync(tmp);

    const imgs = product.images.slice(0, 7);
    const local = [];

    for (let i = 0; i < imgs.length; i++) {
      const dest = path.join(tmp, `img_${i}.jpg`);
      await downloadImage(imgs[i], dest);
      local.push(dest);
    }

    const output = path.join(tmp, "final.mp4");

    // ------------------------------------------------------
    // FFmpeg fade + text + audio
    // ------------------------------------------------------

    const audioURL = "https://gpeijpqhpswggkbhnwqq.supabase.co/storage/v1/object/public/servoya-audio/gadgets/g1.mp3";

    const filter = `
      [0:v]scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2[v0];
      [1:v]scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2[v1];
      [2:v]scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2[v2];
      [3:v]scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2[v3];
      [4:v]scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2[v4];
      [5:v]scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2[v5];
      [6:v]scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2[v6];

      [v0][v1]xfade=transition=fade:duration=1:offset=2[v01];
      [v01][v2]xfade=transition=fade:duration=1:offset=4[v02];
      [v02][v3]xfade=transition=fade:duration=1:offset=6[v03];
      [v03][v4]xfade=transition=fade:duration=1:offset=8[v04];
      [v04][v5]xfade=transition=fade:duration=1:offset=10[v05];
      [v05][v6]xfade=transition=fade:duration=1:offset=12[vf];

      [vf]drawtext=text='${scriptText}':fontsize=40:fontcolor=white:borderw=2:x=(w-text_w)/2:y=100[vtxt];
      [vtxt]drawtext=text='${ctaText}':fontsize=60:fontcolor=yellow:borderw=3:x=(w-text_w)/2:y=h-220[final]
    `.replace(/(\r\n|\n|\r)/gm, " ");

    const ffmpegCmd = `
      ffmpeg -y
      -i "${local[0]}" -i "${local[1]}" -i "${local[2]}" -i "${local[3]}"
      -i "${local[4]}" -i "${local[5]}" -i "${local[6]}"
      -i "${audioURL}"
      -filter_complex "${filter}"
      -map "[final]"
      -map 7:a
      -t 15
      -preset veryfast
      -c:v libx264 -pix_fmt yuv420p
      -c:a aac -b:a 128k
      "${output}"
    `.replace(/\s+/g, " ");

    exec(ffmpegCmd, { maxBuffer: 1024 * 1024 * 20 }, (err) => {
      if (err) return res.status(500).json({ ok: false, error: err.message });

      fs.readFile(output, (err, data) => {
        if (err) return res.status(500).json({ ok: false, error: "Read error" });
        res.setHeader("Content-Type", "video/mp4");
        res.send(data);
        fs.rmSync(tmp, { recursive: true, force: true });
      });
    });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
});

app.listen(3000, () => console.log("🔥 FINAL VPS RENDERER READY"));