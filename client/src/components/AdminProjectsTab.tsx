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
  ChevronLeft,
  ClipboardList,
  FolderKanban,
  LayoutGrid,
  MessageSquare,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Search,
  Send,
  Settings2,
  Sparkles,
  Trash2,
} from "lucide-react";
import {
  createEmptyCheckpointField,
  EMOJIS,
  formatDateOnly,
  formatDateTime,
  getStatusBadgeClass,
  MediaList,
  normalizeImageUrl,
  ProjectAvatar,
  type CheckpointFieldType,
  type ProjectCardRecord,
  type ProjectDetailRecord,
} from "@/components/projects/projectShared";

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
  previewMode,
  onPreviewChange,
  onOpen,
  selected = false,
}: {
  project: ProjectCardRecord;
  previewMode: "team" | "box";
  onPreviewChange: (mode: "team" | "box") => void;
  onOpen: () => void;
  selected?: boolean;
}) {
  const previewImage = previewMode === "box" ? project.boxImageUrl ?? "" : project.teamImageUrl ?? "";

  return (
    <button
      type="button"
      onClick={onOpen}
      className={`w-full rounded-[1.5rem] border p-4 text-left transition-all ${
        selected
          ? "border-slate-300 bg-slate-50 shadow-sm"
          : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
      }`}
    >
      <div className="overflow-hidden rounded-[1.25rem] border border-slate-200 bg-slate-100">
        {previewImage ? (
          <img
            src={normalizeImageUrl(previewImage)}
            alt={project.name}
            className="h-44 w-full object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="flex h-44 items-center justify-center bg-slate-100 text-slate-400">
            <Sparkles className="h-8 w-8" />
          </div>
        )}
      </div>

      <div className="mt-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-lg font-bold text-slate-900">{project.name}</h3>
          <p className="text-xs text-slate-500">
            Updated {formatDateOnly(project.lastActivityAt || project.updatedAt)}
          </p>
        </div>
        <Badge className={getStatusBadgeClass(project.status)}>{project.status}</Badge>
      </div>

      <div className="mt-3 inline-flex rounded-full border border-slate-200 bg-white p-1 text-xs font-semibold">
        <button
          type="button"
          className={`rounded-full px-3 py-1 ${previewMode === "team" ? "bg-slate-900 text-white" : "text-slate-600"}`}
          onClick={(event) => {
            event.stopPropagation();
            onPreviewChange("team");
          }}
        >
          Team
        </button>
        <button
          type="button"
          className={`rounded-full px-3 py-1 ${previewMode === "box" ? "bg-slate-900 text-white" : "text-slate-600"}`}
          onClick={(event) => {
            event.stopPropagation();
            onPreviewChange("box");
          }}
        >
          Box
        </button>
      </div>

      <div className="mt-4 flex -space-x-2">
        {project.members.slice(0, 6).map((member) => (
          <ProjectAvatar
            key={member.userEmail}
            imageUrl={member.profileImageUrl}
            label={member.userName}
            className="h-9 w-9 border-2 border-white"
          />
        ))}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {project.members.slice(0, 4).map((member) => (
          <Badge
            key={`${project.projectId}-${member.userEmail}`}
            variant="outline"
            className="border-slate-200 bg-white text-slate-600"
          >
            {member.userRole}
          </Badge>
        ))}
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
  const [previewMode, setPreviewMode] = useState<Record<string, "team" | "box">>({});
  const [leftRailCollapsed, setLeftRailCollapsed] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingProjectId, setEditingProjectId] = useState<string | undefined>(undefined);
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

  const projectDetail = useQuery(
    api.projects.getProjectDetail,
    selectedProjectId ? { userEmail: currentUserEmail, projectId: selectedProjectId } : "skip",
  ) as ProjectDetailRecord | undefined;

  const upsertProjectMut = useMutation(api.projects.upsertProject);
  const updateQuestionConfigMut = useMutation(api.projects.updateQuestionConfig);
  const reviewBoxMut = useMutation(api.projects.reviewBox);
  const reviewPlanMut = useMutation(api.projects.reviewPlan);
  const createCheckpointFormMut = useMutation(api.projects.createCheckpointForm);
  const addTimelinePostMut = useMutation(api.projects.addTimelinePost);
  const setLifecycleStatusMut = useMutation(api.projects.setLifecycleStatus);
  const deleteProjectMut = useMutation(api.projects.deleteProject);

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
  }, [projectDetail]);

  const toggleMember = (email: string) => {
    setSelectedEmails((prev) =>
      prev.includes(email) ? prev.filter((value) => value !== email) : [...prev, email],
    );
  };

  const openCreateDialog = () => {
    setEditingProjectId(undefined);
    setProjectName("");
    setSelectedEmails([]);
    setMemberSearch("");
    setCreateDialogOpen(true);
  };

  const openEditDialog = () => {
    if (!projectDetail) return;
    setEditingProjectId(projectDetail.projectId);
    setProjectName(projectDetail.name);
    setSelectedEmails(projectDetail.members.map((member) => member.userEmail));
    setMemberSearch("");
    setCreateDialogOpen(true);
  };

  const openComposer = (mode: "post" | "checkpoint" = "post") => {
    if (!selectedProjectId) return;
    setComposerMode(mode);
    setComposerDialogOpen(true);
    setEmojiPickerOpen(false);
  };

  const handleCreateProject = async () => {
    await upsertProjectMut({
      actorEmail: currentUserEmail,
      projectId: editingProjectId,
      name: projectName,
      memberEmails: selectedEmails,
    });
    toast.success(editingProjectId ? "Project group updated." : "Project group created.");
    setCreateDialogOpen(false);
    setEditingProjectId(undefined);
    setProjectName("");
    setSelectedEmails([]);
    setMemberSearch("");
  };

  const handleSavePrompts = async () => {
    if (!projectDetail) return;
    await updateQuestionConfigMut({
      actorEmail: currentUserEmail,
      projectId: projectDetail.projectId,
      questionConfig: promptDraft,
    });
    toast.success("Built-in project questions updated.");
  };

  const handleReviewBox = async (approve: boolean) => {
    if (!projectDetail) return;
    const rejectionNote = approve ? undefined : window.prompt("Add a note for rejecting the box.", "") ?? "";
    await reviewBoxMut({
      actorEmail: currentUserEmail,
      projectId: projectDetail.projectId,
      approve,
      rejectionNote,
    });
    toast.success(approve ? "Box approved." : "Box sent back to draft.");
  };

  const handleReviewPlan = async (approve: boolean) => {
    if (!projectDetail) return;
    const rejectionNote = approve ? undefined : window.prompt("Add a note for rejecting the project plan.", "") ?? "";
    await reviewPlanMut({
      actorEmail: currentUserEmail,
      projectId: projectDetail.projectId,
      approve,
      rejectionNote,
    });
    toast.success(approve ? "Project plan approved." : "Project plan sent back.");
  };

  const handleLifecycleChange = async (status: "COMPLETED" | "ARCHIVED") => {
    if (!projectDetail) return;
    await setLifecycleStatusMut({
      actorEmail: currentUserEmail,
      projectId: projectDetail.projectId,
      status,
    });
    toast.success(status === "COMPLETED" ? "Project marked completed." : "Project archived.");
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

          {item.stage === "box" && projectDetail.boxImageUrl ? (
            <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
              <img
                src={normalizeImageUrl(projectDetail.boxImageUrl)}
                alt={`${projectDetail.name} box`}
                className="h-56 w-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
          ) : null}

          {item.stage === "plan" ? (
            <div className="mt-4">
              <MediaList images={projectDetail.sketchImages ?? []} />
            </div>
          ) : null}
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

    return (
      <Card className="rounded-[1.5rem] border-slate-200 bg-white p-5 shadow-none">
        <div className="flex items-start gap-4">
          <ProjectAvatar
            imageUrl={projectDetail.members.find((member) => member.userEmail === item.authorEmail)?.profileImageUrl}
            label={item.authorName}
            className="h-12 w-12"
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-lg font-bold text-slate-900">{item.authorName}</p>
              <Badge variant="outline" className="border-slate-200 text-slate-600">
                {item.authorRole}
              </Badge>
              <Badge className={getStatusBadgeClass(item.kind)}>{item.kind}</Badge>
            </div>
            <p className="mt-3 whitespace-pre-line text-sm leading-7 text-slate-700">{item.body}</p>
            <div className="mt-4">
              <MediaList images={item.images} videos={item.videos} links={item.links} />
            </div>
          </div>
        </div>
      </Card>
    );
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
        <Card className="rounded-[1.75rem] border-slate-200 bg-white p-5 shadow-sm">
          <div className="space-y-5">
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.28em] text-slate-400">Project Groups</p>
              <h3 className="text-2xl font-black tracking-tight text-slate-900">Project Cards</h3>
              <p className="text-sm text-slate-500">
                Start from the card grid, then open any project to review its timeline, approvals, and team activity.
              </p>
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

            <div className="grid gap-5 md:grid-cols-2 2xl:grid-cols-3">
              {filteredProjects.map((project) => (
                <AdminProjectCardTile
                  key={project.projectId}
                  project={project}
                  previewMode={previewMode[project.projectId] ?? "team"}
                  onPreviewChange={(mode) => setPreviewMode((prev) => ({ ...prev, [project.projectId]: mode }))}
                  onOpen={() => setSelectedProjectId(project.projectId)}
                />
              ))}
            </div>
          </div>
        </Card>
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
                      previewMode={previewMode[project.projectId] ?? "team"}
                      onPreviewChange={(mode) => setPreviewMode((prev) => ({ ...prev, [project.projectId]: mode }))}
                      onOpen={() => setSelectedProjectId(project.projectId)}
                      selected={selectedProjectId === project.projectId}
                    />
                  ))}
                </div>
              </div>
            </Card>
          ) : null}

          <Card className="overflow-hidden rounded-[1.75rem] border-slate-200 bg-white shadow-sm">
            <div className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 px-6 py-5 backdrop-blur">
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

                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" className="border-slate-200" onClick={openEditDialog}>
                      Edit Members
                    </Button>
                    <Button className="bg-slate-900 hover:bg-slate-800" onClick={() => openComposer("post")}>
                      <Plus className="mr-2 h-4 w-4" />
                      Add
                    </Button>
                    {projectDetail.status === "ACTIVE" ? (
                      <Button variant="outline" className="border-slate-200" onClick={() => handleLifecycleChange("COMPLETED")}>
                        Mark Completed
                      </Button>
                    ) : null}
                    {projectDetail.status !== "ARCHIVED" ? (
                      <Button variant="outline" className="border-slate-200" onClick={() => handleLifecycleChange("ARCHIVED")}>
                        Archive
                      </Button>
                    ) : null}
                    <Button
                      variant="outline"
                      className="border-rose-200 text-rose-600 hover:border-rose-300 hover:bg-rose-50"
                      onClick={handleDeleteProject}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </Button>
                    <Button
                      variant="outline"
                      className="border-slate-200"
                      onClick={() => setLeftRailCollapsed((prev) => !prev)}
                    >
                      {leftRailCollapsed ? (
                        <>
                          <PanelLeftOpen className="mr-2 h-4 w-4" />
                          Show Cards
                        </>
                      ) : (
                        <>
                          <PanelLeftClose className="mr-2 h-4 w-4" />
                          Collapse Cards
                        </>
                      )}
                    </Button>
                    <Button variant="outline" className="border-slate-200" onClick={() => setSelectedProjectId("")}>
                      <ChevronLeft className="mr-2 h-4 w-4" />
                      Back
                    </Button>
                  </div>
                </div>

                <div className="flex -space-x-2">
                  {projectDetail.members.map((member) => (
                    <ProjectAvatar
                      key={member.userEmail}
                      imageUrl={member.profileImageUrl}
                      label={member.userName}
                      className="h-10 w-10 border-2 border-white"
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-6 px-6 py-6">
              <Card className="rounded-[1.5rem] border-slate-200 bg-slate-50 p-5 shadow-none">
                <div className="flex items-center gap-3">
                  <Settings2 className="h-5 w-5 text-slate-500" />
                  <div>
                    <h4 className="text-lg font-bold text-slate-900">Built-In Project Questions</h4>
                    <p className="text-sm text-slate-500">
                      Adjust the wording and helper text for the required approval checkpoints.
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <Input value={promptDraft.boxTitle} onChange={(event) => setPromptDraft((prev) => ({ ...prev, boxTitle: event.target.value }))} className="border-slate-200 bg-white" placeholder="Box title" />
                  <Input value={promptDraft.boxDescription} onChange={(event) => setPromptDraft((prev) => ({ ...prev, boxDescription: event.target.value }))} className="border-slate-200 bg-white" placeholder="Box description" />
                  <Input value={promptDraft.sketchPrompt} onChange={(event) => setPromptDraft((prev) => ({ ...prev, sketchPrompt: event.target.value }))} className="border-slate-200 bg-white" placeholder="Sketch prompt" />
                  <Input value={promptDraft.sketchHelp} onChange={(event) => setPromptDraft((prev) => ({ ...prev, sketchHelp: event.target.value }))} className="border-slate-200 bg-white" placeholder="Sketch help text" />
                  <Input value={promptDraft.completedBehaviorPrompt} onChange={(event) => setPromptDraft((prev) => ({ ...prev, completedBehaviorPrompt: event.target.value }))} className="border-slate-200 bg-white" placeholder="Completed behavior prompt" />
                  <Input value={promptDraft.materialsRequiredPrompt} onChange={(event) => setPromptDraft((prev) => ({ ...prev, materialsRequiredPrompt: event.target.value }))} className="border-slate-200 bg-white" placeholder="Materials prompt" />
                  <Input value={promptDraft.initialPlansPrompt} onChange={(event) => setPromptDraft((prev) => ({ ...prev, initialPlansPrompt: event.target.value }))} className="border-slate-200 bg-white" placeholder="Initial plans prompt" />
                  <Input value={promptDraft.firstStepsPrompt} onChange={(event) => setPromptDraft((prev) => ({ ...prev, firstStepsPrompt: event.target.value }))} className="border-slate-200 bg-white" placeholder="First steps prompt" />
                </div>

                <div className="mt-4 flex justify-end">
                  <Button className="bg-slate-900 hover:bg-slate-800" onClick={handleSavePrompts}>
                    Save Question Copy
                  </Button>
                </div>
              </Card>

              <Card className="rounded-[1.5rem] border-slate-200 bg-slate-50 p-5 shadow-none">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h4 className="text-lg font-bold text-slate-900">Checkpoint Actions</h4>
                    <p className="text-sm text-slate-500">
                      Review the built-in box and planning checkpoints directly from this panel.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {projectDetail.status === "BOX_PENDING" ? (
                      <>
                        <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => handleReviewBox(true)}>
                          Approve Box
                        </Button>
                        <Button variant="outline" className="border-red-200 text-red-600 hover:border-red-400 hover:bg-red-50" onClick={() => handleReviewBox(false)}>
                          Reject Box
                        </Button>
                      </>
                    ) : null}
                    {projectDetail.status === "PLAN_PENDING" ? (
                      <>
                        <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => handleReviewPlan(true)}>
                          Approve Plan
                        </Button>
                        <Button variant="outline" className="border-red-200 text-red-600 hover:border-red-400 hover:bg-red-50" onClick={() => handleReviewPlan(false)}>
                          Reject Plan
                        </Button>
                      </>
                    ) : null}
                  </div>
                </div>
              </Card>

              <div className="relative">
                <div className="absolute left-1/2 top-0 hidden h-full w-px -translate-x-1/2 bg-slate-200 md:block" />
                <div className="space-y-8">
                  {projectDetail.timeline.map((item, index) => {
                    const leftAligned = index % 2 === 0;
                    return (
                      <div
                        key={item.id}
                        className="relative grid gap-4 md:grid-cols-[minmax(0,1fr)_6rem_minmax(0,1fr)] md:items-start"
                      >
                        <TimelineMarker createdAt={item.createdAt} mobile />
                        <div className={leftAligned ? "md:col-start-1" : "md:col-start-3"}>
                          {renderTimelineCard(item)}
                        </div>
                        <div className="hidden md:block md:col-start-2">
                          <TimelineMarker createdAt={item.createdAt} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      <Dialog
        open={createDialogOpen}
        onOpenChange={(open) => {
          setCreateDialogOpen(open);
          if (!open) {
            setEditingProjectId(undefined);
          }
        }}
      >
        <DialogContent className="border-slate-200 bg-white sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingProjectId ? "Edit Project Group" : "Create Project Group"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <Input value={projectName} onChange={(event) => setProjectName(event.target.value)} placeholder="Project name" className="border-slate-200 bg-slate-50" />
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input value={memberSearch} onChange={(event) => setMemberSearch(event.target.value)} placeholder="Search approved users or team members" className="border-slate-200 bg-slate-50 pl-9" />
            </div>
            <div className="max-h-[360px] space-y-2 overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50 p-3">
              {filteredUsers.map((entry) => (
                <label key={entry.email} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-3 py-3">
                  <div className="flex items-center gap-3">
                    <Checkbox checked={selectedEmails.includes(entry.email)} onCheckedChange={() => toggleMember(entry.email)} />
                    <div>
                      <p className="font-medium text-slate-900">{entry.name}</p>
                      <p className="text-xs text-slate-500">{entry.email}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="border-slate-200 text-slate-600">
                    {entry.role}
                  </Badge>
                </label>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="border-slate-200" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button className="bg-slate-900 hover:bg-slate-800" onClick={handleCreateProject}>
              {editingProjectId ? "Save Project" : "Create Project"}
            </Button>
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
    </section>
  );
}
