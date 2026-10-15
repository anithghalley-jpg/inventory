import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import { v } from "convex/values";

const MAX_FORUMS = 200;
const MAX_ACTION_ITEMS = 500;

const forumRolesValidator = v.object({
  chairperson: v.object({
    name: v.string(),
    email: v.optional(v.string()),
    department: v.optional(v.string()),
  }),
  noteTaker: v.object({
    name: v.string(),
    email: v.optional(v.string()),
    department: v.optional(v.string()),
  }),
  timeKeeper: v.object({
    name: v.string(),
    email: v.optional(v.string()),
    department: v.optional(v.string()),
  }),
  questionMaster: v.object({
    name: v.string(),
    email: v.optional(v.string()),
    department: v.optional(v.string()),
  }),
});

const forumStatusValidator = v.union(
  v.literal("UPCOMING"),
  v.literal("IN_PROGRESS"),
  v.literal("COMPLETED"),
  v.literal("CANCELLED"),
);

/**
 * Get all forums (bounded)
 */
export const getAll = query({
  args: {},
  handler: async (ctx) => {
    const forums = await ctx.db
      .query("forums")
      .order("desc")
      .take(MAX_FORUMS);

    return forums.sort((a, b) => b.edition - a.edition);
  },
});

/**
 * Get the next upcoming or currently in-progress forum
 */
export const getUpcoming = query({
  args: {},
  handler: async (ctx) => {
    const inProgress = await ctx.db
      .query("forums")
      .withIndex("by_status", (q) => q.eq("status", "IN_PROGRESS"))
      .first();

    if (inProgress) return inProgress;

    const upcomingList = await ctx.db
      .query("forums")
      .withIndex("by_status", (q) => q.eq("status", "UPCOMING"))
      .take(MAX_FORUMS);

    if (upcomingList.length === 0) return null;

    // Sort by earliest date and time
    return upcomingList.sort((a, b) => {
      const dateA = new Date(`${a.date}T${a.time || "00:00"}`).getTime();
      const dateB = new Date(`${b.date}T${b.time || "00:00"}`).getTime();
      return dateA - dateB;
    })[0];
  },
});

/**
 * Get history archive of completed forums
 */
export const getHistory = query({
  args: {},
  handler: async (ctx) => {
    const completedList = await ctx.db
      .query("forums")
      .withIndex("by_status", (q) => q.eq("status", "COMPLETED"))
      .take(MAX_FORUMS);

    return completedList.sort((a, b) => b.edition - a.edition);
  },
});

/**
 * Get a specific forum by forumId, enriched with its action items
 */
export const getForumById = query({
  args: { forumId: v.string() },
  handler: async (ctx, args) => {
    const forum = await ctx.db
      .query("forums")
      .withIndex("by_forumId", (q) => q.eq("forumId", args.forumId))
      .first();

    if (!forum) return null;

    const originItems = await ctx.db
      .query("forumActionItems")
      .withIndex("by_forumId", (q) => q.eq("forumId", args.forumId))
      .take(MAX_ACTION_ITEMS);

    const carriedOverItems = await ctx.db
      .query("forumActionItems")
      .withIndex("by_currentForumId", (q) => q.eq("currentForumId", args.forumId))
      .take(MAX_ACTION_ITEMS);

    // Merge unique items
    const itemMap = new Map();
    [...originItems, ...carriedOverItems].forEach((item) => {
      itemMap.set(item.itemId, item);
    });

    return {
      ...forum,
      actionItems: Array.from(itemMap.values()),
    };
  },
});

/**
 * Compute the next edition number (highest edition + 1)
 */
export const getNextEditionNumber = query({
  args: {},
  handler: async (ctx) => {
    const forums = await ctx.db.query("forums").take(MAX_FORUMS);
    if (forums.length === 0) return 1;

    const maxEdition = Math.max(...forums.map((f) => f.edition || 0));
    return maxEdition + 1;
  },
});

/**
 * Get all unresolved action items from past forums available for carry-over
 */
export const getUnresolvedActionItems = query({
  args: {},
  handler: async (ctx) => {
    const openItems = await ctx.db
      .query("forumActionItems")
      .withIndex("by_isResolved", (q) => q.eq("isResolved", false))
      .take(MAX_ACTION_ITEMS);

    return openItems.sort((a, b) => b.createdAt - a.createdAt);
  },
});

