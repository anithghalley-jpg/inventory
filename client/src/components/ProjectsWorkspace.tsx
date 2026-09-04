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
  Edit3,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ClipboardList,
  Download,
  Eye,
  FileText,
  FolderKanban,
  Globe,
  LayoutGrid,
  Lock,
  MessageSquare,
  PanelLeftClose,
  PanelLeftOpen,
  Play,
  Plus,
  Search,
  Send,
  SlidersHorizontal,
  Sparkles,
  Star,
  UserRound,
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
  getProjectLifecycleCategory,
  getLifecycleBadgeInfo,
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
  type TimelinePostKind,
  type ProjectLifecycleCategory,
} from "@/components/projects/projectShared";
import ProjectProfilePanel from "./projects/ProjectProfilePanel";
import ProjectPostPanel from "./projects/ProjectPostPanel";
import ProjectReportGenerator from "./projects/ProjectReportGenerator";

interface ProjectsWorkspaceProps {
  workspace?: { projects: ProjectCardRecord[] };
  userEmail?: string;
}

type ResponseState = Record<string, Record<string, { singleValue: string; multiValueText: string }>>;

function fieldUsesMultipleLines(fieldType: CheckpointFieldType) {
  return fieldType === "image_links" || fieldType === "video_links" || fieldType === "labeled_links";
}

