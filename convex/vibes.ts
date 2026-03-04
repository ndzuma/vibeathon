import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

const levelValidator = v.union(
  v.literal("empty"),
  v.literal("quiet"),
  v.literal("busy"),
  v.literal("chaos")
);

/** Submit a vibe report for a place (rate-limited: once per 30 min per user per place) */
export const submitVibe = mutation({
  args: {
    placeId: v.id("places"),
    userId: v.string(), // authId
    level: levelValidator,
  },
  handler: async (ctx, { placeId, userId, level }) => {
    // Verify the place exists
    const place = await ctx.db.get(placeId);
    if (!place) throw new Error("Place not found");

    // Rate-limit: check if this user already reported for this place in the last 30 min
    const thirtyMinAgo = Date.now() - 30 * 60 * 1000;
    const recent = await ctx.db
      .query("vibes")
      .withIndex("by_placeId_createdAt", (q) =>
        q.eq("placeId", placeId).gte("createdAt", thirtyMinAgo)
      )
      .filter((q) => q.eq(q.field("userId"), userId))
      .first();

    if (recent) {
      const minsLeft = Math.ceil((recent.createdAt + 30 * 60 * 1000 - Date.now()) / 60000);
      throw new Error(`You already reported a vibe here. Try again in ${minsLeft} minute${minsLeft !== 1 ? "s" : ""}.`);
    }

    return ctx.db.insert("vibes", {
      placeId,
      userId,
      level,
      createdAt: Date.now(),
    });
  },
});

/** Get vibe history for a place (most recent first, capped at 50) */
export const getVibesForPlace = query({
  args: { placeId: v.id("places"), limit: v.optional(v.number()) },
  handler: async (ctx, { placeId, limit = 50 }) => {
    return ctx.db
      .query("vibes")
      .withIndex("by_placeId_createdAt", (q) => q.eq("placeId", placeId))
      .order("desc")
      .take(limit);
  },
});

/** Get vibe aggregation for a place (counts per level in the last N hours) */
export const getVibeSummary = query({
  args: { placeId: v.id("places"), hoursBack: v.optional(v.number()) },
  handler: async (ctx, { placeId, hoursBack = 2 }) => {
    const since = Date.now() - hoursBack * 60 * 60 * 1000;
    const vibes = await ctx.db
      .query("vibes")
      .withIndex("by_placeId_createdAt", (q) =>
        q.eq("placeId", placeId).gte("createdAt", since)
      )
      .collect();

    const counts: Record<"empty" | "quiet" | "busy" | "chaos", number> = {
      empty: 0,
      quiet: 0,
      busy: 0,
      chaos: 0,
    };
    for (const vibe of vibes) {
      counts[vibe.level]++;
    }

    const total = vibes.length;
    const dominant =
      total > 0
        ? (Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0] as
            | "empty"
            | "quiet"
            | "busy"
            | "chaos")
        : null;

    return { counts, total, dominant };
  },
});

/**
 * Check if the current user can submit a vibe for this place.
 * Returns { canSubmit: true } or { canSubmit: false, minsLeft: number }
 */
export const canSubmitVibe = query({
  args: { placeId: v.id("places"), userId: v.string() },
  handler: async (ctx, { placeId, userId }) => {
    const thirtyMinAgo = Date.now() - 30 * 60 * 1000;
    const recent = await ctx.db
      .query("vibes")
      .withIndex("by_placeId_createdAt", (q) =>
        q.eq("placeId", placeId).gte("createdAt", thirtyMinAgo)
      )
      .filter((q) => q.eq(q.field("userId"), userId))
      .first();

    if (!recent) return { canSubmit: true, minsLeft: 0 };
    const minsLeft = Math.ceil((recent.createdAt + 30 * 60 * 1000 - Date.now()) / 60000);
    return { canSubmit: false, minsLeft };
  },
});

/** Get all vibes submitted by a specific user */
export const getVibesByUser = query({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    return ctx.db
      .query("vibes")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
  },
});
