import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { enqueueSheetsSyncJob } from "./sheetsSync";

function formatInventoryForSheets(item: {
  itemId: string;
  name: string;
  quantity: number;
  category: string;
  company: string;
  imageUrl: string;
  remarks: string;
  links: string;
  tags: string[];
}) {
  return {
    itemId: item.itemId,
    name: item.name,
    quantity: item.quantity,
    category: item.category,
    company: item.company,
    imageUrl: item.imageUrl,
    remarks: item.remarks,
    links: item.links,
    tags: item.tags,
  };
}

export const getAll = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("inventory").collect();
  },
});

export const addItem = mutation({
  args: {
    itemId: v.optional(v.string()),
    name: v.string(),
    quantity: v.number(),
    category: v.string(),
    company: v.string(),
    imageUrl: v.string(),
    remarks: v.string(),
    links: v.string(),
    tags: v.array(v.string()),
    scriptUrl: v.string(),
  },
  handler: async (ctx, args) => {
    const itemId = args.itemId ?? crypto.randomUUID();
    const inventoryItem = {
      itemId,
      name: args.name,
      quantity: args.quantity,
      category: args.category,
      company: args.company,
      imageUrl: args.imageUrl,
      remarks: args.remarks,
      links: args.links,
      tags: args.tags,
    };

    await ctx.db.insert("inventory", inventoryItem);
    await enqueueSheetsSyncJob(ctx, {
      scriptUrl: args.scriptUrl,
      entityType: "inventory",
      entityKey: itemId,
      operation: "upsert",
      payload: formatInventoryForSheets(inventoryItem),
    });

    return { success: true, itemId };
  },
});

export const updateItem = mutation({
  args: {
    itemId: v.string(),
    name: v.optional(v.string()),
    quantity: v.optional(v.number()),
    category: v.optional(v.string()),
    company: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    remarks: v.optional(v.string()),
    links: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    scriptUrl: v.string(),
  },
  handler: async (ctx, args) => {
    const item = await ctx.db.query("inventory").withIndex("by_itemId", (q) => q.eq("itemId", args.itemId)).first();
    if (!item) {
      throw new Error("Item not found");
    }

    const patch: Partial<typeof item> = {};
    if (args.name !== undefined) patch.name = args.name;
    if (args.quantity !== undefined) patch.quantity = args.quantity;
    if (args.category !== undefined) patch.category = args.category;
    if (args.company !== undefined) patch.company = args.company;
    if (args.imageUrl !== undefined) patch.imageUrl = args.imageUrl;
    if (args.remarks !== undefined) patch.remarks = args.remarks;
    if (args.links !== undefined) patch.links = args.links;
    if (args.tags !== undefined) patch.tags = args.tags;

    await ctx.db.patch(item._id, patch);
    const updatedItem = { ...item, ...patch };

    await enqueueSheetsSyncJob(ctx, {
      scriptUrl: args.scriptUrl,
      entityType: "inventory",
      entityKey: updatedItem.itemId,
      operation: "upsert",
      payload: formatInventoryForSheets(updatedItem),
    });

    return { success: true, item: updatedItem };
  },
});

export const deleteItem = mutation({
  args: {
    itemId: v.string(),
    scriptUrl: v.string(),
  },
  handler: async (ctx, args) => {
    const item = await ctx.db.query("inventory").withIndex("by_itemId", (q) => q.eq("itemId", args.itemId)).first();
    if (!item) {
      throw new Error("Item not found");
    }

    await ctx.db.delete(item._id);
    await enqueueSheetsSyncJob(ctx, {
      scriptUrl: args.scriptUrl,
      entityType: "inventory",
      entityKey: args.itemId,
      operation: "delete",
      payload: { itemId: args.itemId },
    });

    return { success: true };
  },
});
