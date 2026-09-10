import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

const SETTINGS_KEY = "admin";

// Helper: Convert UTC timestamp to GMT+6 YYYY-MM-DD date string
export function getGmtPlus6DateString(timestamp: string | number | Date = new Date()): string {
  const d = new Date(timestamp);
  // Using Asia/Dhaka or Etc/GMT-6 (UTC+6)
  try {
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Dhaka",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    return formatter.format(d); // Outputs YYYY-MM-DD
  } catch {
    // Fallback: manual offset calculation
    const offsetMs = 6 * 60 * 60 * 1000;
    const gmt6Date = new Date(d.getTime() + offsetMs);
    return gmt6Date.toISOString().slice(0, 10);
  }
}

// Helper: Format ISO timestamp to GMT+6 "11:32 AM" / "01:30 PM"
export function formatGmtPlus6Time(timestamp: string): string {
  if (!timestamp) return "";
  const d = new Date(timestamp);
  try {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Dhaka",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }).format(d);
  } catch {
    return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
  }
}

// ── QUERIES ──

export const getAll = query({
  args: {},
  handler: async (ctx) => {
    const devices = await ctx.db.query("devices").collect();
    devices.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" }));
    return devices;
  },
});

export const getSettings = query({
  args: {},
  handler: async (ctx) => {
    const settings = await ctx.db
      .query("settings")
      .withIndex("by_adminSettingsTitle", (q) => q.eq("adminSettingsTitle", SETTINGS_KEY))
      .first();

    return {
      enableDeviceTracking: Boolean(settings?.enableDeviceTracking),
    };
  },
});

export const get30DayMatrix = query({
  args: {},
  handler: async (ctx) => {
    const devices = await ctx.db.query("devices").collect();
    devices.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" }));

    // Generate past 30 days dates in GMT+6 (Day 1 is 29 days ago, Day 30 is Today)
    const now = new Date();
    const dates: Array<{
      date: string; // YYYY-MM-DD
      displayDate: string; // e.g. "10 Sep"
      dayOfWeek: string; // e.g. "Thu"
      dayIndex: number; // 1 to 30
      isToday: boolean;
    }> = [];

    const todayGmt6Str = getGmtPlus6DateString(now);

    for (let i = 29; i >= 0; i--) {
      // Calculate target day
      const targetTime = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = getGmtPlus6DateString(targetTime);
      const dayIndex = 30 - i; // 1 (oldest in 30d window) to 30 (today)

      let displayDate = dateStr;
      let dayOfWeek = "";
      try {
        const dObj = new Date(targetTime);
        displayDate = new Intl.DateTimeFormat("en-US", {
          timeZone: "Asia/Dhaka",
          month: "short",
          day: "numeric",
        }).format(dObj);
        dayOfWeek = new Intl.DateTimeFormat("en-US", {
          timeZone: "Asia/Dhaka",
          weekday: "short",
        }).format(dObj);
      } catch {
        displayDate = dateStr.slice(5);
      }

      dates.push({
        date: dateStr,
        displayDate,
        dayOfWeek,
        dayIndex,
        isToday: dateStr === todayGmt6Str,
      });
    }

    const startDate = dates[0].date;
    const endDate = dates[dates.length - 1].date;

    // Collect all device logs
    const allLogs = await ctx.db.query("deviceLogs").collect();

    // Filter logs within 30-day range or active
    const logsInRange = allLogs.filter((log) => {
      if (!log.date) return false;
      return log.date >= startDate && log.date <= endDate;
    });

    // Formatted logs list with GMT+6 time display
    const formattedLogs = logsInRange.map((log) => {
      const startFormatted = formatGmtPlus6Time(log.startTime);
      const endFormatted = log.endTime ? formatGmtPlus6Time(log.endTime) : "Active";
      const displayString = `${log.userName || log.userEmail.split("@")[0]} (${startFormatted} to ${endFormatted})`;

      return {
        _id: log._id,
        logId: log.logId,
        deviceId: log.deviceId,
        deviceName: log.deviceName,
        userEmail: log.userEmail,
        userName: log.userName,
        startTime: log.startTime,
        endTime: log.endTime,
        durationMinutes: log.durationMinutes,
        date: log.date,
        startFormatted,
        endFormatted,
        displayString,
        isActive: !log.endTime,
      };
    });

    return {
      dates,
      devices,
      logs: formattedLogs,
      todayDate: todayGmt6Str,
    };
  },
});

// ── MUTATIONS ──

export const updateSettings = mutation({
  args: {
    enableDeviceTracking: v.boolean(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("settings")
      .withIndex("by_adminSettingsTitle", (q) => q.eq("adminSettingsTitle", SETTINGS_KEY))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        enableDeviceTracking: args.enableDeviceTracking,
      });
    } else {
      await ctx.db.insert("settings", {
        adminSettingsTitle: SETTINGS_KEY,
        allowTeamInventory: false,
        allowPublicProjectAccess: false,
        enableDeviceTracking: args.enableDeviceTracking,
      });
    }

    return { success: true, enableDeviceTracking: args.enableDeviceTracking };
  },
});

