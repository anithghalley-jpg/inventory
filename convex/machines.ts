import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { enqueueSheetsSyncJob } from "./sheetsSync";

export const getAll = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("machines").collect();
  },
});

function formatMachineForSheets(machine: any) {
  return {
    id: machine.machineId,
    name: machine.name,
    isOnline: machine.status === "ENGAGED",
    currentUser: machine.currentUser || "",
    lastUsed: machine.lastUsed || "",
    note: machine.lastNote || "",
  };
}

export const register = mutation({
  args: {
    machineId: v.string(),
    name: v.string(),
    scriptUrl: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.query("machines").withIndex("by_machineId", q => q.eq("machineId", args.machineId)).first();
    if (existing) throw new Error("Machine ID already exists");

    const machine = {
      machineId: args.machineId,
      name: args.name,
      status: "AVAILABLE",
    };

    await ctx.db.insert("machines", machine);
    
    await enqueueSheetsSyncJob(ctx, {
      scriptUrl: args.scriptUrl,
      entityType: "machines",
      entityKey: args.machineId,
      operation: "upsert",
      payload: formatMachineForSheets(machine),
    });

    return { success: true };
  },
});

export const unregister = mutation({
  args: {
    machineId: v.string(),
    scriptUrl: v.string(),
  },
  handler: async (ctx, args) => {
    const machine = await ctx.db.query("machines").withIndex("by_machineId", q => q.eq("machineId", args.machineId)).first();
    if (machine) {
      await ctx.db.delete(machine._id);
      
      await enqueueSheetsSyncJob(ctx, {
        scriptUrl: args.scriptUrl,
        entityType: "machines",
        entityKey: args.machineId,
        operation: "delete",
        payload: { id: args.machineId },
      });
    }
    return { success: true };
  },
});

export const startSession = mutation({
  args: {
    machineId: v.string(),
    userEmail: v.string(),
    userName: v.string(),
    scriptUrl: v.string(),
  },
  handler: async (ctx, args) => {
    const machine = await ctx.db.query("machines").withIndex("by_machineId", q => q.eq("machineId", args.machineId)).first();
    if (!machine) throw new Error("Machine not found");
    if (machine.status === "ENGAGED") throw new Error("Machine is already in use");

    // check if it's RESERVED for someone else
    if (machine.status === "RESERVED" && machine.currentTurnEmail && machine.currentTurnEmail !== args.userEmail) {
      throw new Error(`Machine is reserved for ${machine.currentTurnName || machine.currentTurnEmail}`);
    }

    const now = new Date().toISOString();
    
    // Manage waiting list: If the user starting the session is in the queue, remove them.
    const waitingList = machine.waitingList || [];
    const newWaitingList = waitingList.filter(u => u.userEmail !== args.userEmail);

    const patch = {
      status: "ENGAGED",
      currentUser: args.userName || args.userEmail,
      lastUsed: now,
      waitingList: newWaitingList,
      currentTurnEmail: undefined,
      currentTurnName: undefined,
    };

    await ctx.db.patch(machine._id, patch);

    // Create a new log entry
    await ctx.db.insert("machineLogs", {
      machineId: args.machineId,
      userName: args.userName || args.userEmail,
      userEmail: args.userEmail,
      startTime: now,
      command: "ON",
    });
    
    // Optional: Keep Sheets list in sync for high-level status
    await enqueueSheetsSyncJob(ctx, {
      scriptUrl: args.scriptUrl,
      entityType: "machines",
      entityKey: args.machineId,
      operation: "upsert",
      payload: formatMachineForSheets({
        machineId: args.machineId,
        name: machine.name,
        ...patch
      }),
    });

    return { success: true };
  },
});

const MAX_LOGS_PER_MACHINE = 10;

async function pruneLogs(ctx: any, machineId: string) {
  const logs = await ctx.db
    .query("machineLogs")
    .withIndex("by_machineId_and_startTime", (q: any) => q.eq("machineId", machineId))
    .order("asc") // Oldest first
    .collect();

  if (logs.length > MAX_LOGS_PER_MACHINE) {
    const toDeleteCount = logs.length - MAX_LOGS_PER_MACHINE;
    for (let i = 0; i < toDeleteCount; i++) {
        await ctx.db.delete(logs[i]._id);
    }
  }
}

