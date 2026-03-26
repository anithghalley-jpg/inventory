import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { enqueueSheetsSyncJob } from "./sheetsSync";

const SETTINGS_KEY = "admin";

function formatSettingsForSheets(settings: {
  adminSettingsTitle: string;
  allowTeamInventory: boolean;
  homeDescription?: string;
  theme?: string;
}) {
  return {
    adminSettingsTitle: settings.adminSettingsTitle,
    allowTeamInventory: settings.allowTeamInventory,
    homeDescription: settings.homeDescription ?? "",
    theme: settings.theme ?? "",
  };
}

export const getAdmin = query({
  args: {},
  handler: async (ctx) => {
    const settings = await ctx.db
      .query("settings")
      .withIndex("by_adminSettingsTitle", (q) => q.eq("adminSettingsTitle", SETTINGS_KEY))
      .first();

    return (
      settings ?? {
        adminSettingsTitle: SETTINGS_KEY,
        allowTeamInventory: false,
        homeDescription: "",
        theme: "",
      }
    );
  },
});

export const updateAdmin = mutation({
  args: {
    allowTeamInventory: v.boolean(),
    scriptUrl: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("settings")
      .withIndex("by_adminSettingsTitle", (q) => q.eq("adminSettingsTitle", SETTINGS_KEY))
      .first();

    const settingsDoc = {
      adminSettingsTitle: SETTINGS_KEY,
      allowTeamInventory: args.allowTeamInventory,
      homeDescription: existing?.homeDescription ?? "",
      theme: existing?.theme ?? "",
    };

    if (existing) {
      await ctx.db.patch(existing._id, settingsDoc);
    } else {
      await ctx.db.insert("settings", settingsDoc);
    }

    await enqueueSheetsSyncJob(ctx, {
      scriptUrl: args.scriptUrl,
      entityType: "settings",
      entityKey: SETTINGS_KEY,
      operation: "upsert",
      payload: formatSettingsForSheets(settingsDoc),
    });

    return { success: true, settings: settingsDoc };
  },
});
