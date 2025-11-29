// Servoya Pipeline HTTP Endpoint v1
// Wraps the full machine (trend → product → prompt → audio → video → storage)
// and exposes it as /api/pipeline/run on the Cloud Run worker.

import express from "express";
import * as TrendJobRunner from "./trendJobRunner_v1.js";

/**
 * Register the full pipeline endpoint on an existing Express app.
 * Call this from index.js after creating `app`.
 */
export function registerPipelineEndpoint(app) {
  if (!app || typeof app.post !== "function") {
    throw new Error("Express app instance is required");
  }

  app.post("/api/pipeline/run", async (req, res) => {
    try {
      // Try to find the main pipeline function from trendJobRunner_v1
      const fn =
        TrendJobRunner.runFullJob ||
        TrendJobRunner.runTrendJob ||
        TrendJobRunner.runPipeline ||
        TrendJobRunner.default;

      if (!fn || typeof fn !== "function") {
        return res.status(500).json({
          ok: false,
          error: "No pipeline function exported from trendJobRunner_v1.js"
        });
      }

      // Allow optional overrides from body (category, test ASIN, etc)
      const options = req.body && typeof req.body === "object" ? req.body : {};

      const result = await fn(options);

      res.json({
        ok: true,
        endpoint: "/api/pipeline/run",
        options,
        result
      });
    } catch (err) {
      console.error("🔥 Pipeline endpoint error:", err);
      res.status(500).json({
        ok: false,
        error: err?.message || "Pipeline failed"
      });
    }
  });
}