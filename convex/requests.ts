import { mutation, query, type MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import { enqueueSheetsSyncJob } from "./sheetsSync";

async function dismissHoldingReminder(ctx: MutationCtx, requestId: string) {
  const reminders = await ctx.db
    .query("dashboardUpdates")
    .withIndex("by_relatedRequestId", (q) => q.eq("relatedRequestId", requestId))
    .take(10);

  for (const reminder of reminders) {
    await ctx.db.delete(reminder._id);
  }
}

async function clearProjectAssignments(ctx: MutationCtx, requestId: string) {
  const projectItems = await ctx.db
    .query("projectItems")
    .withIndex("by_requestId", (q) => q.eq("requestId", requestId))
    .take(20);

  for (const projectItem of projectItems) {
    await ctx.db.delete(projectItem._id);
  }
}

function formatRequestForSheets(request: {
  date: string;
  userEmail: string;
  userName: string;
  itemId: string;
  itemName: string;
  quantity: number;
  status: string;
  actionBy: string;
  returnStatus: string;
  returnTarget: string;
  returnReceiver: string;
  returnRemarks?: string;
}) {
  return {
    date: request.date,
    userEmail: request.userEmail,
    userName: request.userName,
    itemId: request.itemId,
    itemName: request.itemName,
    quantity: request.quantity,
    status: request.status,
    actionBy: request.actionBy,
    returnStatus: request.returnStatus,
    returnTarget: request.returnTarget,
    returnReceiver: request.returnReceiver,
    returnRemarks: request.returnRemarks ?? "",
  };
}

function formatInventoryForSheets(inventory: {
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
    itemId: inventory.itemId,
    name: inventory.name,
    quantity: inventory.quantity,
    category: inventory.category,
    company: inventory.company,
    imageUrl: inventory.imageUrl,
    remarks: inventory.remarks,
    links: inventory.links,
    tags: inventory.tags,
  };
}

export const getAll = query({
  args: {},
  handler: async (ctx) => {
    const requests = await ctx.db.query("requests").order("desc").collect();
    return requests.map((request) => ({
      ...request,
      returnRequestStatus: request.returnStatus,
    }));
  },
});

export const checkoutRequest = mutation({
  args: {
    userEmail: v.string(),
    userName: v.string(),
    itemId: v.string(),
    itemName: v.string(),
    quantity: v.number(),
    scriptUrl: v.string()
  },
  handler: async (ctx, args) => {
    const timestamp = new Date().toISOString();
    
    const requestDoc = {
      date: timestamp,
      userEmail: args.userEmail,
      userName: args.userName,
      itemId: args.itemId,
      itemName: args.itemName,
      quantity: args.quantity,
      status: "PENDING",
      actionBy: "",
      returnStatus: "",
      returnTarget: "",
      returnReceiver: "",
      returnRemarks: "",
    };
    await ctx.db.insert("requests", requestDoc);

    await enqueueSheetsSyncJob(ctx, {
      scriptUrl: args.scriptUrl,
      entityType: "requests",
      entityKey: requestDoc.date,
      operation: "upsert",
      payload: formatRequestForSheets(requestDoc),
    });

    return { success: true };
  }
});

export const approveCheckoutRequest = mutation({
  args: {
    requestId: v.string(), // This is the date timestamp
    approverName: v.string(),
    scriptUrl: v.string()
  },
  handler: async (ctx, args) => {
    const reqDoc = await ctx.db.query("requests").withIndex("by_date", q => q.eq("date", args.requestId)).first();
    if (!reqDoc) throw new Error("Request not found");

    // Approve the request
    await ctx.db.patch(reqDoc._id, {
      status: "APPROVED",
      actionBy: args.approverName
    });

    // Deduct from inventory
    const invDoc = await ctx.db.query("inventory").withIndex("by_itemId", q => q.eq("itemId", reqDoc.itemId)).first();
    if (invDoc) {
      await ctx.db.patch(invDoc._id, {
        quantity: Math.max(0, invDoc.quantity - reqDoc.quantity)
      });
    }

    const updatedRequest = {
      ...reqDoc,
      status: "APPROVED",
      actionBy: args.approverName,
    };

    await enqueueSheetsSyncJob(ctx, {
      scriptUrl: args.scriptUrl,
      entityType: "requests",
      entityKey: updatedRequest.date,
      operation: "upsert",
      payload: formatRequestForSheets(updatedRequest),
    });

    if (invDoc) {
      await enqueueSheetsSyncJob(ctx, {
        scriptUrl: args.scriptUrl,
        entityType: "inventory",
        entityKey: invDoc.itemId,
        operation: "upsert",
        payload: formatInventoryForSheets({
          ...invDoc,
          quantity: Math.max(0, invDoc.quantity - reqDoc.quantity),
        }),
      });
    }

    return { success: true };
  }
});

export const initiateReturn = mutation({
  args: {
    requestId: v.string(),
    returnTarget: v.string(),
    scriptUrl: v.string()
  },
  handler: async (ctx, args) => {
    const reqDoc = await ctx.db.query("requests").withIndex("by_date", q => q.eq("date", args.requestId)).first();
    if (!reqDoc) throw new Error("Request not found");

    await ctx.db.patch(reqDoc._id, {
      returnStatus: "RETURN_PENDING",
      returnTarget: args.returnTarget
    });

    await dismissHoldingReminder(ctx, reqDoc.date);
    await clearProjectAssignments(ctx, reqDoc.date);

    await enqueueSheetsSyncJob(ctx, {
      scriptUrl: args.scriptUrl,
      entityType: "requests",
      entityKey: reqDoc.date,
      operation: "upsert",
      payload: formatRequestForSheets({
        ...reqDoc,
        returnStatus: "RETURN_PENDING",
        returnTarget: args.returnTarget,
      }),
    });

    return { success: true };
  }
});

export const processReturn = mutation({
  args: {
    requestId: v.string(),
    approverName: v.string(),
    remarks: v.string(),
    scriptUrl: v.string()
  },
  handler: async (ctx, args) => {
    const reqDoc = await ctx.db.query("requests").withIndex("by_date", q => q.eq("date", args.requestId)).first();
    if (!reqDoc) throw new Error("Request not found");

    const returnReceiver = `${args.approverName}${args.remarks ? `: ${args.remarks}` : ""}`;
    await ctx.db.patch(reqDoc._id, {
      returnStatus: "RETURN_APPROVED",
      returnReceiver,
      returnRemarks: args.remarks,
    });

    await dismissHoldingReminder(ctx, reqDoc.date);
    await clearProjectAssignments(ctx, reqDoc.date);

    const invDoc = await ctx.db.query("inventory").withIndex("by_itemId", q => q.eq("itemId", reqDoc.itemId)).first();
    if (invDoc) {
      await ctx.db.patch(invDoc._id, {
        quantity: invDoc.quantity + reqDoc.quantity
      });
    }

    await enqueueSheetsSyncJob(ctx, {
      scriptUrl: args.scriptUrl,
      entityType: "requests",
      entityKey: reqDoc.date,
      operation: "upsert",
      payload: formatRequestForSheets({
        ...reqDoc,
        returnStatus: "RETURN_APPROVED",
        returnReceiver,
        returnRemarks: args.remarks,
      }),
    });

    if (invDoc) {
      await enqueueSheetsSyncJob(ctx, {
        scriptUrl: args.scriptUrl,
        entityType: "inventory",
        entityKey: invDoc.itemId,
        operation: "upsert",
        payload: formatInventoryForSheets({
          ...invDoc,
          quantity: invDoc.quantity + reqDoc.quantity,
        }),
      });
    }

    return { success: true };
  }
});

export const cancelReturn = mutation({
  args: {
    requestId: v.string(),
    scriptUrl: v.string(),
  },
  handler: async (ctx, args) => {
    const reqDoc = await ctx.db.query("requests").withIndex("by_date", q => q.eq("date", args.requestId)).first();
    if (!reqDoc) throw new Error("Request not found");

    // Clear return fields — item stays with the user
    await ctx.db.patch(reqDoc._id, {
      returnStatus: "",
      returnTarget: "",
    });

    await enqueueSheetsSyncJob(ctx, {
      scriptUrl: args.scriptUrl,
      entityType: "requests",
      entityKey: reqDoc.date,
      operation: "upsert",
      payload: formatRequestForSheets({
        ...reqDoc,
        returnStatus: "",
        returnTarget: "",
      }),
    });

    return { success: true };
  }
});

export const cancelCheckoutRequest = mutation({
  args: {
    requestId: v.string(),
    scriptUrl: v.string(),
  },
  handler: async (ctx, args) => {
    const reqDoc = await ctx.db.query("requests").withIndex("by_date", q => q.eq("date", args.requestId)).first();
    if (!reqDoc) throw new Error("Request not found");

    // Only allow canceling PENDING requests
    if (reqDoc.status !== "PENDING") {
      throw new Error("Only pending requests can be cancelled");
    }

    // Delete the request
    await ctx.db.delete(reqDoc._id);

    // Sync deletion to Google Sheets
    await enqueueSheetsSyncJob(ctx, {
      scriptUrl: args.scriptUrl,
      entityType: "requests",
      entityKey: reqDoc.date,
      operation: "delete",
      payload: { date: reqDoc.date },
    });

    return { success: true };
  }
});
