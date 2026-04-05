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
  CheckCircle2,
  ChevronLeft,
  ClipboardList,
  FolderKanban,
  LayoutGrid,
  MessageSquare,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Send,
  Sparkles,
  Star,
  UserRound,
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
  type TimelinePostKind,
} from "@/components/projects/projectShared";

interface ProjectsWorkspaceProps {
  workspace?: { projects: ProjectCardRecord[] };
  userEmail?: string;
}

type ResponseState = Record<string, Record<string, { singleValue: string; multiValueText: string }>>;

function fieldUsesMultipleLines(fieldType: CheckpointFieldType) {
  return fieldType === "image_links" || fieldType === "video_links" || fieldType === "labeled_links";
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

function ProjectCardTile({
  project,
  previewMode,
  onPreviewChange,
  onOpen,
  onStar,
  onComment,
  selected = false,
}: {
  project: ProjectCardRecord;
  previewMode: "team" | "box";
  onPreviewChange: (mode: "team" | "box") => void;
  onOpen: () => void;
  onStar: () => void;
  onComment: () => void;
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

      <div className="mt-4 flex items-center justify-between gap-3">
        <div className="flex -space-x-2">
          {project.members.slice(0, 5).map((member) => (
            <ProjectAvatar
              key={member.userEmail}
              imageUrl={member.profileImageUrl}
              label={member.userName}
              className="h-9 w-9 border-2 border-white"
            />
          ))}
        </div>
        <div className="text-xs font-medium text-slate-500">{project.memberCount} members</div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
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

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          className="border-slate-200 bg-white"
          onClick={(event) => {
            event.stopPropagation();
            onStar();
          }}
        >
          <Star className="mr-2 h-4 w-4" />
          {project.likeCount}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="border-slate-200 bg-white"
          onClick={(event) => {
            event.stopPropagation();
            onComment();
          }}
        >
          <MessageSquare className="mr-2 h-4 w-4" />
          Comment
        </Button>
      </div>
    </button>
  );
}

export default function ProjectsWorkspace({ workspace, userEmail }: ProjectsWorkspaceProps) {
  const projects = workspace?.projects ?? [];
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [previewMode, setPreviewMode] = useState<Record<string, "team" | "box">>({});
  const [leftRailCollapsed, setLeftRailCollapsed] = useState(false);
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
  const createCheckpointFormMut = useMutation(api.projects.createCheckpointForm);
  const submitCheckpointResponseMut = useMutation(api.projects.submitCheckpointResponse);
  const toggleProjectLikeMut = useMutation(api.projects.toggleProjectLike);

  const filteredProjects = useMemo(() => {
    const needle = searchQuery.trim().toLowerCase();
    if (!needle) return projects;
    return projects.filter((project) => {
      const memberMatch = project.members.some((member) =>
        `${member.userName} ${member.userEmail}`.toLowerCase().includes(needle),
      );
      return project.name.toLowerCase().includes(needle) || memberMatch;
    });
  }, [projects, searchQuery]);

  useEffect(() => {
    if (selectedProjectId && !projects.some((project) => project.projectId === selectedProjectId)) {
      setSelectedProjectId("");
      setComposerDialogOpen(false);
    }
  }, [projects, selectedProjectId]);

  useEffect(() => {
    if (!projectDetail || !userEmail) return;
    const membership = projectDetail.members.find((member) => member.userEmail === userEmail);
    setProfileImageUrl(membership?.profileImageUrl ?? "");
    setProjectNote(membership?.projectNote ?? "");
    setProjectNameDraft(projectDetail.name);
    setTeamImageDraft(projectDetail.teamImageUrl ?? "");
  }, [projectDetail, userEmail]);

  const selectedCard = useMemo(
    () => projects.find((project) => project.projectId === selectedProjectId),
    [projects, selectedProjectId],
  );

  const openProject = (projectId: string) => {
    setSelectedProjectId(projectId);
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

  const handleSubmitCheckpointResponse = async (checkpointId: string) => {
    if (!projectDetail || !userEmail) return;

    const values = Object.entries(responseValues[checkpointId] ?? {}).map(([fieldId, value]) => ({
      fieldId,
      singleValue: value.singleValue.trim() || undefined,
      multiValues: value.multiValueText
        .split("\n")
        .map((entry) => entry.trim())
        .filter(Boolean),
    }));

    await submitCheckpointResponseMut({
      userEmail,
      projectId: projectDetail.projectId,
      checkpointId,
      values,
    });
    toast.success("Checkpoint response submitted.");
  };

  const handleToggleLike = async (projectId: string) => {
    if (!userEmail) return;
    await toggleProjectLikeMut({
      userEmail,
      projectId,
    });
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

          {item.stage === "team_setup" ? (
            <div className="mt-4 flex items-center gap-3">
              <ProjectAvatar
                imageUrl={String(item.details.teamImageUrl || "")}
                label={String(item.details.projectName || projectDetail.name)}
                className="h-16 w-16"
              />
              <div className="space-y-1 text-sm text-slate-600">
                <p className="font-semibold text-slate-900">{String(item.details.projectName || projectDetail.name)}</p>
                <p>{projectDetail.members.length} members in this project group.</p>
              </div>
            </div>
          ) : null}

          {item.stage === "box" ? (
            <div className="mt-4 space-y-4">
              {projectDetail.boxImageUrl ? (
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
                  <img
                    src={normalizeImageUrl(projectDetail.boxImageUrl)}
                    alt={`${projectDetail.name} box`}
                    className="h-56 w-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
              ) : null}
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Submitted</p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">
                    {formatDateTime(projectDetail.boxSubmittedAt)}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Approved</p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">
                    {projectDetail.boxApprovedAt
                      ? `${formatDateTime(projectDetail.boxApprovedAt)} by ${projectDetail.boxApprovedBy || "Admin"}`
                      : "Waiting for approval"}
                  </p>
                </div>
              </div>
              {projectDetail.boxRejectionNote ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                  <span className="font-semibold">Feedback:</span> {projectDetail.boxRejectionNote}
                </div>
              ) : null}
            </div>
          ) : null}

          {item.stage === "plan" ? (
            <div className="mt-4 space-y-4">
              {(projectDetail.sketchImages ?? []).length > 0 ? (
                <div className="grid gap-3 md:grid-cols-2">
                  {(projectDetail.sketchImages ?? []).map((image, index) => (
                    <div
                      key={`${image}-${index}`}
                      className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-100"
                    >
                      <img
                        src={normalizeImageUrl(image)}
                        alt="Project sketch"
                        className="h-48 w-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  ))}
                </div>
              ) : null}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-[0.22em] text-slate-400">
                    {projectDetail.questionConfig.completedBehaviorPrompt}
                  </p>
                  <p className="mt-3 whitespace-pre-line text-sm leading-6 text-slate-700">
                    {projectDetail.completedBehavior || "Not answered yet"}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-[0.22em] text-slate-400">
                    {projectDetail.questionConfig.materialsRequiredPrompt}
                  </p>
                  <p className="mt-3 whitespace-pre-line text-sm leading-6 text-slate-700">
                    {projectDetail.materialsRequired || "Not answered yet"}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-[0.22em] text-slate-400">
                    {projectDetail.questionConfig.initialPlansPrompt}
                  </p>
                  <p className="mt-3 whitespace-pre-line text-sm leading-6 text-slate-700">
                    {projectDetail.initialPlans || "Not answered yet"}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-[0.22em] text-slate-400">
                    {projectDetail.questionConfig.firstStepsPrompt}
                  </p>
                  <p className="mt-3 whitespace-pre-line text-sm leading-6 text-slate-700">
                    {projectDetail.firstSteps || "Not answered yet"}
                  </p>
                </div>
              </div>
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

          <div className="mt-4 flex items-center gap-3 text-sm text-slate-500">
            <ProjectAvatar imageUrl="" label={item.createdByName} className="h-10 w-10" />
            <div>
              <p className="font-semibold text-slate-900">{item.createdByName}</p>
              <p>{item.createdByRole}</p>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {item.fields.map((field) => {
              const currentValue = responseValues[item.id]?.[field.fieldId] ?? {
                singleValue: "",
                multiValueText: "",
              };
              const multiLine = fieldUsesMultipleLines(field.fieldType);

              return (
                <div key={field.fieldId} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <p className="font-semibold text-slate-900">{field.label}</p>
                    {field.required ? (
                      <Badge variant="outline" className="border-slate-200 text-slate-600">
                        Required
                      </Badge>
                    ) : null}
                  </div>
                  <p className="mb-3 text-xs uppercase tracking-[0.22em] text-slate-400">
                    {field.fieldType.replace(/_/g, " ")}
                  </p>
                  {projectDetail.permissions.canRespondToCheckpoint ? (
                    multiLine ? (
                      <Textarea
                        value={currentValue.multiValueText}
                        onChange={(event) =>
                          setResponseValues((prev) => ({
                            ...prev,
                            [item.id]: {
                              ...(prev[item.id] ?? {}),
                              [field.fieldId]: {
                                ...currentValue,
                                multiValueText: event.target.value,
                              },
                            },
                          }))
                        }
                        placeholder="Add one entry per line"
                        className="min-h-[110px] border-slate-200 bg-white"
                      />
                    ) : field.fieldType === "long_text" ? (
                      <Textarea
                        value={currentValue.singleValue}
                        onChange={(event) =>
                          setResponseValues((prev) => ({
                            ...prev,
                            [item.id]: {
                              ...(prev[item.id] ?? {}),
                              [field.fieldId]: {
                                ...currentValue,
                                singleValue: event.target.value,
                              },
                            },
                          }))
                        }
                        className="min-h-[110px] border-slate-200 bg-white"
                      />
                    ) : (
                      <Input
                        type={
                          field.fieldType === "number"
                            ? "number"
                            : field.fieldType === "date"
                              ? "date"
                              : "text"
                        }
                        value={currentValue.singleValue}
                        onChange={(event) =>
                          setResponseValues((prev) => ({
                            ...prev,
                            [item.id]: {
                              ...(prev[item.id] ?? {}),
                              [field.fieldId]: {
                                ...currentValue,
                                singleValue: event.target.value,
                              },
                            },
                          }))
                        }
                        className="border-slate-200 bg-white"
                      />
                    )
                  ) : null}
                </div>
              );
            })}
          </div>

          {projectDetail.permissions.canRespondToCheckpoint ? (
            <div className="mt-4 flex justify-end">
              <Button className="bg-slate-900 hover:bg-slate-800" onClick={() => handleSubmitCheckpointResponse(item.id)}>
                Submit Checkpoint Response
              </Button>
            </div>
          ) : null}

          {item.responses.length > 0 ? (
            <div className="mt-5 space-y-3">
              <h4 className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-400">Responses</h4>
              {item.responses.map((response) => (
                <div key={response.responseId} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center gap-3">
                    <ProjectAvatar imageUrl="" label={response.submittedByName} className="h-10 w-10" />
                    <div>
                      <p className="font-semibold text-slate-900">{response.submittedByName}</p>
                      <p className="text-xs text-slate-500">
                        {response.submittedByRole} • {formatDateTime(response.updatedAt)}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 space-y-3">
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
              <h3 className="text-lg font-bold text-slate-900">{item.authorName}</h3>
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

  if (!projects.length) {
    return (
      <Card className="rounded-[1.75rem] border-slate-200 bg-white p-8 shadow-sm">
        <div className="max-w-xl space-y-3">
          <div className="inline-flex rounded-full border border-slate-200 bg-slate-50 p-3 text-slate-600">
            <FolderKanban className="h-5 w-5" />
          </div>
          <h2 className="text-2xl font-black tracking-tight text-slate-900">Projects</h2>
          <p className="text-sm leading-6 text-slate-600">
            No visible projects are available right now. Once a project group exists, the project cards
            and timeline workspace will appear here.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <section className="space-y-6">
      {!selectedProjectId || !projectDetail ? (
        <Card className="rounded-[1.75rem] border-slate-200 bg-white p-5 shadow-sm">
          <div className="space-y-5">
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.28em] text-slate-400">Projects</p>
              <h2 className="text-2xl font-black tracking-tight text-slate-900">Project Cards</h2>
              <p className="text-sm text-slate-500">
                Open any card to expand the project timeline. You can also star a project or leave a comment from here.
              </p>
            </div>

            <Input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search project name or member"
              className="border-slate-200 bg-slate-50"
            />

            <div className="grid gap-5 md:grid-cols-2 2xl:grid-cols-3">
              {filteredProjects.map((project) => (
                <ProjectCardTile
                  key={project.projectId}
                  project={project}
                  previewMode={previewMode[project.projectId] ?? "team"}
                  onPreviewChange={(mode) => setPreviewMode((prev) => ({ ...prev, [project.projectId]: mode }))}
                  onOpen={() => openProject(project.projectId)}
                  onStar={() => handleToggleLike(project.projectId)}
                  onComment={() => openComposer(project.projectId, "post")}
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
                    <p className="text-xs uppercase tracking-[0.28em] text-slate-400">Project Cards</p>
                    <h3 className="text-2xl font-black tracking-tight text-slate-900">Browse Projects</h3>
                  </div>
                  <Button variant="outline" className="border-slate-200" onClick={() => setSelectedProjectId("")}>
                    <LayoutGrid className="mr-2 h-4 w-4" />
                    Grid
                  </Button>
                </div>

                <Input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search project name or member"
                  className="border-slate-200 bg-slate-50"
                />

                <div className="space-y-4">
                  {filteredProjects.map((project) => (
                    <ProjectCardTile
                      key={project.projectId}
                      project={project}
                      previewMode={previewMode[project.projectId] ?? "team"}
                      onPreviewChange={(mode) => setPreviewMode((prev) => ({ ...prev, [project.projectId]: mode }))}
                      onOpen={() => openProject(project.projectId)}
                      onStar={() => handleToggleLike(project.projectId)}
                      onComment={() => openComposer(project.projectId, "post")}
                      selected={selectedProjectId === project.projectId}
                    />
                  ))}
                </div>
              </div>
            </Card>
          ) : null}

          <Card className="overflow-hidden rounded-[1.75rem] border-slate-200 bg-white shadow-sm">
            <div className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 px-6 py-5 backdrop-blur">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-center gap-4">
                  <ProjectAvatar imageUrl={projectDetail.teamImageUrl} label={projectDetail.name} className="h-16 w-16" />
                  <div>
                    <p className="text-xs uppercase tracking-[0.28em] text-slate-400">Project Timeline</p>
                    <h2 className="text-3xl font-black tracking-tight text-slate-900">{projectDetail.name}</h2>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <Badge className={getStatusBadgeClass(projectDetail.status)}>{projectDetail.status}</Badge>
                      <span className="text-xs text-slate-500">
                        Active since {formatDateOnly(projectDetail.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
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
                  <Button variant="outline" className="border-slate-200" onClick={() => handleToggleLike(projectDetail.projectId)}>
                    <Star className={`mr-2 h-4 w-4 ${projectDetail.viewerHasLiked ? "fill-current text-amber-500" : ""}`} />
                    {projectDetail.likeCount}
                  </Button>
                  {projectDetail.permissions.canComment || projectDetail.permissions.canCreateCheckpoint ? (
                    <Button className="bg-slate-900 hover:bg-slate-800" onClick={() => openComposer(projectDetail.projectId, "post")}>
                      <Plus className="mr-2 h-4 w-4" />
                      Add
                    </Button>
                  ) : null}
                  {projectDetail.permissions.canUpdateOwnProfile ? (
                    <Button variant="outline" className="border-slate-200" onClick={() => setProfileDialogOpen(true)}>
                      <UserRound className="mr-2 h-4 w-4" />
                      My Profile
                    </Button>
                  ) : null}
                  {(projectDetail.permissions.canRenameProject || projectDetail.permissions.canUpdateTeamImage) ? (
                    <Button variant="outline" className="border-slate-200" onClick={() => setIdentityDialogOpen(true)}>
                      Edit Project
                    </Button>
                  ) : null}
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
            </div>

            <div className="space-y-6 px-6 py-6">
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

              <Card className="rounded-[1.5rem] border-slate-200 bg-slate-50 p-5 shadow-none">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-slate-500" />
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">Project Box Items</h3>
                    <p className="text-sm text-slate-500">Items currently linked to this project box.</p>
                  </div>
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  {projectDetail.items.length > 0 ? (
                    projectDetail.items.map((item) => (
                      <div key={item.requestId} className="rounded-2xl border border-slate-200 bg-white p-4">
                        <p className="font-semibold text-slate-900">{item.itemName}</p>
                        <p className="mt-1 text-sm text-slate-500">
                          Owner: {item.userEmail} • Qty: {item.quantity}
                        </p>
                        <p className="mt-2 text-xs uppercase tracking-[0.22em] text-slate-400">
                          Added {formatDateOnly(item.taggedAt)}
                        </p>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-5 text-sm text-slate-500 md:col-span-2">
                      No items have been linked to this project box yet.
                    </div>
                  )}
                </div>
              </Card>
            </div>
          </Card>
        </div>
      )}

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
    </section>
  );
}
