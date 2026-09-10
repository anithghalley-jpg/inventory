import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { enqueueSheetsSyncJob } from "./sheetsSync";

function formatUserForSheets(user: {
  email: string;
  name: string;
  role: string;
  status: string;
  createdDate: string;
  laptopStatus: string;
  sessionStart?: string;
  sessionEnd?: string;
  totalTime: number;
  rfid?: string;
  myPageLink?: string;
  profileImageUrl?: string;
  tags: string[];
  note?: string;
  customTheme?: string;
}) {
  return {
    email: user.email,
    name: user.name,
    role: user.role,
    status: user.status,
    createdDate: user.createdDate,
    laptopStatus: user.laptopStatus,
    sessionStart: user.sessionStart ?? "",
    sessionEnd: user.sessionEnd ?? "",
    totalTime: user.totalTime,
    rfid: user.rfid ?? "",
    myPageLink: user.myPageLink ?? "",
    profileImageUrl: user.profileImageUrl ?? "",
    tags: user.tags,
    note: user.note ?? "",
    customTheme: user.customTheme ?? "",
  };
}

export const getAll = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("users").collect();
  },
});

export const getUserByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db.query("users").withIndex("by_email", q => q.eq("email", args.email)).first();
  }
});

export const toggleLaptop = mutation({
  args: { 
    email: v.string(), 
    isTurningOn: v.boolean(),
    newTotal: v.number(),
    scriptUrl: v.string(),
    deviceId: v.optional(v.string()),
    deviceName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userDoc = await ctx.db.query("users").withIndex("by_email", q => q.eq("email", args.email)).first();
    if (!userDoc) {
      throw new Error("User not found");
    }

    const now = new Date().toISOString();
    let nextTotal = userDoc.totalTime;
    let sessionStart = userDoc.sessionStart ?? "";
    let sessionEnd = userDoc.sessionEnd ?? "";
    let activeDeviceId = userDoc.activeDeviceId;
    let activeDeviceName = userDoc.activeDeviceName;
    let activeDeviceLogId = userDoc.activeDeviceLogId;

    if (args.isTurningOn) {
      sessionStart = now;
      sessionEnd = "";

      // If a device was chosen
      if (args.deviceId && args.deviceName) {
        activeDeviceId = args.deviceId;
        activeDeviceName = args.deviceName;
        const logId = `dlog_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
        activeDeviceLogId = logId;

        // GMT+6 date
        let gmt6Date = now.slice(0, 10);
        try {
          gmt6Date = new Intl.DateTimeFormat("en-CA", {
            timeZone: "Asia/Dhaka",
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
          }).format(new Date(now));
        } catch {
          const offsetMs = 6 * 60 * 60 * 1000;
          gmt6Date = new Date(new Date(now).getTime() + offsetMs).toISOString().slice(0, 10);
        }

        await ctx.db.insert("deviceLogs", {
          logId,
          deviceId: args.deviceId,
          deviceName: args.deviceName,
          userEmail: userDoc.email,
          userName: userDoc.name,
          startTime: now,
          date: gmt6Date,
          createdAt: now,
        });

        // Update device in-use state
        const device = await ctx.db
          .query("devices")
          .withIndex("by_deviceId", (q) => q.eq("deviceId", args.deviceId!))
          .first();
        if (device) {
          await ctx.db.patch(device._id, {
            status: "IN_USE",
            currentUserEmail: userDoc.email,
            currentUserName: userDoc.name,
            currentSessionStart: now,
            updatedAt: now,
          });
        }
      }
    } else {
      sessionEnd = now;
      if (sessionStart) {
        const startedAt = new Date(sessionStart).getTime();
        const endedAt = new Date(sessionEnd).getTime();
        if (!Number.isNaN(startedAt) && !Number.isNaN(endedAt) && endedAt >= startedAt) {
          nextTotal = userDoc.totalTime + Math.floor((endedAt - startedAt) / 60000);
        }
      } else {
        nextTotal = args.newTotal;
      }

      // Finalize active device session if any
      const logIdToClose = activeDeviceLogId;
      if (logIdToClose) {
        const log = await ctx.db
          .query("deviceLogs")
          .withIndex("by_logId", (q) => q.eq("logId", logIdToClose))
          .first();

        if (log && !log.endTime) {
          const startMs = new Date(log.startTime).getTime();
          const endMs = new Date(now).getTime();
          const durationMinutes = Math.max(1, Math.round((endMs - startMs) / 60000));
          await ctx.db.patch(log._id, {
            endTime: now,
            durationMinutes,
          });
        }
      }

      const deviceIdToFree = activeDeviceId;
      if (deviceIdToFree) {
        const device = await ctx.db
          .query("devices")
          .withIndex("by_deviceId", (q) => q.eq("deviceId", deviceIdToFree))
          .first();

        if (device && device.currentUserEmail === userDoc.email) {
          await ctx.db.patch(device._id, {
            status: "AVAILABLE",
            currentUserEmail: undefined,
            currentUserName: undefined,
            currentSessionStart: undefined,
            updatedAt: now,
          });
        }
      }

      activeDeviceId = undefined;
      activeDeviceName = undefined;
      activeDeviceLogId = undefined;
    }

    const updatedUser = {
      ...userDoc,
      laptopStatus: args.isTurningOn ? "Online" : "Offline",
      sessionStart,
      sessionEnd,
      totalTime: nextTotal,
      activeDeviceId,
      activeDeviceName,
      activeDeviceLogId,
    };

    await ctx.db.patch(userDoc._id, {
      laptopStatus: updatedUser.laptopStatus,
      sessionStart: updatedUser.sessionStart,
      sessionEnd: updatedUser.sessionEnd,
      totalTime: updatedUser.totalTime,
      activeDeviceId: updatedUser.activeDeviceId,
      activeDeviceName: updatedUser.activeDeviceName,
      activeDeviceLogId: updatedUser.activeDeviceLogId,
    });

    await enqueueSheetsSyncJob(ctx, {
      scriptUrl: args.scriptUrl,
      entityType: "users",
      entityKey: updatedUser.email,
      operation: "upsert",
      payload: formatUserForSheets(updatedUser),
    });

    return { success: true };
  }
});

export const login = mutation({
  args: { email: v.string(), name: v.string(), scriptUrl: v.string() },
  handler: async (ctx, args) => {
    let user = await ctx.db.query("users").withIndex("by_email", q => q.eq("email", args.email)).first();
    
    if (!user) {
      const newUserId = await ctx.db.insert("users", {
        email: args.email,
        name: args.name,
        role: "USER",
        status: "PENDING",
        createdDate: new Date().toISOString(),
        laptopStatus: "Offline",
        sessionStart: "",
        sessionEnd: "",
        totalTime: 0,
        rfid: "",
        myPageLink: "",
        profileImageUrl: "",
        tags: [],
        note: "",
      });
      user = await ctx.db.get(newUserId);
      if (!user) {
        throw new Error("Failed to create user");
      }

      await enqueueSheetsSyncJob(ctx, {
        scriptUrl: args.scriptUrl,
        entityType: "users",
        entityKey: user.email,
        operation: "upsert",
        payload: formatUserForSheets(user),
      });
    } else if (user.name !== args.name) {
      await ctx.db.patch(user._id, { name: args.name });
      user = { ...user, name: args.name };
      await enqueueSheetsSyncJob(ctx, {
        scriptUrl: args.scriptUrl,
        entityType: "users",
        entityKey: user.email,
        operation: "upsert",
        payload: formatUserForSheets(user),
      });
    }

    return { success: true, user };
  }
});

export const updateStatus = mutation({
  args: {
    email: v.string(),
    status: v.union(v.literal("APPROVED"), v.literal("REJECTED"), v.literal("PENDING")),
    scriptUrl: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.query("users").withIndex("by_email", q => q.eq("email", args.email)).first();
    if (!user) {
      throw new Error("User not found");
    }

    await ctx.db.patch(user._id, { status: args.status });
    const updatedUser = { ...user, status: args.status };

    await enqueueSheetsSyncJob(ctx, {
      scriptUrl: args.scriptUrl,
      entityType: "users",
      entityKey: updatedUser.email,
      operation: "upsert",
      payload: formatUserForSheets(updatedUser),
    });

    return { success: true, user: updatedUser };
  },
});

export const updateProfile = mutation({
  args: {
    email: v.string(),
    name: v.optional(v.string()),
    role: v.optional(v.union(v.literal("ADMIN"), v.literal("USER"), v.literal("TEAM"))),
    note: v.optional(v.string()),
    myPageLink: v.optional(v.string()),
    profileImageUrl: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    customTheme: v.optional(v.string()),
    scriptUrl: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.query("users").withIndex("by_email", q => q.eq("email", args.email)).first();
    if (!user) {
      throw new Error("User not found");
    }

    const patch: Partial<typeof user> = {};
    if (args.name !== undefined) patch.name = args.name;
    if (args.role !== undefined) patch.role = args.role;
    if (args.note !== undefined) patch.note = args.note;
    if (args.myPageLink !== undefined) patch.myPageLink = args.myPageLink;
    if (args.profileImageUrl !== undefined) patch.profileImageUrl = args.profileImageUrl;
    if (args.tags !== undefined) patch.tags = args.tags;
    if (args.customTheme !== undefined) patch.customTheme = args.customTheme;

    await ctx.db.patch(user._id, patch);
    const updatedUser = { ...user, ...patch };

    await enqueueSheetsSyncJob(ctx, {
      scriptUrl: args.scriptUrl,
      entityType: "users",
      entityKey: updatedUser.email,
      operation: "upsert",
      payload: formatUserForSheets(updatedUser),
    });

    return { success: true, user: updatedUser };
  },
});

export const upsertFromSheetSnapshot = mutation({
  args: {
    email: v.string(),
    name: v.string(),
    role: v.union(v.literal("ADMIN"), v.literal("USER"), v.literal("TEAM")),
    status: v.union(v.literal("APPROVED"), v.literal("REJECTED"), v.literal("PENDING")),
    createdDate: v.string(),
    laptopStatus: v.optional(v.string()),
    sessionStart: v.optional(v.string()),
    sessionEnd: v.optional(v.string()),
    totalTime: v.optional(v.number()),
    rfid: v.optional(v.string()),
    myPageLink: v.optional(v.string()),
    profileImageUrl: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    note: v.optional(v.string()),
    customTheme: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.query("users").withIndex("by_email", q => q.eq("email", args.email)).first();
    const snapshot = {
      email: args.email,
      name: args.name,
      role: args.role,
      status: args.status,
      createdDate: args.createdDate,
      laptopStatus: args.laptopStatus ?? "Offline",
      sessionStart: args.sessionStart ?? "",
      sessionEnd: args.sessionEnd ?? "",
      totalTime: args.totalTime ?? 0,
      rfid: args.rfid ?? "",
      myPageLink: args.myPageLink ?? "",
      profileImageUrl: args.profileImageUrl ?? existing?.profileImageUrl ?? "",
      tags: args.tags ?? [],
      note: args.note ?? "",
      customTheme: args.customTheme ?? existing?.customTheme ?? "",
    };

    if (existing) {
      await ctx.db.patch(existing._id, snapshot);
      return { success: true, user: { ...existing, ...snapshot } };
    }

    const userId = await ctx.db.insert("users", snapshot);
    const user = await ctx.db.get(userId);
    return { success: true, user };
  },
});

export const updateProjectProfile = mutation({
  args: {
    email: v.string(),
    profileImageUrl: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.query("users").withIndex("by_email", (q) => q.eq("email", args.email)).first();
    if (!user) {
      throw new Error("User not found");
    }

    await ctx.db.patch(user._id, {
      profileImageUrl: args.profileImageUrl,
    });

    return {
      success: true,
      user: {
        ...user,
        profileImageUrl: args.profileImageUrl,
      },
    };
  },
});

export const resetScreenTime = mutation({
  args: {
    email: v.string(),
    scriptUrl: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();
    if (!user) {
      throw new Error("User not found");
    }

    const updatedUser = {
      ...user,
      totalTime: 0,
      sessionStart: user.laptopStatus === "Online" ? user.sessionStart : "",
      sessionEnd: "",
    };

    await ctx.db.patch(user._id, {
      totalTime: 0,
      sessionStart: updatedUser.sessionStart,
      sessionEnd: updatedUser.sessionEnd,
    });

    await enqueueSheetsSyncJob(ctx, {
      scriptUrl: args.scriptUrl,
      entityType: "users",
      entityKey: updatedUser.email,
      operation: "upsert",
      payload: formatUserForSheets(updatedUser),
    });

    return { success: true };
  },
});

export const resetAllScreenTime = mutation({
  args: {
    scriptUrl: v.string(),
  },
  handler: async (ctx, args) => {
    const allUsers = await ctx.db.query("users").collect();

    for (const user of allUsers) {
      const updatedUser = {
        ...user,
        totalTime: 0,
        sessionStart: user.laptopStatus === "Online" ? user.sessionStart : "",
        sessionEnd: "",
      };

      await ctx.db.patch(user._id, {
        totalTime: 0,
        sessionStart: updatedUser.sessionStart,
        sessionEnd: updatedUser.sessionEnd,
      });

      await enqueueSheetsSyncJob(ctx, {
        scriptUrl: args.scriptUrl,
        entityType: "users",
        entityKey: updatedUser.email,
        operation: "upsert",
        payload: formatUserForSheets(updatedUser),
      });
    }

    return { success: true, count: allUsers.length };
  },
});

export const updateStripeCustomizations = mutation({
  args: {
    email: v.string(),
    stripes: v.array(v.object({
      planId: v.string(),
      char: v.string(),
      color: v.optional(v.string()),
    })),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.query("users").withIndex("by_email", q => q.eq("email", args.email)).first();
    if (!user) throw new Error("User not found");

    await ctx.db.patch(user._id, {
      stripeCustomizations: args.stripes,
    });
    return { success: true };
  },
});

