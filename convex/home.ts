import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { enqueueSheetsSyncJob } from "./sheetsSync";

function formatHomeForSheets(item: {
  docId: string;
  title: string;
  description: string;
  type: string;
  content: string;
  order: number;
  visibility: boolean;
  targetAudience: string;
}) {
  return {
    docId: item.docId,
    title: item.title,
    description: item.description,
    type: item.type,
    content: item.content,
    order: item.order,
    visibility: item.visibility,
    targetAudience: item.targetAudience,
  };
}

export const getAll = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("home").collect();
  },
});

export const upsert = mutation({
  args: {
    docId: v.optional(v.string()),
    title: v.string(),
    description: v.string(),
    type: v.string(),
    content: v.string(),
    order: v.optional(v.number()),
    visibility: v.optional(v.boolean()),
    targetAudience: v.optional(v.string()),
    scriptUrl: v.string(),
  },
  handler: async (ctx, args) => {
    const docId = args.docId ?? crypto.randomUUID();
    const existing = await ctx.db.query("home").withIndex("by_docId", (q) => q.eq("docId", docId)).first();
    const homeDoc = {
      docId,
      title: args.title,
      description: args.description,
      type: args.type,
      content: args.content,
      order: args.order ?? 1,
      visibility: args.visibility ?? true,
      targetAudience: args.targetAudience ?? "public",
    };

    if (existing) {
      await ctx.db.patch(existing._id, homeDoc);
    } else {
      await ctx.db.insert("home", homeDoc);
    }

    await enqueueSheetsSyncJob(ctx, {
      scriptUrl: args.scriptUrl,
      entityType: "home",
      entityKey: docId,
      operation: "upsert",
      payload: formatHomeForSheets(homeDoc),
    });

    return { success: true, docId };
  },
});

export const remove = mutation({
  args: {
    docId: v.string(),
    scriptUrl: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.query("home").withIndex("by_docId", (q) => q.eq("docId", args.docId)).first();
    if (!existing) {
      throw new Error("Home content not found");
    }

    await ctx.db.delete(existing._id);
    await enqueueSheetsSyncJob(ctx, {
      scriptUrl: args.scriptUrl,
      entityType: "home",
      entityKey: args.docId,
      operation: "delete",
      payload: { docId: args.docId },
    });

    return { success: true };
  },
});