export const registerDevice = mutation({
  args: {
    name: v.string(),
    serialNumber: v.string(),
    macAddress: v.string(),
    brand: v.string(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const trimmedName = args.name.trim();
    if (!trimmedName) throw new Error("Device name is required");

    const existing = await ctx.db
      .query("devices")
      .withIndex("by_name", (q) => q.eq("name", trimmedName))
      .first();

    if (existing) {
      throw new Error(`Device "${trimmedName}" already exists`);
    }

    const now = new Date().toISOString();
    const deviceId = `dev_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

    await ctx.db.insert("devices", {
      deviceId,
      name: trimmedName,
      serialNumber: args.serialNumber.trim() || "-",
      macAddress: args.macAddress.trim() || "-",
      brand: args.brand.trim() || "Generic",
      status: "AVAILABLE",
      notes: args.notes?.trim() || "",
      createdAt: now,
      updatedAt: now,
    });

    return { success: true, deviceId };
  },
});

export const updateDevice = mutation({
  args: {
    deviceId: v.string(),
    name: v.string(),
    serialNumber: v.string(),
    macAddress: v.string(),
    brand: v.string(),
    notes: v.optional(v.string()),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const device = await ctx.db
      .query("devices")
      .withIndex("by_deviceId", (q) => q.eq("deviceId", args.deviceId))
      .first();

    if (!device) throw new Error("Device not found");

    const now = new Date().toISOString();
    await ctx.db.patch(device._id, {
      name: args.name.trim() || device.name,
      serialNumber: args.serialNumber.trim() || device.serialNumber,
      macAddress: args.macAddress.trim() || device.macAddress,
      brand: args.brand.trim() || device.brand,
      notes: args.notes !== undefined ? args.notes.trim() : device.notes,
      status: args.status || device.status,
      updatedAt: now,
    });

    return { success: true };
  },
});

export const deleteDevice = mutation({
  args: {
    deviceId: v.string(),
  },
  handler: async (ctx, args) => {
    const device = await ctx.db
      .query("devices")
      .withIndex("by_deviceId", (q) => q.eq("deviceId", args.deviceId))
      .first();

    if (device) {
      await ctx.db.delete(device._id);
    }

    return { success: true };
  },
});

export const startDeviceSession = mutation({
  args: {
    userEmail: v.string(),
    userName: v.string(),
    deviceId: v.string(),
    deviceName: v.string(),
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();
    const gmt6Date = getGmtPlus6DateString(now);
    const logId = `dlog_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

    // Create active log record
    await ctx.db.insert("deviceLogs", {
      logId,
      deviceId: args.deviceId,
      deviceName: args.deviceName,
      userEmail: args.userEmail,
      userName: args.userName,
      startTime: now,
      date: gmt6Date,
      createdAt: now,
    });

    // Update device state
    const device = await ctx.db
      .query("devices")
      .withIndex("by_deviceId", (q) => q.eq("deviceId", args.deviceId))
      .first();

    if (device) {
      await ctx.db.patch(device._id, {
        status: "IN_USE",
        currentUserEmail: args.userEmail,
        currentUserName: args.userName,
        currentSessionStart: now,
        updatedAt: now,
      });
    }

    // Update user record
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.userEmail))
      .first();

    if (user) {
      await ctx.db.patch(user._id, {
        activeDeviceId: args.deviceId,
        activeDeviceName: args.deviceName,
        activeDeviceLogId: logId,
      });
    }

    return { success: true, logId };
  },
});

export const endDeviceSession = mutation({
  args: {
    userEmail: v.string(),
    logId: v.optional(v.string()),
    deviceId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.userEmail))
      .first();

    const targetLogId = args.logId || user?.activeDeviceLogId;
    const targetDeviceId = args.deviceId || user?.activeDeviceId;

    // Finalize device log
    if (targetLogId) {
      const log = await ctx.db
        .query("deviceLogs")
        .withIndex("by_logId", (q) => q.eq("logId", targetLogId))
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
    } else if (targetDeviceId) {
      // Look up any open log for this device & user
      const openLogs = await ctx.db
        .query("deviceLogs")
        .withIndex("by_deviceId", (q) => q.eq("deviceId", targetDeviceId))
        .collect();

      const userOpenLog = openLogs.find((l) => l.userEmail === args.userEmail && !l.endTime);
      if (userOpenLog) {
        const startMs = new Date(userOpenLog.startTime).getTime();
        const endMs = new Date(now).getTime();
        const durationMinutes = Math.max(1, Math.round((endMs - startMs) / 60000));

        await ctx.db.patch(userOpenLog._id, {
          endTime: now,
          durationMinutes,
        });
      }
    }

    // Reset device state
    if (targetDeviceId) {
      const device = await ctx.db
        .query("devices")
        .withIndex("by_deviceId", (q) => q.eq("deviceId", targetDeviceId))
        .first();

      if (device && device.currentUserEmail === args.userEmail) {
        await ctx.db.patch(device._id, {
          status: "AVAILABLE",
          currentUserEmail: undefined,
          currentUserName: undefined,
          currentSessionStart: undefined,
          updatedAt: now,
        });
      }
    }

    // Reset user active device state
    if (user) {
      await ctx.db.patch(user._id, {
        activeDeviceId: undefined,
        activeDeviceName: undefined,
        activeDeviceLogId: undefined,
      });
    }

    return { success: true };
  },
});
