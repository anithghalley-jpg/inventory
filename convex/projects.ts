import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import { v } from "convex/values";

const MAX_PROJECTS = 200;
const MAX_MEMBERS_PER_PROJECT = 50;
const MAX_ITEMS_PER_PROJECT = 200;
const MAX_TIMELINE_POSTS = 400;
const MAX_CHECKPOINTS = 100;
const MAX_CHECKPOINT_RESPONSES = 500;
const MAX_REACTIONS = 1000;
const MAX_LIKES = 500;

const VISIBLE_PROJECT_STATUSES = new Set([
  "DRAFT",
  "BOX_PENDING",
  "BOX_APPROVED",
  "PLAN_PENDING",
  "ACTIVE",
  "COMPLETED",
]);

const lifecycleStatusValidator = v.union(
  v.literal("COMPLETED"),
  v.literal("ARCHIVED"),
);

const postKindValidator = v.union(
  v.literal("comment"),
  v.literal("note"),
  v.literal("question"),
);

const checkpointFieldTypeValidator = v.union(
  v.literal("short_text"),
  v.literal("long_text"),
  v.literal("number"),
  v.literal("date"),
  v.literal("link"),
  v.literal("image_links"),
  v.literal("video_links"),
  v.literal("labeled_links"),
);

type CheckpointFieldType =
  | "short_text"
  | "long_text"
  | "number"
  | "date"
  | "link"
  | "image_links"
  | "video_links"
  | "labeled_links";

const linkValidator = v.object({
  label: v.string(),
  url: v.string(),
});

const questionConfigValidator = v.object({
  boxTitle: v.string(),
  boxDescription: v.string(),
  sketchPrompt: v.string(),
  sketchHelp: v.string(),
  completedBehaviorPrompt: v.string(),
  materialsRequiredPrompt: v.string(),
  initialPlansPrompt: v.string(),
  firstStepsPrompt: v.string(),
});

const checkpointFieldValidator = v.object({
  label: v.string(),
  fieldType: checkpointFieldTypeValidator,
  required: v.boolean(),
});

const checkpointResponseValueValidator = v.object({
  fieldId: v.string(),
  singleValue: v.optional(v.string()),
  multiValues: v.optional(v.array(v.string())),
});

const DEFAULT_QUESTION_CONFIG = {
  boxTitle: "Find a project box",
  boxDescription:
    "Add an image link of the cardboard or laser-cut box your team will use, then wait for admin approval.",
  sketchPrompt: "Sketch of your possible project.",
  sketchHelp: "Add one or more image links that show the early sketch or concept.",
  completedBehaviorPrompt: "What will it do once completed?",
  materialsRequiredPrompt: "What are the materials required?",
  initialPlansPrompt: "Any initial plans or details.",
  firstStepsPrompt: "What do you think we have to do first?",
};

function sanitizeText(value: string) {
  return value.trim();
}

function sanitizeLinks(links: { label: string; url: string }[] = []) {
  return links
    .map((link) => ({
      label: sanitizeText(link.label),
      url: sanitizeText(link.url),
    }))
    .filter((link) => link.label && link.url);
}

function sanitizeUrlArray(values: string[] = []) {
  return values.map((value) => sanitizeText(value)).filter(Boolean);
}

async function getUserByEmail(ctx: QueryCtx | MutationCtx, email: string) {
  return await ctx.db.query("users").withIndex("by_email", (q) => q.eq("email", email)).first();
}

async function getProjectByProjectId(ctx: QueryCtx | MutationCtx, projectId: string) {
  return await ctx.db
    .query("projects")
    .withIndex("by_projectId", (q) => q.eq("projectId", projectId))
    .first();
}

async function getProjectMembers(ctx: QueryCtx | MutationCtx, projectId: string) {
  const members = await ctx.db
    .query("projectMembers")
    .withIndex("by_projectId_and_order", (q) => q.eq("projectId", projectId))
    .take(MAX_MEMBERS_PER_PROJECT);

  return await Promise.all(
    members.map(async (member) => {
      const user = await getUserByEmail(ctx, member.userEmail);
      return {
        ...member,
        profileImageUrl: user?.profileImageUrl ?? "",
      };
    }),
  );
}

async function getProjectItems(ctx: QueryCtx | MutationCtx, projectId: string) {
  return await ctx.db
    .query("projectItems")
    .withIndex("by_projectId", (q) => q.eq("projectId", projectId))
    .take(MAX_ITEMS_PER_PROJECT);
}

async function assertAdmin(ctx: QueryCtx | MutationCtx, actorEmail: string) {
  const actor = await getUserByEmail(ctx, actorEmail);
  if (!actor || actor.role !== "ADMIN") {
    throw new Error("Admin access required");
  }
  return actor;
}

async function assertApprovedViewer(ctx: QueryCtx | MutationCtx, userEmail: string) {
  const user = await getUserByEmail(ctx, userEmail);
  if (!user || user.status !== "APPROVED") {
    throw new Error("Approved user access required");
  }
  return user;
}

async function assertProjectMember(ctx: QueryCtx | MutationCtx, projectId: string, userEmail: string) {
  const membership = await ctx.db
    .query("projectMembers")
    .withIndex("by_projectId_and_userEmail", (q) =>
      q.eq("projectId", projectId).eq("userEmail", userEmail),
    )
    .first();

  if (!membership) {
    throw new Error("Project membership required");
  }

  return membership;
}

