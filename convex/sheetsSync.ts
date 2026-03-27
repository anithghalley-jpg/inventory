import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import {
  ActionCtx,
  internalAction,
  internalMutation,
  MutationCtx,
} from "./_generated/server";
import { internal } from "./_generated/api";

type SyncEntityType = "users" | "requests" | "inventory" | "home" | "fabAcademy" | "settings";
type SyncOperation = "upsert" | "delete";

type EnqueueSheetsSyncJobArgs = {
  scriptUrl: string;
  entityType: SyncEntityType;
  entityKey: string;
  operation: SyncOperation;
  payload: unknown;
};

export async function enqueueSheetsSyncJob(
  ctx: MutationCtx,
  args: EnqueueSheetsSyncJobArgs,
) {
  const now = Date.now();
  await ctx.db.insert("sheetsSyncJobs", {
    scriptUrl: args.scriptUrl,
    entityType: args.entityType,
    entityKey: args.entityKey,
    operation: args.operation,
    payload: args.payload,
    status: "pending",
    attemptCount: 0,
    nextAttemptAt: now,
    createdAt: now,
    updatedAt: now,
  });
  await ctx.scheduler.runAfter(0, internal.sheetsSync.processPendingJobs, {});
}

function buildAppsScriptPayload(job: {
  entityType: SyncEntityType;
  operation: SyncOperation;
  payload: any;
}) {
  const actionMap: Record<`${SyncEntityType}:${SyncOperation}`, string> = {
    "users:upsert": "upsertUserRow",
    "users:delete": "deleteUserRow",
    "requests:upsert": "upsertRequestRow",
    "requests:delete": "deleteRequestRow",
    "inventory:upsert": "upsertInventoryRow",
    "inventory:delete": "deleteInventoryRow",
    "home:upsert": "upsertHomeRow",
    "home:delete": "deleteHomeRow",
    "fabAcademy:upsert": "upsertFabAcademyRow",
    "fabAcademy:delete": "deleteFabAcademyRow",
    "settings:upsert": "upsertSettingsRow",
    "settings:delete": "deleteSettingsRow",
  };

  const action = actionMap[`${job.entityType}:${job.operation}`];
  if (!action) {
    throw new Error(`Unsupported Sheets sync operation: ${job.entityType}:${job.operation}`);
  }

  return {
    action,
    ...(typeof job.payload === "object" && job.payload !== null ? job.payload : { payload: job.payload }),
  };
}

function getRetryDelayMs(attemptCount: number) {
  const baseDelayMs = 5_000;
  const maxDelayMs = 5 * 60 * 1000;
  return Math.min(baseDelayMs * 2 ** Math.max(0, attemptCount - 1), maxDelayMs);
}

export const claimNextJob = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const pendingJob = await ctx.db
      .query("sheetsSyncJobs")
      .withIndex("by_status_and_nextAttemptAt", (q) =>
        q.eq("status", "pending").lte("nextAttemptAt", now),
      )
      .first();

    const failedJob =
      pendingJob ??
      (await ctx.db
        .query("sheetsSyncJobs")
        .withIndex("by_status_and_nextAttemptAt", (q) =>
          q.eq("status", "failed").lte("nextAttemptAt", now),
        )
        .first());

    if (!failedJob) {
      return null;
    }

    await ctx.db.patch(failedJob._id, {
      status: "processing",
      attemptCount: failedJob.attemptCount + 1,
      updatedAt: now,
    });

    return {
      _id: failedJob._id,
      scriptUrl: failedJob.scriptUrl,
      entityType: failedJob.entityType,
      entityKey: failedJob.entityKey,
      operation: failedJob.operation,
      payload: failedJob.payload,
      attemptCount: failedJob.attemptCount + 1,
    };
  },
});

export const markJobSucceeded = internalMutation({
  args: { jobId: v.id("sheetsSyncJobs") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.jobId);
  },
});

export const markJobFailed = internalMutation({
  args: {
    jobId: v.id("sheetsSyncJobs"),
    attemptCount: v.number(),
    errorMessage: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    await ctx.db.patch(args.jobId, {
      status: "failed",
      lastError: args.errorMessage,
      nextAttemptAt: now + getRetryDelayMs(args.attemptCount),
      updatedAt: now,
    });
  },
});

async function pushJobToSheets(
  ctx: ActionCtx,
  job: {
    _id: Id<"sheetsSyncJobs">;
    scriptUrl: string;
    entityType: SyncEntityType;
    entityKey: string;
    operation: SyncOperation;
    payload: any;
    attemptCount: number;
  },
) {
  const response = await fetch(job.scriptUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(buildAppsScriptPayload(job)),
  });

  const responseText = await response.text();
  let parsed: any = null;
  try {
    parsed = responseText ? JSON.parse(responseText) : null;
  } catch {
    parsed = null;
  }

  if (!response.ok || (parsed && parsed.success === false)) {
    const message =
      parsed?.message ||
      parsed?.error ||
      responseText ||
      `HTTP ${response.status}`;
    throw new Error(message);
  }
}

export const processPendingJobs = internalAction({
  args: {},
  handler: async (ctx) => {
    for (let index = 0; index < 25; index += 1) {
      const job: {
        _id: Id<"sheetsSyncJobs">;
        scriptUrl: string;
        entityType: SyncEntityType;
        entityKey: string;
        operation: SyncOperation;
        payload: any;
        attemptCount: number;
      } | null = await ctx.runMutation(internal.sheetsSync.claimNextJob, {});

      if (!job) {
        return;
      }

      try {
        await pushJobToSheets(ctx, job);
        await ctx.runMutation(internal.sheetsSync.markJobSucceeded, {
          jobId: job._id,
        });
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown Google Sheets sync error";
        await ctx.runMutation(internal.sheetsSync.markJobFailed, {
          jobId: job._id,
          attemptCount: job.attemptCount,
          errorMessage,
        });
      }
    }
  },
});
