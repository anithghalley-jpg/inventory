import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Get all aspects
export const getAll = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("aspects").collect();
  },
});

// Add a new aspect
export const add = mutation({
  args: {
    entryId: v.string(),
    aspect: v.string(),
    writeUp: v.string(),
    shortNote: v.string(),
    images: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    // Check if an aspect with this entryId already exists
    const existingEntry = await ctx.db
      .query("aspects")
      .withIndex("by_entryId", (q) => q.eq("entryId", args.entryId))
      .first();

    if (existingEntry) {
      throw new Error(`An aspect with ID ${args.entryId} already exists.`);
    }

    return await ctx.db.insert("aspects", {
      entryId: args.entryId,
      aspect: args.aspect,
      writeUp: args.writeUp,
      shortNote: args.shortNote,
      images: args.images,
    });
  },
});

// Update an existing aspect
export const update = mutation({
  args: {
    id: v.id("aspects"),
    entryId: v.optional(v.string()),
    aspect: v.optional(v.string()),
    writeUp: v.optional(v.string()),
    shortNote: v.optional(v.string()),
    images: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    await ctx.db.patch(id, updates);
  },
});

// Remove an aspect
export const remove = mutation({
  args: { id: v.id("aspects") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
