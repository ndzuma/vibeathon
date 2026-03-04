import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/** Get the current user's profile by their better-auth authId */
export const getMe = query({
  args: { authId: v.string() },
  handler: async (ctx, { authId }) => {
    return ctx.db
      .query("users")
      .withIndex("by_authId", (q) => q.eq("authId", authId))
      .unique();
  },
});

/** Get any user by their Convex document ID */
export const getUserById = query({
  args: { id: v.id("users") },
  handler: async (ctx, { id }) => {
    return ctx.db.get(id);
  },
});

/**
 * Upsert a user profile — called after sign-in/sign-up to ensure
 * a profile row exists in our `users` table.
 */
export const upsertUser = mutation({
  args: {
    authId: v.string(),
    name: v.string(),
    email: v.string(),
    avatarUrl: v.optional(v.string()),
  },
  handler: async (ctx, { authId, name, email, avatarUrl }) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_authId", (q) => q.eq("authId", authId))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, { name, email, avatarUrl });
      return existing._id;
    }

    return ctx.db.insert("users", {
      authId,
      name,
      email,
      avatarUrl,
      createdAt: Date.now(),
    });
  },
});

/** Update display name / bio / avatar for the current user */
export const updateProfile = mutation({
  args: {
    authId: v.string(),
    name: v.optional(v.string()),
    bio: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
  },
  handler: async (ctx, { authId, name, bio, avatarUrl }) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_authId", (q) => q.eq("authId", authId))
      .unique();

    if (!user) throw new Error("User not found");

    const patch: Partial<{ name: string; bio: string; avatarUrl: string }> = {};
    if (name !== undefined) patch.name = name;
    if (bio !== undefined) patch.bio = bio;
    if (avatarUrl !== undefined) patch.avatarUrl = avatarUrl;

    await ctx.db.patch(user._id, patch);
    return user._id;
  },
});
