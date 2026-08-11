import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { enqueueSheetsSyncJob } from "./sheetsSync";

export const createPlan = mutation({
  args: {
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
    status: v.union(v.literal("DRAFT"), v.literal("PUBLISHED"), v.literal("COMPLETED")),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("learningPlans", {
      ...args,
      registeredUsers: [],
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
    tags: v.optional(v.array(v.string())),
    imageUrls: v.optional(v.array(v.string())),
    videoUrls: v.optional(v.array(v.string())),
    documentationUrl: v.optional(v.string()),
    collaboratorEmails: v.optional(v.array(v.string())),
    status: v.optional(v.union(v.literal("DRAFT"), v.literal("PUBLISHED"), v.literal("COMPLETED"))),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    const now = Date.now();
    await ctx.db.patch(id, {
      ...updates,
      updatedAt: now,
    });
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
        plan.collaboratorEmails.includes(args.userEmail)
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

    const currentUsers = plan.registeredUsers || [];
    
    // Check if user is already registered
    if (currentUsers.some(u => u.email.toLowerCase() === args.email.toLowerCase())) {
      return { success: false, message: "Already registered" };
    }

    const updatedUsers = [...currentUsers, { name: args.name, email: args.email, attended: false }];
    await ctx.db.patch(args.planId, {
      registeredUsers: updatedUsers,
      updatedAt: Date.now(),
    });

    return { success: true, message: "Successfully registered" };
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

    await ctx.db.patch(args.planId, {
      status: args.status,
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

    await ctx.db.patch(args.planId, {
      status: "COMPLETED",
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