async function assertCanEditProjectIdentity(
  ctx: MutationCtx,
  projectId: string,
  userEmail: string,
) {
  const user = await assertApprovedViewer(ctx, userEmail);
  if (user.role === "ADMIN") {
    return user;
  }

  await assertProjectMember(ctx, projectId, userEmail);
  return user;
}

async function assertTeamOrAdmin(ctx: MutationCtx, userEmail: string) {
  const user = await assertApprovedViewer(ctx, userEmail);
  if (user.role !== "TEAM" && user.role !== "ADMIN") {
    throw new Error("Team or admin access required");
  }
  return user;
}

function getQuestionConfig(project: {
  questionConfig?: typeof DEFAULT_QUESTION_CONFIG;
}) {
  return {
    ...DEFAULT_QUESTION_CONFIG,
    ...(project.questionConfig ?? {}),
  };
}

function getViewerPermissions(params: {
  viewerRole: string;
  isMember: boolean;
}) {
  const isPrivileged = params.viewerRole === "TEAM" || params.viewerRole === "ADMIN";
  return {
    isMember: params.isMember,
    canRenameProject: params.isMember || params.viewerRole === "ADMIN",
    canUpdateTeamImage: params.isMember || params.viewerRole === "ADMIN",
    canUpdateOwnProfile: params.isMember,
    canComment: true,
    canPostMedia: params.isMember || isPrivileged,
    canCreateCheckpoint: isPrivileged,
    canRespondToCheckpoint: params.isMember || isPrivileged,
    canModerateTimeline: isPrivileged,
    canApproveBuiltInStages: params.viewerRole === "ADMIN",
    canEditBuiltInPrompts: params.viewerRole === "ADMIN",
  };
}

async function touchProject(ctx: MutationCtx, projectId: string, timestamp?: string) {
  const project = await getProjectByProjectId(ctx, projectId);
  if (!project) return;

  const now = timestamp ?? new Date().toISOString();
  await ctx.db.patch(project._id, {
    updatedAt: now,
    lastActivityAt: now,
  });
}

async function buildProjectCard(
  ctx: QueryCtx,
  project: NonNullable<Awaited<ReturnType<typeof getProjectByProjectId>>>,
  viewerEmail?: string,
) {
  const members = await getProjectMembers(ctx, project.projectId);
  const likes = await ctx.db
    .query("projectLikes")
    .withIndex("by_projectId", (q) => q.eq("projectId", project.projectId))
    .take(MAX_LIKES);
  const isMember = !!viewerEmail && members.some((member) => member.userEmail === viewerEmail);

  return {
    projectId: project.projectId,
    name: project.name,
    status: project.status,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
    lastActivityAt: project.lastActivityAt ?? project.updatedAt,
    teamImageUrl: project.teamImageUrl ?? "",
    boxImageUrl: project.boxImageUrl ?? "",
    members,
    memberCount: members.length,
    likeCount: likes.length,
    questionConfig: getQuestionConfig(project),
    viewerIsMember: isMember,
  };
}

