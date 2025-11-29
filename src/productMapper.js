/* Servoya Product Mapper v3 – 100K/month Edition */

export function mapTrendToProduct(trendTitle = "") {
  if (!trendTitle) {
    return {
      match: false,
      category: "general",
      intent: "none",
    };
  }

  const title = trendTitle
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .trim();

  // 1) Direct ASIN signals from Keepa
  if (title.startsWith("asin")) {
    return {
      match: true,
      category: "general",
      intent: "amazon_product"
    };
  }

  // 2) Servoya top earning niches (strong signals)
  const groups = [
    {
      category: "beauty",
      intent: "skincare",
      keywords: [
        "serum", "skin", "glow", "wrinkle", "acne", "face",
        "korean", "sunscreen", "moisturizer", "retinol",
        "collagen", "niacinamide", "vitamin c", "hyaluronic"
      ],
    },

    {
      category: "haircare",
      intent: "haircare",
      keywords: [
        "hair", "frizz", "dry hair", "keratin", "curl",
        "straightener", "leave in", "hair oil"
      ],
    },

    {
      category: "massage_devices",
      intent: "pain-relief",
      keywords: [
        "massage", "tension", "back", "neck", "muscle",
        "sciatica", "relief", "massager", "gun"
      ],
    },

    {
      category: "pets",
      intent: "pets",
      keywords: [
        "cat", "dog", "pet", "fur", "bark", "scratching",
        "litter", "automatic feeder"
      ],
    },

    {
      category: "smart_home",
      intent: "home-cleaning",
      keywords: [
        "vacuum", "robot", "cleaner", "mop", "smart",
        "air purifier", "camera", "security", "doorbell"
      ],
    },

    {
      category: "kitchen",
      intent: "cooking",
      keywords: [
        "kitchen", "cook", "air fryer", "blender",
        "coffee", "juicer", "knife", "nonstick"
      ],
    },

    {
      category: "fitness",
      intent: "fitness",
      keywords: [
        "fitness", "gym", "exercise", "workout", "dumbbell",
        "yoga", "pilates", "resistance band"
      ],
    },

    {
      category: "gadgets",
      intent: "tech",
      keywords: [
        "gadget", "device", "projector", "mini projector",
        "tech", "smartwatch", "charger", "usb", "led"
      ],
    }
  ];

  // 3) Smart matching
  for (const g of groups) {
    if (g.keywords.some(k => title.includes(k))) {
      return {
        match: true,
        category: g.category,
        intent: g.intent
      };
    }
  }

  // 4) Generic commercial triggers
  if (["best", "deal", "review", "amazon", "viral", "trending"]
    .some(k => title.includes(k))) {
    return {
      match: false,
      category: "general",
      intent: "commercial"
    };
  }

  // 5) Fallback
  return {
    match: false,
    category: "general",
    intent: "none"
  };
}