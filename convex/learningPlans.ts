import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

export const createPlan = mutation({
  args: {
    planId: v.string(),
    title: v.string(),
    description: v.string(),
    date: v.optional(v.string()),
    time: v.optional(v.string()),
    location: v.optional(v.string()),
    tags: v.array(v.string()),
    imageUrls: v.array(v.string()),
    videoUrls: v.array(v.string()),
    documentationUrl: v.optional(v.string()),
    authorEmail: v.string(),
    authorName: v.string(),
    collaboratorEmails: v.array(v.string()),
    status: v.union(v.literal("DRAFT"), v.literal("PUBLISHED")),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("learningPlans", {
      ...args,
      registeredUsers: [],
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updatePlan = mutation({
  args: {
    id: v.id("learningPlans"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    date: v.optional(v.string()),
    time: v.optional(v.string()),
    location: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    imageUrls: v.optional(v.array(v.string())),
    videoUrls: v.optional(v.array(v.string())),
    documentationUrl: v.optional(v.string()),
    collaboratorEmails: v.optional(v.array(v.string())),
    status: v.optional(v.union(v.literal("DRAFT"), v.literal("PUBLISHED"))),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    const now = Date.now();
    await ctx.db.patch(id, {
      ...updates,
      updatedAt: now,
    });
  },
});

export const deletePlan = mutation({
  args: { id: v.id("learningPlans") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

export const getMyPlans = query({
  args: {
    userEmail: v.string(),
  },
  handler: async (ctx, args) => {
    const allPlans = await ctx.db.query("learningPlans").collect();
    
    // Filter to plans where the user is the author or a collaborator
    const myPlans = allPlans.filter(
      (plan) =>
        plan.authorEmail === args.userEmail ||
        plan.collaboratorEmails.includes(args.userEmail)
    );
    
    // Sort by updatedAt descending
    return myPlans.sort((a, b) => b.updatedAt - a.updatedAt);
  },
});

export const getPublishedPlans = query({
  args: {},
  handler: async (ctx) => {
    const publishedPlans = await ctx.db
      .query("learningPlans")
      .withIndex("by_status", (q) => q.eq("status", "PUBLISHED"))
      .collect();
      
      // Sort by createdAt descending
    return publishedPlans.sort((a, b) => b.createdAt - a.createdAt);
  },
});

export const registerForPlan = mutation({
  args: {
    planId: v.id("learningPlans"),
    name: v.string(),
    email: v.string(),
  },
  handler: async (ctx, args) => {
    const plan = await ctx.db.get(args.planId);
    if (!plan) throw new Error("Plan not found");

    const currentUsers = plan.registeredUsers || [];
    
    // Check if user is already registered
    if (currentUsers.some(u => u.email === args.email)) {
      return { success: false, message: "Already registered" };
    }

    const updatedUsers = [...currentUsers, { name: args.name, email: args.email }];
    await ctx.db.patch(args.planId, {
      registeredUsers: updatedUsers,
      updatedAt: Date.now(),
    });

    return { success: true, message: "Successfully registered" };
  },
});
