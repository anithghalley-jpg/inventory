import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { enqueueSheetsSyncJob } from "./sheetsSync";

export const getAll = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("machines").collect();
  },
});

function formatMachineForSheets(machine: {
  machineId: string;
  name: string;
  status: string;
  currentUser?: string;
  lastUsed?: string;
  lastNote?: string;
}) {
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

    const now = new Date().toISOString();
    const patch = {
      status: "ENGAGED",
      currentUser: args.userName || args.userEmail,
      lastUsed: now,
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
    const updatedMachine = { ...machine, ...patch };
    await enqueueSheetsSyncJob(ctx, {
      scriptUrl: args.scriptUrl,
      entityType: "machines",
      entityKey: args.machineId,
      operation: "upsert",
      payload: formatMachineForSheets(updatedMachine),
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
    const patch = {
      status: "AVAILABLE",
      currentUser: "",
      lastNote: args.note,
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
    const updatedMachine = { ...machine, ...patch };
    await enqueueSheetsSyncJob(ctx, {
      scriptUrl: args.scriptUrl,
      entityType: "machines",
      entityKey: args.machineId,
      operation: "upsert",
      payload: formatMachineForSheets(updatedMachine),
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
