import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Download,
  Edit3,
  FileText,
  FolderKanban,
  Image as ImageIcon,
  LayoutGrid,
  Link,
  MessageSquare,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Search,
  Send,
  Sparkles,
  Star,
  Trash2,
  Users,
} from "lucide-react";
import {
  createEmptyCheckpointField,
  EMOJIS,
  formatDateOnly,
  formatDateTime,
  getStatusBadgeClass,
  getStatusLabel,
  getStatusAccentClass,
  getStatusBgClass,
  getStatusPillClass,
  getPostTypeStyle,
  isRecentActivity,
  MediaList,
  normalizeImageUrl,
  normalizeVideoUrl,
  PostAuthorHeader,
  ProgressRing,
  ProjectAvatar,
  RelativeTime,
  ImageWithLightbox,
  getProjectProgress,
  InteractiveTimelinePostCard,
  TimelinePostComposerDialog,
  type CheckpointFieldType,
  type ProjectCardRecord,
  type ProjectDetailRecord,
} from "@/components/projects/projectShared";

import ProjectProfilePanel from "@/components/projects/ProjectProfilePanel";
import ProjectPostPanel from "@/components/projects/ProjectPostPanel";
import ProjectReportGenerator from "@/components/projects/ProjectReportGenerator";

interface EligibleUser {
  email: string;
  name: string;
  role: string;
  status: string;
}

interface AdminProjectsTabProps {
  currentUserEmail: string;
}

function TimelineMarker({ createdAt, mobile = false }: { createdAt: string; mobile?: boolean }) {
  if (mobile) {
    return (
      <div className="mb-3 flex items-center gap-3 text-xs uppercase tracking-[0.22em] text-slate-400 md:hidden">
        <CalendarDays className="h-3.5 w-3.5" />
        <span>{formatDateOnly(createdAt)}</span>
        <span>{formatDateTime(createdAt).split(", ").slice(1).join(", ")}</span>
      </div>
    );
  }

  return (
    <div className="hidden h-full flex-col items-center md:flex">
      <div className="rounded-full border border-slate-200 bg-white px-3 py-2 text-center shadow-sm">
        <p className="text-[10px] uppercase tracking-[0.24em] text-slate-400">{formatDateOnly(createdAt)}</p>
        <p className="mt-1 text-xs font-semibold text-slate-700">
          {formatDateTime(createdAt).split(", ").slice(1).join(", ")}
        </p>
      </div>
      <div className="mt-3 h-4 w-4 rounded-full border-4 border-white bg-slate-900 shadow-sm" />
    </div>
  );
}

function AdminProjectCardTile({
  project,
  onOpen,
  selected = false,
}: {
  project: ProjectCardRecord;
  onOpen: () => void;
  selected?: boolean;
}) {
  const previewImage = project.teamImageUrl ?? project.boxImageUrl ?? "";
  const { percent } = getProjectProgress(project.status);
  const accentClass = getStatusAccentClass(project.status);
  const bgClass = getStatusBgClass(project.status);
  const pillClass = getStatusPillClass(project.status);
  const hasRecentActivity = isRecentActivity(project.lastActivityAt);

  return (
    <button
      type="button"
      onClick={onOpen}
      className={`project-card-premium w-full text-left ${bgClass} ${selected ? "selected" : ""}`}
    >
      {/* Accent strip */}
      <div className={`project-card-accent ${accentClass}`} />

      {/* Cover image */}
      <div className="overflow-hidden rounded-2xl border border-slate-200/70 bg-slate-100 shadow-sm mb-3">
        {previewImage ? (
          <img
            src={normalizeImageUrl(previewImage)}
            alt={project.name}
            className="h-40 w-full object-cover transition-transform duration-500 group-hover:scale-105"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="flex h-40 items-center justify-center bg-gradient-to-br from-slate-100 to-slate-50">
            <FolderKanban className="h-10 w-10 text-slate-300" />
          </div>
        )}
      </div>

      {/* Name + progress ring row */}
      <div className="flex items-start justify-between gap-2 mb-2 pl-1">
        <div className="min-w-0">
          <h3 className="truncate text-base font-black text-slate-900 leading-snug">{project.name}</h3>
          <div className="flex items-center gap-1.5 mt-0.5">
            {hasRecentActivity && <span className="project-activity-pulse" />}
            <RelativeTime value={project.lastActivityAt || project.updatedAt} />
          </div>
        </div>
        <ProgressRing percent={percent} size={44} strokeWidth={4} />
      </div>

      {/* Status pill */}
      <div className="pl-1 mb-3">
        <span className={pillClass}>{getStatusLabel(project.status)}</span>
      </div>

      {/* Members */}
      <div className="flex items-center justify-between pl-1">
        <div className="project-avatar-stack">
          {project.members.slice(0, 5).map((member) => (
            <ProjectAvatar
              key={member.userEmail}
              imageUrl={member.profileImageUrl}
              label={member.userName}
              className="h-7 w-7 border-2 border-white text-[10px]"
            />
          ))}
          {project.members.length > 5 && (
            <div className="h-7 w-7 rounded-full border-2 border-white bg-slate-200 text-slate-600 text-[10px] flex items-center justify-center font-bold">
              +{project.members.length - 5}
            </div>
          )}
        </div>
        <div className="project-card-meta">
          {project.likeCount > 0 && (
            <span className="project-card-meta-chip text-amber-500">
              <Star className="h-3 w-3 fill-current" /> {project.likeCount}
            </span>
          )}
          <span className="project-card-meta-chip">
            <Users className="h-3 w-3" /> {project.memberCount}
          </span>
        </div>
      </div>
    </button>
  );
}

