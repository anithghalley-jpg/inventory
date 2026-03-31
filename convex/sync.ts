import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

export const syncTable = internalMutation({
  args: {
    table: v.string(),
    data: v.any(), // Array of records
  },
  handler: async (ctx, args) => {
    const { table, data } = args;
    
    // We handle bulk sync by clearing the existing table and re-inserting, 
    // or by upserting. Since Google Sheets is the source of truth,
    // total replacement works for bulk sync. For row-level, we use a different mutation.

    if (table === "inventory") {
      const existing = await ctx.db.query("inventory").collect();
      for (const doc of existing) {
        await ctx.db.delete(doc._id);
      }
      for (const item of data) {
        await ctx.db.insert("inventory", item);
      }
    } else if (table === "users") {
      const existing = await ctx.db.query("users").collect();
      for (const doc of existing) {
        await ctx.db.delete(doc._id);
      }
      for (const item of data) {
        await ctx.db.insert("users", item);
      }
    } else if (table === "requests") {
      const existing = await ctx.db.query("requests").collect();
      for (const doc of existing) {
        await ctx.db.delete(doc._id);
      }
      for (const item of data) {
        await ctx.db.insert("requests", item);
      }
    } else if (table === "home") {
      const existing = await ctx.db.query("home").collect();
      for (const doc of existing) {
        await ctx.db.delete(doc._id);
      }
      for (const item of data) {
        await ctx.db.insert("home", item);
      }
    } else if (table === "fabAcademy") {
      const existing = await ctx.db.query("fabAcademy").collect();
      for (const doc of existing) {
        await ctx.db.delete(doc._id);
      }
      for (const item of data) {
        await ctx.db.insert("fabAcademy", item);
      }
    } else if (table === "settings") {
      const existing = await ctx.db.query("settings").collect();
      for (const doc of existing) {
        await ctx.db.delete(doc._id);
      }
    } else if (table === "machines") {
      const existing = await ctx.db.query("machines").collect();
      for (const doc of existing) {
        await ctx.db.delete(doc._id);
      }
      for (const item of data) {
        // Sanitize machine data to match schema
        const sanitized = {
          machineId: item.machineId || item.id,
          name: item.name,
          status: item.status || (item.isOnline ? "ENGAGED" : "AVAILABLE"),
          currentUser: item.currentUser,
          lastUsed: item.lastUsed,
          lastNote: item.lastNote,
        };
        await ctx.db.insert("machines", sanitized);
      }
    }
  },
});

export const syncRow = internalMutation({
  args: {
    table: v.string(),
    key: v.string(), // e.g. "itemId" or "email"
    keyValue: v.string(),
    data: v.any(),
  },
  handler: async (ctx, args) => {
    const { table, key, keyValue, data } = args;
    let existing: any = null;
    
    if (table === "inventory") {
      existing = await ctx.db.query("inventory").withIndex("by_itemId", q => q.eq("itemId", keyValue)).first();
      if (existing) await ctx.db.patch(existing._id, data);
      else await ctx.db.insert("inventory", data);
    } else if (table === "users") {
      existing = await ctx.db.query("users").withIndex("by_email", q => q.eq("email", keyValue)).first();
      if (existing) await ctx.db.patch(existing._id, data);
      else await ctx.db.insert("users", data);
    } else if (table === "requests") {
      existing = await ctx.db.query("requests").withIndex("by_date", q => q.eq("date", keyValue)).first();
      if (existing) await ctx.db.patch(existing._id, data);
      else await ctx.db.insert("requests", data);
    } else if (table === "home") {
      existing = await ctx.db.query("home").withIndex("by_docId", q => q.eq("docId", keyValue)).first();
      if (existing) await ctx.db.patch(existing._id, data);
      else await ctx.db.insert("home", data);
    } else if (table === "fabAcademy") {
      existing = await ctx.db.query("fabAcademy").withIndex("by_entryId", q => q.eq("entryId", keyValue)).first();
      if (existing) await ctx.db.patch(existing._id, data);
      else await ctx.db.insert("fabAcademy", data);
    } else if (table === "settings") {
      existing = await ctx.db
        .query("settings")
        .withIndex("by_adminSettingsTitle", q => q.eq("adminSettingsTitle", keyValue))
        .first();
      if (existing) await ctx.db.patch(existing._id, data);
      else await ctx.db.insert("settings", data);
    } else if (table === "machines") {
      // Sanitize machine data to match schema
      const sanitized = {
        machineId: data.machineId || data.id,
        name: data.name,
        status: data.status || (data.isOnline ? "ENGAGED" : "AVAILABLE"),
        currentUser: data.currentUser,
        lastUsed: data.lastUsed,
        lastNote: data.lastNote,
      };
      existing = await ctx.db.query("machines").withIndex("by_machineId", q => q.eq("machineId", keyValue)).first();
      if (existing) await ctx.db.patch(existing._id, sanitized);
      else await ctx.db.insert("machines", sanitized);
    }
  }
});

