import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { enqueueSheetsSyncJob } from "./sheetsSync";

export function isDateTimeExpired(dateStr?: string, timeStr?: string): boolean {
  if (!dateStr || !dateStr.trim()) return false;
  
  const trimmedDate = dateStr.trim();
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  if (trimmedDate < todayStr) return true;
  if (trimmedDate > todayStr) return false;

  // If date is today, check time if provided
  if (!timeStr || !timeStr.trim()) return false;

  const trimmedTime = timeStr.trim();
  const nowHours = today.getHours();
  const nowMinutes = today.getMinutes();

  // Try parsing 24-hr time like "14:30"
  const match24 = trimmedTime.match(/^(\d{1,2}):(\d{2})$/);
  if (match24) {
    const targetHours = parseInt(match24[1], 10);
    const targetMinutes = parseInt(match24[2], 10);
    if (nowHours > targetHours) return true;
    if (nowHours === targetHours && nowMinutes >= targetMinutes) return true;
    return false;
  }

  // Try parsing 12-hr time like "02:30 PM"
  const match12 = trimmedTime.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (match12) {
    let targetHours = parseInt(match12[1], 10);
    const targetMinutes = parseInt(match12[2], 10);
    const ampm = match12[3].toUpperCase();
    if (ampm === "PM" && targetHours < 12) targetHours += 12;
    if (ampm === "AM" && targetHours === 12) targetHours = 0;

    if (nowHours > targetHours) return true;
    if (nowHours === targetHours && nowMinutes >= targetMinutes) return true;
    return false;
  }

  return false;
}