/**
 * Get all action items with optional filters
 */
export const getAllActionItems = query({
  args: {
    department: v.optional(v.string()),
    isResolved: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    let items: any[] = [];

    if (args.isResolved !== undefined) {
      items = await ctx.db
        .query("forumActionItems")
        .withIndex("by_isResolved", (q) => q.eq("isResolved", args.isResolved!))
        .take(MAX_ACTION_ITEMS);
    } else {
      items = await ctx.db
        .query("forumActionItems")
        .order("desc")
        .take(MAX_ACTION_ITEMS);
    }

    if (args.department && args.department !== "ALL") {
      items = items.filter((i) => i.department === args.department);
    }

    return items;
  },
});

/**
 * Schedule a new forum edition
 */
export const scheduleForum = mutation({
  args: {
    title: v.string(),
    edition: v.number(),
    editionLabel: v.optional(v.string()),
    date: v.string(),
    time: v.string(),
    location: v.optional(v.string()),
    description: v.optional(v.string()),
    agenda: v.optional(v.string()),
    departments: v.optional(v.array(v.string())),
    roles: forumRolesValidator,
    carriedOverActionItemIds: v.optional(v.array(v.string())),
    userEmail: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const forumId = `forum_${now}_${Math.random().toString(36).substring(2, 7)}`;
    const editionLabel = args.editionLabel || `Edition #${args.edition}`;

    // Auto-generate drive folder name based on edition and date requirement:
    // e.g. "Forum Edition 1 - 2026-09-22"
    const driveFolderName = `Forum Edition ${args.edition} - ${args.date}`;

    await ctx.db.insert("forums", {
      forumId,
      title: args.title.trim(),
      edition: args.edition,
      editionLabel,
      date: args.date,
      time: args.time,
      location: args.location?.trim() || "Multi-Disciplinary Hub / Seminar Room",
      description: args.description?.trim() || "",
      agenda: args.agenda?.trim() || "",
      departments: args.departments || ["Technology", "FabLab", "Astronomy"],
      roles: args.roles,
      status: "UPCOMING",
      driveFolderName,
      carriedOverActionItemIds: args.carriedOverActionItemIds || [],
      createdBy: args.userEmail,
      createdAt: now,
      updatedAt: now,
    });

    // Tag carried-over action items with this forumId as their current forum
    if (args.carriedOverActionItemIds && args.carriedOverActionItemIds.length > 0) {
      for (const itemId of args.carriedOverActionItemIds) {
        const itemDoc = await ctx.db
          .query("forumActionItems")
          .withIndex("by_itemId", (q) => q.eq("itemId", itemId))
          .first();

        if (itemDoc) {
          await ctx.db.patch(itemDoc._id, {
            currentForumId: forumId,
            updatedAt: now,
          });
        }
      }
    }

    return { success: true, forumId, driveFolderName };
  },
});

/**
 * Update details of an existing forum
 */
export const updateForum = mutation({
  args: {
    forumId: v.string(),
    title: v.optional(v.string()),
    edition: v.optional(v.number()),
    editionLabel: v.optional(v.string()),
    date: v.optional(v.string()),
    time: v.optional(v.string()),
    location: v.optional(v.string()),
    description: v.optional(v.string()),
    agenda: v.optional(v.string()),
    departments: v.optional(v.array(v.string())),
    roles: v.optional(forumRolesValidator),
    carriedOverActionItemIds: v.optional(v.array(v.string())),
    coverImageUrl: v.optional(v.string()),
    keyTakeaways: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const forum = await ctx.db
      .query("forums")
      .withIndex("by_forumId", (q) => q.eq("forumId", args.forumId))
      .first();

    if (!forum) throw new Error("Forum not found");

    const now = Date.now();
    const patch: any = { updatedAt: now };

    if (args.title !== undefined) patch.title = args.title.trim();
    if (args.edition !== undefined) {
      patch.edition = args.edition;
      patch.editionLabel = args.editionLabel || `Edition #${args.edition}`;
      if (forum.date) {
        patch.driveFolderName = `Forum Edition ${args.edition} - ${args.date || forum.date}`;
      }
    }
    if (args.date !== undefined) {
      patch.date = args.date;
      patch.driveFolderName = `Forum Edition ${args.edition || forum.edition} - ${args.date}`;
    }
    if (args.time !== undefined) patch.time = args.time;
    if (args.location !== undefined) patch.location = args.location.trim();
    if (args.description !== undefined) patch.description = args.description.trim();
    if (args.agenda !== undefined) patch.agenda = args.agenda.trim();
    if (args.departments !== undefined) patch.departments = args.departments;
    if (args.roles !== undefined) patch.roles = args.roles;
    if (args.coverImageUrl !== undefined) patch.coverImageUrl = args.coverImageUrl;
    if (args.keyTakeaways !== undefined) patch.keyTakeaways = args.keyTakeaways;
    if (args.carriedOverActionItemIds !== undefined) {
      patch.carriedOverActionItemIds = args.carriedOverActionItemIds;
    }

    await ctx.db.patch(forum._id, patch);
    return { success: true };
  },
});