function ProjectCardTile({
  project,
  onOpen,
  onStar,
  onComment,
  selected = false,
  isMyProject = false,
}: {
  project: ProjectCardRecord;
  onOpen: () => void;
  onStar: () => void;
  onComment?: () => void;
  selected?: boolean;
  isMyProject?: boolean;
}) {
  const previewImage = project.teamImageUrl ?? project.boxImageUrl ?? "";
  const { percent } = getProjectProgress(project.status);
  const accentClass = getStatusAccentClass(project.status);
  const bgClass = getStatusBgClass(project.status);
  const lifecycle = getLifecycleBadgeInfo(project.status);
  const hasRecentActivity = isRecentActivity(project.lastActivityAt);

  return (
    <button
      type="button"
      onClick={onOpen}
      className={`project-card-premium group w-full text-left transition-all duration-300 ${bgClass} ${selected ? "selected" : ""}`}
    >
      {/* Accent strip */}
      <div className={`project-card-accent ${accentClass}`} />

      {/* Cover image container with floating badges */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200/70 bg-slate-100 shadow-sm mb-3.5">
        {previewImage ? (
          <img
            src={normalizeImageUrl(previewImage)}
            alt={project.name}
            className="h-44 w-full object-cover transition-transform duration-500 group-hover:scale-105"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="flex h-44 items-center justify-center bg-gradient-to-br from-slate-100 to-slate-50">
            <FolderKanban className="h-12 w-12 text-slate-300" />
          </div>
        )}

        {/* Floating status & membership tags */}
        <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between gap-1.5 pointer-events-none">
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold shadow-xs backdrop-blur-md border ${lifecycle.badgeClass} bg-white/90`}>
            <span className={`h-2 w-2 rounded-full shrink-0 ${lifecycle.dotClass}`} />
            <span>{lifecycle.label}</span>
          </span>

          {isMyProject ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold shadow-xs backdrop-blur-md bg-indigo-600/95 text-white border border-indigo-400/40">
              <UserRound className="h-3 w-3" />
              My Project
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold shadow-xs backdrop-blur-md bg-slate-900/80 text-slate-200 border border-slate-700/50">
              <FileText className="h-3 w-3" />
              Report
            </span>
          )}
        </div>
      </div>

      {/* Name + progress ring row */}
      <div className="flex items-start justify-between gap-2 mb-2 pl-1">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base font-black text-slate-900 leading-snug group-hover:text-indigo-600 transition-colors">
            {project.name}
          </h3>
          <div className="flex items-center gap-1.5 mt-0.5">
            {hasRecentActivity && <span className="project-activity-pulse" />}
            <RelativeTime value={project.lastActivityAt || project.updatedAt} />
            <span className="text-slate-300">•</span>
            <span className="text-[11px] text-slate-500 font-medium">{lifecycle.detailLabel}</span>
          </div>
        </div>
        <ProgressRing percent={percent} size={44} strokeWidth={4} />
      </div>

      {/* Members stack + actions */}
      <div className="flex items-center justify-between pl-1 pt-2 border-t border-slate-100 mt-2">
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

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            className="project-card-meta-chip text-amber-500 hover:bg-amber-50 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              onStar();
            }}
          >
            <Star className="h-3 w-3 fill-current" /> {project.likeCount}
          </button>
          
          {isMyProject && onComment && (
            <button
              type="button"
              className="project-card-meta-chip text-blue-500 hover:bg-blue-50 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                onComment();
              }}
              title="Post update"
            >
              <MessageSquare className="h-3 w-3" />
            </button>
          )}

          {!isMyProject && (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 group-hover:text-indigo-600 transition-colors pl-1">
              <Eye className="h-3.5 w-3.5" /> View
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

export default function ProjectsWorkspace({ workspace, userEmail }: ProjectsWorkspaceProps) {
  const projects = workspace?.projects ?? [];
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [lifecycleFilter, setLifecycleFilter] = useState<"ALL" | ProjectLifecycleCategory>("ALL");
  const [activeTab, setActiveTab] = useState<"profile" | "post" | "report">("profile");
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [identityDialogOpen, setIdentityDialogOpen] = useState(false);
  const [composerDialogOpen, setComposerDialogOpen] = useState(false);
  const [composerMode, setComposerMode] = useState<"post" | "checkpoint">("post");
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [profileImageUrl, setProfileImageUrl] = useState("");
  const [projectNote, setProjectNote] = useState("");
  const [projectNameDraft, setProjectNameDraft] = useState("");
  const [teamImageDraft, setTeamImageDraft] = useState("");
  const [postKind, setPostKind] = useState<TimelinePostKind>("comment");
  const [postBody, setPostBody] = useState("");
  const [postImages, setPostImages] = useState([""]);
  const [postVideos, setPostVideos] = useState([""]);
  const [postLinks, setPostLinks] = useState([{ label: "", url: "" }]);
  const [checkpointTitle, setCheckpointTitle] = useState("");
  const [checkpointDescription, setCheckpointDescription] = useState("");
  const [checkpointAllowResponses, setCheckpointAllowResponses] = useState(true);
  const [checkpointFields, setCheckpointFields] = useState([createEmptyCheckpointField()]);
  const [responseValues, setResponseValues] = useState<ResponseState>({});

  const projectDetail = useQuery(
    api.projects.getProjectDetail,
    selectedProjectId && userEmail ? { userEmail, projectId: selectedProjectId } : "skip",
  ) as ProjectDetailRecord | undefined;

  const updateProfileMut = useMutation(api.projects.updateMyProfile);
  const updateProjectIdentityMut = useMutation(api.projects.updateProjectIdentity);
  const addTimelinePostMut = useMutation(api.projects.addTimelinePost);
  const deleteTimelinePostMut = useMutation(api.projects.deleteTimelinePost);
  const createCheckpointFormMut = useMutation(api.projects.createCheckpointForm);
  const submitCheckpointResponseMut = useMutation(api.projects.submitCheckpointResponse);
  const toggleProjectLikeMut = useMutation(api.projects.toggleProjectLike);

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
        userEmail: userEmail ?? "",
        projectId: selectedProjectId,
        entryId,
      });
      toast.success("Post deleted successfully");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete post");
    }
  };

  // Determine if the viewer is a member of the selected project
  const isSelectedProjectMember = useMemo(() => {
    if (!projectDetail || !userEmail) return false;
    return Boolean(
      projectDetail.permissions.isMember ||
      projectDetail.members.some((m) => m.userEmail.toLowerCase() === userEmail.toLowerCase())
    );
  }, [projectDetail, userEmail]);

  // When a non-member opens another project, ensure activeTab is locked to 'report'
  useEffect(() => {
    if (projectDetail && !isSelectedProjectMember && activeTab !== "report") {
      setActiveTab("report");
    }
  }, [projectDetail, isSelectedProjectMember, activeTab]);

  // Filter projects by search query and lifecycle filter
  const filteredProjects = useMemo(() => {
    const needle = searchQuery.trim().toLowerCase();
    return projects.filter((project) => {
      const matchesSearch = !needle ||
        project.name.toLowerCase().includes(needle) ||
        project.members.some((member) =>
          `${member.userName} ${member.userEmail}`.toLowerCase().includes(needle),
        );

      const category = getProjectLifecycleCategory(project.status);
      const matchesCategory = lifecycleFilter === "ALL" || category === lifecycleFilter;

      return matchesSearch && matchesCategory;
    });
  }, [projects, searchQuery, lifecycleFilter]);

  // Split into "My Projects" and "Other Projects"
  const { myProjects, otherProjects } = useMemo(() => {
    const my: ProjectCardRecord[] = [];
    const other: ProjectCardRecord[] = [];
    const normalizedUserEmail = userEmail?.trim().toLowerCase() || "";

    filteredProjects.forEach((project) => {
      const isMember = Boolean(
        project.viewerIsMember ||
        (normalizedUserEmail && project.members.some((m) => m.userEmail.trim().toLowerCase() === normalizedUserEmail))
      );

      if (isMember) {
        my.push(project);
      } else {
        other.push(project);
      }
    });

    return { myProjects: my, otherProjects: other };
  }, [filteredProjects, userEmail]);

  // Global counts across all projects for the filter badges
  const categoryCounts = useMemo(() => {
    const counts = { ALL: projects.length, SETUP: 0, ACTIVE: 0, ARCHIVE: 0 };
    projects.forEach((p) => {
      const cat = getProjectLifecycleCategory(p.status);
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return counts;
  }, [projects]);

  useEffect(() => {
    if (selectedProjectId && !projects.some((project) => project.projectId === selectedProjectId)) {
      setSelectedProjectId("");
      setComposerDialogOpen(false);
    }
  }, [projects, selectedProjectId]);

  useEffect(() => {
    if (!projectDetail || !userEmail) return;
    const membership = projectDetail.members.find(
      (member) => member.userEmail.toLowerCase() === userEmail.toLowerCase()
    );
    setProfileImageUrl(membership?.profileImageUrl ?? "");
    setProjectNote(membership?.projectNote ?? "");
    setProjectNameDraft(projectDetail.name);
    setTeamImageDraft(projectDetail.teamImageUrl ?? "");
  }, [projectDetail, userEmail]);

  const openProject = (projectId: string, isMember: boolean) => {
    setSelectedProjectId(projectId);
    // If opening another's project, default to report view
    if (!isMember) {
      setActiveTab("report");
    } else {
      setActiveTab("profile");
    }
  };

  const openComposer = (projectId: string, mode: "post" | "checkpoint" = "post") => {
    setSelectedProjectId(projectId);
    setComposerMode(mode);
    setComposerDialogOpen(true);
    setEmojiPickerOpen(false);
    if (mode === "post") {
      setPostKind("comment");
    }
  };

  const resetPostComposer = () => {
    setPostKind("comment");
    setPostBody("");
    setPostImages([""]);
    setPostVideos([""]);
    setPostLinks([{ label: "", url: "" }]);
    setEmojiPickerOpen(false);
  };

  const resetCheckpointComposer = () => {
    setCheckpointTitle("");
    setCheckpointDescription("");
    setCheckpointAllowResponses(true);
    setCheckpointFields([createEmptyCheckpointField()]);
  };

  const handleSaveProfile = async () => {
    if (!projectDetail || !userEmail) return;
    await updateProfileMut({
      projectId: projectDetail.projectId,
      userEmail,
      profileImageUrl,
      projectNote,
    });
    toast.success("Project profile updated.");
    setProfileDialogOpen(false);
  };

  const handleSaveIdentity = async () => {
    if (!projectDetail || !userEmail) return;
    await updateProjectIdentityMut({
      projectId: projectDetail.projectId,
      userEmail,
      name: projectNameDraft,
      teamImageUrl: teamImageDraft,
    });
    toast.success("Project identity updated.");
    setIdentityDialogOpen(false);
  };

  const handlePublishPost = async () => {
    if (!projectDetail || !userEmail) return;
    await addTimelinePostMut({
      userEmail,
      projectId: projectDetail.projectId,
      kind: postKind,
      body: postBody,
      images: postImages.map((image) => image.trim()).filter(Boolean),
      videos: postVideos.map((video) => video.trim()).filter(Boolean),
      links: postLinks
        .map((link) => ({ label: link.label.trim(), url: link.url.trim() }))
        .filter((link) => link.label && link.url),
    });
    toast.success("Timeline post published.");
    resetPostComposer();
    setComposerDialogOpen(false);
  };

  const handleCreateCheckpoint = async () => {
    if (!projectDetail || !userEmail) return;
    await createCheckpointFormMut({
      userEmail,
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
    toast.success("Checkpoint added to the timeline.");
    resetCheckpointComposer();
    setComposerDialogOpen(false);
  };

  const handleToggleLike = async (projectId: string) => {
    if (!userEmail) return;
    await toggleProjectLikeMut({
      userEmail,
      projectId,
    });
  };

  if (!projects.length) {
    return (
      <Card className="rounded-[1.75rem] border-slate-200 bg-white p-8 shadow-sm">
        <div className="max-w-xl space-y-3">
          <div className="inline-flex rounded-full border border-slate-200 bg-slate-50 p-3 text-slate-600">
            <FolderKanban className="h-5 w-5" />
          </div>
          <h2 className="text-2xl font-black tracking-tight text-slate-900">Projects</h2>
          <p className="text-sm leading-6 text-slate-600">
            No visible projects are available right now. Once a project group is created, it will appear here.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <section className="space-y-6">
      {!selectedProjectId || !projectDetail ? (
        <div className="space-y-8">
          {/* Header with Search and Lifecycle Filter Chips */}
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between pb-2 border-b border-slate-100">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase tracking-[0.28em] text-emerald-600 font-extrabold">Projects Workspace</span>
                <span className="text-slate-300">•</span>
                <span className="text-xs font-semibold text-slate-500">{projects.length} Total Projects</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900">Project Directory</h2>
              <p className="text-sm leading-6 text-slate-500 max-w-xl">
                Track and manage your team assignments, or explore ongoing and archived projects across the lab.
              </p>
            </div>

            {/* Search Input */}
            <div className="w-full lg:max-w-md space-y-3">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search project by name or team member..."
                  className="h-12 border-slate-200 bg-white shadow-xs rounded-2xl pl-11 pr-5 text-sm"
                />
              </div>

              {/* Category Filter Chips */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                <button
                  type="button"
                  onClick={() => setLifecycleFilter("ALL")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                    lifecycleFilter === "ALL"
                      ? "bg-slate-900 text-white shadow-xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200/80"
                  }`}
                >
                  All ({categoryCounts.ALL})
                </button>
                <button
                  type="button"
                  onClick={() => setLifecycleFilter("SETUP")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
                    lifecycleFilter === "SETUP"
                      ? "bg-amber-500 text-white shadow-xs"
                      : "bg-amber-50 text-amber-800 border border-amber-200/60 hover:bg-amber-100/70"
                  }`}
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                  Setup ({categoryCounts.SETUP})
                </button>
                <button
                  type="button"
                  onClick={() => setLifecycleFilter("ACTIVE")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
                    lifecycleFilter === "ACTIVE"
                      ? "bg-emerald-600 text-white shadow-xs"
                      : "bg-emerald-50 text-emerald-800 border border-emerald-200/60 hover:bg-emerald-100/70"
                  }`}
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Active ({categoryCounts.ACTIVE})
                </button>
                <button
                  type="button"
                  onClick={() => setLifecycleFilter("ARCHIVE")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
                    lifecycleFilter === "ARCHIVE"
                      ? "bg-slate-700 text-white shadow-xs"
                      : "bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200/80"
                  }`}
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                  Archive ({categoryCounts.ARCHIVE})
                </button>
              </div>
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════════════════ */}
          {/* SECTION 1: MY PROJECTS (Top)                                        */}
          {/* ═══════════════════════════════════════════════════════════════════ */}
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4 pb-2 border-b border-slate-200/80">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center text-white shadow-sm">
                  <UserRound className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-black tracking-tight text-slate-900">My Projects</h3>
                    <Badge className="bg-indigo-100 text-indigo-800 border-indigo-200/80 font-bold px-2 py-0.5 text-xs">
                      {myProjects.length}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-500">
                    Projects where you are an active team member with full profile, timeline, and report access.
                  </p>
                </div>
              </div>
            </div>

            {myProjects.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-8 text-center space-y-2">
                <FolderKanban className="h-8 w-8 text-slate-300 mx-auto" />
                <p className="text-sm font-semibold text-slate-700">
                  {searchQuery || lifecycleFilter !== "ALL"
                    ? "No personal projects match your search/filter criteria."
                    : "You are not assigned to any project groups yet."}
                </p>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  {searchQuery || lifecycleFilter !== "ALL"
                    ? "Try clearing the search query or selecting a different status filter."
                    : "Once an admin adds you to a project group, it will appear right here at the top of your workspace."}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {myProjects.map((project) => (
                  <ProjectCardTile
                    key={project.projectId}
                    project={project}
                    isMyProject={true}
                    onOpen={() => openProject(project.projectId, true)}
                    onStar={() => handleToggleLike(project.projectId)}
                    onComment={() => openComposer(project.projectId, "post")}
                    selected={selectedProjectId === project.projectId}
                  />
                ))}
              </div>
            )}
          </div>

          {/* ═══════════════════════════════════════════════════════════════════ */}
          {/* SECTION 2: OTHER PROJECTS (Bottom)                                  */}
          {/* ═══════════════════════════════════════════════════════════════════ */}
          <div className="space-y-4 pt-4">
            <div className="flex items-center justify-between gap-4 pb-2 border-b border-slate-200/80">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-slate-600 to-slate-800 flex items-center justify-center text-white shadow-sm">
                  <Globe className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-black tracking-tight text-slate-900">Other Projects</h3>
                    <Badge variant="outline" className="bg-slate-100 text-slate-700 border-slate-200 font-bold px-2 py-0.5 text-xs">
                      {otherProjects.length}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-500">
                    Projects created and managed by other makers. Click any card to inspect their official project report.
                  </p>
                </div>
              </div>

              <div className="hidden sm:flex items-center gap-1 text-xs font-semibold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200/80">
                <FileText className="h-3.5 w-3.5 text-slate-400" />
                <span>Read-Only Report View</span>
              </div>
            </div>

            {otherProjects.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-8 text-center space-y-2">
                <Users className="h-8 w-8 text-slate-300 mx-auto" />
                <p className="text-sm font-semibold text-slate-700">No other projects found.</p>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  {searchQuery || lifecycleFilter !== "ALL"
                    ? "Try adjusting your filters or search keywords."
                    : "Projects from other teams will appear here for you to explore."}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {otherProjects.map((project) => (
                  <ProjectCardTile
                    key={project.projectId}
                    project={project}
                    isMyProject={false}
                    onOpen={() => openProject(project.projectId, false)}
                    onStar={() => handleToggleLike(project.projectId)}
                    selected={selectedProjectId === project.projectId}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ═════════════════════════════════════════════════════════════════════ */
        /* PROJECT DETAIL VIEW                                                  */
        /* ═════════════════════════════════════════════════════════════════════ */
        <div className="space-y-6">
          <div className="neumorph-card overflow-hidden bg-white">
            {/* Sticky Header with Title & Navigation Controls */}
            <div className="sticky top-0 z-20 border-b border-slate-200/90 bg-white/95 px-6 py-4 backdrop-blur shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedProjectId("")}
                  className="neumorph-btn h-9 text-xs font-semibold text-slate-700 rounded-xl shrink-0"
                >
                  <ChevronLeft className="mr-1 h-4 w-4" />
                  Back
                </Button>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-black text-slate-900 truncate tracking-tight">
                      {projectDetail.name}
                    </h2>
                    {isSelectedProjectMember ? (
                      <Badge className="bg-indigo-100 text-indigo-800 border-indigo-200 text-[10px] font-bold shrink-0">
                        Team Member
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-slate-100 text-slate-600 border-slate-200 text-[10px] font-semibold shrink-0">
                        Report View
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={getStatusPillClass(projectDetail.status)}>
                      {getStatusLabel(projectDetail.status)}
                    </span>
                    <span className="text-slate-300">•</span>
                    <span className="text-xs text-slate-500">
                      {projectDetail.members.length} member{projectDetail.members.length === 1 ? "" : "s"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Navigation: 3-Tab Navigator for Team Members vs Single Indicator for Non-Members */}
              {isSelectedProjectMember ? (
                <div className="neumorph-tab-group shrink-0 self-start md:self-auto">
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
              ) : (
                <div className="flex items-center gap-2 shrink-0 self-start md:self-auto">
                  <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold shadow-2xs">
                    <FileText className="h-3.5 w-3.5 text-slate-500" />
                    Official Project Report
                  </span>
                </div>
              )}
            </div>

            {/* Non-Member Banner Notice */}
            {!isSelectedProjectMember && (
              <div className="bg-amber-50/70 border-b border-amber-200/70 px-6 py-2.5 flex items-center justify-between text-xs text-amber-800">
                <div className="flex items-center gap-2">
                  <Eye className="h-4 w-4 text-amber-600 shrink-0" />
                  <span>
                    You are viewing a project created by another team. Non-members have read-only access to the synthesized project report.
                  </span>
                </div>
              </div>
            )}

            {/* Tab Content Panes */}
            <div className="p-4 md:p-6 bg-slate-50/40">
              {isSelectedProjectMember ? (
                <>
                  {activeTab === "profile" && (
                    <ProjectProfilePanel projectDetail={projectDetail} userEmail={userEmail ?? ""} />
                  )}
                  {activeTab === "post" && (
                    <ProjectPostPanel projectDetail={projectDetail} userEmail={userEmail ?? ""} />
                  )}
                  {activeTab === "report" && (
                    <ProjectReportGenerator
                      projectId={projectDetail.projectId}
                      userEmail={userEmail ?? ""}
                      projectDetail={projectDetail}
                    />
                  )}
                </>
              ) : (
                /* Non-members exclusively see the Project Report */
                <ProjectReportGenerator
                  projectId={projectDetail.projectId}
                  userEmail={userEmail ?? ""}
                  projectDetail={projectDetail}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Dialogs for Members ── */}
      <Dialog open={composerDialogOpen} onOpenChange={setComposerDialogOpen}>
        <DialogContent className="border-slate-200 bg-white sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {composerMode === "checkpoint" ? "Add Project Checkpoint" : "Post To Timeline"}
            </DialogTitle>
          </DialogHeader>
          {!projectDetail ? (
            <div className="py-8 text-sm text-slate-500">Loading project details...</div>
          ) : (
            <div className="space-y-5 py-2">
              {(projectDetail.permissions.canComment || projectDetail.permissions.canCreateCheckpoint) ? (
                <div className="inline-flex rounded-full border border-slate-200 bg-slate-50 p-1 text-xs font-semibold">
                  <button
                    type="button"
                    className={`rounded-full px-4 py-2 ${composerMode === "post" ? "bg-slate-900 text-white" : "text-slate-600"}`}
                    onClick={() => setComposerMode("post")}
                  >
                    Timeline Post
                  </button>
                  {projectDetail.permissions.canCreateCheckpoint ? (
                    <button
                      type="button"
                      className={`rounded-full px-4 py-2 ${composerMode === "checkpoint" ? "bg-slate-900 text-white" : "text-slate-600"}`}
                      onClick={() => setComposerMode("checkpoint")}
                    >
                      Add Checkpoint
                    </button>
                  ) : null}
                </div>
              ) : null}

              {composerMode === "post" ? (
                <div className="space-y-4">
                  {(projectDetail.permissions.canModerateTimeline || projectDetail.permissions.isMember) ? (
                    <Select value={postKind} onValueChange={(value) => setPostKind(value as TimelinePostKind)}>
                      <SelectTrigger className="border-slate-200 bg-slate-50">
                        <SelectValue placeholder="Select post type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="comment">Comment</SelectItem>
                        <SelectItem value="note">Note</SelectItem>
                        {projectDetail.permissions.canModerateTimeline ? (
                          <SelectItem value="question">Question</SelectItem>
                        ) : null}
                      </SelectContent>
                    </Select>
                  ) : null}

                  <Textarea
                    value={postBody}
                    onChange={(event) => setPostBody(event.target.value)}
                    placeholder="Write your update, feedback, or question..."
                    className="min-h-[160px] border-slate-200 bg-slate-50"
                  />

                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="border-slate-200"
                      onClick={() => setEmojiPickerOpen((prev) => !prev)}
                    >
                      <MessageSquare className="mr-2 h-4 w-4" />
                      Emoji Options
                    </Button>
                    {projectDetail.permissions.canCreateCheckpoint ? (
                      <Button
                        type="button"
                        variant="outline"
                        className="border-slate-200"
                        onClick={() => setComposerMode("checkpoint")}
                      >
                        <ClipboardList className="mr-2 h-4 w-4" />
                        Add Checkpoint Instead
                      </Button>
                    ) : null}
                  </div>

                  {emojiPickerOpen ? (
                    <div className="flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      {EMOJIS.map((emoji) => (
                        <Button
                          key={emoji}
                          type="button"
                          variant="outline"
                          className="border-slate-200 bg-white text-lg"
                          onClick={() => setPostBody((prev) => `${prev}${emoji}`)}
                        >
                          {emoji}
                        </Button>
                      ))}
                    </div>
                  ) : null}

                  {projectDetail.permissions.canPostMedia ? (
                    <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-700">Image links</label>
                        {postImages.map((value, index) => (
                          <Input
                            key={`post-image-${index}`}
                            value={value}
                            onChange={(event) =>
                              setPostImages((prev) =>
                                prev.map((entry, currentIndex) => (currentIndex === index ? event.target.value : entry)),
                              )
                            }
                            className="border-slate-200 bg-white"
                            placeholder="https://..."
                          />
                        ))}
                        <Button
                          type="button"
                          variant="outline"
                          className="border-slate-200"
                          onClick={() => setPostImages((prev) => [...prev, ""])}
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          Add Image
                        </Button>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-700">Video links</label>
                        {postVideos.map((value, index) => (
                          <Input
                            key={`post-video-${index}`}
                            value={value}
                            onChange={(event) =>
                              setPostVideos((prev) =>
                                prev.map((entry, currentIndex) => (currentIndex === index ? event.target.value : entry)),
                              )
                            }
                            className="border-slate-200 bg-white"
                            placeholder="https://..."
                          />
                        ))}
                        <Button
                          type="button"
                          variant="outline"
                          className="border-slate-200"
                          onClick={() => setPostVideos((prev) => [...prev, ""])}
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          Add Video
                        </Button>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-700">Links</label>
                        {postLinks.map((value, index) => (
                          <div key={`post-link-${index}`} className="grid gap-2 md:grid-cols-[0.9fr_1.1fr]">
                            <Input
                              value={value.label}
                              onChange={(event) =>
                                setPostLinks((prev) =>
                                  prev.map((entry, currentIndex) =>
                                    currentIndex === index ? { ...entry, label: event.target.value } : entry,
                                  ),
                                )
                              }
                              className="border-slate-200 bg-white"
                              placeholder="Label"
                            />
                            <Input
                              value={value.url}
                              onChange={(event) =>
                                setPostLinks((prev) =>
                                  prev.map((entry, currentIndex) =>
                                    currentIndex === index ? { ...entry, url: event.target.value } : entry,
                                  ),
                                )
                              }
                              className="border-slate-200 bg-white"
                              placeholder="https://..."
                            />
                          </div>
                        ))}
                        <Button
                          type="button"
                          variant="outline"
                          className="border-slate-200"
                          onClick={() => setPostLinks((prev) => [...prev, { label: "", url: "" }])}
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          Add Link
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="space-y-4">
                  <Input
                    value={checkpointTitle}
                    onChange={(event) => setCheckpointTitle(event.target.value)}
                    placeholder="Checkpoint title"
                    className="border-slate-200 bg-slate-50"
                  />
                  <Textarea
                    value={checkpointDescription}
                    onChange={(event) => setCheckpointDescription(event.target.value)}
                    placeholder="What should the team provide here?"
                    className="min-h-[120px] border-slate-200 bg-slate-50"
                  />
                  <label className="flex items-center gap-3 text-sm font-medium text-slate-700">
                    <Checkbox
                      checked={checkpointAllowResponses}
                      onCheckedChange={(value) => setCheckpointAllowResponses(Boolean(value))}
                    />
                    Allow project members to submit responses
                  </label>

                  <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    {checkpointFields.map((field, index) => (
                      <div key={`checkpoint-field-${index}`} className="grid gap-3 md:grid-cols-[1.2fr_0.9fr_auto_auto]">
                        <Input
                          value={field.label}
                          onChange={(event) =>
                            setCheckpointFields((prev) =>
                              prev.map((entry, currentIndex) =>
                                currentIndex === index ? { ...entry, label: event.target.value } : entry,
                              ),
                            )
                          }
                          placeholder="Field label"
                          className="border-slate-200 bg-white"
                        />
                        <Select
                          value={field.fieldType}
                          onValueChange={(value) =>
                            setCheckpointFields((prev) =>
                              prev.map((entry, currentIndex) =>
                                currentIndex === index
                                  ? { ...entry, fieldType: value as CheckpointFieldType }
                                  : entry,
                              ),
                            )
                          }
                        >
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
                          <Checkbox
                            checked={field.required}
                            onCheckedChange={(value) =>
                              setCheckpointFields((prev) =>
                                prev.map((entry, currentIndex) =>
                                  currentIndex === index ? { ...entry, required: Boolean(value) } : entry,
                                ),
                              )
                            }
                          />
                          Required
                        </label>
                        <Button
                          type="button"
                          variant="outline"
                          className="border-slate-200"
                          onClick={() =>
                            setCheckpointFields((prev) =>
                              prev.length === 1 ? [createEmptyCheckpointField()] : prev.filter((_, i) => i !== index),
                            )
                          }
                        >
                          Remove
                        </Button>
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      className="border-slate-200"
                      onClick={() => setCheckpointFields((prev) => [...prev, createEmptyCheckpointField()])}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add Field
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              className="border-slate-200"
              onClick={() => {
                setComposerDialogOpen(false);
                setEmojiPickerOpen(false);
              }}
            >
              Cancel
            </Button>
            {projectDetail && composerMode === "post" ? (
              <Button className="bg-slate-900 hover:bg-slate-800" onClick={handlePublishPost}>
                <Send className="mr-2 h-4 w-4" />
                Post To Timeline
              </Button>
            ) : null}
            {projectDetail && composerMode === "checkpoint" ? (
              <Button className="bg-slate-900 hover:bg-slate-800" onClick={handleCreateCheckpoint}>
                <ClipboardList className="mr-2 h-4 w-4" />
                Add Checkpoint
              </Button>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={profileDialogOpen} onOpenChange={setProfileDialogOpen}>
        <DialogContent className="border-slate-200 bg-white sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>My Project Profile</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <Input
              value={profileImageUrl}
              onChange={(event) => setProfileImageUrl(event.target.value)}
              placeholder="Profile image URL"
              className="border-slate-200 bg-slate-50"
            />
            <Textarea
              value={projectNote}
              onChange={(event) => setProjectNote(event.target.value)}
              placeholder="Add a short note about your role in this project."
              className="min-h-[150px] border-slate-200 bg-slate-50"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" className="border-slate-200" onClick={() => setProfileDialogOpen(false)}>
              Cancel
            </Button>
            <Button className="bg-slate-900 hover:bg-slate-800" onClick={handleSaveProfile}>
              Save Profile
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={identityDialogOpen} onOpenChange={setIdentityDialogOpen}>
        <DialogContent className="border-slate-200 bg-white sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Edit Project Identity</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <Input
              value={projectNameDraft}
              onChange={(event) => setProjectNameDraft(event.target.value)}
              placeholder="Project name"
              className="border-slate-200 bg-slate-50"
            />
            <Input
              value={teamImageDraft}
              onChange={(event) => setTeamImageDraft(event.target.value)}
              placeholder="Shared team image URL"
              className="border-slate-200 bg-slate-50"
            />
            {teamImageDraft.trim() ? (
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
                <img
                  src={normalizeImageUrl(teamImageDraft)}
                  alt="Project preview"
                  className="h-56 w-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
            ) : null}
          </div>
          <DialogFooter>
            <Button variant="outline" className="border-slate-200" onClick={() => setIdentityDialogOpen(false)}>
              Cancel
            </Button>
            <Button className="bg-slate-900 hover:bg-slate-800" onClick={handleSaveIdentity}>
              Save Project
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <TimelinePostComposerDialog
        open={timelinePostComposerOpen}
        onOpenChange={setTimelinePostComposerOpen}
        projectId={selectedProjectId}
        userEmail={userEmail ?? ""}
        editingPost={editingTimelinePost}
        canModerate={Boolean(projectDetail?.permissions.canModerateTimeline)}
        canPostMedia={Boolean(projectDetail?.permissions.canPostMedia)}
      />
    </section>
  );
}
