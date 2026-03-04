import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Users — extended profile on top of better-auth's user record
  users: defineTable({
    // better-auth user id (string) — used as the join key
    authId: v.string(),
    name: v.string(),
    email: v.string(),
    avatarUrl: v.optional(v.string()),
    bio: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_authId", ["authId"])
    .index("by_email", ["email"]),

  // Places — crowd-sourced venues around Kingston Uni / Penryn campus
  places: defineTable({
    name: v.string(),
    category: v.union(
      v.literal("cafe"),
      v.literal("library"),
      v.literal("lab"),
      v.literal("bar"),
      v.literal("restaurant"),
      v.literal("park"),
      v.literal("gym"),
      v.literal("shop"),
      v.literal("other")
    ),
    description: v.optional(v.string()),
    address: v.string(),
    lat: v.number(),
    lng: v.number(),
    // Convex file storage ID for the hero image
    imageStorageId: v.optional(v.id("_storage")),
    // Fallback URL for seeded places that use a remote image
    imageUrl: v.optional(v.string()),
    addedBy: v.optional(v.string()), // authId of the user who added it
    createdAt: v.number(),
  })
    .index("by_category", ["category"])
    .index("by_createdAt", ["createdAt"]),

  // Vibes — crowd-sourced "how busy is it right now" data points
  vibes: defineTable({
    placeId: v.id("places"),
    userId: v.string(), // authId
    level: v.union(
      v.literal("empty"),
      v.literal("quiet"),
      v.literal("busy"),
      v.literal("chaos")
    ),
    createdAt: v.number(),
  })
    .index("by_placeId", ["placeId"])
    .index("by_placeId_createdAt", ["placeId", "createdAt"])
    .index("by_userId", ["userId"]),

  // Saves — bookmarked places per user
  saves: defineTable({
    userId: v.string(), // authId
    placeId: v.id("places"),
    createdAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_userId_placeId", ["userId", "placeId"]),
});
