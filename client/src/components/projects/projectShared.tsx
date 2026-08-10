import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getOptimizedImageUrl } from "@/lib/utils";
import { X, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";

export const EMOJIS = ["👍", "👏", "🔥", "💡", "🎉", "🙂"];

export type ProjectStatus =
  | "DRAFT"
  | "SETUP_PENDING"
  | "SETUP_APPROVED"
  | "BOX_PENDING"
  | "BOX_APPROVED"
  | "PLAN_PENDING"
  | "ACTIVE"
  | "COMPLETED"
  | "ARCHIVED";

export type TimelinePostKind = "comment" | "note" | "question";

export type CheckpointFieldType =
  | "short_text"
  | "long_text"
  | "number"
  | "date"
  | "link"
  | "image_links"
  | "video_links"
  | "labeled_links";

export interface ProjectCardMember {
  userEmail: string;
  userName: string;
  userRole: string;
  projectNote?: string;
  profileImageUrl?: string;
}

export interface ProjectCardRecord {
  projectId: string;
  name: string;
  status: ProjectStatus;
  createdAt?: string;
  updatedAt: string;
  lastActivityAt?: string;
  teamImageUrl?: string;
  boxImageUrl?: string;
  members: ProjectCardMember[];
  memberCount: number;
  likeCount: number;
  viewerIsMember?: boolean;
  // Rejection notes (present when admin rejects a step and team must resubmit)
  setupRejectionNote?: string;
  boxRejectionNote?: string;
  planRejectionNote?: string;
}

export interface ProjectDetailRecord {
  projectId: string;
  name: string;
  status: ProjectStatus;
  createdAt: string;
  updatedAt: string;
  lastActivityAt?: string;
  teamImageUrl?: string;
  members: ProjectCardMember[];
  items: {
    requestId: string;
    itemName: string;
    quantity: number;
    userEmail: string;
    taggedAt: string;
  }[];
  likeCount: number;
  viewerHasLiked: boolean;
  permissions: {
    isMember: boolean;
    canRenameProject: boolean;
    canUpdateTeamImage: boolean;
    canUpdateOwnProfile: boolean;
    canComment: boolean;
    canPostMedia: boolean;
    canCreateCheckpoint: boolean;
    canRespondToCheckpoint: boolean;
    canModerateTimeline: boolean;
    canApproveBuiltInStages: boolean;
    canEditBuiltInPrompts: boolean;
  };
  timeline: Array<
    | {
        itemType: "system";
        id: string;
        stage: "team_setup" | "box" | "plan";
        title: string;
        description: string;
        createdAt: string;
        status: string;
        details: Record<string, unknown>;
      }
    | {
        itemType: "checkpoint";
        id: string;
        title: string;
        description: string;
        createdAt: string;
        updatedAt: string;
        status: "OPEN" | "COMPLETED";
        createdByEmail: string;
        createdByName: string;
        createdByRole: string;
        allowMemberResponses: boolean;
        fields: Array<{
          fieldId: string;
          label: string;
          fieldType: CheckpointFieldType;
          required: boolean;
          position: number;
        }>;
        responses: Array<{
          responseId: string;
          submittedByEmail: string;
          submittedByName: string;
          submittedByRole: string;
          values: Array<{
            fieldId: string;
            label: string;
            fieldType: string;
            singleValue?: string;
            multiValues?: string[];
          }>;
          createdAt: string;
          updatedAt: string;
        }>;
      }
    | {
        itemType: "post";
        id: string;
        kind: TimelinePostKind;
        createdAt: string;
        updatedAt: string;
        authorEmail: string;
        authorName: string;
        authorRole: string;
        body: string;
        images: string[];
        videos: string[];
        links: { label: string; url: string }[];
        reactions: Array<{
          emoji: string;
          count: number;
          viewerReacted: boolean;
          users: string[];
        }>;
      }
  >;
  questionConfig: {
    boxTitle: string;
    boxDescription: string;
    sketchPrompt: string;
    sketchHelp: string;
    completedBehaviorPrompt: string;
    materialsRequiredPrompt: string;
    initialPlansPrompt: string;
    firstStepsPrompt: string;
  };
  // Setup stage
  setupSubmittedAt?: string;
  setupApprovedAt?: string;
  setupApprovedBy?: string;
  setupRejectionNote?: string;
  // Box stage
  boxImageUrl?: string;
  boxSubmittedAt?: string;
  boxApprovedAt?: string;
  boxApprovedBy?: string;
  boxRejectionNote?: string;
  sketchImages?: string[];
  completedBehavior?: string;
  materialsRequired?: string;
  initialPlans?: string;
  firstSteps?: string;
  planSubmittedAt?: string;
  planApprovedAt?: string;
  planApprovedBy?: string;
  planRejectionNote?: string;
  planningFields?: Array<{
    fieldId: string;
    label: string;
    fieldType: CheckpointFieldType;
    required: boolean;
    position: number;
  }>;
  planningResponses?: Array<{
    fieldId: string;
    label: string;
    fieldType: string;
    singleValue?: string;
    multiValues?: string[];
  }>;
}

export function normalizeImageUrl(url: string) {
  const trimmed = url.trim();
  if (!trimmed) return "";

  const driveView = trimmed.match(/^https:\/\/drive\.google\.com\/uc\?export=view&id=(.+)$/);
  const driveFile = trimmed.match(/drive\.google\.com\/file\/d\/([^/]+)/);

  if (driveView?.[1]) return `https://lh3.googleusercontent.com/d/${driveView[1]}=w1200`;
  if (driveFile?.[1]) return `https://lh3.googleusercontent.com/d/${driveFile[1]}=w1200`;

  return getOptimizedImageUrl(trimmed);
}

export function normalizeVideoUrl(url: string) {
  const trimmed = url.trim();
  const youtubeWatch = trimmed.match(/[?&]v=([^&]+)/);
  const youtubeShort = trimmed.match(/youtu\.be\/([^?&]+)/);
  const youtubeEmbed = trimmed.match(/youtube\.com\/embed\/([^?&]+)/);
  const driveFile = trimmed.match(/drive\.google\.com\/file\/d\/([^/]+)/);

  if (youtubeEmbed?.[1]) return `https://www.youtube.com/embed/${youtubeEmbed[1]}`;
  if (youtubeWatch?.[1]) return `https://www.youtube.com/embed/${youtubeWatch[1]}`;
  if (youtubeShort?.[1]) return `https://www.youtube.com/embed/${youtubeShort[1]}`;
  if (driveFile?.[1]) return `https://drive.google.com/file/d/${driveFile[1]}/preview`;

  return trimmed;
}

export function formatDateTime(value?: string) {
  if (!value) return "Not available";
  return new Date(value).toLocaleString();
}

export function formatDateOnly(value?: string) {
  if (!value) return "";
  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function getStatusBadgeClass(status: string) {
  if (status === "APPROVED" || status === "ACTIVE" || status === "COMPLETED") {
    return "bg-emerald-100 text-emerald-800 hover:bg-emerald-100";
  }
  if (status === "PENDING" || status === "BOX_PENDING" || status === "PLAN_PENDING" || status === "OPEN") {
    return "bg-amber-100 text-amber-800 hover:bg-amber-100";
  }
  if (status === "REJECTED" || status === "ARCHIVED") {
    return "bg-rose-100 text-rose-700 hover:bg-rose-100";
  }
  return "bg-slate-100 text-slate-700 hover:bg-slate-100";
}

export function createEmptyCheckpointField() {
  return {
    label: "",
    fieldType: "short_text" as CheckpointFieldType,
    required: false,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// History & Report types
// ─────────────────────────────────────────────────────────────────────────────

export interface ProjectHistoryEntry {
  historyId: string;
  projectId: string;
  action: string;
  actorEmail: string;
  actorName: string;
  details?: string;
  createdAt: string;
}

export interface ProjectReportData {
  project: ProjectDetailRecord;
  history: ProjectHistoryEntry[];
}

/** Human-readable labels for history actions */
export const HISTORY_ACTION_LABELS: Record<string, { label: string; icon: string; color: string }> = {
  PROJECT_CREATED: { label: "Project Created", icon: "🚀", color: "emerald" },
  SETUP_SUBMITTED: { label: "Team Setup Submitted", icon: "📋", color: "blue" },
  SETUP_APPROVED: { label: "Team Setup Approved", icon: "✅", color: "emerald" },
  SETUP_REJECTED: { label: "Team Setup Rejected", icon: "❌", color: "rose" },
  BOX_SUBMITTED: { label: "Project Box Submitted", icon: "📦", color: "blue" },
  BOX_APPROVED: { label: "Project Box Approved", icon: "✅", color: "emerald" },
  BOX_REJECTED: { label: "Project Box Rejected", icon: "❌", color: "rose" },
  PLAN_SUBMITTED: { label: "Plan Submitted", icon: "📝", color: "blue" },
  PLAN_APPROVED: { label: "Plan Approved", icon: "✅", color: "emerald" },
  PLAN_REJECTED: { label: "Plan Rejected", icon: "❌", color: "rose" },
  MARKED_ACTIVE: { label: "Project Activated", icon: "⚡", color: "emerald" },
  MARKED_COMPLETED: { label: "Project Completed", icon: "🎉", color: "emerald" },
  MARKED_ARCHIVED: { label: "Project Archived", icon: "📂", color: "slate" },
  POST_ADDED: { label: "Timeline Post Added", icon: "💬", color: "blue" },
  CHECKPOINT_CREATED: { label: "Checkpoint Created", icon: "🏁", color: "purple" },
  CHECKPOINT_RESPONSE: { label: "Checkpoint Response", icon: "📝", color: "blue" },
  MEMBER_JOINED: { label: "Member Joined", icon: "👤", color: "emerald" },
  MEMBER_REMOVED: { label: "Member Removed", icon: "👤", color: "rose" },
  ITEM_TAGGED: { label: "Item Tagged", icon: "🏷️", color: "blue" },
  ITEM_UNTAGGED: { label: "Item Untagged", icon: "🏷️", color: "slate" },
  PROJECT_LIKED: { label: "Project Liked", icon: "⭐", color: "amber" },
};

/**
 * Calculates the progress of a project through its 4 stages.
 * Returns a value between 0 and 1.
 */
export function getProjectProgress(status: ProjectStatus): { step: number; total: number; percent: number } {
  const stages: Record<ProjectStatus, number> = {
    DRAFT: 0,
    SETUP_PENDING: 0.5,
    SETUP_APPROVED: 1,
    BOX_PENDING: 1.5,
    BOX_APPROVED: 2,
    PLAN_PENDING: 2.5,
    ACTIVE: 3,
    COMPLETED: 4,
    ARCHIVED: 4,
  };
  const step = stages[status] ?? 0;
  return { step, total: 4, percent: step / 4 };
}

/** Returns the Kanban column for a project status */
export function getKanbanColumn(status: ProjectStatus): "setup" | "active" | "completed" | "archived" {
  if (status === "COMPLETED") return "completed";
  if (status === "ARCHIVED") return "archived";
  if (status === "ACTIVE") return "active";
  return "setup";
}

export const KANBAN_COLUMNS = [
  { key: "setup" as const, label: "In Progress", color: "bg-amber-50 border-amber-200", textColor: "text-amber-700", dotColor: "bg-amber-400" },
  { key: "active" as const, label: "Active", color: "bg-emerald-50 border-emerald-200", textColor: "text-emerald-700", dotColor: "bg-emerald-400" },
  { key: "completed" as const, label: "Completed", color: "bg-blue-50 border-blue-200", textColor: "text-blue-700", dotColor: "bg-blue-400" },
  { key: "archived" as const, label: "Archived", color: "bg-slate-50 border-slate-200", textColor: "text-slate-500", dotColor: "bg-slate-400" },
];

export function ProjectAvatar({
  imageUrl,
  label,
  className = "h-10 w-10",
}: {
  imageUrl?: string;
  label: string;
  className?: string;
}) {
  const normalized = normalizeImageUrl(imageUrl ?? "");
  return (
    <Avatar className={`${className} border border-slate-200 shadow-sm`}>
      {normalized ? <AvatarImage src={normalized} alt={label} referrerPolicy="no-referrer" /> : null}
      <AvatarFallback className="bg-slate-100 text-slate-600">{label.charAt(0)}</AvatarFallback>
    </Avatar>
  );
}

export function MediaList({
  images = [],
  videos = [],
  links = [],
}: {
  images?: string[];
  videos?: string[];
  links?: { label: string; url: string }[];
}) {
  const cleanImages = images.filter((image) => image.trim());
  const cleanVideos = videos.filter((video) => video.trim());
  const cleanLinks = links.filter((link) => link.label.trim() && link.url.trim());

  if (!cleanImages.length && !cleanVideos.length && !cleanLinks.length) {
    return null;
  }

  return (
    <div className="space-y-4">
      {cleanImages.length > 0 && (
        <div className="grid gap-3 md:grid-cols-2">
          {cleanImages.map((image, index) => (
            <div
              key={`${image}-${index}`}
              className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-100"
            >
              <img
                src={normalizeImageUrl(image)}
                alt="Timeline attachment"
                className="h-48 w-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
          ))}
        </div>
      )}

      {cleanVideos.length > 0 && (
        <div className="space-y-3">
          {cleanVideos.map((video, index) => (
            <div
              key={`${video}-${index}`}
              className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-950"
            >
              <iframe
                src={normalizeVideoUrl(video)}
                title={`Timeline video ${index + 1}`}
                className="aspect-video w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          ))}
        </div>
      )}

      {cleanLinks.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {cleanLinks.map((link, index) => (
            <a
              key={`${link.url}-${index}`}
              href={link.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:border-slate-300 hover:text-slate-900"
            >
              {link.label}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Zoomable image with full-screen lightbox
// ─────────────────────────────────────────────────────────────────────────────

export function ImageWithLightbox({
  src,
  alt,
  className,
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const normalized = normalizeImageUrl(src);
  if (!normalized) return null;

  return (
    <>
      <img
        src={normalized}
        alt={alt}
        referrerPolicy="no-referrer"
        onClick={() => { setOpen(true); setZoom(1); }}
        className={`cursor-zoom-in transition-opacity hover:opacity-90 ${className ?? ""}`}
      />

      {open && (
        <div
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black/92 backdrop-blur-md"
          onClick={() => setOpen(false)}
        >
          <div
            className="absolute right-4 top-4 z-10 flex items-center gap-2"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setZoom((z) => Math.max(0.25, z - 0.25))}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/30"
            >
              <ZoomOut className="h-4 w-4" />
            </button>
            <span className="min-w-[50px] text-center text-sm font-semibold text-white">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={() => setZoom((z) => Math.min(5, z + 0.25))}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/30"
            >
              <ZoomIn className="h-4 w-4" />
            </button>
            <button
              onClick={() => setZoom(1)}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/30"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
            <button
              onClick={() => setOpen(false)}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/30"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div
            className="overflow-auto"
            style={{ maxWidth: "95vw", maxHeight: "88vh" }}
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={normalized}
              alt={alt}
              referrerPolicy="no-referrer"
              draggable={false}
              style={{
                transform: `scale(${zoom})`,
                transformOrigin: "top left",
                transition: "transform 0.2s ease",
                maxWidth: zoom === 1 ? "88vw" : "none",
                height: "auto",
                display: "block",
              }}
            />
          </div>

          <p className="mt-4 text-xs text-white/40">Click outside or ✕ to close</p>
        </div>
      )}
    </>
  );
}
