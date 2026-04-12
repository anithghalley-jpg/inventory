import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
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
  FileText,
  Users,
  Package,
  AlertCircle,
} from "lucide-react";
import {
  formatDateOnly,
  formatDateTime,
  normalizeImageUrl,
  normalizeVideoUrl,
  ProjectAvatar,
  type ProjectDetailRecord,
  ImageWithLightbox,
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
        Submitted{submittedAt ? ` ${formatDateTime(submittedAt)}` : ""} — waiting for admin review…
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
  onReview?: (stage: "setup" | "box" | "plan", approve: boolean) => void;
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
  const submitBoxMut = useMutation(api.projects.submitBox);
  const submitPlanMut = useMutation(api.projects.submitPlan);

  const planComments = useQuery(api.projects.getPlanComments, {
    projectId: projectDetail.projectId,
    userEmail,
  });

  const membership = projectDetail.members.find((m) => m.userEmail === userEmail);

  // Step 1 — my profile
  const [profileImageUrl, setProfileImageUrl] = useState(membership?.profileImageUrl ?? "");
  const [projectNote, setProjectNote] = useState(membership?.projectNote ?? "");
  // Step 1 — team identity
  const [projectNameDraft, setProjectNameDraft] = useState(projectDetail.name);
  const [teamImageDraft, setTeamImageDraft] = useState(projectDetail.teamImageUrl ?? "");
  // Step 2 — box
  const [boxImageDraft, setBoxImageDraft] = useState(projectDetail.boxImageUrl ?? "");
  // Step 3 — plan
  const [sketchImagesDraft, setSketchImagesDraft] = useState<string[]>(
    projectDetail.sketchImages?.length ? projectDetail.sketchImages : [""],
  );
  const [completedBehaviorDraft, setCompletedBehaviorDraft] = useState(
    projectDetail.completedBehavior ?? "",
  );
  const [materialsRequiredDraft, setMaterialsRequiredDraft] = useState(
    projectDetail.materialsRequired ?? "",
  );
  const [initialPlansDraft, setInitialPlansDraft] = useState(projectDetail.initialPlans ?? "");
  const [firstStepsDraft, setFirstStepsDraft] = useState(projectDetail.firstSteps ?? "");
  // Materials reference links
  const [materialsLinks, setMaterialsLinks] = useState<{ label: string; url: string }[]>([]);

  // Dynamic Step 3 responses
  const [dynamicResponses, setDynamicResponses] = useState<Record<string, { singleValue?: string, multiValues?: string[] }>>(() => {
    const initial: Record<string, { singleValue?: string, multiValues?: string[] }> = {};
    projectDetail.planningResponses?.forEach(res => {
      initial[res.fieldId] = { singleValue: res.singleValue, multiValues: res.multiValues };
    });
    return initial;
  });

  const s = projectDetail.status;

  // ── Step status resolution ──
  // Step 1: completed as soon as admin has approved it (SETUP_APPROVED+)
  const step1Status: StepStatus =
    s === "DRAFT" || s === "SETUP_PENDING" ? "current" : "completed";

  // Step 2: locked until step1 approved; current while in box flow (SETUP_APPROVED, BOX_PENDING);
  // completed only when boxApprovedAt is set (BOX_APPROVED+)
  const step2Status: StepStatus =
    s === "DRAFT" || s === "SETUP_PENDING"
      ? "locked"
      : s === "BOX_APPROVED" || s === "PLAN_PENDING" || s === "ACTIVE" || s === "COMPLETED" || s === "ARCHIVED"
      ? "completed"
      : "current"; // SETUP_APPROVED (awaiting box) or BOX_PENDING (review pending)

  // Step 3: locked until box approved; current while in plan flow; completed when plan approved
  const step3Status: StepStatus =
    !["BOX_APPROVED", "PLAN_PENDING", "ACTIVE", "COMPLETED", "ARCHIVED"].includes(s)
      ? "locked"
      : s === "ACTIVE" || s === "COMPLETED" || s === "ARCHIVED"
      ? "completed"
      : "current"; // BOX_APPROVED (awaiting plan) or PLAN_PENDING (review pending)

  const step4Status: StepStatus =
    s === "ACTIVE" || s === "COMPLETED" || s === "ARCHIVED" ? "current" : "locked";


  // ── Can "Apply for Step 1 Approval"? ──
  // ALL members must have profileImageUrl + projectNote saved. Team image must be set.
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
      label: "Project Box",
      icon: <Package className="h-4 w-4" />,
      status: step2Status,
      completedAt: projectDetail.boxApprovedAt || undefined,
    },
    {
      number: 3,
      label: "Planning",
      icon: <FileText className="h-4 w-4" />,
      status: step3Status,
      completedAt: projectDetail.planApprovedAt || undefined,
    },
    {
      number: 4,
      label: "Active Project",
      icon: <ImageIcon className="h-4 w-4" />,
      status: step4Status,
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

  const handleSubmitBox = () => {
    if (!boxImageDraft.trim()) return;
    toast.promise(
      submitBoxMut({
        projectId: projectDetail.projectId,
        userEmail,
        boxImageUrl: boxImageDraft.trim(),
      }),
      {
        loading: "Submitting project box…",
        success: "Box submitted for admin approval!",
        error: (e) => `Failed: ${e.message}`,
      },
    );
  };

  const handleSubmitPlan = () => {
    const isDynamic = (projectDetail.planningFields?.length ?? 0) > 0;
    
    if (isDynamic) {
      // Validate required fields
      for (const field of projectDetail.planningFields!) {
        const res = dynamicResponses[field.fieldId];
        if (field.required) {
          const hasValue = field.fieldType === 'image_links' || field.fieldType === 'video_links' || field.fieldType === 'labeled_links'
            ? (res?.multiValues?.length ?? 0) > 0
            : (res?.singleValue?.trim().length ?? 0) > 0;
          
          if (!hasValue) {
            toast.error(`Please provide a value for "${field.label}"`);
            return;
          }
        }
      }

      toast.promise(
        submitPlanMut({
          projectId: projectDetail.projectId,
          userEmail,
          values: Object.entries(dynamicResponses).map(([fieldId, res]) => {
            const fieldDef = projectDetail.planningFields?.find(f => f.fieldId === fieldId);
            return {
              fieldId,
              label: fieldDef?.label || "Unknown Field",
              fieldType: fieldDef?.fieldType || "short_text",
              singleValue: res.singleValue,
              multiValues: res.multiValues,
            };
          }),
        }),
        {
          loading: "Submitting project plan…",
          success: "Plan submitted for admin approval!",
          error: (e) => `Failed: ${e.message}`,
        },
      );
    } else {
      // Legacy 
      if (!completedBehaviorDraft.trim()) {
        toast.error("Please describe what the project will do when completed.");
        return;
      }
      toast.promise(
        submitPlanMut({
          projectId: projectDetail.projectId,
          userEmail,
          sketchImages: sketchImagesDraft.filter((u) => u.trim()),
          completedBehavior: completedBehaviorDraft.trim(),
          materialsRequired: [
            materialsRequiredDraft.trim(),
            // Append any reference links as formatted text
            ...(materialsLinks.filter((l) => l.url.trim()).map(
              (l) => `• ${l.label.trim() || l.url.trim()}: ${l.url.trim()}`
            )),
          ].filter(Boolean).join("\n"),
          initialPlans: initialPlansDraft.trim(),
          firstSteps: firstStepsDraft.trim(),
        }),
        {
          loading: "Submitting project plan…",
          success: "Plan submitted for admin approval!",
          error: (e) => `Failed: ${e.message}`,
        },
      );
    }
  };

  // ── Helper: group plan comments by questionKey ──
  const commentsByQuestion = (planComments ?? []).reduce(
    (acc, c) => {
      if (!acc[c.questionKey]) acc[c.questionKey] = [];
      acc[c.questionKey].push(c);
      return acc;
    },
    {} as Record<string, { authorName: string; comment: string; createdAt: string }[]>,
  );

  function QuestionComments({ questionKey }: { questionKey: string }) {
    const comments = commentsByQuestion[questionKey] ?? [];
    if (!comments.length) return null;
    return (
      <div className="mt-2 space-y-1">
        {comments.map((c, i) => (
          <div key={i} className="rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-xs">
            <span className="font-semibold text-blue-800">{c.authorName}: </span>
            <span className="text-blue-700">{c.comment}</span>
          </div>
        ))}
      </div>
    );
  }

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
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                Team Members — Individual Profiles
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
              {projectDetail.members.map((m) => {
                const isMe = m.userEmail === userEmail;
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
                      <div>
                        <p className="font-semibold text-slate-900">{m.userName}</p>
                        <p className="text-xs text-slate-500">{m.userEmail}</p>
                      </div>
                      {hasProfile && hasNote && (
                        <Badge className="ml-auto border-emerald-200 bg-emerald-50 text-emerald-700 text-[10px]">
                          Ready
                        </Badge>
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

        {/* ── STEP 2: Project Box ── */}
        {step2Status === "locked" ? (
          <LockedStep stepNumber={2} label="Find a Project Box" />
        ) : step2Status === "completed" ? (
          <CollapsedStep
            stepNumber={2}
            label="Find a Project Box"
            completedAt={projectDetail.boxApprovedAt}
            summary={`Approved by ${projectDetail.boxApprovedBy || "Admin"}`}
          />
        ) : (
          <ActiveStepCard
            stepNumber={2}
            label="Find a Project Box"
            subtitle={
              s === "BOX_PENDING"
                ? "Your box is under admin review"
                : "Upload a photo of your project box and apply for approval"
            }
          >
            {projectDetail.boxRejectionNote && (
              <div className="mb-4">
                <RejectionBanner note={projectDetail.boxRejectionNote} />
              </div>
            )}
            {s === "BOX_PENDING" && (
              <div className="mb-4">
                <PendingBanner submittedAt={projectDetail.boxSubmittedAt ?? ""} />
              </div>
            )}

            {projectDetail.boxImageUrl && (
              <div className="mb-4 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                <ImageWithLightbox
                  src={projectDetail.boxImageUrl}
                  alt="Current box"
                  className="w-full h-auto max-h-[380px] object-contain"
                />
              </div>
            )}

            <div className="space-y-3">
              <Input
                value={boxImageDraft}
                onChange={(e) => setBoxImageDraft(e.target.value)}
                placeholder="Box image URL"
                className="border-slate-200 bg-slate-50"
              />
              {boxImageDraft.trim() && boxImageDraft !== projectDetail.boxImageUrl && (
                <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                  <ImageWithLightbox
                    src={boxImageDraft}
                    alt="Box preview"
                    className="w-full h-auto max-h-[300px] object-contain"
                  />
                </div>
              )}
              {!onReview && (
                <Button
                  className="w-full bg-slate-900 hover:bg-slate-800"
                  disabled={!boxImageDraft.trim()}
                  onClick={handleSubmitBox}
                >
                  {s === "BOX_PENDING" ? "Resubmit Box" : "Submit Box for Approval"}
                </Button>
              )}

              {/* Admin review inline — shown at the end of this step */}
              {onReview && s === "BOX_PENDING" && (
                <div className="flex gap-3 pt-1">
                  <Button
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                    onClick={() => onReview("box", true)}
                  >
                    Approve Box
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 border-red-200 text-red-600 hover:bg-red-50"
                    onClick={() => onReview("box", false)}
                  >
                    Reject Box
                  </Button>
                </div>
              )}
            </div>

            {/* Step 3 preview — visible but locked */}
            <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center gap-2 mb-3">
                <Lock className="h-3.5 w-3.5 text-slate-400" />
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Step 3 — Project Planning (unlocks after box approved)
                </p>
              </div>
              <div className="space-y-2 opacity-60 pointer-events-none select-none">
                {projectDetail.planningFields && projectDetail.planningFields.length > 0 ? (
                  projectDetail.planningFields.map((field) => (
                    <div key={field.fieldId} className="space-y-1">
                      <p className="text-xs font-medium text-slate-500">{field.label}</p>
                      <div className="h-9 rounded-xl border border-slate-200 bg-white" />
                    </div>
                  ))
                ) : (
                  [
                    projectDetail.questionConfig.completedBehaviorPrompt || "What will it do when completed?",
                    projectDetail.questionConfig.materialsRequiredPrompt || "Materials required",
                    projectDetail.questionConfig.initialPlansPrompt || "Initial plans",
                    projectDetail.questionConfig.firstStepsPrompt || "First steps",
                    projectDetail.questionConfig.sketchPrompt || "Sketch images",
                  ].map((prompt, i) => (
                    <div key={i} className="space-y-1">
                      <p className="text-xs font-medium text-slate-500">{prompt}</p>
                      <div className="h-9 rounded-xl border border-slate-200 bg-white" />
                    </div>
                  ))
                )}
              </div>
            </div>
          </ActiveStepCard>
        )}

        {/* ── STEP 3: Project Planning ── */}
        {step3Status === "locked" ? (
          <LockedStep stepNumber={3} label="Project Planning" />
        ) : step3Status === "completed" ? (
          <CollapsedStep
            stepNumber={3}
            label="Project Planning"
            completedAt={projectDetail.planApprovedAt}
            summary={`Approved by ${projectDetail.planApprovedBy || "Admin"}`}
          />
        ) : (
          <ActiveStepCard
            stepNumber={3}
            label="Project Planning"
            subtitle={
              s === "PLAN_PENDING"
                ? "Your plan is under admin review"
                : "Answer all questions then submit for final approval"
            }
          >
            {projectDetail.planRejectionNote && (
              <div className="mb-4">
                <RejectionBanner note={projectDetail.planRejectionNote} />
              </div>
            )}
            {s === "PLAN_PENDING" && (
              <div className="mb-4">
                <PendingBanner submittedAt={projectDetail.planSubmittedAt ?? ""} />
              </div>
            )}

            <div className="space-y-6">
              {projectDetail.planningFields?.length ? (
                /* Dynamic Fields */
                projectDetail.planningFields.map((field) => (
                  <div key={field.fieldId} className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                      {field.label} {field.required && <span className="text-rose-500">*</span>}
                    </label>
                    
                    {field.fieldType === "image_links" || field.fieldType === "video_links" ? (
                      <div className="space-y-3">
                        {(dynamicResponses[field.fieldId]?.multiValues || [""]).map((val, i) => (
                          <div key={i} className="space-y-1">
                            <Input
                              value={val}
                              onChange={(e) => {
                                const newMulti = [...(dynamicResponses[field.fieldId]?.multiValues || [""])];
                                newMulti[i] = e.target.value;
                                setDynamicResponses(prev => ({ 
                                  ...prev, 
                                  [field.fieldId]: { ...prev[field.fieldId], multiValues: newMulti } 
                                }));
                              }}
                              placeholder={`${field.fieldType === "image_links" ? "Image" : "Video"} URL`}
                              className="border-slate-200 bg-slate-50"
                            />
                            {val.trim() && (
                              <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                                {field.fieldType === "image_links" ? (
                                  <ImageWithLightbox src={val} alt={`${field.label} ${i+1}`} className="w-full h-auto max-h-[240px] object-contain" />
                                ) : (
                                  <iframe src={normalizeVideoUrl(val)} className="aspect-video w-full" allowFullScreen />
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="border-slate-200 text-slate-600"
                          onClick={() => {
                            const current = dynamicResponses[field.fieldId]?.multiValues || [""];
                            setDynamicResponses(prev => ({
                              ...prev,
                              [field.fieldId]: { ...prev[field.fieldId], multiValues: [...current, ""] }
                            }));
                          }}
                        >
                          <Plus className="mr-2 h-3.5 w-3.5" /> Add {field.fieldType === "image_links" ? "Image" : "Video"}
                        </Button>
                      </div>
                    ) : field.fieldType === "long_text" ? (
                      <Textarea
                        value={dynamicResponses[field.fieldId]?.singleValue || ""}
                        onChange={(e) => setDynamicResponses(prev => ({ 
                          ...prev, 
                          [field.fieldId]: { ...prev[field.fieldId], singleValue: e.target.value } 
                        }))}
                        placeholder={`Enter ${field.label.toLowerCase()}…`}
                        className="min-h-[120px] border-slate-200 bg-slate-50"
                      />
                    ) : (
                      <Input
                        type={field.fieldType === "number" ? "number" : field.fieldType === "date" ? "date" : "text"}
                        value={dynamicResponses[field.fieldId]?.singleValue || ""}
                        onChange={(e) => setDynamicResponses(prev => ({ 
                          ...prev, 
                          [field.fieldId]: { ...prev[field.fieldId], singleValue: e.target.value } 
                        }))}
                        className="border-slate-200 bg-slate-50"
                      />
                    )}
                    <QuestionComments questionKey={field.fieldId} />
                  </div>
                ))
              ) : (
                /* Legacy Fields */
                <>
                  {/* completedBehavior */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      {projectDetail.questionConfig.completedBehaviorPrompt || "What will it do when completed?"}
                    </label>
                    <Textarea
                      value={completedBehaviorDraft}
                      onChange={(e) => setCompletedBehaviorDraft(e.target.value)}
                      placeholder="Describe expected behavior…"
                      className="min-h-[90px] border-slate-200 bg-slate-50"
                    />
                    <QuestionComments questionKey="completedBehavior" />
                  </div>

                  {/* materialsRequired */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      {projectDetail.questionConfig.materialsRequiredPrompt || "Materials required"}
                    </label>
                    <Textarea
                      value={materialsRequiredDraft}
                      onChange={(e) => setMaterialsRequiredDraft(e.target.value)}
                      placeholder="List materials and components…"
                      className="min-h-[90px] border-slate-200 bg-slate-50"
                    />
                    {/* Material reference links */}
                    {materialsLinks.length > 0 && (
                      <div className="space-y-2 pt-1">
                        {materialsLinks.map((link, i) => (
                          <div key={i} className="flex gap-2">
                            <Input
                              value={link.label}
                              onChange={(e) =>
                                setMaterialsLinks((prev) =>
                                  prev.map((l, j) => j === i ? { ...l, label: e.target.value } : l)
                                )
                              }
                              placeholder="Name"
                              className="flex-1 border-slate-200 bg-white text-sm"
                            />
                            <Input
                              value={link.url}
                              onChange={(e) =>
                                setMaterialsLinks((prev) =>
                                  prev.map((l, j) => j === i ? { ...l, url: e.target.value } : l)
                                )
                              }
                              placeholder="Link"
                              className="flex-1 border-slate-200 bg-white text-sm"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="border-red-200 text-red-500"
                              onClick={() => setMaterialsLinks((prev) => prev.filter((_, j) => j !== i))}
                            >✕</Button>
                          </div>
                        ))}
                      </div>
                    )}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="border-slate-200 text-slate-600 mt-2"
                      onClick={() => setMaterialsLinks((prev) => [...prev, { label: "", url: "" }])}
                    >
                      <Plus className="mr-2 h-3.5 w-3.5" /> Add Link
                    </Button>
                    <QuestionComments questionKey="materialsRequired" />
                  </div>

                  {/* initialPlans */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      {projectDetail.questionConfig.initialPlansPrompt || "Initial plans"}
                    </label>
                    <Textarea
                      value={initialPlansDraft}
                      onChange={(e) => setInitialPlansDraft(e.target.value)}
                      placeholder="Describe your initial plans…"
                      className="min-h-[90px] border-slate-200 bg-slate-50"
                    />
                    <QuestionComments questionKey="initialPlans" />
                  </div>

                  {/* sketchImages */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      {projectDetail.questionConfig.sketchPrompt || "Sketch / diagram images"}
                    </label>
                    {sketchImagesDraft.map((url, i) => (
                      <div key={i} className="space-y-1">
                        <Input
                          value={url}
                          onChange={(e) =>
                            setSketchImagesDraft((prev) =>
                              prev.map((v, j) => (j === i ? e.target.value : v)),
                            )
                          }
                          placeholder="Sketch image URL"
                          className="border-slate-200 bg-slate-50"
                        />
                        {url.trim() && (
                          <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                            <ImageWithLightbox src={url} alt={`Sketch ${i + 1}`} className="w-full h-auto max-h-[240px] object-contain" />
                          </div>
                        )}
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="border-slate-200"
                      onClick={() => setSketchImagesDraft((prev) => [...prev, ""])}
                    >
                      <Plus className="mr-2 h-4 w-4" /> Add Sketch
                    </Button>
                    <QuestionComments questionKey="sketchImages" />
                  </div>
                </>
              )}
            </div>

              {/* Submit / Admin review at the end of Step 3 */}
              {onReview ? (
                /* Admin: show approve/reject instead of submit */
                s === "PLAN_PENDING" ? (
                  <div className="flex gap-3 pt-1">
                    <Button
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                      onClick={() => onReview("plan", true)}
                    >
                      Approve Plan
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1 border-red-200 text-red-600 hover:bg-red-50"
                      onClick={() => onReview("plan", false)}
                    >
                      Reject Plan
                    </Button>
                  </div>
                ) : null
              ) : (
                <Button className="w-full bg-slate-900 hover:bg-slate-800" onClick={handleSubmitPlan}>
                  {s === "PLAN_PENDING" ? "Resubmit Plan" : "Submit Plan for Final Approval"}
                </Button>
              )}
          </ActiveStepCard>
        )}

        {/* ── STEP 4: Active Project ── */}
        {step4Status === "locked" ? (
          <LockedStep stepNumber={4} label="Active Project" />
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-900 text-sm font-bold text-white">
                  4
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
              const posts = projectDetail.timeline.filter(
                (item) => item.itemType === "post" || item.itemType === "checkpoint",
              );
              return posts.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
                  No timeline posts yet. Use "Add to Timeline" to get started.
                </div>
              ) : (
                <div className="space-y-4">{posts.map((item) => renderTimelineItem(item))}</div>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
}
