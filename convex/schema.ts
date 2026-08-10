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
  })
    .index("by_itemId", ["itemId"])
    .index("by_category", ["category"])
    .searchIndex("search_name", { searchField: "name" }),
  
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
    profileImageUrl: v.optional(v.string()),
    tags: v.array(v.string()),
    note: v.optional(v.string()),
    customTheme: v.optional(v.string()),
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

  aspects: defineTable({
    entryId: v.string(),
    aspect: v.string(),
    writeUp: v.string(),
    shortNote: v.string(),
    images: v.array(v.string()),
  }).index("by_entryId", ["entryId"]),

  fabAcademy: defineTable({
    entryId: v.string(),
    studentName: v.string(),
    imageUrl: v.string(),
    fabYear: v.string(),
    videoUrl: v.string(),
    documentationUrl: v.string(),
    remarks: v.string(),
  }).index("by_entryId", ["entryId"]),
  
  fabInterns: defineTable({
    entryId: v.string(),
    studentName: v.string(),
    imageUrl: v.string(),
    internshipYear: v.string(),
    videoUrl: v.string(),
    documentationUrl: v.string(),
    remarks: v.string(),
  }).index("by_entryId", ["entryId"]),
  
  machines: defineTable({
    machineId: v.string(),
    name: v.string(),
    status: v.string(),
    currentUser: v.optional(v.string()),
    lastUsed: v.optional(v.string()),
    lastNote: v.optional(v.string()),
    waitingList: v.optional(v.array(v.object({
        userEmail: v.string(),
        userName: v.string(),
        note: v.string(),
        timestamp: v.number(),
    }))),
    currentTurnEmail: v.optional(v.string()),
    currentTurnName: v.optional(v.string()),
  }).index("by_machineId", ["machineId"]),
  
  machineLogs: defineTable({
    machineId: v.string(),
    userName: v.string(),
    userEmail: v.string(),
    startTime: v.string(),
    endTime: v.optional(v.string()),
    note: v.optional(v.string()),
    command: v.optional(v.string()), // "ON", "OFF"
  }).index("by_machineId", ["machineId"])
    .index("by_machineId_and_startTime", ["machineId", "startTime"]),
  
  settings: defineTable({
    adminSettingsTitle: v.string(),
    homeDescription: v.optional(v.string()),
    allowTeamInventory: v.boolean(),
    allowPublicProjectAccess: v.boolean(),
    theme: v.optional(v.string()),
  }).index("by_adminSettingsTitle", ["adminSettingsTitle"]),

  dashboardUpdates: defineTable({
    entryId: v.string(),
    title: v.string(),
    body: v.string(),
    kind: v.union(v.literal("announcement"), v.literal("update")),
    audience: v.union(v.literal("all"), v.literal("user"), v.literal("team")),
    targetUserEmail: v.optional(v.string()),
    relatedRequestId: v.optional(v.string()),
    images: v.optional(v.array(v.string())),
    videos: v.optional(v.array(v.string())),
    links: v.optional(v.array(v.object({
      label: v.string(),
      url: v.string(),
    }))),
    reminderDetails: v.optional(v.object({
      itemId: v.string(),
      itemName: v.string(),
      itemImageUrl: v.string(),
      quantity: v.number(),
      issuedAt: v.string(),
      issuedBy: v.string(),
      userEmail: v.string(),
      userName: v.string(),
    })),
    pinned: v.boolean(),
    published: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_entryId", ["entryId"])
    .index("by_relatedRequestId", ["relatedRequestId"])
    .index("by_updatedAt", ["updatedAt"])
    .index("by_published_and_updatedAt", ["published", "updatedAt"]),

  projects: defineTable({
    projectId: v.string(),
    name: v.string(),
    status: v.union(
      v.literal("DRAFT"),
      v.literal("SETUP_PENDING"),
      v.literal("SETUP_APPROVED"),
      v.literal("BOX_PENDING"),
      v.literal("BOX_APPROVED"),
      v.literal("PLAN_PENDING"),
      v.literal("ACTIVE"),
      v.literal("COMPLETED"),
      v.literal("ARCHIVED"),
    ),
    createdBy: v.string(),
    createdAt: v.string(),
    updatedAt: v.string(),
    lastActivityAt: v.optional(v.string()),
    teamImageUrl: v.optional(v.string()),
    boxImageUrl: v.optional(v.string()),
    boxSubmittedAt: v.optional(v.string()),
    boxApprovedAt: v.optional(v.string()),
    boxApprovedBy: v.optional(v.string()),
    boxRejectionNote: v.optional(v.string()),
    // Setup stage fields
    setupSubmittedAt: v.optional(v.string()),
    setupApprovedAt: v.optional(v.string()),
    setupApprovedBy: v.optional(v.string()),
    setupRejectionNote: v.optional(v.string()),
    sketchImages: v.array(v.string()),
    completedBehavior: v.string(),
    materialsRequired: v.string(),
    initialPlans: v.string(),
    firstSteps: v.string(),
    planSubmittedAt: v.optional(v.string()),
    planApprovedAt: v.optional(v.string()),
    planApprovedBy: v.optional(v.string()),
    planRejectionNote: v.optional(v.string()),
    // Dynamic planning fields (replaces/extends the 5 hardcoded fields above)
    planningFields: v.optional(v.array(v.object({
      fieldId: v.string(),
      label: v.string(),
      fieldType: v.string(),
      required: v.boolean(),
      position: v.number(),
    }))),
    planningResponses: v.optional(v.array(v.object({
      fieldId: v.string(),
      label: v.string(),
      fieldType: v.string(),
      singleValue: v.optional(v.string()),
      multiValues: v.optional(v.array(v.string())),
    }))),
    questionConfig: v.optional(v.object({
      boxTitle: v.string(),
      boxDescription: v.string(),
      sketchPrompt: v.string(),
      sketchHelp: v.string(),
      completedBehaviorPrompt: v.string(),
      materialsRequiredPrompt: v.string(),
      initialPlansPrompt: v.string(),
      firstStepsPrompt: v.string(),
    })),
  })
    .index("by_projectId", ["projectId"])
    .index("by_updatedAt", ["updatedAt"]),

  projectMembers: defineTable({
    projectId: v.string(),
    userEmail: v.string(),
    userName: v.string(),
    userRole: v.string(),
    projectNote: v.string(),
    profileImageUrl: v.optional(v.string()),
    joinedAt: v.string(),
    order: v.number(),
  })
    .index("by_projectId_and_userEmail", ["projectId", "userEmail"])
    .index("by_projectId_and_order", ["projectId", "order"])
    .index("by_userEmail", ["userEmail"]),

  // Per-question admin comments on plan submissions
  projectPlanComments: defineTable({
    projectId: v.string(),
    questionKey: v.string(),    // e.g. "completedBehavior", "materialsRequired", …
    authorEmail: v.string(),
    authorName: v.string(),
    comment: v.string(),
    createdAt: v.string(),
  })
    .index("by_projectId", ["projectId"])
    .index("by_projectId_and_question", ["projectId", "questionKey"]),

  projectItems: defineTable({
    projectId: v.string(),
    requestId: v.string(),
    userEmail: v.string(),
    itemId: v.string(),
    itemName: v.string(),
    quantity: v.number(),
    taggedAt: v.string(),
    taggedBy: v.string(),
  })
    .index("by_projectId", ["projectId"])
    .index("by_requestId", ["requestId"])
    .index("by_taggedAt", ["taggedAt"]),

  projectTimelineEntries: defineTable({
    entryId: v.string(),
    projectId: v.string(),
    kind: v.union(v.literal("comment"), v.literal("note"), v.literal("question")),
    authorEmail: v.string(),
    authorName: v.string(),
    authorRole: v.string(),
    body: v.string(),
    images: v.array(v.string()),
    videos: v.array(v.string()),
    links: v.array(v.object({
      label: v.string(),
      url: v.string(),
    })),
    createdAt: v.string(),
    updatedAt: v.string(),
  })
    .index("by_entryId", ["entryId"])
    .index("by_projectId_and_createdAt", ["projectId", "createdAt"]),

  projectCheckpointForms: defineTable({
    checkpointId: v.string(),
    projectId: v.string(),
    title: v.string(),
    description: v.string(),
    createdByEmail: v.string(),
    createdByName: v.string(),
    createdByRole: v.string(),
    allowMemberResponses: v.boolean(),
    status: v.union(v.literal("OPEN"), v.literal("COMPLETED")),
    createdAt: v.string(),
    updatedAt: v.string(),
  })
    .index("by_checkpointId", ["checkpointId"])
    .index("by_projectId_and_createdAt", ["projectId", "createdAt"]),

  projectCheckpointFields: defineTable({
    checkpointId: v.string(),
    fieldId: v.string(),
    label: v.string(),
    fieldType: v.union(
      v.literal("short_text"),
      v.literal("long_text"),
      v.literal("number"),
      v.literal("date"),
      v.literal("link"),
      v.literal("image_links"),
      v.literal("video_links"),
      v.literal("labeled_links"),
    ),
    required: v.boolean(),
    position: v.number(),
  })
    .index("by_checkpointId_and_position", ["checkpointId", "position"])
    .index("by_fieldId", ["fieldId"]),

  projectCheckpointResponses: defineTable({
    responseId: v.string(),
    checkpointId: v.string(),
    projectId: v.string(),
    submittedByEmail: v.string(),
    submittedByName: v.string(),
    submittedByRole: v.string(),
    values: v.array(v.object({
      fieldId: v.string(),
      label: v.string(),
      fieldType: v.string(),
      singleValue: v.optional(v.string()),
      multiValues: v.optional(v.array(v.string())),
    })),
    createdAt: v.string(),
    updatedAt: v.string(),
  })
    .index("by_checkpointId_and_submittedByEmail", ["checkpointId", "submittedByEmail"])
    .index("by_checkpointId_and_updatedAt", ["checkpointId", "updatedAt"])
    .index("by_projectId_and_updatedAt", ["projectId", "updatedAt"]),

  projectLikes: defineTable({
    projectId: v.string(),
    userEmail: v.string(),
    userName: v.string(),
    createdAt: v.string(),
  })
    .index("by_projectId", ["projectId"])
    .index("by_projectId_and_userEmail", ["projectId", "userEmail"]),

  projectEntryReactions: defineTable({
    entryId: v.string(),
    projectId: v.string(),
    userEmail: v.string(),
    userName: v.string(),
    emoji: v.string(),
    createdAt: v.string(),
  })
    .index("by_projectId", ["projectId"])
    .index("by_entryId", ["entryId"])
    .index("by_entryId_and_userEmail_and_emoji", ["entryId", "userEmail", "emoji"]),

  sheetsSyncJobs: defineTable({
    scriptUrl: v.string(),
    entityType: v.union(
      v.literal("users"),
      v.literal("requests"),
      v.literal("inventory"),
      v.literal("home"),
      v.literal("fabAcademy"),
      v.literal("fabInterns"),
      v.literal("settings"),
      v.literal("machines"),
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

  learningPlans: defineTable({
    planId: v.string(),
    title: v.string(),
    description: v.string(),
    date: v.optional(v.string()),
    time: v.optional(v.string()),
    location: v.optional(v.string()),
    tags: v.array(v.string()),
    imageUrls: v.array(v.string()),
    videoUrls: v.array(v.string()),
    documentationUrl: v.optional(v.string()),
    authorEmail: v.string(),
    authorName: v.string(),
    collaboratorEmails: v.array(v.string()),
    registeredUsers: v.optional(v.array(v.object({
      name: v.string(),
      email: v.string()
    }))),
    status: v.union(v.literal("DRAFT"), v.literal("PUBLISHED")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_planId", ["planId"])
    .index("by_status", ["status"])
    .index("by_authorEmail", ["authorEmail"]),

  projectHistory: defineTable({
    historyId: v.string(),
    projectId: v.string(),
    action: v.string(),
    actorEmail: v.string(),
    actorName: v.string(),
    details: v.optional(v.string()),
    createdAt: v.string(),
  })
    .index("by_projectId_and_createdAt", ["projectId", "createdAt"])
    .index("by_historyId", ["historyId"]),
});