export const endSession = mutation({
  args: {
    machineId: v.string(),
    note: v.string(), // Mandatory note
    scriptUrl: v.string(),
  },
  handler: async (ctx, args) => {
    const machine = await ctx.db.query("machines").withIndex("by_machineId", q => q.eq("machineId", args.machineId)).first();
    if (!machine) throw new Error("Machine not found");

    const now = new Date().toISOString();
    
    // Check if there's someone in the waiting list
    const waitingList = machine.waitingList || [];
    let status = "AVAILABLE";
    let currentTurnEmail = undefined;
    let currentTurnName = undefined;

    if (waitingList.length > 0) {
      status = "RESERVED";
      currentTurnEmail = waitingList[0].userEmail;
      currentTurnName = waitingList[0].userName;
    }

    const patch = {
      status: status,
      currentUser: "",
      lastNote: args.note,
      currentTurnEmail: currentTurnEmail,
      currentTurnName: currentTurnName,
    };

    await ctx.db.patch(machine._id, patch);

    // Update the active log entry
    const activeLog = await ctx.db
      .query("machineLogs")
      .withIndex("by_machineId_and_startTime", q => q.eq("machineId", args.machineId))
      .filter(q => q.eq(q.field("command"), "ON"))
      .order("desc")
      .first();

    if (activeLog) {
      await ctx.db.patch(activeLog._id, {
        endTime: now,
        note: args.note,
        command: "OFF",
      });
    }

    // Prune logs to keep only top 10
    await pruneLogs(ctx, args.machineId);
    
    // Optional: Keep Sheets list in sync
    await enqueueSheetsSyncJob(ctx, {
      scriptUrl: args.scriptUrl,
      entityType: "machines",
      entityKey: args.machineId,
      operation: "upsert",
      payload: formatMachineForSheets({
        machineId: args.machineId,
        name: machine.name,
        ...patch
      }),
    });

    return { success: true };
  },
});

// New Queries and Mutations for Log Management
export const getLogsByMachine = query({
  args: { machineId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("machineLogs")
      .withIndex("by_machineId_and_startTime", q => q.eq("machineId", args.machineId))
      .order("desc")
      .collect();
  },
});

export const deleteLog = mutation({
  args: { logId: v.id("machineLogs") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.logId);
    return { success: true };
  },
});

const MAX_WAITING_LIST = 5;

export const bookMachine = mutation({
  args: {
    machineId: v.string(),
    userEmail: v.string(),
    userName: v.string(),
    note: v.string(),
  },
  handler: async (ctx, args) => {
    const machine = await ctx.db.query("machines").withIndex("by_machineId", q => q.eq("machineId", args.machineId)).first();
    if (!machine) throw new Error("Machine not found");
    if (machine.status !== "ENGAGED") throw new Error("Machine is available; start a session instead");

    const waitingList = machine.waitingList || [];
    if (waitingList.length >= MAX_WAITING_LIST) throw new Error("Waiting list is full (max 5)");
    
    if (waitingList.some(u => u.userEmail === args.userEmail)) {
        throw new Error("You are already in the waiting list");
    }

    const newWaitingList = [
        ...waitingList,
        {
            userEmail: args.userEmail,
            userName: args.userName,
            note: args.note,
            timestamp: Date.now(),
        }
    ];

    await ctx.db.patch(machine._id, { waitingList: newWaitingList });
    return { success: true };
  },
});

export const cancelBooking = mutation({
  args: {
    machineId: v.string(),
    userEmail: v.string(),
  },
  handler: async (ctx, args) => {
    const machine = await ctx.db.query("machines").withIndex("by_machineId", q => q.eq("machineId", args.machineId)).first();
    if (!machine) throw new Error("Machine not found");

    const waitingList = machine.waitingList || [];
    const newWaitingList = waitingList.filter(u => u.userEmail !== args.userEmail);

    if (newWaitingList.length !== waitingList.length) {
        // If the user we removed was the one with the turn, we need to pass it
        let patch: any = { waitingList: newWaitingList };
        if (machine.currentTurnEmail === args.userEmail) {
            if (newWaitingList.length > 0) {
                patch.currentTurnEmail = newWaitingList[0].userEmail;
                patch.currentTurnName = newWaitingList[0].userName;
                patch.status = "RESERVED";
            } else {
                patch.currentTurnEmail = undefined;
                patch.currentTurnName = undefined;
                patch.status = "AVAILABLE";
            }
        }
        await ctx.db.patch(machine._id, patch);
    }
    return { success: true };
  },
});

export const passTurn = mutation({
  args: {
    machineId: v.string(),
    userEmail: v.string(),
  },
  handler: async (ctx, args) => {
    const machine = await ctx.db.query("machines").withIndex("by_machineId", q => q.eq("machineId", args.machineId)).first();
    if (!machine) throw new Error("Machine not found");
    if (machine.currentTurnEmail !== args.userEmail) throw new Error("It's not your turn");

    const waitingList = machine.waitingList || [];
    // Remove current user from waiting list
    const newWaitingList = waitingList.slice(1);

    if (newWaitingList.length > 0) {
        await ctx.db.patch(machine._id, {
            waitingList: newWaitingList,
            currentTurnEmail: newWaitingList[0].userEmail,
            currentTurnName: newWaitingList[0].userName,
            status: "RESERVED",
        });
    } else {
        await ctx.db.patch(machine._id, {
            waitingList: [],
            currentTurnEmail: undefined,
            currentTurnName: undefined,
            status: "AVAILABLE",
        });
    }

    return { success: true };
  },
});
