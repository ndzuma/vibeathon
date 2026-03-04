import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

const categoryValidator = v.union(
  v.literal("cafe"),
  v.literal("library"),
  v.literal("lab"),
  v.literal("bar"),
  v.literal("restaurant"),
  v.literal("park"),
  v.literal("gym"),
  v.literal("shop"),
  v.literal("other")
);

/** List all places, optionally filtered by category */
export const listPlaces = query({
  args: {
    category: v.optional(categoryValidator),
  },
  handler: async (ctx, { category }) => {
    let places;
    if (category) {
      places = await ctx.db
        .query("places")
        .withIndex("by_category", (q) => q.eq("category", category))
        .order("desc")
        .collect();
    } else {
      places = await ctx.db
        .query("places")
        .withIndex("by_createdAt")
        .order("desc")
        .collect();
    }

    // Attach current vibe + image URL for each place
    return Promise.all(places.map((p) => enrichPlace(ctx, p)));
  },
});

/** Get a single place by ID with vibe data */
export const getPlace = query({
  args: { id: v.id("places") },
  handler: async (ctx, { id }) => {
    const place = await ctx.db.get(id);
    if (!place) return null;
    return enrichPlace(ctx, place);
  },
});

/** Search places by name (case-insensitive substring) */
export const searchPlaces = query({
  args: { query: v.string() },
  handler: async (ctx, { query: q }) => {
    const all = await ctx.db.query("places").collect();
    const lower = q.toLowerCase();
    const filtered = all.filter(
      (p) =>
        p.name.toLowerCase().includes(lower) ||
        p.address.toLowerCase().includes(lower) ||
        p.description?.toLowerCase().includes(lower)
    );
    return Promise.all(filtered.map((p) => enrichPlace(ctx, p)));
  },
});

/**
 * Trending places — ranked by number of vibes submitted in the last 3 hours.
 * Returns up to `limit` places.
 */
export const getTrendingPlaces = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit = 10 }) => {
    const since = Date.now() - 3 * 60 * 60 * 1000; // 3 hours ago
    const recentVibes = await ctx.db
      .query("vibes")
      .filter((q) => q.gte(q.field("createdAt"), since))
      .collect();

    // Count vibes per place
    const countMap: Record<string, number> = {};
    for (const v of recentVibes) {
      countMap[v.placeId] = (countMap[v.placeId] ?? 0) + 1;
    }

    // Sort by count descending
    const sortedIds = Object.entries(countMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([id]) => id);

    // Fetch the actual places
    const places = await Promise.all(
      sortedIds.map((id) => ctx.db.get(id as any))
    );
    const valid = places.filter(Boolean) as any[];
    return Promise.all(valid.map((p) => enrichPlace(ctx, p)));
  },
});

/** Add a new place */
export const addPlace = mutation({
  args: {
    name: v.string(),
    category: categoryValidator,
    description: v.optional(v.string()),
    address: v.string(),
    lat: v.number(),
    lng: v.number(),
    imageStorageId: v.optional(v.id("_storage")),
    imageUrl: v.optional(v.string()),
    addedBy: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return ctx.db.insert("places", {
      ...args,
      createdAt: Date.now(),
    });
  },
});

/** Edit an existing place */
export const updatePlace = mutation({
  args: {
    id: v.id("places"),
    name: v.optional(v.string()),
    category: v.optional(categoryValidator),
    description: v.optional(v.string()),
    address: v.optional(v.string()),
    lat: v.optional(v.number()),
    lng: v.optional(v.number()),
    imageStorageId: v.optional(v.id("_storage")),
    imageUrl: v.optional(v.string()),
  },
  handler: async (ctx, { id, ...fields }) => {
    const place = await ctx.db.get(id);
    if (!place) throw new Error("Place not found");
    // Only patch fields that were actually provided
    const patch = Object.fromEntries(
      Object.entries(fields).filter(([, v]) => v !== undefined)
    );
    await ctx.db.patch(id, patch);
    return id;
  },
});

/** Delete a place (admin / owner only — caller should validate) */
export const deletePlace = mutation({
  args: { id: v.id("places") },
  handler: async (ctx, { id }) => {
    await ctx.db.delete(id);
  },
});

// ---------------------------------------------------------------------------
// Internal helper — enrich a place row with current vibe + image URL
// ---------------------------------------------------------------------------
async function enrichPlace(ctx: any, place: any) {
  // Resolve storage image URL
  let resolvedImageUrl: string | null = null;
  if (place.imageStorageId) {
    resolvedImageUrl = await ctx.storage.getUrl(place.imageStorageId);
  } else if (place.imageUrl) {
    resolvedImageUrl = place.imageUrl;
  }

  // Get the most recent vibe (within last 2 hours) to show current vibe
  const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000;
  const recentVibes = await ctx.db
    .query("vibes")
    .withIndex("by_placeId_createdAt", (q: any) =>
      q.eq("placeId", place._id).gte("createdAt", twoHoursAgo)
    )
    .order("desc")
    .collect();

  // Calculate the dominant vibe from recent reports
  const vibeCount: Record<string, number> = {};
  for (const v of recentVibes) {
    vibeCount[v.level] = (vibeCount[v.level] ?? 0) + 1;
  }
  const currentVibe =
    recentVibes.length > 0
      ? (Object.entries(vibeCount).sort((a, b) => b[1] - a[1])[0][0] as string)
      : null;

  return {
    ...place,
    imageUrl: resolvedImageUrl,
    currentVibe,
    vibeCount: recentVibes.length,
  };
}

/** Generate a short-lived upload URL for place images */
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return ctx.storage.generateUploadUrl();
  },
});