async function buildProjectDetail(
  ctx: QueryCtx,
  project: NonNullable<Awaited<ReturnType<typeof getProjectByProjectId>>>,
  viewer: NonNullable<Awaited<ReturnType<typeof getUserByEmail>>>,
) {
  const members = await getProjectMembers(ctx, project.projectId);
  const items = await getProjectItems(ctx, project.projectId);
  const likes = await ctx.db
    .query("projectLikes")
    .withIndex("by_projectId", (q) => q.eq("projectId", project.projectId))
    .take(MAX_LIKES);
  const posts = await ctx.db
    .query("projectTimelineEntries")
    .withIndex("by_projectId_and_createdAt", (q) => q.eq("projectId", project.projectId))
    .order("asc")
    .take(MAX_TIMELINE_POSTS);
  const checkpoints = await ctx.db
    .query("projectCheckpointForms")
    .withIndex("by_projectId_and_createdAt", (q) => q.eq("projectId", project.projectId))
    .order("asc")
    .take(MAX_CHECKPOINTS);
  const reactions = await ctx.db
    .query("projectEntryReactions")
    .withIndex("by_projectId", (q) => q.eq("projectId", project.projectId))
    .take(MAX_REACTIONS);

  const isMember = members.some((member) => member.userEmail === viewer.email);
  const permissions = getViewerPermissions({
    viewerRole: viewer.role,
    isMember,
  });

  const questionConfig = getQuestionConfig(project);
  const reactionsByEntry = new Map<
    string,
    { emoji: string; count: number; viewerReacted: boolean; users: string[] }[]
  >();
  const reactionAccumulator = new Map<string, Map<string, { count: number; viewerReacted: boolean; users: string[] }>>();

  for (const reaction of reactions) {
    if (!reactionAccumulator.has(reaction.entryId)) {
      reactionAccumulator.set(reaction.entryId, new Map());
    }
    const byEmoji = reactionAccumulator.get(reaction.entryId)!;
    if (!byEmoji.has(reaction.emoji)) {
      byEmoji.set(reaction.emoji, {
        count: 0,
        viewerReacted: false,
        users: [],
      });
    }
    const current = byEmoji.get(reaction.emoji)!;
    current.count += 1;
    current.users.push(reaction.userName);
    if (reaction.userEmail === viewer.email) {
      current.viewerReacted = true;
    }
  }

  Array.from(reactionAccumulator.entries()).forEach(([entryId, value]) => {
    reactionsByEntry.set(
      entryId,
      Array.from(value.entries()).map(([emoji, summary]) => ({
        emoji,
        ...summary,
      })),
    );
  });

  const builtInTimeline = [
    {
      itemType: "system" as const,
      id: `${project.projectId}-team-setup`,
      stage: "team_setup",
      title: "Project group created",
      description:
        "The project group is ready for members to shape the team profile and prepare the first approval steps.",
      createdAt: project.createdAt,
      status: "READY",
      details: {
        projectName: project.name,
        teamImageUrl: project.teamImageUrl ?? "",
        memberCount: members.length,
      },
    },
    {
      itemType: "system" as const,
      id: `${project.projectId}-box-stage`,
      stage: "box",
      title: questionConfig.boxTitle,
      description: questionConfig.boxDescription,
      createdAt: project.boxSubmittedAt || project.createdAt,
      status:
        project.status === "BOX_PENDING"
          ? "PENDING"
          : project.boxApprovedAt
            ? "APPROVED"
            : project.boxRejectionNote
              ? "REJECTED"
              : "WAITING",
      details: {
        imageUrl: project.boxImageUrl ?? "",
        submittedAt: project.boxSubmittedAt ?? "",
        approvedAt: project.boxApprovedAt ?? "",
        approvedBy: project.boxApprovedBy ?? "",
        rejectionNote: project.boxRejectionNote ?? "",
      },
    },
    {
      itemType: "system" as const,
      id: `${project.projectId}-plan-stage`,
      stage: "plan",
      title: "Project planning",
      description:
        "Submit sketches, completed behavior, required materials, initial plans, and the first build step.",
      createdAt: project.planSubmittedAt || project.createdAt,
      status:
        project.status === "PLAN_PENDING"
          ? "PENDING"
          : project.planApprovedAt
            ? "APPROVED"
            : project.planRejectionNote
              ? "REJECTED"
              : "WAITING",
      details: {
        prompts: questionConfig,
        sketchImages: project.sketchImages ?? [],
        completedBehavior: project.completedBehavior ?? "",
        materialsRequired: project.materialsRequired ?? "",
        initialPlans: project.initialPlans ?? "",
        firstSteps: project.firstSteps ?? "",
        submittedAt: project.planSubmittedAt ?? "",
        approvedAt: project.planApprovedAt ?? "",
        approvedBy: project.planApprovedBy ?? "",
        rejectionNote: project.planRejectionNote ?? "",
      },
    },
  ];

  const customTimelineItems = await Promise.all(
    checkpoints.map(async (checkpoint) => {
      const fields = await ctx.db
        .query("projectCheckpointFields")
        .withIndex("by_checkpointId_and_position", (q) => q.eq("checkpointId", checkpoint.checkpointId))
        .take(40);
      const responses = await ctx.db
        .query("projectCheckpointResponses")
        .withIndex("by_checkpointId_and_updatedAt", (q) => q.eq("checkpointId", checkpoint.checkpointId))
        .order("asc")
        .take(100);

      return {
        itemType: "checkpoint" as const,
        id: checkpoint.checkpointId,
        createdAt: checkpoint.createdAt,
        updatedAt: checkpoint.updatedAt,
        title: checkpoint.title,
        description: checkpoint.description,
        status: checkpoint.status,
        createdByEmail: checkpoint.createdByEmail,
        createdByName: checkpoint.createdByName,
        createdByRole: checkpoint.createdByRole,
        allowMemberResponses: checkpoint.allowMemberResponses,
        fields,
        responses,
      };
    }),
  );

  const postTimelineItems = posts.map((post) => ({
    itemType: "post" as const,
    id: post.entryId,
    kind: post.kind,
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
    authorEmail: post.authorEmail,
    authorName: post.authorName,
    authorRole: post.authorRole,
    body: post.body,
    images: post.images ?? [],
    videos: post.videos ?? [],
    links: post.links ?? [],
    reactions: reactionsByEntry.get(post.entryId) ?? [],
  }));

  const trailingTimeline = [...customTimelineItems, ...postTimelineItems].sort((a, b) =>
    a.createdAt.localeCompare(b.createdAt),
  );

  return {
    projectId: project.projectId,
    name: project.name,
    status: project.status,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
    lastActivityAt: project.lastActivityAt ?? project.updatedAt,
    teamImageUrl: project.teamImageUrl ?? "",
    questionConfig,
    boxImageUrl: project.boxImageUrl ?? "",
    boxSubmittedAt: project.boxSubmittedAt ?? "",
    boxApprovedAt: project.boxApprovedAt ?? "",
    boxApprovedBy: project.boxApprovedBy ?? "",
    boxRejectionNote: project.boxRejectionNote ?? "",
    sketchImages: project.sketchImages ?? [],
    completedBehavior: project.completedBehavior ?? "",
    materialsRequired: project.materialsRequired ?? "",
    initialPlans: project.initialPlans ?? "",
    firstSteps: project.firstSteps ?? "",
    planSubmittedAt: project.planSubmittedAt ?? "",
    planApprovedAt: project.planApprovedAt ?? "",
    planApprovedBy: project.planApprovedBy ?? "",
    planRejectionNote: project.planRejectionNote ?? "",
    members,
    items,
    likeCount: likes.length,
    viewerHasLiked: likes.some((like) => like.userEmail === viewer.email),
    permissions,
    timeline: [...builtInTimeline, ...trailingTimeline],
  };
}

