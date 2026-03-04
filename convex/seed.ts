import { mutation } from "./_generated/server";

/**
 * Seed the database with real places around Kingston University's
 * Penryn Road campus (KT1 2EE area).
 *
 * Run once via:
 *   npx convex run seed:seedPlaces
 *
 * The function is idempotent — it skips insert if a place with the
 * same name already exists.
 */
export const seedPlaces = mutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query("places").collect();
    const existingNames = new Set(existing.map((p) => p.name));

    const places = [
      {
        name: "The River Bar & Kitchen",
        category: "bar" as const,
        description:
          "Kingston University's students' union bar on Penryn Road. Cheap drinks, sports screens and a relaxed vibe.",
        address: "Penryn Road, Kingston upon Thames, KT1 2EE",
        lat: 51.4123,
        lng: -0.3022,
      },
      {
        name: "KU Library — Penryn Building",
        category: "library" as const,
        description:
          "Main campus library with silent study zones, group study rooms, printing and 24/7 access during term.",
        address: "Penryn Road, Kingston upon Thames, KT1 2EE",
        lat: 51.4120,
        lng: -0.3018,
      },
      {
        name: "Ground Floor Café (KU)",
        category: "cafe" as const,
        description:
          "The main canteen-style café inside the Penryn building — great for a quick coffee between lectures.",
        address: "Penryn Road, Kingston upon Thames, KT1 2EE",
        lat: 51.4119,
        lng: -0.3020,
      },
      {
        name: "Open Access Computing Lab",
        category: "lab" as const,
        description:
          "Large open-access PC lab available to all students. Usually busy around assignment deadlines.",
        address: "Penryn Road, Kingston upon Thames, KT1 2EE",
        lat: 51.4121,
        lng: -0.3015,
      },
      {
        name: "Hippodrome Square",
        category: "park" as const,
        description:
          "Open outdoor square in front of the main KU building — popular lunch spot when the weather's good.",
        address: "Hippodrome Place, Kingston upon Thames, KT1 2AJ",
        lat: 51.4116,
        lng: -0.3012,
      },
      {
        name: "Nando's Kingston",
        category: "restaurant" as const,
        description:
          "Classic Nando's just a 5-min walk from campus. Gets very busy on Friday evenings.",
        address: "3 Wood Street, Kingston upon Thames, KT1 1TR",
        lat: 51.4103,
        lng: -0.3008,
      },
      {
        name: "Costa Coffee — Kingston Market",
        category: "cafe" as const,
        description:
          "Busy Costa near the market square — good wifi and plenty of seating upstairs.",
        address: "Market Place, Kingston upon Thames, KT1 1JH",
        lat: 51.4108,
        lng: -0.2998,
      },
      {
        name: "Kingston Sports Centre",
        category: "gym" as const,
        description:
          "University sports centre offering gym, squash courts and fitness classes.",
        address: "Penryn Road, Kingston upon Thames, KT1 2EE",
        lat: 51.4126,
        lng: -0.3025,
      },
    ];

    let inserted = 0;
    for (const place of places) {
      if (existingNames.has(place.name)) continue;
      await ctx.db.insert("places", {
        ...place,
        createdAt: Date.now(),
      });
      inserted++;
    }

    return { inserted, skipped: places.length - inserted };
  },
});
