import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

const MAX_ADMIN_ITEMS = 100;
const MAX_AUDIENCE_ITEMS = 40;

const dashboardUpdateKind = v.union(
  v.literal("announcement"),
  v.literal("update"),
);

const dashboardAudience = v.union(
  v.literal("all"),
  v.literal("user"),
  v.literal("team"),
);

const dashboardLink = v.object({
  label: v.string(),
  url: v.string(),
});

const reminderDetailsValidator = v.object({
  itemId: v.string(),
  itemName: v.string(),
  itemImageUrl: v.string(),
  quantity: v.number(),
  issuedAt: v.string(),
  issuedBy: v.string(),
  userEmail: v.string(),
  userName: v.string(),
});

function sortUpdates<T extends { pinned: boolean; updatedAt: number }>(items: T[]) {
  return [...items].sort((a, b) => {
    if (a.pinned !== b.pinned) {
      return Number(b.pinned) - Number(a.pinned);
    }
    return b.updatedAt - a.updatedAt;
  });
}

export const getAll = query({
  args: {},
  handler: async (ctx) => {
    const items = await ctx.db
      .query("dashboardUpdates")
      .withIndex("by_updatedAt")
      .order("desc")
      .take(MAX_ADMIN_ITEMS);

    return sortUpdates(items);
  },
});

export const getForAudience = query({
  args: {
    audience: dashboardAudience,
    userEmail: v.string(),
  },
  handler: async (ctx, args) => {
    const items = await ctx.db
      .query("dashboardUpdates")
      .withIndex("by_published_and_updatedAt", (q) => q.eq("published", true))
      .order("desc")
      .take(MAX_AUDIENCE_ITEMS);

    return sortUpdates(
      items.filter(
        (item) =>
          (item.audience === "all" || item.audience === args.audience) &&
          (!item.targetUserEmail || item.targetUserEmail === args.userEmail),
      ),
    ).slice(0, 8);
  },
});

export const upsert = mutation({
  args: {
    entryId: v.optional(v.string()),
    title: v.string(),
    body: v.string(),
    kind: dashboardUpdateKind,
    audience: dashboardAudience,
    targetUserEmail: v.optional(v.string()),
    relatedRequestId: v.optional(v.string()),
    images: v.optional(v.array(v.string())),
    videos: v.optional(v.array(v.string())),
    links: v.optional(v.array(dashboardLink)),
    reminderDetails: v.optional(reminderDetailsValidator),
    pinned: v.boolean(),
    published: v.boolean(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const entryId = args.entryId ?? crypto.randomUUID();
    const existing = await ctx.db
      .query("dashboardUpdates")
      .withIndex("by_entryId", (q) => q.eq("entryId", entryId))
      .unique();

    const payload = {
      entryId,
      title: args.title.trim(),
      body: args.body.trim(),
      kind: args.kind,
      audience: args.audience,
      targetUserEmail: args.targetUserEmail,
      relatedRequestId: args.relatedRequestId,
      images: (args.images ?? []).map((image) => image.trim()).filter(Boolean),
      videos: (args.videos ?? []).map((video) => video.trim()).filter(Boolean),
      links: (args.links ?? [])
        .map((link) => ({
          label: link.label.trim(),
          url: link.url.trim(),
        }))
        .filter((link) => link.label && link.url),
      reminderDetails: args.reminderDetails,
      pinned: args.pinned,
      published: args.published,
      updatedAt: now,
    };

    if (existing) {
      await ctx.db.patch(existing._id, payload);
    } else {
      await ctx.db.insert("dashboardUpdates", {
        ...payload,
        createdAt: now,
      });
    }

    return { success: true, entryId };
  },
});

export const createHoldingReminder = mutation({
  args: {
    requestId: v.string(),
    reminderMessage: v.optional(v.string()),
    createdBy: v.string(),
  },
  handler: async (ctx, args) => {
    const request = await ctx.db
      .query("requests")
      .withIndex("by_date", (q) => q.eq("date", args.requestId))
      .unique();

    if (!request) {
      throw new Error("Holding request not found");
    }

    const requester = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", request.userEmail))
      .first();

    const inventoryItem = await ctx.db
      .query("inventory")
      .withIndex("by_itemId", (q) => q.eq("itemId", request.itemId))
      .first();

    const existingReminder = await ctx.db
      .query("dashboardUpdates")
      .withIndex("by_relatedRequestId", (q) => q.eq("relatedRequestId", args.requestId))
      .first();

    const audience: "team" | "user" =
      requester?.role === "TEAM" || requester?.role === "ADMIN" ? "team" : "user";
    const title = `Return reminder: ${request.itemName}`;
    const body =
      args.reminderMessage?.trim() ||
      `Please follow up with the return procedure for ${request.itemName}. This reminder stays pinned until you begin the return process.`;
    const now = Date.now();
    const images = inventoryItem?.imageUrl ? [inventoryItem.imageUrl] : [];
    const links: { label: string; url: string }[] = [
      ...(inventoryItem?.imageUrl
        ? [{ label: "View item image", url: inventoryItem.imageUrl }]
        : []),
      ...(inventoryItem?.links
        ? [{ label: "View item reference", url: inventoryItem.links }]
        : []),
    ];

    const reminderDetails = {
      itemId: request.itemId,
      itemName: request.itemName,
      itemImageUrl: inventoryItem?.imageUrl ?? "",
      quantity: request.quantity,
      issuedAt: request.date,
      issuedBy: request.actionBy || args.createdBy,
      userEmail: request.userEmail,
      userName: request.userName,
    };

    const payload: {
      entryId: string;
      title: string;
      body: string;
      kind: "announcement";
      audience: "user" | "team";
      targetUserEmail: string;
      relatedRequestId: string;
      images: string[];
      videos: string[];
      links: { label: string; url: string }[];
      reminderDetails: typeof reminderDetails;
      pinned: boolean;
      published: boolean;
      updatedAt: number;
    } = {
      entryId: existingReminder?.entryId ?? crypto.randomUUID(),
      title,
      body,
      kind: "announcement" as const,
      audience,
      targetUserEmail: request.userEmail,
      relatedRequestId: request.date,
      images,
      videos: [],
      links,
      reminderDetails,
      pinned: true,
      published: true,
      updatedAt: now,
    };

    if (existingReminder) {
      await ctx.db.patch(existingReminder._id, payload);
    } else {
      await ctx.db.insert("dashboardUpdates", {
        ...payload,
        createdAt: now,
      });
    }

    return {
      success: true,
      reminder: payload,
      emailPayload: {
        userEmail: request.userEmail,
        userName: request.userName,
        itemName: request.itemName,
        quantity: request.quantity,
        issuedAt: request.date,
        issuedBy: request.actionBy || args.createdBy,
        itemImageUrl: inventoryItem?.imageUrl ?? "",
        itemReferenceUrl: inventoryItem?.links ?? "",
        subject: title,
        message: body,
      },
    };
  },
});

export const remove = mutation({
  args: {
    entryId: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("dashboardUpdates")
      .withIndex("by_entryId", (q) => q.eq("entryId", args.entryId))
      .unique();

    if (!existing) {
      throw new Error("Update not found");
    }

    await ctx.db.delete(existing._id);
    return { success: true };
  },
});
