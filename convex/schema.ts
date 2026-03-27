import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  inventory: defineTable({
    itemId: v.string(),
    name: v.string(),
    quantity: v.number(),
    category: v.string(),
    company: v.string(),
    imageUrl: v.string(),
    remarks: v.string(),
    links: v.string(),
    tags: v.array(v.string()),
  }).index("by_itemId", ["itemId"]),
  
  users: defineTable({
    email: v.string(),
    name: v.string(),
    role: v.string(),
    status: v.string(),
    createdDate: v.string(),
    laptopStatus: v.string(),
    sessionStart: v.optional(v.string()),
    sessionEnd: v.optional(v.string()),
    totalTime: v.number(),
    rfid: v.optional(v.string()),
    myPageLink: v.optional(v.string()),
    tags: v.array(v.string()),
    note: v.optional(v.string()),
  }).index("by_email", ["email"]),
  
  requests: defineTable({
    date: v.string(),
    userEmail: v.string(),
    userName: v.string(),
    itemId: v.string(),
    itemName: v.string(),
    quantity: v.number(),
    status: v.string(),
    actionBy: v.string(),
    returnStatus: v.string(),
    returnTarget: v.string(),
    returnReceiver: v.string(),
    returnRemarks: v.optional(v.string()),
  }).index("by_date", ["date"]),
  
  home: defineTable({
    docId: v.string(),
    title: v.string(),
    description: v.string(),
    type: v.string(),
    content: v.string(),
    order: v.number(),
    visibility: v.boolean(),
    targetAudience: v.string(),
  }).index("by_docId", ["docId"]),

  fabAcademy: defineTable({
    entryId: v.string(),
    studentName: v.string(),
    imageUrl: v.string(),
    fabYear: v.string(),
    videoUrl: v.string(),
    documentationUrl: v.string(),
    remarks: v.string(),
  }).index("by_entryId", ["entryId"]),
  
  settings: defineTable({
    adminSettingsTitle: v.string(),
    homeDescription: v.optional(v.string()),
    allowTeamInventory: v.boolean(),
    theme: v.optional(v.string()),
  }).index("by_adminSettingsTitle", ["adminSettingsTitle"]),

  sheetsSyncJobs: defineTable({
    scriptUrl: v.string(),
    entityType: v.union(
      v.literal("users"),
      v.literal("requests"),
      v.literal("inventory"),
      v.literal("home"),
      v.literal("fabAcademy"),
      v.literal("settings"),
    ),
    entityKey: v.string(),
    operation: v.union(v.literal("upsert"), v.literal("delete")),
    payload: v.any(),
    status: v.union(v.literal("pending"), v.literal("processing"), v.literal("failed")),
    attemptCount: v.number(),
    lastError: v.optional(v.string()),
    nextAttemptAt: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_status_and_nextAttemptAt", ["status", "nextAttemptAt"])
    .index("by_entityType_and_entityKey", ["entityType", "entityKey"]),
});
