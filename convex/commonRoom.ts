import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const getAll = query({
  args: {},
  handler: async (ctx) => {
    const list = await ctx.db.query("commonRoom").collect();
    // Sort by podcastNumber descending (e.g. Podcast #3, #2, #1)
    return list.sort((a, b) => (b.podcastNumber || 0) - (a.podcastNumber || 0));
  },
});

export const getById = query({
  args: { podcastId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("commonRoom")
      .withIndex("by_podcastId", (q) => q.eq("podcastId", args.podcastId))
      .first();
  },
});

export const upsert = mutation({
  args: {
    podcastId: v.optional(v.string()),
    podcastNumber: v.number(),
    title: v.string(),
    videoUrl: v.string(),
    tags: v.array(v.string()),
    description: v.string(),
    guests: v.array(
      v.object({
        name: v.string(),
        email: v.string(),
      })
    ),
    coverImageUrl: v.optional(v.string()),
    published: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const podcastId = args.podcastId || `podcast_${now}_${Math.random().toString(36).substring(2, 7)}`;

    const existing = await ctx.db
      .query("commonRoom")
      .withIndex("by_podcastId", (q) => q.eq("podcastId", podcastId))
      .first();

    const data = {
      podcastId,
      podcastNumber: args.podcastNumber,
      title: args.title.trim(),
      videoUrl: args.videoUrl.trim(),
      tags: args.tags.map((t) => t.trim()).filter(Boolean),
      description: args.description.trim(),
      guests: args.guests.map((g) => ({
        name: g.name.trim(),
        email: g.email.trim(),
      })),
      coverImageUrl: args.coverImageUrl?.trim() || undefined,
      published: args.published ?? true,
      updatedAt: now,
    };

    if (existing) {
      await ctx.db.patch(existing._id, data);
    } else {
      await ctx.db.insert("commonRoom", {
        ...data,
        createdAt: now,
      });
    }

    return { success: true, podcastId };
  },
});

export const remove = mutation({
  args: { podcastId: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("commonRoom")
      .withIndex("by_podcastId", (q) => q.eq("podcastId", args.podcastId))
      .first();

    if (!existing) {
      throw new Error("Podcast entry not found");
    }

    await ctx.db.delete(existing._id);
    return { success: true };
  },
});