export const getAdminWorkspace = query({
  args: {
    viewerEmail: v.string(),
  },
  handler: async (ctx, args) => {
    await assertAdmin(ctx, args.viewerEmail);
    const projects = await ctx.db
      .query("projects")
      .withIndex("by_updatedAt")
      .order("desc")
      .take(MAX_PROJECTS);

    const cards = await Promise.all(projects.map((project) => buildProjectCard(ctx, project, args.viewerEmail)));
    return { projects: cards };
  },
});

export const getMemberWorkspace = query({
  args: {
    userEmail: v.string(),
  },
  handler: async (ctx, args) => {
    if (!args.userEmail) {
      return { projects: [] };
    }

    const viewer = await assertApprovedViewer(ctx, args.userEmail);
    const projects = await ctx.db
      .query("projects")
      .withIndex("by_updatedAt")
      .order("desc")
      .take(MAX_PROJECTS);

    const visibleProjects = projects.filter((project) => {
      if (viewer.role === "ADMIN") return true;
      return VISIBLE_PROJECT_STATUSES.has(project.status);
    });

    const cards = await Promise.all(
      visibleProjects.map((project) => buildProjectCard(ctx, project, args.userEmail)),
    );
    return { projects: cards };
  },
});

export const getProjectDetail = query({
  args: {
    userEmail: v.string(),
    projectId: v.string(),
  },
  handler: async (ctx, args) => {
    const viewer = await assertApprovedViewer(ctx, args.userEmail);
    const project = await getProjectByProjectId(ctx, args.projectId);

    if (!project) {
      throw new Error("Project not found");
    }
    if (project.status === "ARCHIVED" && viewer.role !== "ADMIN") {
      throw new Error("Project not found");
    }

    return await buildProjectDetail(ctx, project, viewer);
  },
});

export const getAssignmentsOverview = query({
  args: {},
  handler: async (ctx) => {
    const items = await ctx.db
      .query("projectItems")
      .withIndex("by_taggedAt")
      .order("desc")
      .take(500);

    return await Promise.all(
      items.map(async (item) => {
        const project = await getProjectByProjectId(ctx, item.projectId);
        return {
          ...item,
          projectName: project?.name ?? "Project",
          projectStatus: project?.status ?? "DRAFT",
        };
      }),
    );
  },
});

