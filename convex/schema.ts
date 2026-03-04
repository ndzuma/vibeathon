import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Users — extended profile on top of better-auth's user record
  users: defineTable({
    authId: v.string(),
    name: v.string(),
    email: v.string(),
    avatarUrl: v.optional(v.string()),
    avatarStorageId: v.optional(v.id("_storage")),
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
    imageStorageId: v.optional(v.id("_storage")),
    imageUrl: v.optional(v.string()),
    addedBy: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_category", ["category"])
    .index("by_createdAt", ["createdAt"]),

  // Vibes — crowd-sourced "how busy is it right now" data points
  vibes: defineTable({
    placeId: v.id("places"),
    userId: v.string(),
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
    userId: v.string(),
    placeId: v.id("places"),
    createdAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_userId_placeId", ["userId", "placeId"]),

  // Image requests
  imageRequests: defineTable({
    placeId: v.id("places"),
    submittedBy: v.string(),
    imageStorageId: v.optional(v.id("_storage")),
    status: v.union(v.literal("pending"), v.literal("approved"), v.literal("rejected")),
    createdAt: v.number(),
  })
    .index("by_placeId", ["placeId"])
    .index("by_submittedBy", ["submittedBy"]),

  // Ratings — 1-5 star rating per user per place (one per user, updatable)
  ratings: defineTable({
    placeId: v.id("places"),
    userId: v.string(),
    stars: v.number(), // 1-5
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_placeId", ["placeId"])
    .index("by_userId_placeId", ["userId", "placeId"]),

  // Likes — one like per user per place (toggle)
  likes: defineTable({
    placeId: v.id("places"),
    userId: v.string(),
    createdAt: v.number(),
  })
    .index("by_placeId", ["placeId"])
    .index("by_userId_placeId", ["userId", "placeId"]),
});
