import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/** Submit or update a star rating (1-5) for a place */
export const submitRating = mutation({
  args: {
    placeId: v.id("places"),
    userId: v.string(),
    stars: v.number(),
  },
  handler: async (ctx, { placeId, userId, stars }) => {
    if (stars < 1 || stars > 5) throw new Error("Stars must be 1-5");
    const existing = await ctx.db
      .query("ratings")
      .withIndex("by_userId_placeId", (q) =>
        q.eq("userId", userId).eq("placeId", placeId)
      )
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, { stars, updatedAt: Date.now() });
      return existing._id;
    }
    return ctx.db.insert("ratings", {
      placeId,
      userId,
      stars,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

/** Get average rating + count for a place */
export const getRatingForPlace = query({
  args: { placeId: v.id("places") },
  handler: async (ctx, { placeId }) => {
    const ratings = await ctx.db
      .query("ratings")
      .withIndex("by_placeId", (q) => q.eq("placeId", placeId))
      .collect();
    if (ratings.length === 0) return { avg: 0, count: 0, userRating: null };
    const avg = ratings.reduce((s, r) => s + r.stars, 0) / ratings.length;
    return { avg: Math.round(avg * 10) / 10, count: ratings.length, userRating: null };
  },
});

/** Get a specific user's rating for a place */
export const getUserRating = query({
  args: { placeId: v.id("places"), userId: v.string() },
  handler: async (ctx, { placeId, userId }) => {
    const r = await ctx.db
      .query("ratings")
      .withIndex("by_userId_placeId", (q) =>
        q.eq("userId", userId).eq("placeId", placeId)
      )
      .unique();
    return r?.stars ?? null;
  },
});

/** Toggle a like on a place */
export const toggleLike = mutation({
  args: { placeId: v.id("places"), userId: v.string() },
  handler: async (ctx, { placeId, userId }) => {
    const existing = await ctx.db
      .query("likes")
      .withIndex("by_userId_placeId", (q) =>
        q.eq("userId", userId).eq("placeId", placeId)
      )
      .unique();
    if (existing) {
      await ctx.db.delete(existing._id);
      return false;
    }
    await ctx.db.insert("likes", { placeId, userId, createdAt: Date.now() });
    return true;
  },
});

/** Check if user liked a place */
export const isLiked = query({
  args: { placeId: v.id("places"), userId: v.string() },
  handler: async (ctx, { placeId, userId }) => {
    const r = await ctx.db
      .query("likes")
      .withIndex("by_userId_placeId", (q) =>
        q.eq("userId", userId).eq("placeId", placeId)
      )
      .unique();
    return !!r;
  },
});

/** Get like count for a place */
export const getLikeCount = query({
  args: { placeId: v.id("places") },
  handler: async (ctx, { placeId }) => {
    const likes = await ctx.db
      .query("likes")
      .withIndex("by_placeId", (q) => q.eq("placeId", placeId))
      .collect();
    return likes.length;
  },
});

/**
 * Gems — places that are well-liked/rated but currently not chaotic.
 * Score = (avgRating * 0.4 + likeNorm * 0.3 + vibeFrequency * 0.3) * quietBonus
 * quietBonus = 1.5 if currentVibe is empty/quiet, 0.8 if busy, 0.2 if chaos
 */
export const getGems = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit = 10 }) => {
    const allPlaces = await ctx.db.query("places").collect();
    const thirtyMinAgo = Date.now() - 30 * 60 * 1000;
    const threeHoursAgo = Date.now() - 3 * 60 * 60 * 1000;

    const scored = await Promise.all(
      allPlaces.map(async (place) => {
        // Ratings
        const ratings = await ctx.db
          .query("ratings")
          .withIndex("by_placeId", (q) => q.eq("placeId", place._id))
          .collect();
        const avgRating =
          ratings.length > 0
            ? ratings.reduce((s, r) => s + r.stars, 0) / ratings.length
            : 0;

        // Likes
        const likes = await ctx.db
          .query("likes")
          .withIndex("by_placeId", (q) => q.eq("placeId", place._id))
          .collect();
        const likeCount = likes.length;

        // Recent vibes (last 3h for frequency)
        const recentVibes = await ctx.db
          .query("vibes")
          .withIndex("by_placeId_createdAt", (q: any) =>
            q.eq("placeId", place._id).gte("createdAt", threeHoursAgo)
          )
          .collect();
        const vibeFrequency = recentVibes.length;

        // Last 30-min vibe to determine current quietness
        const lastVibes = await ctx.db
          .query("vibes")
          .withIndex("by_placeId_createdAt", (q: any) =>
            q.eq("placeId", place._id).gte("createdAt", thirtyMinAgo)
          )
          .order("desc")
          .collect();

        // Weighted dominant vibe (chaos=4, busy=3, quiet=2, empty=1)
        const WEIGHTS: Record<string, number> = { empty: 1, quiet: 2, busy: 3, chaos: 4 };
        let currentVibe: string | null = null;
        if (lastVibes.length > 0) {
          const counts: Record<string, number> = {};
          for (const v of lastVibes) counts[v.level] = (counts[v.level] ?? 0) + 1;
          currentVibe = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
        }

        const quietBonus =
          currentVibe === null ? 1.2
          : currentVibe === "empty" ? 1.5
          : currentVibe === "quiet" ? 1.4
          : currentVibe === "busy" ? 0.7
          : 0.15; // chaos

        // Normalise (likeCount capped at 50 for normalisation)
        const likeNorm = Math.min(likeCount / 50, 1);
        const freqNorm = Math.min(vibeFrequency / 20, 1);
        const ratingNorm = avgRating / 5;

        const score = (ratingNorm * 0.4 + likeNorm * 0.3 + freqNorm * 0.3) * quietBonus;

        // Resolve image URL
        let imageUrl: string | null = null;
        if (place.imageStorageId) {
          imageUrl = await ctx.storage.getUrl(place.imageStorageId);
        } else if (place.imageUrl) {
          imageUrl = place.imageUrl;
        }

        return {
          ...place,
          imageUrl,
          currentVibe,
          vibeCount: lastVibes.length,
          avgRating: Math.round(avgRating * 10) / 10,
          likeCount,
          score,
        };
      })
    );

    // Filter: must have at least 1 rating OR 1 like, and not be chaos
    return scored
      .filter((p) => (p.avgRating > 0 || p.likeCount > 0) && p.currentVibe !== "chaos")
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  },
});