export const deleteRow = internalMutation({
  args: {
    table: v.string(),
    key: v.string(),
    keyValue: v.string(),
  },
  handler: async (ctx, args) => {
    const { table, key, keyValue } = args;
    let existing: any = null;
    if (table === "inventory") {
      existing = await ctx.db.query("inventory").withIndex("by_itemId", q => q.eq("itemId", keyValue)).first();
    } else if (table === "users") {
      existing = await ctx.db.query("users").withIndex("by_email", q => q.eq("email", keyValue)).first();
    } else if (table === "requests") {
      existing = await ctx.db.query("requests").withIndex("by_date", q => q.eq("date", keyValue)).first();
    } else if (table === "home") {
      existing = await ctx.db.query("home").withIndex("by_docId", q => q.eq("docId", keyValue)).first();
    } else if (table === "fabAcademy") {
      existing = await ctx.db.query("fabAcademy").withIndex("by_entryId", q => q.eq("entryId", keyValue)).first();
    } else if (table === "settings") {
      existing = await ctx.db
        .query("settings")
        .withIndex("by_adminSettingsTitle", q => q.eq("adminSettingsTitle", keyValue))
        .first();
    } else if (table === "machines") {
      existing = await ctx.db.query("machines").withIndex("by_machineId", q => q.eq("machineId", keyValue)).first();
    }
    
    if (existing) {
      await ctx.db.delete(existing._id);
    }
  }
});

export const deleteMissingRows = internalMutation({
  args: {
    table: v.string(),
    key: v.string(),
    validKeys: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const { table, key, validKeys } = args;
    const validSet = new Set(validKeys);
    const seen = new Set<string>();
    
    if (table === "inventory") {
      const existing = await ctx.db.query("inventory").collect();
      for (const doc of existing) {
        const primaryKey = String(doc.itemId || '');
        if (!validSet.has(primaryKey) || seen.has(primaryKey)) {
          await ctx.db.delete(doc._id);
        } else {
          seen.add(primaryKey);
        }
      }
    } else if (table === "users") {
      const existing = await ctx.db.query("users").collect();
      for (const doc of existing) {
        const primaryKey = String(doc.email || '');
        if (!validSet.has(primaryKey) || seen.has(primaryKey)) {
          await ctx.db.delete(doc._id);
        } else {
          seen.add(primaryKey);
        }
      }
    } else if (table === "requests") {
      const existing = await ctx.db.query("requests").collect();
      for (const doc of existing) {
        const primaryKey = String(doc.date || '');
        if (!validSet.has(primaryKey) || seen.has(primaryKey)) {
          await ctx.db.delete(doc._id);
        } else {
          seen.add(primaryKey);
        }
      }
    } else if (table === "home") {
      const existing = await ctx.db.query("home").collect();
      for (const doc of existing) {
        const primaryKey = String(doc.docId || '');
        if (!validSet.has(primaryKey) || seen.has(primaryKey)) {
          await ctx.db.delete(doc._id);
        } else {
          seen.add(primaryKey);
        }
      }
    } else if (table === "fabAcademy") {
      const existing = await ctx.db.query("fabAcademy").collect();
      for (const doc of existing) {
        const primaryKey = String(doc.entryId || '');
        if (!validSet.has(primaryKey) || seen.has(primaryKey)) {
          await ctx.db.delete(doc._id);
        } else {
          seen.add(primaryKey);
        }
      }
    } else if (table === "settings") {
      const existing = await ctx.db.query("settings").collect();
      for (const doc of existing) {
        const primaryKey = String(doc.adminSettingsTitle || '');
        if (!validSet.has(primaryKey) || seen.has(primaryKey)) {
          await ctx.db.delete(doc._id);
        } else {
          seen.add(primaryKey);
        }
      }
    } else if (table === "machines") {
      const existing = await ctx.db.query("machines").collect();
      for (const doc of existing) {
        const primaryKey = String(doc.machineId || '');
        if (!validSet.has(primaryKey) || seen.has(primaryKey)) {
          await ctx.db.delete(doc._id);
        } else {
          seen.add(primaryKey);
        }
      }
    }
  }
});