export default function AdminProjectsTab({ currentUserEmail }: AdminProjectsTabProps) {
  const projectWorkspace = useQuery(api.projects.getAdminWorkspace, {
    viewerEmail: currentUserEmail,
  }) as { projects: ProjectCardRecord[] } | undefined;
  const users = useQuery(api.users.getAll) as EligibleUser[] | undefined;

  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [projectSearch, setProjectSearch] = useState("");
  const [memberSearch, setMemberSearch] = useState("");
  const [leftRailCollapsed, setLeftRailCollapsed] = useState(true);
  const [activeTab, setActiveTab] = useState<"profile" | "post" | "report">("profile");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingProjectId, setEditingProjectId] = useState<string | undefined>(undefined);
  const [wizardStep, setWizardStep] = useState(1);
  const [wizardCoverImageUrl, setWizardCoverImageUrl] = useState("");

  const [composerDialogOpen, setComposerDialogOpen] = useState(false);
  const [composerMode, setComposerMode] = useState<"post" | "checkpoint">("post");
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [selectedEmails, setSelectedEmails] = useState<string[]>([]);
  const [promptDraft, setPromptDraft] = useState({
    boxTitle: "",
    boxDescription: "",
    sketchPrompt: "",
    sketchHelp: "",
    completedBehaviorPrompt: "",
    materialsRequiredPrompt: "",
    initialPlansPrompt: "",
    firstStepsPrompt: "",
  });
  const [postKind, setPostKind] = useState<"comment" | "note" | "question">("question");
  const [postBody, setPostBody] = useState("");
  const [postImages, setPostImages] = useState([""]);
  const [postVideos, setPostVideos] = useState([""]);
  const [postLinks, setPostLinks] = useState([{ label: "", url: "" }]);
  const [checkpointTitle, setCheckpointTitle] = useState("");
  const [checkpointDescription, setCheckpointDescription] = useState("");
  const [checkpointAllowResponses, setCheckpointAllowResponses] = useState(true);
  const [checkpointFields, setCheckpointFields] = useState([createEmptyCheckpointField()]);
  const [planningFields, setPlanningFields] = useState([createEmptyCheckpointField()]);

  // ── Admin review dialog state ──
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [reviewAction, setReviewAction] = useState<{ stage: "setup"; approve: boolean } | null>(null);
  const [adminComment, setAdminComment] = useState("");

  const projectDetail = useQuery(
    api.projects.getProjectDetail,
    selectedProjectId ? { userEmail: currentUserEmail, projectId: selectedProjectId } : "skip",
  ) as ProjectDetailRecord | undefined;

  const upsertProjectMut = useMutation(api.projects.upsertProject);
  const updateQuestionConfigMut = useMutation(api.projects.updateQuestionConfig);
  const updateProjectIdentityMut = useMutation(api.projects.updateProjectIdentity);
  const reviewTeamSetupMut = useMutation(api.projects.reviewTeamSetup);
  const createCheckpointFormMut = useMutation(api.projects.createCheckpointForm);
  const updatePlanningFieldsMut = useMutation(api.projects.updatePlanningFields);
  const addTimelinePostMut = useMutation(api.projects.addTimelinePost);
  const deleteTimelinePostMut = useMutation(api.projects.deleteTimelinePost);
  const setLifecycleStatusMut = useMutation(api.projects.setLifecycleStatus);
  const deleteProjectMut = useMutation(api.projects.deleteProject);

  // Rich post editing state
  const [editingTimelinePost, setEditingTimelinePost] = useState<Extract<
    ProjectDetailRecord["timeline"][number],
    { itemType: "post" }
  > | null>(null);
  const [timelinePostComposerOpen, setTimelinePostComposerOpen] = useState(false);

  const handleEditTimelinePost = (
    post: Extract<ProjectDetailRecord["timeline"][number], { itemType: "post" }>,
  ) => {
    setEditingTimelinePost(post);
    setTimelinePostComposerOpen(true);
  };

  const handleDeleteTimelinePost = async (entryId: string) => {
    if (!confirm("Are you sure you want to delete this update?")) return;
    try {
      await deleteTimelinePostMut({
        userEmail: currentUserEmail,
        projectId: selectedProjectId,
        entryId,
      });
      toast.success("Post deleted successfully");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete post");
    }
  };

  const openPostComposer = () => {
    setEditingTimelinePost(null);
    setTimelinePostComposerOpen(true);
  };


  const projects = projectWorkspace?.projects ?? [];
  const eligibleUsers = useMemo(
    () =>
      (users ?? []).filter(
        (entry) => entry.status === "APPROVED" && (entry.role === "USER" || entry.role === "TEAM"),
      ),
    [users],
  );

  const filteredProjects = useMemo(() => {
    const needle = projectSearch.trim().toLowerCase();
    if (!needle) return projects;
    return projects.filter((project) => {
      const memberMatch = project.members.some((member) =>
        `${member.userName} ${member.userEmail}`.toLowerCase().includes(needle),
      );
      return project.name.toLowerCase().includes(needle) || memberMatch;
    });
  }, [projects, projectSearch]);

  const filteredUsers = useMemo(() => {
    const needle = memberSearch.trim().toLowerCase();
    if (!needle) return eligibleUsers;
    return eligibleUsers.filter((entry) =>
      `${entry.name} ${entry.email}`.toLowerCase().includes(needle),
    );
  }, [eligibleUsers, memberSearch]);

  useEffect(() => {
    if (selectedProjectId && !projects.some((project) => project.projectId === selectedProjectId)) {
      setSelectedProjectId("");
      setComposerDialogOpen(false);
    }
  }, [projects, selectedProjectId]);

  useEffect(() => {
    if (!projectDetail) return;
    setPromptDraft(projectDetail.questionConfig);
    setPlanningFields(projectDetail.planningFields?.length ? projectDetail.planningFields : [createEmptyCheckpointField()]);
  }, [projectDetail]);

  const toggleMember = (email: string) => {
    setSelectedEmails((prev) =>
      prev.includes(email) ? prev.filter((value) => value !== email) : [...prev, email],
    );
  };

  const [editTab, setEditTab] = useState<"info" | "members">("info");

  const openCreateDialog = () => {
    setEditingProjectId(undefined);
    setProjectName("");
    setSelectedEmails([]);
    setMemberSearch("");
    setPlanningFields([createEmptyCheckpointField()]);
    setWizardStep(1);
    setWizardCoverImageUrl("");
    setCreateDialogOpen(true);
  };

  const openEditDialog = () => {
    if (!projectDetail) return;
    setEditingProjectId(projectDetail.projectId);
    setProjectName(projectDetail.name);
    setSelectedEmails(projectDetail.members.map((member) => member.userEmail));
    setMemberSearch("");
    setPlanningFields(projectDetail.planningFields?.length ? projectDetail.planningFields : [createEmptyCheckpointField()]);
    setWizardStep(1);
    setEditTab("info");
    setWizardCoverImageUrl(projectDetail.teamImageUrl ?? "");
    setCreateDialogOpen(true);
  };

  const openComposer = (mode: "post" | "checkpoint" = "post") => {
    if (!selectedProjectId) return;
    setComposerMode(mode);
    setComposerDialogOpen(true);
    setEmojiPickerOpen(false);
  };

  const handleCreateProject = async () => {
    if (!projectName.trim()) {
      toast.error("Please enter a project name.");
      return;
    }
    const res = await upsertProjectMut({
      actorEmail: currentUserEmail,
      projectId: editingProjectId,
      name: projectName,
      memberEmails: selectedEmails,
      planningFields: planningFields
        .map((f, i) => ({ ...f, fieldId: (f as any).fieldId || crypto.randomUUID(), position: i }))
        .filter((f) => f.label.trim()),
    });
    if (wizardCoverImageUrl.trim()) {
      const pid = editingProjectId || (res as any)?.projectId;
      if (pid) {
        await updateProjectIdentityMut({
          projectId: pid,
          userEmail: currentUserEmail,
          name: projectName,
          teamImageUrl: wizardCoverImageUrl.trim(),
        });
      }
    }
    toast.success(editingProjectId ? "Project group updated." : "Project group created.");
    setCreateDialogOpen(false);
    setEditingProjectId(undefined);
    setProjectName("");
    setSelectedEmails([]);
    setMemberSearch("");
    setPlanningFields([createEmptyCheckpointField()]);
  };


  const handleSavePrompts = async () => {
    if (!projectDetail) return;
    await updateQuestionConfigMut({
      actorEmail: currentUserEmail,
      projectId: projectDetail.projectId,
      questionConfig: promptDraft,
    });
    
    // Also save dynamic planning fields if they've been adjusted in the details view
    await updatePlanningFieldsMut({
      actorEmail: currentUserEmail,
      projectId: projectDetail.projectId,
      fields: planningFields.map((f, i) => ({ 
        ...f, 
        fieldId: (f as any).fieldId || crypto.randomUUID(), 
        position: i 
      })).filter(f => f.label.trim())
    });
    
    toast.success("Project planning questions updated.");
  };

  const openReviewDialog = (stage: "setup", approve: boolean) => {
    setReviewAction({ stage, approve });
    setAdminComment("");
    setReviewDialogOpen(true);
  };

  const handleReviewSetup = (approve: boolean) => openReviewDialog("setup", approve);

  const handleConfirmReview = async () => {
    if (!projectDetail || !reviewAction) return;
    const { approve } = reviewAction;
    const rejectionNote = approve ? undefined : adminComment.trim() || "Rejected by admin.";
    try {
      await reviewTeamSetupMut({ actorEmail: currentUserEmail, projectId: projectDetail.projectId, approve, rejectionNote });
      if (approve && adminComment.trim()) {
        await addTimelinePostMut({
          userEmail: currentUserEmail,
          projectId: projectDetail.projectId,
          kind: "note",
          body: `Admin note on Team Setup approval: ${adminComment.trim()}`,
          images: [],
          videos: [],
          links: [],
        });
      }
      toast.success(approve ? "Team Setup approved! Project is now active." : "Feedback sent to the team.");
      setReviewDialogOpen(false);
      setReviewAction(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Review action failed");
    }
  };


  const handleLifecycleChange = async (status: "ACTIVE" | "COMPLETED" | "ARCHIVED") => {
    if (!projectDetail) return;
    await setLifecycleStatusMut({
      actorEmail: currentUserEmail,
      projectId: projectDetail.projectId,
      status,
    });
    toast.success(
      status === "ACTIVE"
        ? "Project activated and visible to team!"
        : status === "COMPLETED"
        ? "Project marked completed."
        : "Project archived.",
    );
  };


  const handleDeleteProject = async () => {
    if (!projectDetail) return;
    const confirmed = window.confirm(
      `Delete "${projectDetail.name}" permanently? This removes the project card, timeline, checkpoints, likes, and project item links.`,
    );
    if (!confirmed) return;

    await deleteProjectMut({
      actorEmail: currentUserEmail,
      projectId: projectDetail.projectId,
    });
    toast.success("Project deleted permanently.");
    setSelectedProjectId("");
  };

  const handleCreateCheckpoint = async () => {
    if (!projectDetail) return;
    await createCheckpointFormMut({
      userEmail: currentUserEmail,
      projectId: projectDetail.projectId,
      title: checkpointTitle,
      description: checkpointDescription,
      allowMemberResponses: checkpointAllowResponses,
      fields: checkpointFields
        .map((field) => ({
          label: field.label.trim(),
          fieldType: field.fieldType,
          required: field.required,
        }))
        .filter((field) => field.label),
    });
    toast.success("Checkpoint added.");
    setCheckpointTitle("");
    setCheckpointDescription("");
    setCheckpointAllowResponses(true);
    setCheckpointFields([createEmptyCheckpointField()]);
    setComposerDialogOpen(false);
  };

  const handlePublishPost = async () => {
    if (!projectDetail) return;
    await addTimelinePostMut({
      userEmail: currentUserEmail,
      projectId: projectDetail.projectId,
      kind: postKind,
      body: postBody,
      images: postImages.map((image) => image.trim()).filter(Boolean),
      videos: postVideos.map((video) => video.trim()).filter(Boolean),
      links: postLinks
        .map((link) => ({ label: link.label.trim(), url: link.url.trim() }))
        .filter((link) => link.label && link.url),
    });
    toast.success("Timeline update posted.");
    setPostBody("");
    setPostImages([""]);
    setPostVideos([""]);
    setPostLinks([{ label: "", url: "" }]);
    setPostKind("question");
    setEmojiPickerOpen(false);
    setComposerDialogOpen(false);
  };

  const renderTimelineCard = (item: ProjectDetailRecord["timeline"][number]) => {
    if (!projectDetail) return null;

    if (item.itemType === "system") {
      return (
        <Card className="rounded-[1.5rem] border-slate-200 bg-white p-5 shadow-none">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-xl font-bold text-slate-900">{item.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p>
            </div>
            <Badge className={getStatusBadgeClass(item.status)}>{item.status}</Badge>
          </div>


        </Card>
      );
    }

    if (item.itemType === "checkpoint") {
      return (
        <Card className="rounded-[1.5rem] border-slate-200 bg-white p-5 shadow-none">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-xl font-bold text-slate-900">{item.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p>
            </div>
            <Badge className={getStatusBadgeClass(item.status)}>{item.status}</Badge>
          </div>

          <div className="mt-4 space-y-2">
            {item.fields.map((field) => (
              <div key={field.fieldId} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="font-semibold text-slate-900">{field.label}</p>
                <p className="mt-1 text-xs uppercase tracking-[0.22em] text-slate-400">
                  {String(field.fieldType).replace(/_/g, " ")}
                </p>
              </div>
            ))}
          </div>

          {item.responses.length > 0 ? (
            <div className="mt-5 space-y-3">
              <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Responses</p>
              {item.responses.map((response) => (
                <div key={response.responseId} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="font-semibold text-slate-900">{response.submittedByName}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {response.submittedByRole} • {formatDateTime(response.updatedAt)}
                  </p>
                  <div className="mt-3 space-y-3">
                    {response.values.map((value) => (
                      <div key={`${response.responseId}-${value.fieldId}`}>
                        <p className="text-xs uppercase tracking-[0.22em] text-slate-400">{value.label}</p>
                        <div className="mt-2 text-sm text-slate-700">
                          {value.multiValues && value.multiValues.length > 0 ? (
                            <div className="space-y-1">
                              {value.multiValues.map((entry, index) => (
                                <p key={`${entry}-${index}`}>{entry}</p>
                              ))}
                            </div>
                          ) : (
                            <p>{value.singleValue || "No response"}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </Card>
      );
    }

    if (item.itemType === "post") {
      return (
        <InteractiveTimelinePostCard
          key={item.id}
          post={item}
          projectDetail={projectDetail}
          currentUserEmail={currentUserEmail}
          currentUserRole="ADMIN"
          onEditPost={handleEditTimelinePost}
          onDeletePost={handleDeleteTimelinePost}
        />
      );
    }

    return null;
  };


  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Projects</h2>
          <p className="text-muted-foreground">
            Manage project groups, approvals, checkpoints, and the project timeline.
          </p>
        </div>
        <Button className="bg-slate-900 hover:bg-slate-800" onClick={openCreateDialog}>
          <Plus className="mr-2 h-4 w-4" />
          Create Project
        </Button>
      </div>

      {!projects.length ? (
        <Card className="rounded-[1.75rem] border-slate-200 bg-white p-8 shadow-sm">
          <div className="max-w-xl space-y-3">
            <div className="inline-flex rounded-full border border-slate-200 bg-slate-50 p-3 text-slate-600">
              <FolderKanban className="h-5 w-5" />
            </div>
            <h3 className="text-2xl font-black tracking-tight text-slate-900">No Projects Yet</h3>
            <p className="text-sm leading-6 text-slate-600">
              Create the first project group to start approvals, discussions, and the timeline workflow.
            </p>
          </div>
        </Card>
      ) : !selectedProjectId || !projectDetail ? (
        <div className="space-y-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.28em] text-slate-400">Project Groups</p>
              <h2 className="text-4xl font-black tracking-tight text-slate-900">Project Cards</h2>
              <p className="text-sm leading-6 text-slate-500 max-w-lg">
                Start from the card grid, then open any project to review its timeline, 
                approvals, and team activity.
              </p>
            </div>

            <div className="w-full lg:max-w-sm">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  value={projectSearch}
                  onChange={(event) => setProjectSearch(event.target.value)}
                  placeholder="Search project or member"
                  className="h-12 border-slate-200 bg-white shadow-sm rounded-2xl pl-11 pr-5 text-sm"
                />
              </div>
            </div>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
            {filteredProjects.map((project) => (
              <AdminProjectCardTile
                key={project.projectId}
                project={project}
                selected={project.projectId === selectedProjectId}
                onOpen={() => {
                  setSelectedProjectId(project.projectId);
                  setLeftRailCollapsed(true);
                }}
              />
            ))}
          </div>
        </div>
      ) : (
        <div className={`grid gap-6 ${leftRailCollapsed ? "xl:grid-cols-1" : "xl:grid-cols-[0.88fr_1.12fr]"}`}>
          {!leftRailCollapsed ? (
            <Card className="rounded-[1.75rem] border-slate-200 bg-white p-5 shadow-sm">
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.28em] text-slate-400">Project Groups</p>
                    <h3 className="text-2xl font-black tracking-tight text-slate-900">Browse Projects</h3>
                  </div>
                  <Button variant="outline" className="border-slate-200" onClick={() => setSelectedProjectId("")}>
                    <LayoutGrid className="mr-2 h-4 w-4" />
                    Grid
                  </Button>
                </div>

                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    value={projectSearch}
                    onChange={(event) => setProjectSearch(event.target.value)}
                    placeholder="Search project or member"
                    className="border-slate-200 bg-slate-50 pl-9"
                  />
                </div>

                <div className="space-y-4">
                  {filteredProjects.map((project) => (
                    <AdminProjectCardTile
                      key={project.projectId}
                      project={project}
                      onOpen={() => setSelectedProjectId(project.projectId)}
                      selected={selectedProjectId === project.projectId}
                    />
                  ))}

                </div>
              </div>
            </Card>
          ) : null}

          <div className="neumorph-card overflow-hidden bg-white">
            <div className="sticky top-0 z-20 border-b border-slate-200/90 bg-white/95 px-6 py-5 backdrop-blur shadow-xs">
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex items-center gap-4">
                    <ProjectAvatar imageUrl={projectDetail.teamImageUrl} label={projectDetail.name} className="h-16 w-16" />
                    <div>
                      <p className="text-xs uppercase tracking-[0.28em] text-slate-400">Selected Project</p>
                      <h3 className="text-3xl font-black tracking-tight text-slate-900">{projectDetail.name}</h3>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <Badge className={getStatusBadgeClass(projectDetail.status)}>{projectDetail.status}</Badge>
                        <span className="text-xs text-slate-500">
                          Created {formatDateOnly(projectDetail.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 items-center">
                    <Button variant="outline" className="neumorph-btn text-xs font-semibold text-slate-700" onClick={openEditDialog}>
                      <Users className="mr-1.5 h-3.5 w-3.5 text-slate-500" />
                      Edit Members
                    </Button>
                    {projectDetail.status !== "ACTIVE" && projectDetail.status !== "COMPLETED" && projectDetail.status !== "ARCHIVED" && (
                      <Button className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl" onClick={() => handleLifecycleChange("ACTIVE")}>
                        <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                        Activate Project
                      </Button>
                    )}
                    {projectDetail.status === "ACTIVE" ? (
                      <Button variant="outline" className="neumorph-btn text-xs font-semibold text-slate-700" onClick={() => handleLifecycleChange("COMPLETED")}>
                        Mark Completed
                      </Button>
                    ) : null}
                    {projectDetail.status !== "ARCHIVED" ? (
                      <Button variant="outline" className="neumorph-btn text-xs font-semibold text-slate-700" onClick={() => handleLifecycleChange("ARCHIVED")}>
                        Archive
                      </Button>
                    ) : (
                      <Button className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl" onClick={() => handleLifecycleChange("ACTIVE")}>
                        <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                        Restore to Active
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      className="border-rose-200 text-rose-600 hover:border-rose-300 hover:bg-rose-50 text-xs rounded-xl"
                      onClick={handleDeleteProject}
                    >
                      <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                      Delete
                    </Button>

                    <Button
                      variant="outline"
                      className="neumorph-btn text-xs font-semibold text-slate-700"
                      onClick={() => setLeftRailCollapsed((prev) => !prev)}
                    >
                      {leftRailCollapsed ? (
                        <>
                          <PanelLeftOpen className="mr-1.5 h-3.5 w-3.5" />
                          Show Cards
                        </>
                      ) : (
                        <>
                          <PanelLeftClose className="mr-1.5 h-3.5 w-3.5" />
                          Collapse Cards
                        </>
                      )}
                    </Button>
                    <Button variant="outline" className="neumorph-btn text-xs font-semibold text-slate-700" onClick={() => setSelectedProjectId("")}>
                      <ChevronLeft className="mr-1.5 h-3.5 w-3.5" />
                      Back
                    </Button>
                  </div>
                </div>

                {/* 3-Tab Navigator Row */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2 border-t border-slate-100">
                  <div className="neumorph-tab-group">
                    <button
                      type="button"
                      className={`neumorph-tab-item ${activeTab === "profile" ? "active" : ""}`}
                      onClick={() => setActiveTab("profile")}
                    >
                      <FolderKanban className="h-4 w-4" />
                      Project Profile
                    </button>
                    <button
                      type="button"
                      className={`neumorph-tab-item ${activeTab === "post" ? "active" : ""}`}
                      onClick={() => setActiveTab("post")}
                    >
                      <Edit3 className="h-4 w-4" />
                      Project Post
                    </button>
                    <button
                      type="button"
                      className={`neumorph-tab-item ${activeTab === "report" ? "active" : ""}`}
                      onClick={() => setActiveTab("report")}
                    >
                      <FileText className="h-4 w-4" />
                      Project Report
                    </button>
                  </div>

                  <div className="flex -space-x-2">
                    {projectDetail.members.map((member) => (
                      <ProjectAvatar
                        key={member.userEmail}
                        imageUrl={member.profileImageUrl}
                        label={member.userName}
                        className="h-8 w-8 border-2 border-white shadow-xs"
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Pending review banner */}
            {projectDetail.status === "SETUP_PENDING" && (
              <div className="border-b border-amber-200 bg-amber-50 px-6 py-3.5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <div className="h-2.5 w-2.5 animate-pulse rounded-full bg-amber-500 shrink-0" />
                  <p className="text-sm font-semibold text-amber-900">
                    Team Setup submitted — review profiles and team identity
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold h-8"
                    onClick={() => openReviewDialog("setup", true)}
                  >
                    Approve Setup
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-rose-200 text-rose-700 hover:bg-rose-50 rounded-xl text-xs font-semibold h-8"
                    onClick={() => openReviewDialog("setup", false)}
                  >
                    Reject Setup
                  </Button>
                </div>
              </div>
            )}

            {/* 3-Tab Content Panes */}
            <div className="p-4 md:p-6 bg-slate-50/40">
              {activeTab === "profile" && (
                <ProjectProfilePanel
                  projectDetail={projectDetail}
                  userEmail={currentUserEmail}
                />
              )}
              {activeTab === "post" && (
                <ProjectPostPanel
                  projectDetail={projectDetail}
                  userEmail={currentUserEmail}
                />
              )}
              {activeTab === "report" && (
                <ProjectReportGenerator
                  projectId={projectDetail.projectId}
                  userEmail={currentUserEmail}
                  projectDetail={projectDetail}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Admin Review Dialog ── */}
      <Dialog open={reviewDialogOpen} onOpenChange={(open) => { if (!open) { setReviewDialogOpen(false); setReviewAction(null); } }}>
        <DialogContent className="border-slate-200 bg-white sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-black">
              {reviewAction?.approve ? "Approve Team Setup" : "Reject Team Setup"}
            </DialogTitle>
          </DialogHeader>

          {projectDetail && (
            <div className="space-y-5 py-2">
              <div className="space-y-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Team Submission — Team Setup</p>

                {/* Team image */}
                {projectDetail.teamImageUrl && (
                  <div className="space-y-1">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Team Image</p>
                    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                      <ImageWithLightbox src={projectDetail.teamImageUrl} alt="Team" className="w-full h-auto max-h-[260px] object-contain" />
                    </div>
                  </div>
                )}

                {/* Member profiles */}
                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Member Profiles</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {projectDetail.members.map((m) => (
                      <div key={m.userEmail} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                        <div className="flex items-center gap-3 mb-2">
                          {m.profileImageUrl ? (
                            <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full border border-slate-200">
                              <ImageWithLightbox src={m.profileImageUrl} alt={m.userName} className="h-12 w-12 object-cover" />
                            </div>
                          ) : (
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-slate-200 text-slate-500 text-xs font-bold">
                              {m.userName.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div>
                            <p className="font-semibold text-slate-900">{m.userName}</p>
                            <p className="text-xs text-slate-500">{m.userRole}</p>
                          </div>
                        </div>
                        {m.projectNote ? (
                          <p className="text-sm text-slate-600">{m.projectNote}</p>
                        ) : (
                          <p className="text-xs text-amber-600 italic">No note added</p>
                        )}
                        {!m.profileImageUrl && (
                          <p className="text-xs text-red-500 italic mt-1">Profile image missing</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Admin overall comment */}
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                  {reviewAction?.approve ? "Overall note for the team (optional)" : "Rejection feedback for the team (required)"}
                </label>
                <Textarea
                  value={adminComment}
                  onChange={(e) => setAdminComment(e.target.value)}
                  placeholder={reviewAction?.approve ? "Great work! Everything looks good…" : "Please revise because…"}
                  className="min-h-[90px] border-slate-200 bg-slate-50"
                />
                {reviewAction?.approve && (
                  <p className="text-xs text-slate-400">If provided, this will be posted to the project timeline as an admin note.</p>
                )}
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" className="border-slate-200" onClick={() => setReviewDialogOpen(false)}>
              Cancel
            </Button>
            {reviewAction?.approve ? (
              <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleConfirmReview}>
                Confirm Approval (Activate Project)
              </Button>
            ) : (
              <Button
                variant="outline"
                className="border-red-200 text-red-600 hover:bg-red-50"
                disabled={!adminComment.trim()}
                onClick={handleConfirmReview}
              >
                Send Feedback &amp; Reject
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── 3-Step Project Creation Wizard ── */}
      <Dialog
        open={createDialogOpen}
        onOpenChange={(open) => {
          setCreateDialogOpen(open);
          if (!open) {
            setEditingProjectId(undefined);
            setWizardStep(1);
          }
        }}
      >
        <DialogContent className="border-slate-200 bg-white sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-black">
              {editingProjectId ? "Edit Project Group" : "Create New Project"}
            </DialogTitle>
          </DialogHeader>

          {/* Step indicator */}
          {!editingProjectId && (
            <div className="wizard-step-indicator">
              {[{ n: 1, label: "Identity" }, { n: 2, label: "Members" }, { n: 3, label: "Planning" }].map((s, i) => (
                <>
                  <div key={s.n} className="wizard-step-dot">
                    <div className={`wizard-step-circle ${
                      s.n < wizardStep ? "wizard-step-circle-done" :
                      s.n === wizardStep ? "wizard-step-circle-current" :
                      "wizard-step-circle-future"
                    }`}>
                      {s.n < wizardStep ? <Check className="h-4 w-4" /> : s.n}
                    </div>
                    <span className={`wizard-step-label ${
                      s.n < wizardStep ? "wizard-step-label-done" :
                      s.n === wizardStep ? "wizard-step-label-current" :
                      "wizard-step-label-future"
                    }`}>{s.label}</span>
                  </div>
                  {i < 2 && (
                    <div className={`wizard-connector ${s.n < wizardStep ? "wizard-connector-done" : "wizard-connector-future"}`} />
                  )}
                </>
              ))}
            </div>
          )}

          {/* ── Edit Mode: Tabs for Info & Members ── */}
          {editingProjectId ? (
            <div className="space-y-4 py-2">
              <div className="flex gap-2 p-1 bg-slate-100 rounded-xl">
                <button
                  type="button"
                  onClick={() => setEditTab("info")}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
                    editTab === "info" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <FolderKanban className="inline-block mr-1.5 h-3.5 w-3.5" />
                  Project Info
                </button>
                <button
                  type="button"
                  onClick={() => setEditTab("members")}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
                    editTab === "members" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Users className="inline-block mr-1.5 h-3.5 w-3.5" />
                  Project Members ({selectedEmails.length})
                </button>
              </div>

              {editTab === "info" && (
                <div className="wizard-panel space-y-4 py-2">
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 block mb-1.5">Project Name *</label>
                    <Input
                      value={projectName}
                      onChange={(e) => setProjectName(e.target.value)}
                      placeholder="e.g. Smart Greenhouse System"
                      className="border-slate-200 bg-slate-50 text-base font-semibold h-12 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 block mb-1.5">Cover / Team Image URL</label>
                    <Input
                      value={wizardCoverImageUrl}
                      onChange={(e) => setWizardCoverImageUrl(e.target.value)}
                      placeholder="https://... (Drive or direct image URL)"
                      className="border-slate-200 bg-slate-50 rounded-xl"
                    />
                  </div>
                  <div className="wizard-cover-preview">
                    {wizardCoverImageUrl.trim() ? (
                      <img
                        src={normalizeImageUrl(wizardCoverImageUrl.trim())}
                        alt="Cover preview"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-slate-400">
                        <FolderKanban className="h-8 w-8" />
                        <span className="text-xs">Cover image preview</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {editTab === "members" && (
                <div className="wizard-panel space-y-4 py-2">
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 block mb-1.5">Search & Select Members</label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <Input value={memberSearch} onChange={(e) => setMemberSearch(e.target.value)} placeholder="Search by name or email..." className="border-slate-200 bg-slate-50 pl-9 rounded-xl" />
                    </div>
                  </div>

                  {selectedEmails.length > 0 && (
                    <div className="wizard-selected-strip">
                      {selectedEmails.map((email) => {
                        const u = (users ?? []).find((x) => x.email === email);
                        if (!u) return null;
                        return (
                          <div key={email} className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700">
                            <span className="h-5 w-5 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-[10px]">{u.name.charAt(0)}</span>
                            {u.name}
                            <button type="button" onClick={() => toggleMember(email)} className="text-slate-400 hover:text-red-500 transition-colors">×</button>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <div className="max-h-[280px] space-y-2 overflow-y-auto">
                    {filteredUsers.map((entry) => (
                      <div
                        key={entry.email}
                        className={`wizard-member-row ${selectedEmails.includes(entry.email) ? "selected" : ""}`}
                        onClick={() => toggleMember(entry.email)}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-sm ${
                            selectedEmails.includes(entry.email) ? "bg-indigo-500 text-white" : "bg-slate-100 text-slate-600"
                          }`}>
                            {selectedEmails.includes(entry.email) ? <Check className="h-4 w-4" /> : entry.name.charAt(0)}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-900">{entry.name}</p>
                            <p className="text-xs text-slate-500">{entry.email}</p>
                          </div>
                        </div>
                        <Badge variant="outline" className="border-slate-200 text-xs">{entry.role}</Badge>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-slate-400">{selectedEmails.length} member{selectedEmails.length !== 1 ? "s" : ""} selected for this project</p>
                </div>
              )}
            </div>
          ) : (
            <>
              {/* ── Step 1: Identity ── */}
              {wizardStep === 1 && (
                <div className="wizard-panel space-y-4 py-2">
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 block mb-1.5">Project Name *</label>
                    <Input
                      value={projectName}
                      onChange={(e) => setProjectName(e.target.value)}
                      placeholder="e.g. Smart Greenhouse System"
                      className="border-slate-200 bg-slate-50 text-base font-semibold h-12 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 block mb-1.5">Cover / Team Image URL (optional)</label>
                    <Input
                      value={wizardCoverImageUrl}
                      onChange={(e) => setWizardCoverImageUrl(e.target.value)}
                      placeholder="https://... (Drive or direct image URL)"
                      className="border-slate-200 bg-slate-50 rounded-xl"
                    />
                  </div>
                  {/* Live preview */}
                  <div className="wizard-cover-preview">
                    {wizardCoverImageUrl.trim() ? (
                      <img
                        src={normalizeImageUrl(wizardCoverImageUrl.trim())}
                        alt="Cover preview"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-slate-400">
                        <FolderKanban className="h-8 w-8" />
                        <span className="text-xs">Cover image preview</span>
                      </div>
                    )}
                  </div>
                  <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-xs text-blue-700">
                    <strong>Workflow overview:</strong> After creation, team members complete Team Setup. Once approved by an admin, the project immediately becomes Active for timeline posting, item tracking, and checkpoints.
                  </div>
                </div>
              )}

              {/* ── Step 2: Members ── */}
              {wizardStep === 2 && (
                <div className="wizard-panel space-y-4 py-2">
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 block mb-1.5">Search Members</label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <Input value={memberSearch} onChange={(e) => setMemberSearch(e.target.value)} placeholder="Name or email" className="border-slate-200 bg-slate-50 pl-9 rounded-xl" />
                    </div>
                  </div>

                  {/* Selected preview strip */}
                  {selectedEmails.length > 0 && (
                    <div className="wizard-selected-strip">
                      {selectedEmails.map((email) => {
                        const u = (users ?? []).find((x) => x.email === email);
                        if (!u) return null;
                        return (
                          <div key={email} className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700">
                            <span className="h-5 w-5 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-[10px]">{u.name.charAt(0)}</span>
                            {u.name}
                            <button type="button" onClick={() => toggleMember(email)} className="text-slate-400 hover:text-red-500 transition-colors">×</button>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <div className="max-h-[280px] space-y-2 overflow-y-auto">
                    {filteredUsers.map((entry) => (
                      <div
                        key={entry.email}
                        className={`wizard-member-row ${selectedEmails.includes(entry.email) ? "selected" : ""}`}
                        onClick={() => toggleMember(entry.email)}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-sm ${
                            selectedEmails.includes(entry.email) ? "bg-indigo-500 text-white" : "bg-slate-100 text-slate-600"
                          }`}>
                            {selectedEmails.includes(entry.email) ? <Check className="h-4 w-4" /> : entry.name.charAt(0)}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-900">{entry.name}</p>
                            <p className="text-xs text-slate-500">{entry.email}</p>
                          </div>
                        </div>
                        <Badge variant="outline" className="border-slate-200 text-xs">{entry.role}</Badge>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-slate-400">{selectedEmails.length} member{selectedEmails.length !== 1 ? "s" : ""} selected</p>
                </div>
              )}

              {/* ── Step 3: Planning form builder ── */}
              {wizardStep === 3 && (
                <div className="wizard-panel space-y-4 py-2">
                  <div className="rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-3 text-xs text-indigo-700">
                    <strong>Planning Step Questions</strong> — These questions will be shown to team members during the Planning stage. Leave empty to use defaults.
                  </div>
                  <div className="space-y-3">
                    {planningFields.map((field, index) => (
                      <div key={`wizard-planning-field-${index}`} className="wizard-field-row">
                        <Input
                          value={field.label}
                          onChange={(e) => setPlanningFields((prev) => prev.map((entry, i) => i === index ? { ...entry, label: e.target.value } : entry))}
                          placeholder="Question / field label"
                          className="border-slate-200 bg-white text-sm rounded-lg h-9"
                        />
                        <Select value={field.fieldType} onValueChange={(v) => setPlanningFields((prev) => prev.map((entry, i) => i === index ? { ...entry, fieldType: v as CheckpointFieldType } : entry))}>
                          <SelectTrigger className="border-slate-200 bg-white rounded-lg h-9 text-xs">
                            <SelectValue placeholder="Type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="short_text">Short text</SelectItem>
                            <SelectItem value="long_text">Long text</SelectItem>
                            <SelectItem value="number">Number</SelectItem>
                            <SelectItem value="date">Date</SelectItem>
                            <SelectItem value="link">Link</SelectItem>
                            <SelectItem value="image_links">Image links</SelectItem>
                            <SelectItem value="video_links">Video links</SelectItem>
                            <SelectItem value="labeled_links">Labeled links</SelectItem>
                          </SelectContent>
                        </Select>
                        <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
                          <Checkbox checked={field.required} onCheckedChange={(v) => setPlanningFields((prev) => prev.map((entry, i) => i === index ? { ...entry, required: Boolean(v) } : entry))} />
                          Req
                        </label>
                        <Button type="button" variant="ghost" size="sm" className="h-9 w-9 p-0 text-slate-400 hover:text-red-500"
                          onClick={() => setPlanningFields((prev) => prev.length === 1 ? [createEmptyCheckpointField()] : prev.filter((_, i) => i !== index))}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    <Button type="button" variant="outline" className="w-full border-dashed border-indigo-200 text-indigo-600 hover:bg-indigo-50 rounded-xl"
                      onClick={() => setPlanningFields((prev) => [...prev, createEmptyCheckpointField()])}>
                      <Plus className="mr-2 h-4 w-4" /> Add Question
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Footer navigation */}
          <DialogFooter className="gap-2 flex-col sm:flex-row">
            <Button variant="outline" className="border-slate-200" onClick={() => {
              if (wizardStep > 1 && !editingProjectId) setWizardStep((s) => s - 1);
              else { setCreateDialogOpen(false); setEditingProjectId(undefined); setWizardStep(1); }
            }}>
              {wizardStep > 1 && !editingProjectId ? <><ChevronLeft className="mr-1 h-4 w-4" /> Back</> : "Cancel"}
            </Button>
            {(wizardStep < 3 && !editingProjectId) ? (
              <Button className="bg-indigo-600 hover:bg-indigo-700" onClick={() => setWizardStep((s) => s + 1)} disabled={wizardStep === 1 && !projectName.trim()}>
                Next <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            ) : (
              <Button className="bg-slate-900 hover:bg-slate-800" onClick={handleCreateProject}>
                {editingProjectId ? "Save Changes" : "Create Project"}
              </Button>
            )}
          </DialogFooter>

        </DialogContent>
      </Dialog>

      <Dialog open={composerDialogOpen} onOpenChange={setComposerDialogOpen}>
        <DialogContent className="border-slate-200 bg-white sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{composerMode === "checkpoint" ? "Add Project Checkpoint" : "Post To Timeline"}</DialogTitle>
          </DialogHeader>
          {!projectDetail ? (
            <div className="py-8 text-sm text-slate-500">Loading project details...</div>
          ) : (
            <div className="space-y-5 py-2">
              <div className="inline-flex rounded-full border border-slate-200 bg-slate-50 p-1 text-xs font-semibold">
                <button
                  type="button"
                  className={`rounded-full px-4 py-2 ${composerMode === "post" ? "bg-slate-900 text-white" : "text-slate-600"}`}
                  onClick={() => setComposerMode("post")}
                >
                  Timeline Post
                </button>
                <button
                  type="button"
                  className={`rounded-full px-4 py-2 ${composerMode === "checkpoint" ? "bg-slate-900 text-white" : "text-slate-600"}`}
                  onClick={() => setComposerMode("checkpoint")}
                >
                  Add Checkpoint
                </button>
              </div>

              {composerMode === "post" ? (
                <div className="space-y-4">
                  <Select value={postKind} onValueChange={(value) => setPostKind(value as "comment" | "note" | "question")}>
                    <SelectTrigger className="border-slate-200 bg-slate-50">
                      <SelectValue placeholder="Post type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="comment">Comment</SelectItem>
                      <SelectItem value="note">Note</SelectItem>
                      <SelectItem value="question">Question</SelectItem>
                    </SelectContent>
                  </Select>
                  <Textarea value={postBody} onChange={(event) => setPostBody(event.target.value)} className="min-h-[150px] border-slate-200 bg-slate-50" placeholder="Write a project update or question..." />
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="outline" className="border-slate-200" onClick={() => setEmojiPickerOpen((prev) => !prev)}>
                      <MessageSquare className="mr-2 h-4 w-4" />
                      Emoji Options
                    </Button>
                    <Button type="button" variant="outline" className="border-slate-200" onClick={() => setComposerMode("checkpoint")}>
                      <ClipboardList className="mr-2 h-4 w-4" />
                      Add Checkpoint Instead
                    </Button>
                  </div>
                  {emojiPickerOpen ? (
                    <div className="flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      {EMOJIS.map((emoji) => (
                        <Button key={emoji} type="button" variant="outline" className="border-slate-200 bg-white text-lg" onClick={() => setPostBody((prev) => `${prev}${emoji}`)}>
                          {emoji}
                        </Button>
                      ))}
                    </div>
                  ) : null}
                  <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-700">Image links</label>
                      {postImages.map((value, index) => (
                        <Input key={`admin-post-image-${index}`} value={value} onChange={(event) => setPostImages((prev) => prev.map((entry, currentIndex) => currentIndex === index ? event.target.value : entry))} className="border-slate-200 bg-white" placeholder="https://..." />
                      ))}
                      <Button type="button" variant="outline" className="border-slate-200" onClick={() => setPostImages((prev) => [...prev, ""])}>
                        <Plus className="mr-2 h-4 w-4" />
                        Add Image
                      </Button>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-700">Video links</label>
                      {postVideos.map((value, index) => (
                        <Input key={`admin-post-video-${index}`} value={value} onChange={(event) => setPostVideos((prev) => prev.map((entry, currentIndex) => currentIndex === index ? event.target.value : entry))} className="border-slate-200 bg-white" placeholder="https://..." />
                      ))}
                      <Button type="button" variant="outline" className="border-slate-200" onClick={() => setPostVideos((prev) => [...prev, ""])}>
                        <Plus className="mr-2 h-4 w-4" />
                        Add Video
                      </Button>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-700">Links</label>
                      {postLinks.map((value, index) => (
                        <div key={`admin-post-link-${index}`} className="grid gap-2 md:grid-cols-[0.9fr_1.1fr]">
                          <Input value={value.label} onChange={(event) => setPostLinks((prev) => prev.map((entry, currentIndex) => currentIndex === index ? { ...entry, label: event.target.value } : entry))} className="border-slate-200 bg-white" placeholder="Label" />
                          <Input value={value.url} onChange={(event) => setPostLinks((prev) => prev.map((entry, currentIndex) => currentIndex === index ? { ...entry, url: event.target.value } : entry))} className="border-slate-200 bg-white" placeholder="https://..." />
                        </div>
                      ))}
                      <Button type="button" variant="outline" className="border-slate-200" onClick={() => setPostLinks((prev) => [...prev, { label: "", url: "" }])}>
                        <Plus className="mr-2 h-4 w-4" />
                        Add Link
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <Input value={checkpointTitle} onChange={(event) => setCheckpointTitle(event.target.value)} className="border-slate-200 bg-slate-50" placeholder="Checkpoint title" />
                  <Textarea value={checkpointDescription} onChange={(event) => setCheckpointDescription(event.target.value)} className="min-h-[120px] border-slate-200 bg-slate-50" placeholder="Explain what this checkpoint needs." />
                  <label className="flex items-center gap-3 text-sm font-medium text-slate-700">
                    <Checkbox checked={checkpointAllowResponses} onCheckedChange={(value) => setCheckpointAllowResponses(Boolean(value))} />
                    Allow project members to respond
                  </label>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                    {checkpointFields.map((field, index) => (
                      <div key={`admin-checkpoint-field-${index}`} className="grid gap-3 md:grid-cols-[1.2fr_0.9fr_auto_auto]">
                        <Input value={field.label} onChange={(event) => setCheckpointFields((prev) => prev.map((entry, currentIndex) => currentIndex === index ? { ...entry, label: event.target.value } : entry))} placeholder="Field label" className="border-slate-200 bg-white" />
                        <Select value={field.fieldType} onValueChange={(value) => setCheckpointFields((prev) => prev.map((entry, currentIndex) => currentIndex === index ? { ...entry, fieldType: value as CheckpointFieldType } : entry))}>
                          <SelectTrigger className="border-slate-200 bg-white">
                            <SelectValue placeholder="Field type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="short_text">Short text</SelectItem>
                            <SelectItem value="long_text">Long text</SelectItem>
                            <SelectItem value="number">Number</SelectItem>
                            <SelectItem value="date">Date</SelectItem>
                            <SelectItem value="link">Single link</SelectItem>
                            <SelectItem value="image_links">Image links</SelectItem>
                            <SelectItem value="video_links">Video links</SelectItem>
                            <SelectItem value="labeled_links">Labeled links</SelectItem>
                          </SelectContent>
                        </Select>
                        <label className="flex items-center gap-2 text-sm text-slate-600">
                          <Checkbox checked={field.required} onCheckedChange={(value) => setCheckpointFields((prev) => prev.map((entry, currentIndex) => currentIndex === index ? { ...entry, required: Boolean(value) } : entry))} />
                          Required
                        </label>
                        <Button type="button" variant="outline" className="border-slate-200" onClick={() => setCheckpointFields((prev) => prev.length === 1 ? [createEmptyCheckpointField()] : prev.filter((_, currentIndex) => currentIndex !== index))}>
                          Remove
                        </Button>
                      </div>
                    ))}
                    <Button type="button" variant="outline" className="border-slate-200" onClick={() => setCheckpointFields((prev) => [...prev, createEmptyCheckpointField()])}>
                      <Plus className="mr-2 h-4 w-4" />
                      Add Field
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" className="border-slate-200" onClick={() => setComposerDialogOpen(false)}>
              Cancel
            </Button>
            {composerMode === "post" ? (
              <Button className="bg-slate-900 hover:bg-slate-800" onClick={handlePublishPost}>
                <Send className="mr-2 h-4 w-4" />
                Post Update
              </Button>
            ) : (
              <Button className="bg-slate-900 hover:bg-slate-800" onClick={handleCreateCheckpoint}>
                <ClipboardList className="mr-2 h-4 w-4" />
                Add Checkpoint
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <TimelinePostComposerDialog
        open={timelinePostComposerOpen}
        onOpenChange={setTimelinePostComposerOpen}
        projectId={selectedProjectId}
        userEmail={currentUserEmail}
        editingPost={editingTimelinePost}
        canModerate={true}
        canPostMedia={true}
      />
    </section>
  );
}