export const upsertProject = mutation({
  args: {
    actorEmail: v.string(),
    projectId: v.optional(v.string()),
    name: v.string(),
    memberEmails: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    await assertAdmin(ctx, args.actorEmail);

    const now = new Date().toISOString();
    const projectId = args.projectId ?? crypto.randomUUID();
    const existingProject = await getProjectByProjectId(ctx, projectId);
    const trimmedName = sanitizeText(args.name);

    if (!trimmedName) {
      throw new Error("Project name is required");
    }

    const validMembers = (
      await Promise.all(args.memberEmails.map((email) => getUserByEmail(ctx, email)))
    ).filter(
      (user): user is NonNullable<typeof user> =>
        !!user && user.status === "APPROVED" && (user.role === "USER" || user.role === "TEAM"),
    );

    if (validMembers.length === 0) {
      throw new Error("Select at least one approved USER or TEAM member");
    }

    if (existingProject) {
      await ctx.db.patch(existingProject._id, {
        name: trimmedName,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("projects", {
        projectId,
        name: trimmedName,
        status: "DRAFT",
        createdBy: args.actorEmail,
        createdAt: now,
        updatedAt: now,
        lastActivityAt: now,
        teamImageUrl: "",
        boxImageUrl: "",
        boxSubmittedAt: "",
        boxApprovedAt: "",
        boxApprovedBy: "",
        boxRejectionNote: "",
        sketchImages: [],
        completedBehavior: "",
        materialsRequired: "",
        initialPlans: "",
        firstSteps: "",
        planSubmittedAt: "",
        planApprovedAt: "",
        planApprovedBy: "",
        planRejectionNote: "",
        questionConfig: DEFAULT_QUESTION_CONFIG,
      });
    }

    const existingMembers = await ctx.db
      .query("projectMembers")
      .withIndex("by_projectId_and_order", (q) => q.eq("projectId", projectId))
      .take(MAX_MEMBERS_PER_PROJECT);
    const existingMemberMap = new Map(existingMembers.map((member) => [member.userEmail, member]));
    const nextMemberEmails = new Set(validMembers.map((member) => member.email));

    for (const member of existingMembers) {
      if (!nextMemberEmails.has(member.userEmail)) {
        await ctx.db.delete(member._id);
      }
    }

    const projectItems = await ctx.db
      .query("projectItems")
      .withIndex("by_projectId", (q) => q.eq("projectId", projectId))
      .take(MAX_ITEMS_PER_PROJECT);
    for (const item of projectItems) {
      if (!nextMemberEmails.has(item.userEmail)) {
        await ctx.db.delete(item._id);
      }
    }

    for (let index = 0; index < validMembers.length; index += 1) {
      const member = validMembers[index];
      const existingMembership = existingMemberMap.get(member.email);
      if (existingMembership) {
        await ctx.db.patch(existingMembership._id, {
          userName: member.name,
          userRole: member.role,
          order: index,
        });
      } else {
        await ctx.db.insert("projectMembers", {
          projectId,
          userEmail: member.email,
          userName: member.name,
          userRole: member.role,
          projectNote: "",
          joinedAt: now,
          order: index,
        });
      }
    }

    await touchProject(ctx, projectId, now);

    return { success: true, projectId };
  },
});

export const updateProjectIdentity = mutation({
  args: {
    projectId: v.string(),
    userEmail: v.string(),
    name: v.string(),
    teamImageUrl: v.string(),
  },
  handler: async (ctx, args) => {
    await assertCanEditProjectIdentity(ctx, args.projectId, args.userEmail);
    const project = await getProjectByProjectId(ctx, args.projectId);
    if (!project) {
      throw new Error("Project not found");
    }

    const nextName = sanitizeText(args.name);
    if (!nextName) {
      throw new Error("Project name is required");
    }

    const now = new Date().toISOString();
    await ctx.db.patch(project._id, {
      name: nextName,
      teamImageUrl: sanitizeText(args.teamImageUrl),
      updatedAt: now,
      lastActivityAt: now,
    });

    return { success: true };
  },
});

export const updateMyProfile = mutation({
  args: {
    projectId: v.string(),
    userEmail: v.string(),
    profileImageUrl: v.string(),
    projectNote: v.string(),
  },
  handler: async (ctx, args) => {
    const membership = await assertProjectMember(ctx, args.projectId, args.userEmail);
    const user = await getUserByEmail(ctx, args.userEmail);

    if (!user) {
      throw new Error("User not found");
    }

    const now = new Date().toISOString();
    await ctx.db.patch(user._id, {
      profileImageUrl: sanitizeText(args.profileImageUrl),
    });
    await ctx.db.patch(membership._id, {
      projectNote: sanitizeText(args.projectNote),
    });
    await touchProject(ctx, args.projectId, now);

    return { success: true };
  },
});

export const updateQuestionConfig = mutation({
  args: {
    actorEmail: v.string(),
    projectId: v.string(),
    questionConfig: questionConfigValidator,
  },
  handler: async (ctx, args) => {
    await assertAdmin(ctx, args.actorEmail);
    const project = await getProjectByProjectId(ctx, args.projectId);
    if (!project) {
      throw new Error("Project not found");
    }

    const now = new Date().toISOString();
    await ctx.db.patch(project._id, {
      questionConfig: {
        boxTitle: sanitizeText(args.questionConfig.boxTitle),
        boxDescription: sanitizeText(args.questionConfig.boxDescription),
        sketchPrompt: sanitizeText(args.questionConfig.sketchPrompt),
        sketchHelp: sanitizeText(args.questionConfig.sketchHelp),
        completedBehaviorPrompt: sanitizeText(args.questionConfig.completedBehaviorPrompt),
        materialsRequiredPrompt: sanitizeText(args.questionConfig.materialsRequiredPrompt),
        initialPlansPrompt: sanitizeText(args.questionConfig.initialPlansPrompt),
        firstStepsPrompt: sanitizeText(args.questionConfig.firstStepsPrompt),
      },
      updatedAt: now,
      lastActivityAt: now,
    });

    return { success: true };
  },
});

export const submitBox = mutation({
  args: {
    projectId: v.string(),
    userEmail: v.string(),
    boxImageUrl: v.string(),
  },
  handler: async (ctx, args) => {
    await assertProjectMember(ctx, args.projectId, args.userEmail);
    const project = await getProjectByProjectId(ctx, args.projectId);
    if (!project) {
      throw new Error("Project not found");
    }
    if (!["DRAFT", "BOX_PENDING"].includes(project.status)) {
      throw new Error("Box submission is not allowed at this stage");
    }

    const now = new Date().toISOString();
    await ctx.db.patch(project._id, {
      status: "BOX_PENDING",
      boxImageUrl: sanitizeText(args.boxImageUrl),
      boxSubmittedAt: now,
      boxRejectionNote: "",
      updatedAt: now,
      lastActivityAt: now,
    });

    return { success: true };
  },
});

export const reviewBox = mutation({
  args: {
    actorEmail: v.string(),
    projectId: v.string(),
    approve: v.boolean(),
    rejectionNote: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await assertAdmin(ctx, args.actorEmail);
    const project = await getProjectByProjectId(ctx, args.projectId);
    if (!project) {
      throw new Error("Project not found");
    }

    const now = new Date().toISOString();
    await ctx.db.patch(
      project._id,
      args.approve
        ? {
            status: "BOX_APPROVED",
            boxApprovedAt: now,
            boxApprovedBy: args.actorEmail,
            boxRejectionNote: "",
            updatedAt: now,
            lastActivityAt: now,
          }
        : {
            status: "DRAFT",
            boxApprovedAt: "",
            boxApprovedBy: "",
            boxRejectionNote: sanitizeText(args.rejectionNote ?? ""),
            updatedAt: now,
            lastActivityAt: now,
          },
    );

    return { success: true };
  },
});

export const submitPlan = mutation({
  args: {
    projectId: v.string(),
    userEmail: v.string(),
    sketchImages: v.array(v.string()),
    completedBehavior: v.string(),
    materialsRequired: v.string(),
    initialPlans: v.string(),
    firstSteps: v.string(),
  },
  handler: async (ctx, args) => {
    await assertProjectMember(ctx, args.projectId, args.userEmail);
    const project = await getProjectByProjectId(ctx, args.projectId);
    if (!project) {
      throw new Error("Project not found");
    }
    if (!["BOX_APPROVED", "PLAN_PENDING"].includes(project.status)) {
      throw new Error("Planning is not available until the box is approved");
    }

    const now = new Date().toISOString();
    await ctx.db.patch(project._id, {
      status: "PLAN_PENDING",
      sketchImages: sanitizeUrlArray(args.sketchImages),
      completedBehavior: sanitizeText(args.completedBehavior),
      materialsRequired: sanitizeText(args.materialsRequired),
      initialPlans: sanitizeText(args.initialPlans),
      firstSteps: sanitizeText(args.firstSteps),
      planSubmittedAt: now,
      planRejectionNote: "",
      updatedAt: now,
      lastActivityAt: now,
    });

    return { success: true };
  },
});

export const reviewPlan = mutation({
  args: {
    actorEmail: v.string(),
    projectId: v.string(),
    approve: v.boolean(),
    rejectionNote: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await assertAdmin(ctx, args.actorEmail);
    const project = await getProjectByProjectId(ctx, args.projectId);
    if (!project) {
      throw new Error("Project not found");
    }

    const now = new Date().toISOString();
    await ctx.db.patch(
      project._id,
      args.approve
        ? {
            status: "ACTIVE",
            planApprovedAt: now,
            planApprovedBy: args.actorEmail,
            planRejectionNote: "",
            updatedAt: now,
            lastActivityAt: now,
          }
        : {
            status: "BOX_APPROVED",
            planApprovedAt: "",
            planApprovedBy: "",
            planRejectionNote: sanitizeText(args.rejectionNote ?? ""),
            updatedAt: now,
            lastActivityAt: now,
          },
    );

    return { success: true };
  },
});

export const createCheckpointForm = mutation({
  args: {
    userEmail: v.string(),
    projectId: v.string(),
    title: v.string(),
    description: v.string(),
    allowMemberResponses: v.boolean(),
    fields: v.array(checkpointFieldValidator),
  },
  handler: async (ctx, args) => {
    const user = await assertTeamOrAdmin(ctx, args.userEmail);
    const project = await getProjectByProjectId(ctx, args.projectId);
    if (!project) {
      throw new Error("Project not found");
    }

    const title = sanitizeText(args.title);
    if (!title) {
      throw new Error("Checkpoint title is required");
    }

    const checkpointId = crypto.randomUUID();
    const now = new Date().toISOString();

    await ctx.db.insert("projectCheckpointForms", {
      checkpointId,
      projectId: args.projectId,
      title,
      description: sanitizeText(args.description),
      createdByEmail: user.email,
      createdByName: user.name,
      createdByRole: user.role,
      allowMemberResponses: args.allowMemberResponses,
      status: "OPEN",
      createdAt: now,
      updatedAt: now,
    });

    for (let index = 0; index < args.fields.length; index += 1) {
      const field = args.fields[index];
      const label = sanitizeText(field.label);
      if (!label) continue;

      await ctx.db.insert("projectCheckpointFields", {
        checkpointId,
        fieldId: crypto.randomUUID(),
        label,
        fieldType: field.fieldType,
        required: field.required,
        position: index,
      });
    }

    await touchProject(ctx, args.projectId, now);
    return { success: true, checkpointId };
  },
});

export const submitCheckpointResponse = mutation({
  args: {
    userEmail: v.string(),
    projectId: v.string(),
    checkpointId: v.string(),
    values: v.array(checkpointResponseValueValidator),
  },
  handler: async (ctx, args) => {
    const user = await assertApprovedViewer(ctx, args.userEmail);
    const project = await getProjectByProjectId(ctx, args.projectId);
    if (!project) {
      throw new Error("Project not found");
    }

    const members = await getProjectMembers(ctx, args.projectId);
    const isMember = members.some((member) => member.userEmail === user.email);
    const isPrivileged = user.role === "TEAM" || user.role === "ADMIN";
    if (!isMember && !isPrivileged) {
      throw new Error("Checkpoint responses are restricted to the project team");
    }

    const checkpoint = await ctx.db
      .query("projectCheckpointForms")
      .withIndex("by_checkpointId", (q) => q.eq("checkpointId", args.checkpointId))
      .unique();
    if (!checkpoint || checkpoint.projectId !== args.projectId) {
      throw new Error("Checkpoint not found");
    }
    if (!checkpoint.allowMemberResponses && !isPrivileged) {
      throw new Error("Responses are restricted for this checkpoint");
    }

    const fields = await ctx.db
      .query("projectCheckpointFields")
      .withIndex("by_checkpointId_and_position", (q) => q.eq("checkpointId", args.checkpointId))
      .take(40);
    const fieldMap = new Map(fields.map((field) => [field.fieldId, field]));

    const normalizedValues: {
      fieldId: string;
      label: string;
      fieldType: CheckpointFieldType;
      singleValue: string;
      multiValues: string[];
    }[] = [];

    for (const value of args.values) {
      const field = fieldMap.get(value.fieldId);
      if (!field) continue;
      normalizedValues.push({
        fieldId: field.fieldId,
        label: field.label,
        fieldType: field.fieldType,
        singleValue: sanitizeText(value.singleValue ?? ""),
        multiValues: sanitizeUrlArray(value.multiValues ?? []),
      });
    }

    for (const field of fields) {
      if (!field.required) continue;
      const response = normalizedValues.find((value) => value.fieldId === field.fieldId);
      const hasSingleValue = !!response?.singleValue;
      const hasMultiValue = !!response?.multiValues?.length;
      if (!hasSingleValue && !hasMultiValue) {
        throw new Error(`Field "${field.label}" is required`);
      }
    }

    const existing = await ctx.db
      .query("projectCheckpointResponses")
      .withIndex("by_checkpointId_and_submittedByEmail", (q) =>
        q.eq("checkpointId", args.checkpointId).eq("submittedByEmail", user.email),
      )
      .first();

    const now = new Date().toISOString();
    if (existing) {
      await ctx.db.patch(existing._id, {
        values: normalizedValues,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("projectCheckpointResponses", {
        responseId: crypto.randomUUID(),
        checkpointId: args.checkpointId,
        projectId: args.projectId,
        submittedByEmail: user.email,
        submittedByName: user.name,
        submittedByRole: user.role,
        values: normalizedValues,
        createdAt: now,
        updatedAt: now,
      });
    }

    await ctx.db.patch(checkpoint._id, {
      updatedAt: now,
    });
    await touchProject(ctx, args.projectId, now);

    return { success: true };
  },
});

export const addTimelinePost = mutation({
  args: {
    userEmail: v.string(),
    projectId: v.string(),
    kind: postKindValidator,
    body: v.string(),
    images: v.optional(v.array(v.string())),
    videos: v.optional(v.array(v.string())),
    links: v.optional(v.array(linkValidator)),
  },
  handler: async (ctx, args) => {
    const user = await assertApprovedViewer(ctx, args.userEmail);
    const project = await getProjectByProjectId(ctx, args.projectId);
    if (!project) {
      throw new Error("Project not found");
    }

    const members = await getProjectMembers(ctx, args.projectId);
    const isMember = members.some((member) => member.userEmail === user.email);
    const isPrivileged = user.role === "TEAM" || user.role === "ADMIN";
    const body = sanitizeText(args.body);
    const images = sanitizeUrlArray(args.images ?? []);
    const videos = sanitizeUrlArray(args.videos ?? []);
    const links = sanitizeLinks(args.links ?? []);

    if (!body) {
      throw new Error("Post content is required");
    }
    if (args.kind === "question" && !isPrivileged) {
      throw new Error("Only team or admin can post project questions");
    }
    if ((images.length || videos.length || links.length) && !(isMember || isPrivileged)) {
      throw new Error("Only project members, team, or admin can attach media");
    }

    const now = new Date().toISOString();
    await ctx.db.insert("projectTimelineEntries", {
      entryId: crypto.randomUUID(),
      projectId: args.projectId,
      kind: args.kind,
      authorEmail: user.email,
      authorName: user.name,
      authorRole: user.role,
      body,
      images,
      videos,
      links,
      createdAt: now,
      updatedAt: now,
    });

    await touchProject(ctx, args.projectId, now);
    return { success: true };
  },
});

export const toggleProjectLike = mutation({
  args: {
    userEmail: v.string(),
    projectId: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await assertApprovedViewer(ctx, args.userEmail);
    const project = await getProjectByProjectId(ctx, args.projectId);
    if (!project || (project.status === "ARCHIVED" && user.role !== "ADMIN")) {
      throw new Error("Project not found");
    }

    const existing = await ctx.db
      .query("projectLikes")
      .withIndex("by_projectId_and_userEmail", (q) =>
        q.eq("projectId", args.projectId).eq("userEmail", user.email),
      )
      .first();

    if (existing) {
      await ctx.db.delete(existing._id);
      return { success: true, liked: false };
    }

    await ctx.db.insert("projectLikes", {
      projectId: args.projectId,
      userEmail: user.email,
      userName: user.name,
      createdAt: new Date().toISOString(),
    });

    return { success: true, liked: true };
  },
});

export const toggleEntryReaction = mutation({
  args: {
    userEmail: v.string(),
    projectId: v.string(),
    entryId: v.string(),
    emoji: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await assertApprovedViewer(ctx, args.userEmail);
    const project = await getProjectByProjectId(ctx, args.projectId);
    if (!project || (project.status === "ARCHIVED" && user.role !== "ADMIN")) {
      throw new Error("Project not found");
    }

    const entry = await ctx.db
      .query("projectTimelineEntries")
      .withIndex("by_entryId", (q) => q.eq("entryId", args.entryId))
      .unique();
    if (!entry || entry.projectId !== args.projectId) {
      throw new Error("Timeline entry not found");
    }

    const emoji = sanitizeText(args.emoji);
    if (!emoji) {
      throw new Error("Emoji is required");
    }

    const existing = await ctx.db
      .query("projectEntryReactions")
      .withIndex("by_entryId_and_userEmail_and_emoji", (q) =>
        q.eq("entryId", args.entryId).eq("userEmail", user.email).eq("emoji", emoji),
      )
      .first();

    if (existing) {
      await ctx.db.delete(existing._id);
      return { success: true, reacted: false };
    }

    await ctx.db.insert("projectEntryReactions", {
      entryId: args.entryId,
      projectId: args.projectId,
      userEmail: user.email,
      userName: user.name,
      emoji,
      createdAt: new Date().toISOString(),
    });

    return { success: true, reacted: true };
  },
});

export const setLifecycleStatus = mutation({
  args: {
    actorEmail: v.string(),
    projectId: v.string(),
    status: lifecycleStatusValidator,
  },
  handler: async (ctx, args) => {
    await assertAdmin(ctx, args.actorEmail);
    const project = await getProjectByProjectId(ctx, args.projectId);
    if (!project) {
      throw new Error("Project not found");
    }

    const now = new Date().toISOString();
    await ctx.db.patch(project._id, {
      status: args.status,
      updatedAt: now,
      lastActivityAt: now,
    });

    return { success: true };
  },
});

export const deleteProject = mutation({
  args: {
    actorEmail: v.string(),
    projectId: v.string(),
  },
  handler: async (ctx, args) => {
    await assertAdmin(ctx, args.actorEmail);
    const project = await getProjectByProjectId(ctx, args.projectId);
    if (!project) {
      throw new Error("Project not found");
    }

    const members = await ctx.db
      .query("projectMembers")
      .withIndex("by_projectId_and_order", (q) => q.eq("projectId", args.projectId))
      .take(MAX_MEMBERS_PER_PROJECT);
    for (const member of members) {
      await ctx.db.delete(member._id);
    }

    const items = await ctx.db
      .query("projectItems")
      .withIndex("by_projectId", (q) => q.eq("projectId", args.projectId))
      .take(MAX_ITEMS_PER_PROJECT);
    for (const item of items) {
      await ctx.db.delete(item._id);
    }

    const posts = await ctx.db
      .query("projectTimelineEntries")
      .withIndex("by_projectId_and_createdAt", (q) => q.eq("projectId", args.projectId))
      .take(MAX_TIMELINE_POSTS);
    for (const post of posts) {
      await ctx.db.delete(post._id);
    }

    const checkpoints = await ctx.db
      .query("projectCheckpointForms")
      .withIndex("by_projectId_and_createdAt", (q) => q.eq("projectId", args.projectId))
      .take(MAX_CHECKPOINTS);
    for (const checkpoint of checkpoints) {
      const fields = await ctx.db
        .query("projectCheckpointFields")
        .withIndex("by_checkpointId_and_position", (q) => q.eq("checkpointId", checkpoint.checkpointId))
        .take(40);
      for (const field of fields) {
        await ctx.db.delete(field._id);
      }

      const responses = await ctx.db
        .query("projectCheckpointResponses")
        .withIndex("by_checkpointId_and_updatedAt", (q) => q.eq("checkpointId", checkpoint.checkpointId))
        .take(MAX_CHECKPOINT_RESPONSES);
      for (const response of responses) {
        await ctx.db.delete(response._id);
      }

      await ctx.db.delete(checkpoint._id);
    }

    const likes = await ctx.db
      .query("projectLikes")
      .withIndex("by_projectId", (q) => q.eq("projectId", args.projectId))
      .take(MAX_LIKES);
    for (const like of likes) {
      await ctx.db.delete(like._id);
    }

    const reactions = await ctx.db
      .query("projectEntryReactions")
      .withIndex("by_projectId", (q) => q.eq("projectId", args.projectId))
      .take(MAX_REACTIONS);
    for (const reaction of reactions) {
      await ctx.db.delete(reaction._id);
    }

    await ctx.db.delete(project._id);

    return { success: true };
  },
});

export const addItemToProject = mutation({
  args: {
    projectId: v.string(),
    userEmail: v.string(),
    requestId: v.string(),
  },
  handler: async (ctx, args) => {
    await assertProjectMember(ctx, args.projectId, args.userEmail);
    const project = await getProjectByProjectId(ctx, args.projectId);
    if (!project) {
      throw new Error("Project not found");
    }
    if (project.status !== "ACTIVE") {
      throw new Error("Items can only be added after the project becomes active");
    }

    const request = await ctx.db
      .query("requests")
      .withIndex("by_date", (q) => q.eq("date", args.requestId))
      .first();
    if (!request) {
      throw new Error("Holding not found");
    }
    if (request.userEmail !== args.userEmail) {
      throw new Error("You can only add your own checked-out items");
    }
    if (request.status !== "APPROVED") {
      throw new Error("Only approved holdings can be assigned to a project");
    }
    if (["RETURN_PENDING", "RETURN_APPROVED"].includes(request.returnStatus)) {
      throw new Error("This item is already in the return flow");
    }

    const existingAssignment = await ctx.db
      .query("projectItems")
      .withIndex("by_requestId", (q) => q.eq("requestId", args.requestId))
      .first();
    if (existingAssignment) {
      throw new Error("This item is already linked to a project");
    }

    const now = new Date().toISOString();
    await ctx.db.insert("projectItems", {
      projectId: args.projectId,
      requestId: args.requestId,
      userEmail: args.userEmail,
      itemId: request.itemId,
      itemName: request.itemName,
      quantity: request.quantity,
      taggedAt: now,
      taggedBy: args.userEmail,
    });

    await touchProject(ctx, args.projectId, now);

    return { success: true };
  },
});

export const removeItemFromProject = mutation({
  args: {
    projectId: v.string(),
    userEmail: v.string(),
    requestId: v.string(),
  },
  handler: async (ctx, args) => {
    await assertProjectMember(ctx, args.projectId, args.userEmail);
    const assignment = await ctx.db
      .query("projectItems")
      .withIndex("by_requestId", (q) => q.eq("requestId", args.requestId))
      .first();

    if (!assignment || assignment.projectId !== args.projectId) {
      throw new Error("Project item link not found");
    }

    await ctx.db.delete(assignment._id);
    await touchProject(ctx, args.projectId);

    return { success: true };
  },
});
