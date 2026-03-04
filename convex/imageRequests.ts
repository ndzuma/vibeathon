import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/** Submit a photo request for a place */
export const submitImageRequest = mutation({
  args: {
    placeId: v.id("places"),
    submittedBy: v.string(),
    imageStorageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, { placeId, submittedBy, imageStorageId }) => {
    const place = await ctx.db.get(placeId);
    if (!place) throw new Error("Place not found");

    return ctx.db.insert("imageRequests", {
      placeId,
      submittedBy,
      ...(imageStorageId ? { imageStorageId } : {}),
      status: "pending",
      createdAt: Date.now(),
    });
  },
});

/** Get pending image requests for a place (place owner can approve) */
export const getImageRequests = query({
  args: { placeId: v.id("places") },
  handler: async (ctx, { placeId }) => {
    const requests = await ctx.db
      .query("imageRequests")
      .withIndex("by_placeId", (q) => q.eq("placeId", placeId))
      .order("desc")
      .collect();

    return Promise.all(
      requests.map(async (r) => {
        const url = r.imageStorageId ? await ctx.storage.getUrl(r.imageStorageId) : null;
        return { ...r, imageUrl: url };
      })
    );
  },
});

/** Approve an image request — sets it as the place's hero image */
export const approveImageRequest = mutation({
  args: {
    requestId: v.id("imageRequests"),
    approverId: v.string(),
  },
  handler: async (ctx, { requestId, approverId }) => {
    const request = await ctx.db.get(requestId);
    if (!request) throw new Error("Request not found");

    // Only place owner can approve
    const place = await ctx.db.get(request.placeId);
    if (!place) throw new Error("Place not found");
    if (place.addedBy !== approverId) throw new Error("Only the place owner can approve images");

    // Update request status
    await ctx.db.patch(requestId, { status: "approved" });
    // Set as the place's hero image
    await ctx.db.patch(request.placeId, { imageStorageId: request.imageStorageId });
  },
});
