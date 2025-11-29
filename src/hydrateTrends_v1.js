import { supabase } from "./supabaseClient.js";
import { mapTrendToProduct } from "./productMapper.js";

console.log("🔄 Hydration starting...");

async function hydrate() {
  const { data: rows } = await supabase
    .from("daily_trends")
    .select("id, title")
    .is("asin", null)
    .limit(200);

  if (!rows?.length) {
    console.log("✔ Nothing to hydrate.");
    return;
  }

  for (const r of rows) {
    const mapped = mapTrendToProduct(r.title || "");
    const asin = mapped.asin || null;

    if (!asin) continue;

    await supabase
      .from("daily_trends")
      .update({ asin })
      .eq("id", r.id);

    console.log(`✔ Added ASIN ${asin} → ${r.title}`);
  }

  console.log("🎉 Hydration done.");
}

hydrate();