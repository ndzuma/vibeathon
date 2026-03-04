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

/** Search places — name matches ranked first, then address/description matches */
export const searchPlaces = query({
  args: { query: v.string() },
  handler: async (ctx, { query: q }) => {
    const all = await ctx.db.query("places").collect();
    const lower = q.toLowerCase();

    const nameMatches: typeof all = [];
    const otherMatches: typeof all = [];

    for (const p of all) {
      const nameLower = p.name.toLowerCase();
      if (nameLower.startsWith(lower)) {
        // Exact prefix — highest rank
        nameMatches.unshift(p);
      } else if (nameLower.includes(lower)) {
        nameMatches.push(p);
      } else if (
        p.address.toLowerCase().includes(lower) ||
        p.description?.toLowerCase().includes(lower)
      ) {
        otherMatches.push(p);
      }
    }

    const ordered = [...nameMatches, ...otherMatches];
    return Promise.all(ordered.map((p) => enrichPlace(ctx, p)));
  },
});

/**
 * Trending places — weighted vibe score over last 30 min, sorted chaos→empty.
 * chaos=4, busy=3, quiet=2, empty=1. Returns up to `limit` places.
 */
export const getTrendingPlaces = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit = 10 }) => {
    const thirtyMinAgo = Date.now() - 30 * 60 * 1000;
    const recentVibes = await ctx.db
      .query("vibes")
      .filter((q) => q.gte(q.field("createdAt"), thirtyMinAgo))
      .collect();

    if (recentVibes.length === 0) return [];

    // Weighted score per place: chaos=4, busy=3, quiet=2, empty=1
    const VIBE_WEIGHT: Record<string, number> = {
      chaos: 4, busy: 3, quiet: 2, empty: 1,
    };
    const scoreMap: Record<string, number> = {};
    const countMap: Record<string, number> = {};
    for (const vibe of recentVibes) {
      const pid = vibe.placeId as string;
      scoreMap[pid] = (scoreMap[pid] ?? 0) + (VIBE_WEIGHT[vibe.level] ?? 1);
      countMap[pid] = (countMap[pid] ?? 0) + 1;
    }

    // Average weighted score (so places with 1 chaos report don't beat 5 busy)
    const avgScore: Record<string, number> = {};
    for (const pid of Object.keys(scoreMap)) {
      avgScore[pid] = scoreMap[pid] / countMap[pid];
    }

    // Sort by avg score desc (chaos > busy > quiet > empty)
    const sortedIds = Object.entries(avgScore)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([id]) => id);

    const places = await Promise.all(sortedIds.map((id) => ctx.db.get(id as any)));
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
// Uses last 30-min weighted average: chaos=4, busy=3, quiet=2, empty=1
// ---------------------------------------------------------------------------
async function enrichPlace(ctx: any, place: any) {
  // Resolve storage image URL
  let resolvedImageUrl: string | null = null;
  if (place.imageStorageId) {
    resolvedImageUrl = await ctx.storage.getUrl(place.imageStorageId);
  } else if (place.imageUrl) {
    resolvedImageUrl = place.imageUrl;
  }

  // Weighted dominant vibe from last 30 minutes
  const thirtyMinAgo = Date.now() - 30 * 60 * 1000;
  const recentVibes = await ctx.db
    .query("vibes")
    .withIndex("by_placeId_createdAt", (q: any) =>
      q.eq("placeId", place._id).gte("createdAt", thirtyMinAgo)
    )
    .order("desc")
    .collect();

  // Weighted count: chaos=4, busy=3, quiet=2, empty=1
  const WEIGHTS: Record<string, number> = { chaos: 4, busy: 3, quiet: 2, empty: 1 };
  const weightedCounts: Record<string, number> = {};
  for (const v of recentVibes) {
    weightedCounts[v.level] = (weightedCounts[v.level] ?? 0) + WEIGHTS[v.level];
  }

  const currentVibe =
    recentVibes.length > 0
      ? (Object.entries(weightedCounts).sort((a, b) => b[1] - a[1])[0][0])
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

/** List places added by a specific user */
export const listPlacesByUser = query({
  args: { addedBy: v.string() },
  handler: async (ctx, { addedBy }) => {
    const places = await ctx.db
      .query("places")
      .filter((q) => q.eq(q.field("addedBy"), addedBy))
      .order("desc")
      .collect();
    return Promise.all(places.map((p) => enrichPlace(ctx, p)));
  },
});
