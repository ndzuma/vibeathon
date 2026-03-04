import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/** Toggle save/unsave a place for a user */
export const toggleSave = mutation({
  args: {
    userId: v.string(), // authId
    placeId: v.id("places"),
  },
  handler: async (ctx, { userId, placeId }) => {
    const existing = await ctx.db
      .query("saves")
      .withIndex("by_userId_placeId", (q) =>
        q.eq("userId", userId).eq("placeId", placeId)
      )
      .unique();

    if (existing) {
      await ctx.db.delete(existing._id);
      return { saved: false };
    } else {
      await ctx.db.insert("saves", { userId, placeId, createdAt: Date.now() });
      return { saved: true };
    }
  },
});

/** Check if a user has saved a specific place */
export const isSaved = query({
  args: { userId: v.string(), placeId: v.id("places") },
  handler: async (ctx, { userId, placeId }) => {
    const existing = await ctx.db
      .query("saves")
      .withIndex("by_userId_placeId", (q) =>
        q.eq("userId", userId).eq("placeId", placeId)
      )
      .unique();
    return !!existing;
  },
});

/** Get all saved places for a user (with basic place data) */
export const getSavedPlaces = query({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    const saves = await ctx.db
      .query("saves")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();

    const places = await Promise.all(
      saves.map(async (save) => {
        const place = await ctx.db.get(save.placeId);
        if (!place) return null;
        // Resolve image URL
        let imageUrl: string | null = null;
        if (place.imageStorageId) {
          imageUrl = await ctx.storage.getUrl(place.imageStorageId);
        } else if (place.imageUrl) {
          imageUrl = place.imageUrl;
        }
        return { ...place, imageUrl, savedAt: save.createdAt };
      })
    );

    return places.filter(Boolean);
  },
});