/**
 * Update forum status (UPCOMING, IN_PROGRESS, CANCELLED)
 */
export const updateForumStatus = mutation({
  args: {
    forumId: v.string(),
    status: forumStatusValidator,
  },
  handler: async (ctx, args) => {
    const forum = await ctx.db
      .query("forums")
      .withIndex("by_forumId", (q) => q.eq("forumId", args.forumId))
      .first();

    if (!forum) throw new Error("Forum not found");

    await ctx.db.patch(forum._id, {
      status: args.status,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Complete a forum session: upload minutes PDF, photos, takeaways, and mark action items resolved
 */
export const completeForum = mutation({
  args: {
    forumId: v.string(),
    minutesPdfUrl: v.string(),
    minutesPdfName: v.optional(v.string()),
    coverImageUrl: v.optional(v.string()),
    eventPhotos: v.optional(v.array(v.string())),
    driveFolderId: v.optional(v.string()),
    driveFolderUrl: v.optional(v.string()),
    driveFolderName: v.optional(v.string()),
    keyTakeaways: v.string(),
    resolvedActionItemIds: v.optional(v.array(v.string())),
    newActionItems: v.optional(
      v.array(
        v.object({
          title: v.string(),
          description: v.optional(v.string()),
          assignee: v.optional(v.string()),
          department: v.optional(v.string()),
          isResolved: v.boolean(),
        }),
      ),
    ),
    userEmail: v.string(),
  },
  handler: async (ctx, args) => {
    const forum = await ctx.db
      .query("forums")
      .withIndex("by_forumId", (q) => q.eq("forumId", args.forumId))
      .first();

    if (!forum) throw new Error("Forum not found");

    const now = Date.now();

    // 1. Mark forum complete with records
    await ctx.db.patch(forum._id, {
      status: "COMPLETED",
      minutesPdfUrl: args.minutesPdfUrl,
      minutesPdfName: args.minutesPdfName || `Minutes - Forum Edition ${forum.edition}.pdf`,
      coverImageUrl: args.coverImageUrl || (args.eventPhotos && args.eventPhotos[0]) || forum.coverImageUrl || "",
      eventPhotos: args.eventPhotos || forum.eventPhotos || [],
      driveFolderId: args.driveFolderId || forum.driveFolderId,
      driveFolderUrl: args.driveFolderUrl || forum.driveFolderUrl,
      driveFolderName: args.driveFolderName || forum.driveFolderName || `Forum Edition ${forum.edition} - ${forum.date}`,
      keyTakeaways: args.keyTakeaways.trim(),
      completedAt: now,
      completedBy: args.userEmail,
      updatedAt: now,
    });

    // 2. Resolve selected action items
    if (args.resolvedActionItemIds && args.resolvedActionItemIds.length > 0) {
      for (const itemId of args.resolvedActionItemIds) {
        const itemDoc = await ctx.db
          .query("forumActionItems")
          .withIndex("by_itemId", (q) => q.eq("itemId", itemId))
          .first();

        if (itemDoc) {
          await ctx.db.patch(itemDoc._id, {
            isResolved: true,
            resolvedAt: now,
            resolvedInForumId: forum.forumId,
            updatedAt: now,
          });
        }
      }
    }

    // 3. Insert any new action items created from this session
    if (args.newActionItems && args.newActionItems.length > 0) {
      for (const item of args.newActionItems) {
        if (!item.title.trim()) continue;
        const itemId = `action_${now}_${Math.random().toString(36).substring(2, 7)}`;
        await ctx.db.insert("forumActionItems", {
          itemId,
          forumId: forum.forumId,
          forumEdition: forum.edition,
          title: item.title.trim(),
          description: item.description?.trim() || "",
          assignee: item.assignee?.trim() || "",
          department: item.department || "General",
          isResolved: item.isResolved,
          resolvedAt: item.isResolved ? now : undefined,
          resolvedInForumId: item.isResolved ? forum.forumId : undefined,
          currentForumId: forum.forumId,
          createdBy: args.userEmail,
          createdAt: now,
          updatedAt: now,
        });
      }
    }

    return { success: true };
  },
});

/**
 * Create a standalone or session action item
 */
export const createActionItem = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    assignee: v.optional(v.string()),
    department: v.optional(v.string()),
    forumId: v.optional(v.string()),
    forumEdition: v.optional(v.number()),
    userEmail: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const itemId = `action_${now}_${Math.random().toString(36).substring(2, 7)}`;

    await ctx.db.insert("forumActionItems", {
      itemId,
      forumId: args.forumId,
      forumEdition: args.forumEdition,
      title: args.title.trim(),
      description: args.description?.trim() || "",
      assignee: args.assignee?.trim() || "",
      department: args.department || "General",
      isResolved: false,
      currentForumId: args.forumId,
      createdBy: args.userEmail,
      createdAt: now,
      updatedAt: now,
    });

    return { success: true, itemId };
  },
});

/**
 * Toggle resolved status of an action item
 */
export const toggleActionItemResolved = mutation({
  args: {
    itemId: v.string(),
    isResolved: v.boolean(),
    resolvedInForumId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const itemDoc = await ctx.db
      .query("forumActionItems")
      .withIndex("by_itemId", (q) => q.eq("itemId", args.itemId))
      .first();

    if (!itemDoc) throw new Error("Action item not found");

    const now = Date.now();
    await ctx.db.patch(itemDoc._id, {
      isResolved: args.isResolved,
      resolvedAt: args.isResolved ? now : undefined,
      resolvedInForumId: args.isResolved ? args.resolvedInForumId || itemDoc.resolvedInForumId : undefined,
      updatedAt: now,
    });

    return { success: true };
  },
});

/**
 * Delete a forum
 */
export const deleteForum = mutation({
  args: { forumId: v.string() },
  handler: async (ctx, args) => {
    const forum = await ctx.db
      .query("forums")
      .withIndex("by_forumId", (q) => q.eq("forumId", args.forumId))
      .first();

    if (!forum) throw new Error("Forum not found");

    // Detach action items
    const actionItems = await ctx.db
      .query("forumActionItems")
      .withIndex("by_currentForumId", (q) => q.eq("currentForumId", args.forumId))
      .take(MAX_ACTION_ITEMS);

    for (const item of actionItems) {
      await ctx.db.patch(item._id, {
        currentForumId: undefined,
        updatedAt: Date.now(),
      });
    }

    await ctx.db.delete(forum._id);
    return { success: true };
  },
});

/**
 * Delete an action item
 */
export const deleteActionItem = mutation({
  args: { itemId: v.string() },
  handler: async (ctx, args) => {
    const item = await ctx.db
      .query("forumActionItems")
      .withIndex("by_itemId", (q) => q.eq("itemId", args.itemId))
      .first();

    if (!item) throw new Error("Action item not found");

    await ctx.db.delete(item._id);
    return { success: true };
  },
});

/**
 * Set Google Drive folder info for a forum
 */
export const setForumDriveFolder = mutation({
  args: {
    forumId: v.string(),
    driveFolderId: v.string(),
    driveFolderUrl: v.string(),
    driveFolderName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const forum = await ctx.db
      .query("forums")
      .withIndex("by_forumId", (q) => q.eq("forumId", args.forumId))
      .first();

    if (!forum) throw new Error("Forum not found");

    await ctx.db.patch(forum._id, {
      driveFolderId: args.driveFolderId,
      driveFolderUrl: args.driveFolderUrl,
      driveFolderName: args.driveFolderName || forum.driveFolderName,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});