export const createPlan = mutation({
  args: {
    planId: v.string(),
    title: v.string(),
    description: v.string(),
    date: v.optional(v.string()),
    time: v.optional(v.string()),
    location: v.optional(v.string()),
    maxParticipants: v.optional(v.number()),
    tags: v.array(v.string()),
    imageUrls: v.array(v.string()),
    videoUrls: v.array(v.string()),
    documentationUrl: v.optional(v.string()),
    authorEmail: v.string(),
    authorName: v.string(),
    collaboratorEmails: v.array(v.string()),
    status: v.union(v.literal("DRAFT"), v.literal("PUBLISHED"), v.literal("COMPLETED")),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const isExpired = isDateTimeExpired(args.date, args.time);
    let finalStatus = args.status;
    let completedEditionsCount = 0;

    if (args.status === "PUBLISHED" && isExpired) {
      finalStatus = "COMPLETED";
      completedEditionsCount = 1;
    } else if (args.status === "COMPLETED") {
      completedEditionsCount = 1;
    }

    return await ctx.db.insert("learningPlans", {
      ...args,
      maxParticipants: args.maxParticipants || 20,
      edition: 1,
      completedEditionsCount,
      registeredUsers: [],
      pastEditions: [],
      status: finalStatus,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updatePlan = mutation({
  args: {
    id: v.id("learningPlans"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    date: v.optional(v.string()),
    time: v.optional(v.string()),
    location: v.optional(v.string()),
    maxParticipants: v.optional(v.number()),
    tags: v.optional(v.array(v.string())),
    imageUrls: v.optional(v.array(v.string())),
    videoUrls: v.optional(v.array(v.string())),
    documentationUrl: v.optional(v.string()),
    collaboratorEmails: v.optional(v.array(v.string())),
    status: v.union(v.literal("DRAFT"), v.literal("PUBLISHED"), v.literal("COMPLETED")),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    const now = Date.now();
    const existing = await ctx.db.get(id);
    if (!existing) throw new Error("Plan not found");

    const effectiveDate = updates.date ?? existing.date;
    const effectiveTime = updates.time ?? existing.time;
    const isExpired = isDateTimeExpired(effectiveDate, effectiveTime);

    let patchObj: any = {
      ...updates,
      updatedAt: now,
    };

    if (updates.maxParticipants !== undefined) {
      patchObj.maxParticipants = updates.maxParticipants;
    }

    // Check if plan was completed or expired and is now updated with a NEW upcoming (non-expired) date
    const wasCompleted = existing.status === "COMPLETED" || (existing.status === "PUBLISHED" && isDateTimeExpired(existing.date, existing.time));
    const isNewDateUpcoming = !isExpired && updates.date && updates.date !== existing.date;

    if (wasCompleted && isNewDateUpcoming) {
      // Create new Edition (e.g., Edition 2)
      const currentEdition = existing.edition || 1;
      const pastEditions = existing.pastEditions || [];

      // Archive current registeredUsers into pastEditions
      const archivedEdition = {
        editionNumber: currentEdition,
        date: existing.date,
        time: existing.time,
        location: existing.location,
        registeredUsers: existing.registeredUsers || [],
        completedAt: now,
      };

      patchObj.edition = currentEdition + 1;
      patchObj.completedEditionsCount = Math.max(existing.completedEditionsCount || 0, currentEdition);
      patchObj.pastEditions = [...pastEditions, archivedEdition];
      patchObj.registeredUsers = []; // Fresh registration list for new edition
      patchObj.status = "PUBLISHED";
    } else if (updates.status === "PUBLISHED" && isExpired) {
      patchObj.status = "COMPLETED";
      patchObj.completedEditionsCount = Math.max(existing.completedEditionsCount || 0, existing.edition || 1);
    } else if (updates.status === "COMPLETED") {
      patchObj.completedEditionsCount = Math.max(existing.completedEditionsCount || 0, existing.edition || 1);
    }

    await ctx.db.patch(id, patchObj);
  },
});

export const deletePlan = mutation({
  args: { id: v.id("learningPlans") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

export const getMyPlans = query({
  args: {
    userEmail: v.string(),
  },
  handler: async (ctx, args) => {
    const allPlans = await ctx.db.query("learningPlans").collect();
    
    // Filter to plans where the user is the author or a collaborator
    const myPlans = allPlans.filter(
      (plan) =>
        plan.authorEmail === args.userEmail ||
        (plan.collaboratorEmails && plan.collaboratorEmails.includes(args.userEmail))
    );
    
    // Sort by updatedAt descending
    return myPlans.sort((a, b) => b.updatedAt - a.updatedAt);
  },
});

export const getPublishedPlans = query({
  args: {},
  handler: async (ctx) => {
    const publishedPlans = await ctx.db
      .query("learningPlans")
      .withIndex("by_status", (q) => q.eq("status", "PUBLISHED"))
      .collect();
    const completedPlans = await ctx.db
      .query("learningPlans")
      .withIndex("by_status", (q) => q.eq("status", "COMPLETED"))
      .collect();
      
    const combined = [...publishedPlans, ...completedPlans];
    // Sort by createdAt descending
    return combined.sort((a, b) => b.createdAt - a.createdAt);
  },
});

export const registerForPlan = mutation({
  args: {
    planId: v.id("learningPlans"),
    name: v.string(),
    email: v.string(),
  },
  handler: async (ctx, args) => {
    const plan = await ctx.db.get(args.planId);
    if (!plan) throw new Error("Plan not found");

    const isExpired = isDateTimeExpired(plan.date, plan.time);
    if (plan.status === "COMPLETED" || isExpired) {
      return { success: false, message: "Registration is closed for completed sessions" };
    }

    const currentUsers = plan.registeredUsers || [];
    
    // Check if user is already registered
    if (currentUsers.some(u => u.email.toLowerCase() === args.email.toLowerCase())) {
      return { success: false, message: "Already registered" };
    }

    const newUser = {
      name: args.name,
      email: args.email,
      registeredAt: Date.now(),
      attended: false,
    };
    const updatedUsers = [...currentUsers, newUser];
    await ctx.db.patch(args.planId, {
      registeredUsers: updatedUsers,
      updatedAt: Date.now(),
    });

    const maxCap = plan.maxParticipants || 20;
    const position = updatedUsers.length;
    const isStandby = position > maxCap;

    return {
      success: true,
      message: isStandby
        ? `Registered for Standby List (Spot #${position}, Capacity: ${maxCap})`
        : `Successfully registered! (Spot #${position} of ${maxCap} Confirmed)`,
    };
  },
});

export const postponeRegistration = mutation({
  args: {
    planId: v.id("learningPlans"),
    userEmail: v.string(),
  },
  handler: async (ctx, args) => {
    const plan = await ctx.db.get(args.planId);
    if (!plan) throw new Error("Plan not found");

    const currentUsers = plan.registeredUsers || [];
    const userIndex = currentUsers.findIndex(u => u.email.toLowerCase() === args.userEmail.toLowerCase());
    
    if (userIndex === -1) {
      return { success: false, message: "User is not registered for this session" };
    }

    const targetUser = currentUsers[userIndex];
    // Remove from current position and append to the end of registeredUsers list
    const remainingUsers = currentUsers.filter((_, idx) => idx !== userIndex);
    const updatedUsers = [
      ...remainingUsers,
      { ...targetUser, registeredAt: Date.now() },
    ];

    await ctx.db.patch(args.planId, {
      registeredUsers: updatedUsers,
      updatedAt: Date.now(),
    });

    return { success: true, message: "Session registration postponed. You have been moved to the end of the list." };
  },
});

export const withdrawRegistration = mutation({
  args: {
    planId: v.id("learningPlans"),
    userEmail: v.string(),
  },
  handler: async (ctx, args) => {
    const plan = await ctx.db.get(args.planId);
    if (!plan) throw new Error("Plan not found");

    const currentUsers = plan.registeredUsers || [];
    const updatedUsers = currentUsers.filter(u => u.email.toLowerCase() !== args.userEmail.toLowerCase());

    await ctx.db.patch(args.planId, {
      registeredUsers: updatedUsers,
      updatedAt: Date.now(),
    });

    return { success: true, message: "Withdrawn from session successfully" };
  },
});

export const removeParticipant = mutation({
  args: {
    planId: v.id("learningPlans"),
    userEmail: v.string(),
  },
  handler: async (ctx, args) => {
    const plan = await ctx.db.get(args.planId);
    if (!plan) throw new Error("Plan not found");

    const currentUsers = plan.registeredUsers || [];
    const updatedUsers = currentUsers.filter(u => u.email.toLowerCase() !== args.userEmail.toLowerCase());

    await ctx.db.patch(args.planId, {
      registeredUsers: updatedUsers,
      updatedAt: Date.now(),
    });

    return { success: true, message: "Participant removed successfully" };
  },
});

export const toggleAttendance = mutation({
  args: {
    planId: v.id("learningPlans"),
    userEmail: v.string(),
    attended: v.boolean(),
  },
  handler: async (ctx, args) => {
    const plan = await ctx.db.get(args.planId);
    if (!plan) throw new Error("Plan not found");

    const currentUsers = plan.registeredUsers || [];
    const updatedUsers = currentUsers.map(u => {
      if (u.email.toLowerCase() === args.userEmail.toLowerCase()) {
        return { ...u, attended: args.attended };
      }
      return u;
    });

    await ctx.db.patch(args.planId, {
      registeredUsers: updatedUsers,
      updatedAt: Date.now(),
    });

    return { success: true, message: args.attended ? "Marked as Attended" : "Marked as Absent" };
  },
});

export const setPlanStatus = mutation({
  args: {
    planId: v.id("learningPlans"),
    status: v.union(v.literal("DRAFT"), v.literal("PUBLISHED"), v.literal("COMPLETED")),
  },
  handler: async (ctx, args) => {
    const plan = await ctx.db.get(args.planId);
    if (!plan) throw new Error("Plan not found");

    const isCompleted = args.status === "COMPLETED";
    const completedEditionsCount = isCompleted
      ? Math.max(plan.completedEditionsCount || 0, plan.edition || 1)
      : (plan.completedEditionsCount || 0);

    await ctx.db.patch(args.planId, {
      status: args.status,
      completedEditionsCount,
      updatedAt: Date.now(),
    });

    return { success: true, message: `Plan marked as ${args.status}` };
  },
});

export const getMyAttendedLearnings = query({
  args: {
    userEmail: v.string(),
  },
  handler: async (ctx, args) => {
    if (!args.userEmail) return [];
    const allPlans = await ctx.db.query("learningPlans").collect();

    // Return plans where user attendance was marked as true
    const myAttended = allPlans.filter((plan) => {
      const registeredUsers = plan.registeredUsers || [];
      return registeredUsers.some(
        (u) => u.email.toLowerCase() === args.userEmail.toLowerCase() && u.attended === true
      );
    });

    return myAttended.sort((a, b) => b.updatedAt - a.updatedAt);
  },
});

export const getMyRegisteredLearnings = query({
  args: {
    userEmail: v.string(),
  },
  handler: async (ctx, args) => {
    if (!args.userEmail) return [];
    const allPlans = await ctx.db.query("learningPlans").collect();

    // Return plans where user is currently registered (or attended)
    const myRegistered = allPlans.filter((plan) => {
      const registeredUsers = plan.registeredUsers || [];
      return registeredUsers.some(
        (u) => u.email.toLowerCase() === args.userEmail.toLowerCase()
      );
    });

    return myRegistered.sort((a, b) => b.updatedAt - a.updatedAt);
  },
});

export const submitLearningProof = mutation({
  args: {
    planId: v.id("learningPlans"),
    userEmail: v.string(),
    submissionUrl: v.string(),
  },
  handler: async (ctx, args) => {
    const plan = await ctx.db.get(args.planId);
    if (!plan) throw new Error("Plan not found");

    const currentUsers = plan.registeredUsers || [];
    const updatedUsers = currentUsers.map(u => {
      if (u.email.toLowerCase() === args.userEmail.toLowerCase()) {
        return {
          ...u,
          submissionUrl: args.submissionUrl.trim(),
          submissionStatus: "PENDING" as const,
          submittedAt: Date.now(),
        };
      }
      return u;
    });

    await ctx.db.patch(args.planId, {
      registeredUsers: updatedUsers,
      updatedAt: Date.now(),
    });

    return { success: true, message: "Project link submitted for review!" };
  },
});

export const reviewLearningSubmission = mutation({
  args: {
    planId: v.id("learningPlans"),
    userEmail: v.string(),
    status: v.union(v.literal("APPROVED"), v.literal("REJECTED")),
    feedbackNote: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const plan = await ctx.db.get(args.planId);
    if (!plan) throw new Error("Plan not found");

    const currentUsers = plan.registeredUsers || [];
    const updatedUsers = currentUsers.map(u => {
      if (u.email.toLowerCase() === args.userEmail.toLowerCase()) {
        return {
          ...u,
          submissionStatus: args.status,
          feedbackNote: args.feedbackNote || "",
        };
      }
      return u;
    });

    await ctx.db.patch(args.planId, {
      registeredUsers: updatedUsers,
      updatedAt: Date.now(),
    });

    return {
      success: true,
      message: args.status === "APPROVED" ? "Completion approved! 👍" : "Follow-up requested from student ❌",
    };
  },
});

function formatUserForSheets(user: any) {
  return {
    email: user.email,
    name: user.name,
    role: user.role,
    status: user.status,
    createdDate: user.createdDate,
    laptopStatus: user.laptopStatus || 'Offline',
    sessionStart: user.sessionStart ?? "",
    sessionEnd: user.sessionEnd ?? "",
    totalTime: user.totalTime || 0,
    rfid: user.rfid ?? "",
    myPageLink: user.myPageLink ?? "",
    profileImageUrl: user.profileImageUrl ?? "",
    tags: user.tags || [],
    note: user.note ?? "",
    customTheme: user.customTheme ?? "",
  };
}

export const completeSessionWithTags = mutation({
  args: {
    planId: v.id("learningPlans"),
    awardTag: v.string(),
    scriptUrl: v.string(),
  },
  handler: async (ctx, args) => {
    const plan = await ctx.db.get(args.planId);
    if (!plan) throw new Error("Plan not found");

    const tagToAward = args.awardTag.trim();
    if (!tagToAward) throw new Error("Tag to award cannot be empty");

    const registeredUsers = plan.registeredUsers || [];
    const eligibleEmails = new Set<string>();
    if (plan.authorEmail) eligibleEmails.add(plan.authorEmail.toLowerCase());

    registeredUsers.forEach((u) => {
      if (u.attended && u.submissionStatus === "APPROVED") {
        eligibleEmails.add(u.email.toLowerCase());
      }
    });

    let awardedCount = 0;
    for (const email of Array.from(eligibleEmails)) {
      const user = await ctx.db
        .query("users")
        .withIndex("by_email", (q) => q.eq("email", email))
        .first();

      if (user) {
        const currentTags = user.tags || [];
        if (!currentTags.some(t => t.toLowerCase() === tagToAward.toLowerCase())) {
          const newTags = [...currentTags, tagToAward];
          await ctx.db.patch(user._id, {
            tags: newTags,
          });

          await enqueueSheetsSyncJob(ctx, {
            scriptUrl: args.scriptUrl,
            entityType: "users",
            entityKey: user.email,
            operation: "upsert",
            payload: formatUserForSheets({
              ...user,
              tags: newTags,
            }),
          });
          awardedCount++;
        }
      }
    }

    const currentEdition = plan.edition || 1;
    const completedEditionsCount = Math.max(plan.completedEditionsCount || 0, currentEdition);

    await ctx.db.patch(args.planId, {
      status: "COMPLETED",
      completedEditionsCount,
      awardedTag: tagToAward,
      updatedAt: Date.now(),
    });

    return {
      success: true,
      message: `Session completed! Mastery tag "${tagToAward}" awarded to ${awardedCount} member(s)! 🎉`,
      awardedCount,
    };
  },
});


