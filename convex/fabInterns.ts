import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { enqueueSheetsSyncJob } from "./sheetsSync";

function formatFabInternsForSheets(item: {
  entryId: string;
  studentName: string;
  imageUrl: string;
  internshipYear: string;
  videoUrl: string;
  documentationUrl: string;
  remarks: string;
}) {
  return {
    entryId: item.entryId,
    studentName: item.studentName,
    imageUrl: item.imageUrl,
    internshipYear: item.internshipYear,
    videoUrl: item.videoUrl,
    documentationUrl: item.documentationUrl,
    remarks: item.remarks,
  };
}

export const getAll = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("fabInterns").collect();
  },
});

export const upsert = mutation({
  args: {
    entryId: v.optional(v.string()),
    studentName: v.string(),
    imageUrl: v.string(),
    internshipYear: v.string(),
    videoUrl: v.string(),
    documentationUrl: v.string(),
    remarks: v.string(),
    scriptUrl: v.string(),
  },
  handler: async (ctx, args) => {
    const entryId = args.entryId ?? crypto.randomUUID();
    const existing = await ctx.db
      .query("fabInterns")
      .withIndex("by_entryId", (q) => q.eq("entryId", entryId))
      .first();

    const fabInternsDoc = {
      entryId,
      studentName: args.studentName,
      imageUrl: args.imageUrl,
      internshipYear: args.internshipYear,
      videoUrl: args.videoUrl,
      documentationUrl: args.documentationUrl,
      remarks: args.remarks,
    };

    if (existing) {
      await ctx.db.patch(existing._id, fabInternsDoc);
    } else {
      await ctx.db.insert("fabInterns", fabInternsDoc);
    }

    await enqueueSheetsSyncJob(ctx, {
      scriptUrl: args.scriptUrl,
      entityType: "fabInterns",
      entityKey: entryId,
      operation: "upsert",
      payload: formatFabInternsForSheets(fabInternsDoc),
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
      .query("fabInterns")
      .withIndex("by_entryId", (q) => q.eq("entryId", args.entryId))
      .first();

    if (!existing) {
      throw new Error("Fab Intern content not found");
    }

    await ctx.db.delete(existing._id);
    await enqueueSheetsSyncJob(ctx, {
      scriptUrl: args.scriptUrl,
      entityType: "fabInterns",
      entityKey: args.entryId,
      operation: "delete",
      payload: { entryId: args.entryId },
    });

    return { success: true };
  },
});
