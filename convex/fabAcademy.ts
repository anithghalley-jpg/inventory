import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { enqueueSheetsSyncJob } from "./sheetsSync";

function formatFabAcademyForSheets(item: {
  entryId: string;
  studentName: string;
  imageUrl: string;
  fabYear: string;
  videoUrl: string;
  documentationUrl: string;
  remarks: string;
}) {
  return {
    entryId: item.entryId,
    studentName: item.studentName,
    imageUrl: item.imageUrl,
    fabYear: item.fabYear,
    videoUrl: item.videoUrl,
    documentationUrl: item.documentationUrl,
    remarks: item.remarks,
  };
}

export const getAll = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("fabAcademy").collect();
  },
});

export const upsert = mutation({
  args: {
    entryId: v.optional(v.string()),
    studentName: v.string(),
    imageUrl: v.string(),
    fabYear: v.string(),
    videoUrl: v.string(),
    documentationUrl: v.string(),
    remarks: v.string(),
    scriptUrl: v.string(),
  },
  handler: async (ctx, args) => {
    const entryId = args.entryId ?? crypto.randomUUID();
    const existing = await ctx.db
      .query("fabAcademy")
      .withIndex("by_entryId", (q) => q.eq("entryId", entryId))
      .first();

    const fabAcademyDoc = {
      entryId,
      studentName: args.studentName,
      imageUrl: args.imageUrl,
      fabYear: args.fabYear,
      videoUrl: args.videoUrl,
      documentationUrl: args.documentationUrl,
      remarks: args.remarks,
    };

    if (existing) {
      await ctx.db.patch(existing._id, fabAcademyDoc);
    } else {
      await ctx.db.insert("fabAcademy", fabAcademyDoc);
    }

    await enqueueSheetsSyncJob(ctx, {
      scriptUrl: args.scriptUrl,
      entityType: "fabAcademy",
      entityKey: entryId,
      operation: "upsert",
      payload: formatFabAcademyForSheets(fabAcademyDoc),
    });

    return { success: true, entryId };
  },
});

export const remove = mutation({
  args: {
    entryId: v.string(),
    scriptUrl: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("fabAcademy")
      .withIndex("by_entryId", (q) => q.eq("entryId", args.entryId))
      .first();

    if (!existing) {
      throw new Error("Fab Academy content not found");
    }

    await ctx.db.delete(existing._id);
    await enqueueSheetsSyncJob(ctx, {
      scriptUrl: args.scriptUrl,
      entityType: "fabAcademy",
      entityKey: args.entryId,
      operation: "delete",
      payload: { entryId: args.entryId },
    });

    return { success: true };
  },
});
