import { useState, useMemo } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  CheckCircle2,
  Lock,
  Plus,
  Image as ImageIcon,
  Users,
  AlertCircle,
  UserPlus,
  Trash2,
} from "lucide-react";
import {
  formatDateOnly,
  normalizeImageUrl,
  ProjectAvatar,
  type ProjectDetailRecord,
  ImageWithLightbox,
  TimelineFilterBar,
  AddMemberDialog,
} from "./projectShared";




// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

type StepStatus = "completed" | "current" | "locked";

interface StepDef {
  number: number;
  label: string;
  icon: React.ReactNode;
  status: StepStatus;
  completedAt?: string;
}

// ─────────────────────────────────────────────
// Step Indicator (horizontal progress bar)
// ─────────────────────────────────────────────

function StepIndicator({ steps }: { steps: StepDef[] }) {
  return (
    <div className="flex items-start overflow-x-auto pb-1">
      {steps.map((step, index) => (
        <div key={step.number} className="flex items-start">
          <div className="flex flex-col items-center gap-2 min-w-[90px] max-w-[110px]">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-full border-2 font-bold text-sm transition-all ${
                step.status === "completed"
                  ? "border-emerald-500 bg-emerald-500 text-white shadow-md"
                  : step.status === "current"
                  ? "border-slate-900 bg-slate-900 text-white shadow-md"
                  : "border-slate-200 bg-white text-slate-400"
              }`}
            >
              {step.status === "completed" ? (
                <CheckCircle2 className="h-5 w-5" />
              ) : (
                <span>{step.number}</span>
              )}
            </div>
            <div className="text-center">
              <p
                className={`text-[11px] font-semibold leading-snug ${
                  step.status === "completed"
                    ? "text-emerald-600"
                    : step.status === "current"
                    ? "text-slate-900"
                    : "text-slate-400"
                }`}
              >
                {step.label}
              </p>
              {step.completedAt && (
                <p className="text-[10px] text-slate-400">
                  {formatDateOnly(step.completedAt)}
                </p>
              )}
            </div>
          </div>
          {index < steps.length - 1 && (
            <div
              className={`mt-5 h-0.5 w-10 shrink-0 transition-all ${
                steps[index + 1].status !== "locked"
                  ? "bg-emerald-400"
                  : "bg-slate-200"
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────
// Helper sub-components
// ─────────────────────────────────────────────

function CollapsedStep({
  stepNumber,
  label,
  completedAt,
  summary,
}: {
  stepNumber: number;
  label: string;
  completedAt?: string;
  summary?: string;
}) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
        <CheckCircle2 className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-emerald-800">
          Step {stepNumber}: {label} — Complete
        </p>
        {summary && <p className="text-xs text-emerald-600">{summary}</p>}
      </div>
      {completedAt && (
        <p className="shrink-0 text-xs text-emerald-500">
          {formatDateOnly(completedAt)}
        </p>
      )}
    </div>
  );
}

function LockedStep({ stepNumber, label }: { stepNumber: number; label: string }) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-slate-100 bg-slate-50 px-5 py-3 opacity-50">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-slate-200 bg-white text-slate-400">
        <Lock className="h-3.5 w-3.5" />
      </div>
      <p className="text-sm font-medium text-slate-400">
        Step {stepNumber}: {label}
      </p>
    </div>
  );
}

function ActiveStepCard({
  stepNumber,
  label,
  subtitle,
  children,
}: {
  stepNumber: number;
  label: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="rounded-[1.5rem] border-2 border-slate-900 bg-white p-5 shadow-lg">
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-900 text-sm font-bold text-white">
          {stepNumber}
        </div>
        <div>
          <h3 className="font-bold text-slate-900">{label}</h3>
          {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
        </div>
      </div>
      {children}
    </Card>
  );
}

function PendingBanner({ submittedAt }: { submittedAt: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
      <div className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-amber-400" />
      <p className="text-sm font-medium text-amber-800">
        Submitted{submittedAt ? ` on ${new Date(submittedAt).toLocaleDateString()}` : ""} — waiting for admin review…
      </p>
    </div>
  );
}

function RejectionBanner({ note }: { note: string }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" />
      <div>
        <p className="text-sm font-semibold text-rose-800">Admin feedback:</p>
        <p className="mt-0.5 text-sm text-rose-700">{note}</p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Main export
// ─────────────────────────────────────────────

interface ProjectStepFlowProps {
  projectDetail: ProjectDetailRecord;
  userEmail: string;
  onSaveIdentity: (name: string, teamImageUrl: string) => Promise<void>;
  renderTimelineItem: (item: ProjectDetailRecord["timeline"][number]) => React.ReactNode;
  onOpenComposer: () => void;
  /** When provided (admin context) the Apply gate is replaced with Approve/Reject controls. */
  onReview?: (stage: "setup", approve: boolean) => void;
}

export default function ProjectStepFlow({
  projectDetail,
  userEmail,
  onSaveIdentity,
  renderTimelineItem,
  onOpenComposer,
  onReview,
}: ProjectStepFlowProps) {
  const updateMyProfileMut = useMutation(api.projects.updateMyProfile);
  const submitTeamSetupMut = useMutation(api.projects.submitTeamSetup);
  const updateProjectIdentityMut = useMutation(api.projects.updateProjectIdentity);

  const membership = projectDetail.members.find((m) => m.userEmail === userEmail);

  // Step 1 — my profile
  const [profileImageUrl, setProfileImageUrl] = useState(membership?.profileImageUrl ?? "");
  const [projectNote, setProjectNote] = useState(membership?.projectNote ?? "");
  // Step 1 — team identity
  const [projectNameDraft, setProjectNameDraft] = useState(projectDetail.name);
  const [teamImageDraft, setTeamImageDraft] = useState(projectDetail.teamImageUrl ?? "");

  // Timeline filtering & scaling state
  const [timelineSearch, setTimelineSearch] = useState("");
  const [timelineKind, setTimelineKind] = useState("all");
  const [timelineSort, setTimelineSort] = useState<"desc" | "asc">("desc");
  const [timelinePageLimit, setTimelinePageLimit] = useState(10);

  // Member management
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const removeMemberMut = useMutation(api.projects.removeProjectMember);

  const handleRemoveMember = async (memberEmail: string, memberName: string) => {
    if (!confirm(`Are you sure you want to remove ${memberName} from this project?`)) return;
    try {
      await removeMemberMut({
        userEmail,
        projectId: projectDetail.projectId,
        memberEmailToRemove: memberEmail,
      });
      toast.success(`${memberName} removed from project.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove member");
    }
  };

  const s = projectDetail.status;



  // Step 1: completed as soon as admin has approved it
  const step1Status: StepStatus =
    s === "DRAFT" || s === "SETUP_PENDING" ? "current" : "completed";

  // Step 2: Active work — locked until team setup approved
  const step2Status: StepStatus =
    s === "ACTIVE" || s === "COMPLETED" || s === "ARCHIVED" ? "current" : "locked";

  // ── Can "Apply for Step 1 Approval"? ──
  const allMembersReady = projectDetail.members.every(
    (m) => m.profileImageUrl?.trim() && m.projectNote?.trim(),
  );
  const teamImageSet = teamImageDraft.trim().length > 0 || (projectDetail.teamImageUrl ?? "").trim().length > 0;
  const canSubmitSetup =
    (s === "DRAFT" || s === "SETUP_PENDING") && allMembersReady && teamImageSet;

  const steps: StepDef[] = [
    {
      number: 1,
      label: "Team Setup",
      icon: <Users className="h-4 w-4" />,
      status: step1Status,
      completedAt: projectDetail.setupApprovedAt || undefined,
    },
    {
      number: 2,
      label: "Active Project",
      icon: <ImageIcon className="h-4 w-4" />,
      status: step2Status,
    },
  ];


  // ── Handlers ──
  const handleSaveProfile = async () => {
    if (!profileImageUrl.trim()) {
      toast.error("Please enter your profile image URL.");
      return;
    }
    toast.promise(
      updateMyProfileMut({
        projectId: projectDetail.projectId,
        userEmail,
        profileImageUrl: profileImageUrl.trim(),
        projectNote: projectNote.trim(),
      }),
      {
        loading: "Saving profile…",
        success: "Profile saved!",
        error: (e) => `Failed: ${e.message}`,
      },
    );
  };

  const handleSaveTeamIdentity = async () => {
    await onSaveIdentity(projectNameDraft, teamImageDraft);
  };

  const handleSubmitSetup = () => {
    toast.promise(
      submitTeamSetupMut({ projectId: projectDetail.projectId, userEmail }),
      {
        loading: "Submitting team setup for approval…",
        success: "Submitted! Awaiting admin review.",
        error: (e) => `Failed: ${e.message}`,
      },
    );
  };





  // ─────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────
  return (
    <div className="space-y-6 px-6 py-6">
      {/* Progress indicator */}
      <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
        <StepIndicator steps={steps} />
      </div>

      <div className="space-y-3">
        {/* ── STEP 1: Team Setup ── */}
        {step1Status === "completed" ? (
          <CollapsedStep
            stepNumber={1}
            label="Team Setup"
            completedAt={projectDetail.setupApprovedAt}
            summary={`Approved — ${projectDetail.members.length} members set up`}
          />
        ) : (
          <ActiveStepCard
            stepNumber={1}
            label="Team Setup"
            subtitle="Each member must save their profile image and role. Then submit for admin approval."
          >
            {/* Admin feedback */}
            {projectDetail.setupRejectionNote && (
              <div className="mb-4">
                <RejectionBanner note={projectDetail.setupRejectionNote} />
              </div>
            )}

            {/* Pending banner */}
            {s === "SETUP_PENDING" && (
              <div className="mb-4">
                <PendingBanner submittedAt={projectDetail.setupSubmittedAt ?? ""} />
              </div>
            )}

            {/* Member profile cards — inline grid */}
            <div className="mb-4 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                  Team Members ({projectDetail.members.length})
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-slate-200 text-xs rounded-lg gap-1.5 h-8 bg-white hover:bg-slate-50"
                  onClick={() => setAddMemberOpen(true)}
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  Add Member
                </Button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
              {projectDetail.members.map((m) => {
                const isMe = Boolean(userEmail && m.userEmail && m.userEmail.toLowerCase() === userEmail.toLowerCase());
                const hasProfile = m.profileImageUrl?.trim();
                const hasNote = m.projectNote?.trim();
                return (
                  <div
                    key={m.userEmail}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className="relative">
                        <ProjectAvatar imageUrl={m.profileImageUrl} label={m.userName} className="h-10 w-10" />
                        {hasProfile && hasNote ? (
                          <div className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500">
                            <CheckCircle2 className="h-2.5 w-2.5 text-white" />
                          </div>
                        ) : (
                          <div className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-400">
                            <AlertCircle className="h-2.5 w-2.5 text-white" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-slate-900">{m.userName}</p>
                        <p className="truncate text-xs text-slate-500">{m.userEmail}</p>
                      </div>
                      {hasProfile && hasNote && (
                        <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700 text-[10px]">
                          Ready
                        </Badge>
                      )}
                      {projectDetail.members.length > 1 && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg shrink-0"
                          title={`Remove ${m.userName} from project`}
                          onClick={() => handleRemoveMember(m.userEmail, m.userName)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>


                    {isMe ? (
                      <div className="space-y-2">
                        <Input
                          value={profileImageUrl}
                          onChange={(e) => setProfileImageUrl(e.target.value)}
                          placeholder="Your profile image URL"
                          className="border-slate-200 bg-white text-sm"
                        />
                        {profileImageUrl.trim() && (
                          <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                            <ImageWithLightbox
                              src={profileImageUrl}
                              alt="My profile preview"
                              className="h-auto w-full max-h-[120px] object-contain"
                            />
                          </div>
                        )}
                        <Textarea
                          value={projectNote}
                          onChange={(e) => setProjectNote(e.target.value)}
                          placeholder="Your role or note in this project (e.g. Hardware lead)"
                          className="min-h-[60px] border-slate-200 bg-white text-sm"
                        />
                        <Button
                          size="sm"
                          className="bg-slate-900 hover:bg-slate-800"
                          disabled={!profileImageUrl.trim() || !projectNote.trim()}
                          onClick={handleSaveProfile}
                        >
                          Save My Profile
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-1 text-sm text-slate-500">
                        {m.profileImageUrl ? (
                          <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-100 w-16 h-16">
                            <ImageWithLightbox
                              src={m.profileImageUrl}
                              alt={m.userName}
                              className="h-16 w-16 object-cover"
                            />
                          </div>
                        ) : (
                          <p className="italic text-amber-600">Profile image not set yet</p>
                        )}
                        {m.projectNote ? (
                          <p className="text-slate-600">{m.projectNote}</p>
                        ) : (
                          <p className="italic text-amber-600">No role/note added yet</p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
              </div>
            </div>

            {/* Team identity */}
            {(projectDetail.permissions.canRenameProject || projectDetail.permissions.canUpdateTeamImage) && (
              <div className="mb-4 space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                  Team Identity
                </p>
                <Input
                  value={projectNameDraft}
                  onChange={(e) => setProjectNameDraft(e.target.value)}
                  placeholder="Project / team name"
                  className="border-slate-200 bg-white"
                />
                <Input
                  value={teamImageDraft}
                  onChange={(e) => setTeamImageDraft(e.target.value)}
                  placeholder="Team image URL"
                  className="border-slate-200 bg-white"
                />
                {teamImageDraft.trim() && (
                  <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                    <ImageWithLightbox
                      src={teamImageDraft}
                      alt="Team"
                      className="w-full h-auto max-h-[240px] object-contain"
                    />
                  </div>
                )}
                <Button
                  className="bg-slate-900 hover:bg-slate-800"
                  onClick={handleSaveTeamIdentity}
                >
                  Save Team Identity
                </Button>
              </div>
            )}

            {/* Apply gate — team members only. Admins see Approve/Reject instead. */}
            {onReview ? (
              /* Admin review controls inline at the bottom of this step */
              s === "SETUP_PENDING" ? (
                <div className="flex gap-3 pt-2">
                  <Button
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                    onClick={() => onReview("setup", true)}
                  >
                    Approve Team Setup
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 border-red-200 text-red-600 hover:bg-red-50"
                    onClick={() => onReview("setup", false)}
                  >
                    Reject Setup
                  </Button>
                </div>
              ) : null
            ) : (
              <div className={`rounded-2xl border-2 p-4 ${canSubmitSetup ? "border-slate-900 bg-white" : "border-slate-200 bg-slate-50 opacity-75"}`}>
                <p className="mb-2 text-sm font-bold text-slate-900">
                  Apply for Step 1 Approval →
                </p>
                {!allMembersReady && (
                  <p className="mb-3 text-xs text-amber-700">
                    ⚠ All team members must save their profile image and role before applying.
                  </p>
                )}
                {!teamImageSet && (
                  <p className="mb-3 text-xs text-amber-700">
                    ⚠ Team image must be set before applying.
                  </p>
                )}
                <Button
                  className="w-full bg-slate-900 hover:bg-slate-800 disabled:opacity-40"
                  disabled={!canSubmitSetup}
                  onClick={handleSubmitSetup}
                >
                  {s === "SETUP_PENDING" ? "Resubmit for Approval" : "Submit for Admin Approval"}
                </Button>
              </div>
            )}
          </ActiveStepCard>
        )}

        {/* ── STEP 2: Active Project ── */}
        {step2Status === "locked" ? (
          <LockedStep stepNumber={2} label="Active Project" />
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-900 text-sm font-bold text-white">
                  2
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">Active Project Timeline</h3>
                  <p className="text-xs text-slate-500">
                    Add components from My Items and post to the timeline
                  </p>
                </div>
              </div>
              {(projectDetail.permissions.canComment || projectDetail.permissions.canCreateCheckpoint) && (
                <Button className="bg-slate-900 hover:bg-slate-800" onClick={onOpenComposer}>
                  <Plus className="mr-2 h-4 w-4" /> Add to Timeline
                </Button>
              )}
            </div>

            {projectDetail.items.length > 0 && (
              <Card className="rounded-[1.5rem] border-slate-200 bg-slate-50 p-4 shadow-none">
                <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                  Project Components
                </p>
                <div className="grid gap-3 md:grid-cols-2">
                  {projectDetail.items.map((item) => (
                    <div key={item.requestId} className="rounded-2xl border border-slate-200 bg-white p-4">
                      <p className="font-semibold text-slate-900">{item.itemName}</p>
                      <p className="mt-1 text-sm text-slate-500">
                        {item.userEmail} · Qty {item.quantity}
                      </p>
                      <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-400">
                        Added {formatDateOnly(item.taggedAt)}
                      </p>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {(() => {
              const allTimelinePosts = projectDetail.timeline.filter(
                (item) => item.itemType === "post" || item.itemType === "checkpoint",
              );

              if (allTimelinePosts.length === 0) {
                return (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
                    No timeline posts yet. Use "Add to Timeline" to share updates, media, and notes.
                  </div>
                );
              }

              // Apply Search, Kind filter, and Sort
              const filtered = allTimelinePosts.filter((item) => {
                if (timelineKind === "comment" && (item.itemType !== "post" || item.kind !== "comment")) return false;
                if (timelineKind === "note" && (item.itemType !== "post" || item.kind !== "note")) return false;
                if (timelineKind === "question" && (item.itemType !== "post" || item.kind !== "question")) return false;
                if (timelineKind === "checkpoint" && item.itemType !== "checkpoint") return false;
                if (timelineKind === "media") {
                  if (item.itemType !== "post") return false;
                  if (!item.images?.length && !item.videos?.length && !item.links?.length) return false;
                }

                if (timelineSearch.trim()) {
                  const q = timelineSearch.toLowerCase();
                  if (item.itemType === "post") {
                    const inBody = item.body.toLowerCase().includes(q);
                    const inAuthor = item.authorName.toLowerCase().includes(q) || item.authorEmail.toLowerCase().includes(q);
                    const inLinks = item.links?.some((l) => l.label.toLowerCase().includes(q) || l.url.toLowerCase().includes(q));
                    if (!inBody && !inAuthor && !inLinks) return false;
                  } else if (item.itemType === "checkpoint") {
                    const inTitle = item.title.toLowerCase().includes(q);
                    const inDesc = item.description?.toLowerCase().includes(q);
                    if (!inTitle && !inDesc) return false;
                  }
                }

                return true;
              }).sort((a, b) => {
                if (timelineSort === "desc") {
                  return b.createdAt.localeCompare(a.createdAt);
                }
                return a.createdAt.localeCompare(b.createdAt);
              });

              const visible = filtered.slice(0, timelinePageLimit);
              const remaining = filtered.length - visible.length;

              return (
                <div className="space-y-4">
                  <TimelineFilterBar
                    searchQuery={timelineSearch}
                    onSearchChange={setTimelineSearch}
                    selectedKind={timelineKind}
                    onKindChange={setTimelineKind}
                    sortOrder={timelineSort}
                    onSortChange={setTimelineSort}
                    totalCount={allTimelinePosts.length}
                    visibleCount={filtered.length}
                  />

                  {filtered.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
                      No updates match your filter criteria.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {visible.map((item) => renderTimelineItem(item))}
                    </div>
                  )}

                  {remaining > 0 && (
                    <div className="pt-2 text-center">
                      <Button
                        variant="outline"
                        onClick={() => setTimelinePageLimit((prev) => prev + 10)}
                        className="rounded-full border-slate-200 bg-white px-6 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-xs"
                      >
                        Load more updates ({remaining} remaining)
                      </Button>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        )}

      </div>

      <AddMemberDialog
        open={addMemberOpen}
        onOpenChange={setAddMemberOpen}
        projectId={projectDetail.projectId}
        userEmail={userEmail}
        currentMemberEmails={projectDetail.members.map((m) => m.userEmail)}
      />
    </div>
  );
}


