import { useState, useMemo, useEffect, useRef } from "react";
import { marked } from "marked";
import DOMPurify from "dompurify";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { toast } from "sonner";
import { getOptimizedImageUrl } from "@/lib/utils";
import {
  X,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  MessageSquare,
  FileText,
  HelpCircle,
  ExternalLink,
  Copy,
  Check,
  Image as ImageIcon,
  Video as VideoIcon,
  Link as LinkIcon,
  Search,
  SlidersHorizontal,
  ArrowUpDown,
  Sparkles,
  Plus,
  Trash2,
  Edit3,
  Globe,
  Code,
  Folder,
  Layers,
  ChevronDown,
  ChevronUp,
  Share2,
  Play,
  Film,
  UserPlus,
  UserMinus,
  Users,
  Bold,
  Italic,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  CheckSquare,
  Table as TableIcon,
  Eye,
  FileCode,
  Minus,
  CheckCircle2,
  Package,
  Tag,
  Clock,
  AlertCircle,
  Archive,
  Flag,
  Star,
  ShieldCheck,
  Activity,
  PanelRightOpen,
  PanelRightClose,
} from "lucide-react";

const markdownImageRenderer = new marked.Renderer();
markdownImageRenderer.image = function (arg: any, maybeTitle?: string, maybeText?: string) {
  let href = "";
  let title = "";
  let text = "";
  if (typeof arg === "object" && arg !== null) {
    href = arg.href || "";
    title = arg.title || "";
    text = arg.text || "";
  } else {
    href = String(arg || "");
    title = maybeTitle || "";
    text = maybeText || "";
  }

  const normalizedSrc = normalizeImageUrl(href);
  const titleAttr = title ? ` title="${DOMPurify.sanitize(title)}"` : "";
  const altAttr = text ? ` alt="${DOMPurify.sanitize(text)}"` : "";
  return `<img src="${normalizedSrc}"${altAttr}${titleAttr} loading="lazy" referrerpolicy="no-referrer" class="markdown-rendered-img" />`;
};

marked.use({
  gfm: true,
  breaks: true,
  renderer: markdownImageRenderer,
});

export const EMOJIS = ["👍", "👏", "🔥", "💡", "🎉", "🙂"];

export function insertMarkdownFormatting(
  textarea: HTMLTextAreaElement | null,
  before: string,
  after = "",
  defaultText = "text"
): string {
  if (!textarea) return "";
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const val = textarea.value;
  const selected = val.substring(start, end) || defaultText;
  const replacement = `${before}${selected}${after}`;
  const nextValue = val.substring(0, start) + replacement + val.substring(end);
  
  setTimeout(() => {
    textarea.focus();
    textarea.setSelectionRange(
      start + before.length,
      start + before.length + selected.length
    );
  }, 0);
  
  return nextValue;
}

// ─────────────────────────────────────────────────────────────────────────────
// Human-readable status labels
// ─────────────────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draft",
  SETUP_PENDING: "Setup Pending",
  SETUP_APPROVED: "Setup Approved",
  ACTIVE: "Active",
  COMPLETED: "Completed",
  ARCHIVED: "Archived",
};


export function getStatusLabel(status: string): string {
  return STATUS_LABELS[status] ?? status;
}

// Status → accent group: "setup" | "active" | "complete" | "archived"
export function getStatusAccentGroup(status: string): "setup" | "active" | "complete" | "archived" {
  if (status === "ACTIVE") return "active";
  if (status === "COMPLETED") return "complete";
  if (status === "ARCHIVED") return "archived";
  return "setup";
}

export function getStatusAccentClass(status: string): string {
  const group = getStatusAccentGroup(status);
  return `project-card-accent-${group}`;
}

export function getStatusBgClass(status: string): string {
  const group = getStatusAccentGroup(status);
  return `project-card-bg-${group}`;
}

export function getStatusPillClass(status: string): string {
  if (status === "ACTIVE") return "project-status-pill project-status-pill-active";
  if (status === "COMPLETED") return "project-status-pill project-status-pill-complete";
  if (status === "ARCHIVED") return "project-status-pill project-status-pill-archived";
  if (status.includes("PENDING")) return "project-status-pill project-status-pill-pending";
  return "project-status-pill project-status-pill-setup";
}

// Post type → {icon, chipClass, stripClass, label}
export function getPostTypeStyle(kind: string) {
  switch (kind) {
    case "comment":
      return { icon: <MessageSquare className="h-3 w-3" />, chipClass: "post-kind-chip post-kind-chip-comment", stripClass: "post-type-strip post-type-strip-comment", label: "Comment" };
    case "note":
      return { icon: <FileText className="h-3 w-3" />, chipClass: "post-kind-chip post-kind-chip-note", stripClass: "post-type-strip post-type-strip-note", label: "Note" };
    case "question":
      return { icon: <HelpCircle className="h-3 w-3" />, chipClass: "post-kind-chip post-kind-chip-question", stripClass: "post-type-strip post-type-strip-question", label: "Question" };
    default:
      return { icon: <MessageSquare className="h-3 w-3" />, chipClass: "post-kind-chip post-kind-chip-comment", stripClass: "post-type-strip post-type-strip-comment", label: kind };
  }
}

// Role → pill class
export function getRolePillClass(role: string): string {
  const r = role?.toLowerCase();
  if (r === "admin") return "post-role-pill post-role-pill-admin";
  if (r === "team") return "post-role-pill post-role-pill-team";
  return "post-role-pill post-role-pill-user";
}

// ─────────────────────────────────────────────────────────────────────────────
// Progress Ring SVG Component
// ─────────────────────────────────────────────────────────────────────────────

export function ProgressRing({
  percent,
  size = 52,
  strokeWidth = 4,
}: {
  percent: number;
  size?: number;
  strokeWidth?: number;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;
  const cx = size / 2;
  const cy = size / 2;

  const color = percent >= 100 ? "#10b981" : percent >= 50 ? "#6366f1" : "#f59e0b";

  return (
    <svg
      width={size}
      height={size}
      className="project-progress-ring shrink-0"
      aria-label={`${Math.round(percent)}% complete`}
    >
      <circle
        className="project-progress-ring-bg"
        cx={cx}
        cy={cy}
        r={radius}
        fill="none"
        strokeWidth={strokeWidth}
      />
      <circle
        className="project-progress-ring-circle"
        cx={cx}
        cy={cy}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
      />
      <text
        x={cx}
        y={cy + 4}
        textAnchor="middle"
        fontSize="9"
        className="project-progress-ring-text"
        style={{ transform: "rotate(90deg)", transformOrigin: `${cx}px ${cy}px`, fontWeight: 700, fill: "#1e293b" }}
      >
        {Math.round(percent)}%
      </text>
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Relative Time component
// ─────────────────────────────────────────────────────────────────────────────

export function RelativeTime({ value }: { value?: string }) {
  if (!value) return <span className="text-xs text-slate-400">—</span>;
  const date = new Date(value);
  const now = Date.now();
  const diff = now - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  let label = "";
  if (minutes < 1) label = "just now";
  else if (minutes < 60) label = `${minutes}m ago`;
  else if (hours < 24) label = `${hours}h ago`;
  else if (days < 7) label = `${days}d ago`;
  else label = date.toLocaleDateString(undefined, { month: "short", day: "numeric" });

  return (
    <span className="text-xs text-slate-400" title={date.toLocaleString()}>
      {label}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Was there recent activity? (within 24h)
// ─────────────────────────────────────────────────────────────────────────────

export function isRecentActivity(dateStr?: string): boolean {
  if (!dateStr) return false;
  return Date.now() - new Date(dateStr).getTime() < 86400000;
}

// ─────────────────────────────────────────────────────────────────────────────
// PostAuthorHeader — shared across Admin & Team timeline cards
// ─────────────────────────────────────────────────────────────────────────────

export function PostAuthorHeader({
  imageUrl,
  name,
  role,
  kind,
  createdAt,
  members,
}: {
  imageUrl?: string;
  name: string;
  role: string;
  kind: string;
  createdAt: string;
  members?: { userEmail: string; profileImageUrl?: string; userName: string }[];
}) {
  const { icon, chipClass, label } = getPostTypeStyle(kind);
  const rolePill = getRolePillClass(role);

  return (
    <div className="post-author-header">
      <ProjectAvatar imageUrl={imageUrl} label={name} className="h-10 w-10 shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-sm font-bold text-slate-900 truncate">{name}</span>
          <span className={rolePill}>{role}</span>
          <span className={chipClass}>
            {icon}
            {label}
          </span>
        </div>
        <RelativeTime value={createdAt} />
      </div>
    </div>
  );
}

export type ProjectStatus =
  | "DRAFT"
  | "SETUP_PENDING"
  | "SETUP_APPROVED"
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
        stage: "team_setup";

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

  // 1. Google Drive thumbnail format (e.g. drive.google.com/thumbnail?id=FILE_ID&sz=w800)
  const gdriveThumb = trimmed.match(/drive\.google\.com\/thumbnail\?(?:.*&)?id=([a-zA-Z0-9_-]+)/i);
  if (gdriveThumb?.[1]) {
    return `https://drive.google.com/thumbnail?id=${gdriveThumb[1]}&sz=w1200`;
  }

  // 2. Google Drive uc / export format (e.g. drive.google.com/uc?id=FILE_ID or drive.google.com/uc?export=view&id=FILE_ID)
  const driveView = trimmed.match(/drive\.google\.com\/uc\?(?:.*&)?id=([a-zA-Z0-9_-]+)/i);
  if (driveView?.[1]) {
    return `https://drive.google.com/thumbnail?id=${driveView[1]}&sz=w1200`;
  }

  // 3. Google Drive file/d/ format (e.g. drive.google.com/file/d/FILE_ID/view)
  const driveFile = trimmed.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/i);
  if (driveFile?.[1]) {
    return `https://drive.google.com/thumbnail?id=${driveFile[1]}&sz=w1200`;
  }

  // 4. Google Drive open format (e.g. drive.google.com/open?id=FILE_ID)
  const driveOpen = trimmed.match(/drive\.google\.com\/open\?(?:.*&)?id=([a-zA-Z0-9_-]+)/i);
  if (driveOpen?.[1]) {
    return `https://drive.google.com/thumbnail?id=${driveOpen[1]}&sz=w1200`;
  }

  // 5. Google usercontent format
  const googleUserContent = trimmed.match(/lh3\.googleusercontent\.com\/d\/([a-zA-Z0-9_-]+)/i);
  if (googleUserContent?.[1]) {
    return `https://drive.google.com/thumbnail?id=${googleUserContent[1]}&sz=w1200`;
  }

  return getOptimizedImageUrl(trimmed);
}

export function isDirectVideoUrl(url: string): boolean {
  if (!url) return false;
  const clean = url.trim().toLowerCase().split("?")[0].split("#")[0];
  return clean.endsWith(".mp4") || clean.endsWith(".webm") || clean.endsWith(".ogg") || clean.endsWith(".mov");
}

export function normalizeVideoUrl(url: string) {
  const trimmed = url.trim();
  if (!trimmed) return "";

  // YouTube (watch, embed, short, shorts)
  const youtubeWatch = trimmed.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (youtubeWatch?.[1]) return `https://www.youtube.com/embed/${youtubeWatch[1]}`;

  // Vimeo
  const vimeoMatch = trimmed.match(/vimeo\.com\/(?:video\/)?([0-9]+)/);
  if (vimeoMatch?.[1]) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;

  // Loom
  const loomMatch = trimmed.match(/loom\.com\/(?:share|embed)\/([a-zA-Z0-9]+)/);
  if (loomMatch?.[1]) return `https://www.loom.com/embed/${loomMatch[1]}`;

  // Google Drive
  const driveFile = trimmed.match(/drive\.google\.com\/file\/d\/([^/]+)/);
  if (driveFile?.[1]) return `https://drive.google.com/file/d/${driveFile[1]}/preview`;

  return trimmed;
}

export function getDomainMetadata(rawUrl: string): { domain: string; name: string; iconType: string } {
  try {
    const parsed = new URL(rawUrl.startsWith("http") ? rawUrl : `https://${rawUrl}`);
    const host = parsed.hostname.toLowerCase().replace(/^www\./, "");
    if (host.includes("github.com")) return { domain: host, name: "GitHub", iconType: "github" };
    if (host.includes("figma.com")) return { domain: host, name: "Figma", iconType: "figma" };
    if (host.includes("drive.google.com") || host.includes("docs.google.com")) return { domain: host, name: "Google Docs", iconType: "docs" };
    if (host.includes("notion.so") || host.includes("notion.site")) return { domain: host, name: "Notion", iconType: "notion" };
    if (host.includes("youtube.com") || host.includes("youtu.be")) return { domain: host, name: "YouTube", iconType: "video" };
    if (host.includes("loom.com")) return { domain: host, name: "Loom", iconType: "video" };
    if (parsed.pathname.toLowerCase().endsWith(".pdf")) return { domain: host, name: "PDF Document", iconType: "pdf" };
    return { domain: host, name: host, iconType: "link" };
  } catch {
    return { domain: "web", name: "Link", iconType: "link" };
  }
}

export function AutoLinkText({ text, className = "" }: { text: string; className?: string }) {
  if (!text) return null;
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);

  return (
    <span className={className}>
      {parts.map((part, index) => {
        if (part.match(urlRegex)) {
          return (
            <a
              key={index}
              href={part}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-0.5 text-blue-600 underline underline-offset-2 hover:text-blue-800 font-medium break-all"
              onClick={(e) => e.stopPropagation()}
            >
              {part}
              <ExternalLink className="inline h-3 w-3 shrink-0 ml-0.5 opacity-70" />
            </a>
          );
        }
        return part;
      })}
    </span>
  );
}

export function MarkdownPostRenderer({
  content,
  className = "",
}: {
  content: string;
  className?: string;
}) {
  const html = useMemo(() => {
    if (!content) return "";
    try {
      const parsed = marked.parse(content) as string;
      return DOMPurify.sanitize(parsed, {
        ADD_TAGS: ["img", "iframe", "video", "source"],
        ADD_ATTR: ["target", "rel", "referrerpolicy", "src", "alt", "title", "loading", "class", "style", "width", "height"],
      });
    } catch (e) {
      console.error("Markdown parse error:", e);
      return content;
    }
  }, [content]);

  return (
    <div
      className={`timeline-markdown text-sm leading-relaxed text-slate-800 break-words ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
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
  if (status === "PENDING" || status === "OPEN") {
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
  PROJECT_CREATED: { label: "Project Created", icon: "Sparkles", color: "indigo" },
  SETUP_SUBMITTED: { label: "Team Setup Submitted", icon: "Clock", color: "amber" },
  SETUP_APPROVED: { label: "Team Setup Approved", icon: "CheckCircle2", color: "emerald" },
  SETUP_REJECTED: { label: "Team Setup Needs Revision", icon: "AlertCircle", color: "rose" },
  BOX_SUBMITTED: { label: "Project Box Submitted", icon: "Package", color: "blue" },
  BOX_APPROVED: { label: "Project Box Approved", icon: "CheckCircle2", color: "emerald" },
  BOX_REJECTED: { label: "Project Box Rejected", icon: "AlertCircle", color: "rose" },
  PLAN_SUBMITTED: { label: "Plan Submitted", icon: "FileText", color: "blue" },
  PLAN_APPROVED: { label: "Plan Approved", icon: "CheckCircle2", color: "emerald" },
  PLAN_REJECTED: { label: "Plan Rejected", icon: "AlertCircle", color: "rose" },
  MARKED_ACTIVE: { label: "Project Activated", icon: "Play", color: "emerald" },
  MARKED_COMPLETED: { label: "Project Completed", icon: "CheckCircle2", color: "emerald" },
  MARKED_ARCHIVED: { label: "Project Archived", icon: "Archive", color: "slate" },
  POST_ADDED: { label: "Timeline Update Posted", icon: "MessageSquare", color: "indigo" },
  CHECKPOINT_CREATED: { label: "Checkpoint Created", icon: "Flag", color: "purple" },
  CHECKPOINT_RESPONSE: { label: "Checkpoint Response", icon: "CheckSquare", color: "indigo" },
  MEMBER_JOINED: { label: "Member Joined", icon: "UserPlus", color: "emerald" },
  MEMBER_REMOVED: { label: "Member Removed", icon: "UserMinus", color: "rose" },
  ITEM_TAGGED: { label: "Item Tagged", icon: "Tag", color: "indigo" },
  ITEM_UNTAGGED: { label: "Item Untagged", icon: "Tag", color: "slate" },
  PROJECT_LIKED: { label: "Project Starred", icon: "Star", color: "amber" },
};

export function HistoryActionIcon({ action, className = "h-4 w-4" }: { action: string; className?: string }) {
  switch (action) {
    case "PROJECT_CREATED":
      return <Sparkles className={className} />;
    case "SETUP_SUBMITTED":
      return <Clock className={className} />;
    case "SETUP_APPROVED":
    case "BOX_APPROVED":
    case "PLAN_APPROVED":
    case "MARKED_COMPLETED":
      return <CheckCircle2 className={className} />;
    case "SETUP_REJECTED":
    case "BOX_REJECTED":
    case "PLAN_REJECTED":
      return <AlertCircle className={className} />;
    case "BOX_SUBMITTED":
      return <Package className={className} />;
    case "PLAN_SUBMITTED":
      return <FileText className={className} />;
    case "MARKED_ACTIVE":
      return <Play className={className} />;
    case "MARKED_ARCHIVED":
      return <Archive className={className} />;
    case "POST_ADDED":
      return <MessageSquare className={className} />;
    case "CHECKPOINT_CREATED":
      return <Flag className={className} />;
    case "CHECKPOINT_RESPONSE":
      return <CheckSquare className={className} />;
    case "MEMBER_JOINED":
      return <UserPlus className={className} />;
    case "MEMBER_REMOVED":
      return <UserMinus className={className} />;
    case "ITEM_TAGGED":
    case "ITEM_UNTAGGED":
      return <Tag className={className} />;
    case "PROJECT_LIKED":
      return <Star className={className} />;
    default:
      return <Activity className={className} />;
  }
}

/**
 * Calculates the progress of a project through its 2 stages.
 * Returns percent as 0–100 for use with ProgressRing.
 */
export function getProjectProgress(status: ProjectStatus): { step: number; total: number; percent: number } {
  const stages: Record<ProjectStatus, number> = {
    DRAFT: 0,
    SETUP_PENDING: 20,
    SETUP_APPROVED: 40,
    ACTIVE: 70,
    COMPLETED: 100,
    ARCHIVED: 100,
  };
  const percent = stages[status] ?? 0;
  return { step: percent >= 70 ? 2 : percent >= 20 ? 1 : 0, total: 2, percent };
}

/** Returns the Kanban column for a project status */
export function getKanbanColumn(status: ProjectStatus): "setup" | "active" | "complete" | "archived" {
  if (status === "COMPLETED") return "complete";
  if (status === "ARCHIVED") return "archived";
  if (status === "ACTIVE") return "active";
  return "setup";
}

export const KANBAN_COLUMNS = [
  { key: "setup" as const, label: "Setup", color: "bg-amber-50 border-amber-200", textColor: "text-amber-700", dotColor: "bg-amber-400" },
  { key: "active" as const, label: "Active", color: "bg-indigo-50 border-indigo-200", textColor: "text-indigo-700", dotColor: "bg-indigo-500" },
  { key: "complete" as const, label: "Completed", color: "bg-emerald-50 border-emerald-200", textColor: "text-emerald-700", dotColor: "bg-emerald-500" },
  { key: "archived" as const, label: "Archived", color: "bg-slate-50 border-slate-200", textColor: "text-slate-500", dotColor: "bg-slate-400" },
];

export function ProjectAvatar({
  imageUrl,
  label,
  className,
}: {
  imageUrl?: string;
  label: string;
  className?: string;
}) {

  const normalized = normalizeImageUrl(imageUrl ?? "");
  return (
    <Avatar className={className}>
      {normalized ? <AvatarImage src={normalized} alt={label} referrerPolicy="no-referrer" /> : null}
      <AvatarFallback className="bg-slate-100 text-slate-600">{label.charAt(0)}</AvatarFallback>
    </Avatar>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styled Link Reference Card
// ─────────────────────────────────────────────────────────────────────────────

export function LinkReferenceCard({
  link,
}: {
  link: { label: string; url: string };
}) {
  const [copied, setCopied] = useState(false);
  const meta = getDomainMetadata(link.url);

  const handleCopy = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText(link.url);
    setCopied(true);
    toast.success("Link copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const getDomainIcon = () => {
    switch (meta.iconType) {
      case "github":
        return <Code className="h-4 w-4 text-slate-800" />;
      case "figma":
        return <Layers className="h-4 w-4 text-purple-600" />;
      case "docs":
        return <FileText className="h-4 w-4 text-blue-600" />;
      case "notion":
        return <Folder className="h-4 w-4 text-slate-700" />;
      case "video":
        return <VideoIcon className="h-4 w-4 text-rose-600" />;
      case "pdf":
        return <FileText className="h-4 w-4 text-red-600" />;
      default:
        return <Globe className="h-4 w-4 text-slate-500" />;
    }
  };

  return (
    <div className="group relative flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white/90 p-3 shadow-sm transition-all hover:border-slate-300 hover:shadow-md hover:bg-slate-50/80">
      <a
        href={link.url}
        target="_blank"
        rel="noreferrer"
        className="flex min-w-0 flex-1 items-center gap-3"
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 transition-colors group-hover:bg-white group-hover:shadow-sm">
          {getDomainIcon()}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
            {link.label || meta.name}
          </p>
          <p className="truncate text-xs text-slate-400">
            {meta.domain}
          </p>
        </div>
        <ExternalLink className="h-4 w-4 shrink-0 text-slate-400 group-hover:text-blue-600 transition-colors mr-1" />
      </a>

      <button
        type="button"
        onClick={handleCopy}
        title="Copy Link"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-400 opacity-60 transition-all hover:border-slate-300 hover:bg-white hover:text-slate-700 hover:opacity-100"
      >
        {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Rich Media List (Images with Lightbox, Multi-provider Videos, Link Cards)
// ─────────────────────────────────────────────────────────────────────────────

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
      {/* 🖼️ Images Gallery */}
      {cleanImages.length > 0 && (
        <div
          className={`grid gap-3 ${
            cleanImages.length === 1
              ? "grid-cols-1"
              : cleanImages.length === 2
              ? "grid-cols-1 sm:grid-cols-2"
              : "grid-cols-2 sm:grid-cols-3"
          }`}
        >
          {cleanImages.map((image, index) => (
            <div
              key={`${image}-${index}`}
              className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 shadow-sm transition-all hover:shadow-md"
            >
              <ImageWithLightbox
                src={image}
                alt={`Timeline image ${index + 1}`}
                className={`w-full object-cover transition-transform duration-300 group-hover:scale-105 ${
                  cleanImages.length === 1 ? "h-64 sm:h-80" : "h-44 sm:h-52"
                }`}
              />
              <div className="pointer-events-none absolute bottom-2 right-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity">
                Click to zoom
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 🎥 Video Players (Embedded & Direct) */}
      {cleanVideos.length > 0 && (
        <div className="space-y-3">
          {cleanVideos.map((video, index) => {
            const isDirect = isDirectVideoUrl(video);
            const normalized = normalizeVideoUrl(video);
            const meta = getDomainMetadata(video);

            return (
              <div
                key={`${video}-${index}`}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-950 shadow-md"
              >
                <div className="flex items-center justify-between border-b border-white/10 bg-slate-900 px-4 py-2 text-xs text-slate-300">
                  <div className="flex items-center gap-2">
                    <VideoIcon className="h-3.5 w-3.5 text-red-400" />
                    <span className="font-semibold text-white">Video Attachment {cleanVideos.length > 1 ? `#${index + 1}` : ""}</span>
                    <span className="text-[10px] text-slate-400">({meta.name})</span>
                  </div>
                  <a
                    href={video}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-white transition-colors"
                  >
                    Open in new tab <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
                {isDirect ? (
                  <video
                    controls
                    src={video}
                    className="aspect-video w-full"
                    preload="metadata"
                  >
                    Your browser does not support the video tag.
                  </video>
                ) : (
                  <iframe
                    src={normalized}
                    title={`Timeline video ${index + 1}`}
                    className="aspect-video w-full border-0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 🔗 Reference Hyperlinks */}
      {cleanLinks.length > 0 && (
        <div className="space-y-2">
          <div className="grid gap-2.5 sm:grid-cols-2">
            {cleanLinks.map((link, index) => (
              <LinkReferenceCard key={`${link.url}-${index}`} link={link} />
            ))}
          </div>
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
              type="button"
              onClick={() => setZoom((z) => Math.max(0.25, z - 0.25))}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/30"
              title="Zoom out"
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

// ─────────────────────────────────────────────────────────────────────────────
// Unified Rich Timeline Post Composer Dialog (Create & Edit with Markdown Support)
// ─────────────────────────────────────────────────────────────────────────────

export function TimelinePostComposerDialog({
  open,
  onOpenChange,
  projectId,
  userEmail,
  editingPost,
  onSaved,
  canModerate = false,
  canPostMedia = true,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  userEmail: string;
  editingPost?: {
    id: string;
    kind: TimelinePostKind;
    body: string;
    images: string[];
    videos: string[];
    links: { label: string; url: string }[];
  } | null;
  onSaved?: () => void;
  canModerate?: boolean;
  canPostMedia?: boolean;
}) {
  const addPostMut = useMutation(api.projects.addTimelinePost);
  const updatePostMut = useMutation(api.projects.updateTimelinePost);

  const [kind, setKind] = useState<TimelinePostKind>("comment");
  const [body, setBody] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [videos, setVideos] = useState<string[]>([]);
  const [links, setLinks] = useState<{ label: string; url: string }[]>([]);
  const [activeMediaTab, setActiveMediaTab] = useState<"images" | "videos" | "links">("images");
  const [composerViewMode, setComposerViewMode] = useState<"write" | "preview" | "raw">("write");
  const [newImageInput, setNewImageInput] = useState("");
  const [newVideoInput, setNewVideoInput] = useState("");
  const [newLinkLabel, setNewLinkLabel] = useState("");
  const [newLinkUrl, setNewLinkUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedRawCode, setCopiedRawCode] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Initialize or reset state when dialog opens / editingPost changes
  useEffect(() => {
    if (open) {
      if (editingPost) {
        setKind(editingPost.kind);
        setBody(editingPost.body);
        setImages(editingPost.images || []);
        setVideos(editingPost.videos || []);
        setLinks(editingPost.links || []);
      } else {
        setKind("comment");
        setBody("");
        setImages([]);
        setVideos([]);
        setLinks([]);
      }
      setComposerViewMode("write");
      setNewImageInput("");
      setNewVideoInput("");
      setNewLinkLabel("");
      setNewLinkUrl("");
      setIsSubmitting(false);
    }
  }, [open, editingPost]);

  // Insert markdown formatting at cursor
  const insertMarkdown = (before: string, after: string = "", defaultSample: string = "") => {
    const textarea = textareaRef.current;
    if (!textarea) {
      setBody((prev) => `${prev}${before}${defaultSample}${after}`);
      return;
    }
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = textarea.value.substring(start, end);
    const textToWrap = selectedText || defaultSample;
    const replacement = `${before}${textToWrap}${after}`;
    const newText = textarea.value.substring(0, start) + replacement + textarea.value.substring(end);
    setBody(newText);
    setTimeout(() => {
      textarea.focus();
      if (selectedText) {
        textarea.setSelectionRange(start, start + replacement.length);
      } else {
        textarea.setSelectionRange(start + before.length, start + before.length + defaultSample.length);
      }
    }, 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "b") {
      e.preventDefault();
      insertMarkdown("**", "**", "bold text");
    } else if ((e.ctrlKey || e.metaKey) && e.key === "i") {
      e.preventDefault();
      insertMarkdown("*", "*", "italic text");
    } else if ((e.ctrlKey || e.metaKey) && e.key === "k") {
      e.preventDefault();
      insertMarkdown("[", "](https://example.com)", "link title");
    }
  };

  const handleAddImage = () => {
    const trimmed = newImageInput.trim();
    if (!trimmed) return;
    setImages((prev) => [...prev, trimmed]);
    setNewImageInput("");
  };

  const handleAddVideo = () => {
    const trimmed = newVideoInput.trim();
    if (!trimmed) return;
    setVideos((prev) => [...prev, trimmed]);
    setNewVideoInput("");
  };

  const handleAddLink = () => {
    const trimmedUrl = newLinkUrl.trim();
    const trimmedLabel = newLinkLabel.trim() || trimmedUrl;
    if (!trimmedUrl) return;
    setLinks((prev) => [...prev, { label: trimmedLabel, url: trimmedUrl }]);
    setNewLinkLabel("");
    setNewLinkUrl("");
  };

  const handleCopyRaw = () => {
    navigator.clipboard.writeText(body);
    setCopiedRawCode(true);
    toast.success("Raw Markdown copied to clipboard!");
    setTimeout(() => setCopiedRawCode(false), 2000);
  };

  const handleSubmit = async () => {
    if (!body.trim()) {
      toast.error("Please enter some text for your update");
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingPost) {
        await updatePostMut({
          userEmail,
          projectId,
          entryId: editingPost.id,
          kind,
          body: body.trim(),
          images,
          videos,
          links,
        });
        toast.success("Post updated successfully!");
      } else {
        await addPostMut({
          userEmail,
          projectId,
          kind,
          body: body.trim(),
          images,
          videos,
          links,
        });
        toast.success("Update posted to timeline!");
      }
      onOpenChange(false);
      onSaved?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save post");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-slate-200 bg-white sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between gap-4 flex-wrap pr-6">
            <DialogTitle className="text-xl font-black">
              {editingPost ? "Edit Timeline Update" : "Share Update to Timeline"}
            </DialogTitle>
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
              <button
                type="button"
                onClick={() => setComposerViewMode("write")}
                className={`px-3 py-1 rounded-lg transition-all flex items-center gap-1.5 ${
                  composerViewMode === "write"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Write</span>
              </button>
              <button
                type="button"
                onClick={() => setComposerViewMode("preview")}
                className={`px-3 py-1 rounded-lg transition-all flex items-center gap-1.5 ${
                  composerViewMode === "preview"
                    ? "bg-white text-indigo-700 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Preview</span>
              </button>
              <button
                type="button"
                onClick={() => setComposerViewMode("raw")}
                className={`px-3 py-1 rounded-lg transition-all flex items-center gap-1.5 ${
                  composerViewMode === "raw"
                    ? "bg-slate-900 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <FileCode className="w-3.5 h-3.5" />
                <span>Raw Code</span>
              </button>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Post Kind Select */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Post Type</label>
              <Select value={kind} onValueChange={(val) => setKind(val as TimelinePostKind)}>
                <SelectTrigger className="w-[180px] border-slate-200 bg-slate-50">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="comment">💬 Comment</SelectItem>
                  <SelectItem value="note">📝 Project Note</SelectItem>
                  {canModerate && <SelectItem value="question">❓ Question</SelectItem>}
                </SelectContent>
              </Select>
            </div>
            <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-indigo-500" />
              Markdown &amp; GFM Enabled
            </span>
          </div>

          {/* WRITE MODE */}
          {composerViewMode === "write" && (
            <div className="space-y-2">
              {/* Markdown Action Toolbar */}
              <div className="flex flex-wrap items-center gap-1 p-1.5 bg-slate-100/90 rounded-xl border border-slate-200 text-slate-700">
                <button
                  type="button"
                  title="Bold (**text**)"
                  onClick={() => insertMarkdown("**", "**", "bold text")}
                  className="p-1.5 rounded-lg hover:bg-white hover:text-slate-900 hover:shadow-xs transition-all font-bold text-xs"
                >
                  <Bold className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  title="Italic (*text*)"
                  onClick={() => insertMarkdown("*", "*", "italic text")}
                  className="p-1.5 rounded-lg hover:bg-white hover:text-slate-900 hover:shadow-xs transition-all text-xs"
                >
                  <Italic className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  title="Strikethrough (~~text~~)"
                  onClick={() => insertMarkdown("~~", "~~", "strikethrough")}
                  className="p-1.5 rounded-lg hover:bg-white hover:text-slate-900 hover:shadow-xs transition-all text-xs"
                >
                  <Strikethrough className="w-3.5 h-3.5" />
                </button>

                <div className="w-[1px] h-4 bg-slate-300 mx-0.5" />

                <button
                  type="button"
                  title="Heading 1 (# Heading)"
                  onClick={() => insertMarkdown("\n# ", "\n", "Heading 1")}
                  className="p-1.5 rounded-lg hover:bg-white hover:text-slate-900 hover:shadow-xs transition-all text-xs font-bold"
                >
                  <Heading1 className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  title="Heading 2 (## Heading)"
                  onClick={() => insertMarkdown("\n## ", "\n", "Heading 2")}
                  className="p-1.5 rounded-lg hover:bg-white hover:text-slate-900 hover:shadow-xs transition-all text-xs font-bold"
                >
                  <Heading2 className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  title="Heading 3 (### Heading)"
                  onClick={() => insertMarkdown("\n### ", "\n", "Heading 3")}
                  className="p-1.5 rounded-lg hover:bg-white hover:text-slate-900 hover:shadow-xs transition-all text-xs font-bold"
                >
                  <Heading3 className="w-3.5 h-3.5" />
                </button>

                <div className="w-[1px] h-4 bg-slate-300 mx-0.5" />

                <button
                  type="button"
                  title="Inline Code (`code`)"
                  onClick={() => insertMarkdown("`", "`", "code")}
                  className="p-1.5 rounded-lg hover:bg-white hover:text-slate-900 hover:shadow-xs transition-all text-xs"
                >
                  <Code className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  title="Code Block (```js ... ```)"
                  onClick={() => insertMarkdown("\n```javascript\n", "\n```\n", "// code here")}
                  className="p-1.5 rounded-lg hover:bg-white hover:text-slate-900 hover:shadow-xs transition-all text-xs"
                >
                  <FileCode className="w-3.5 h-3.5" />
                </button>

                <div className="w-[1px] h-4 bg-slate-300 mx-0.5" />

                <button
                  type="button"
                  title="Bullet List (- item)"
                  onClick={() => insertMarkdown("\n- ", "", "List item")}
                  className="p-1.5 rounded-lg hover:bg-white hover:text-slate-900 hover:shadow-xs transition-all text-xs"
                >
                  <List className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  title="Numbered List (1. item)"
                  onClick={() => insertMarkdown("\n1. ", "", "First item")}
                  className="p-1.5 rounded-lg hover:bg-white hover:text-slate-900 hover:shadow-xs transition-all text-xs"
                >
                  <ListOrdered className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  title="Task List (- [ ] task)"
                  onClick={() => insertMarkdown("\n- [ ] ", "", "Task to complete")}
                  className="p-1.5 rounded-lg hover:bg-white hover:text-slate-900 hover:shadow-xs transition-all text-xs"
                >
                  <CheckSquare className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  title="Blockquote (> quote)"
                  onClick={() => insertMarkdown("\n> ", "", "Important project note")}
                  className="p-1.5 rounded-lg hover:bg-white hover:text-slate-900 hover:shadow-xs transition-all text-xs"
                >
                  <Quote className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  title="Table"
                  onClick={() => insertMarkdown("\n| Stage | Component | Status |\n|---|---|---|\n| Prototype | ESP32 Board | Tested |\n", "", "")}
                  className="p-1.5 rounded-lg hover:bg-white hover:text-slate-900 hover:shadow-xs transition-all text-xs"
                >
                  <TableIcon className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  title="Divider (---)"
                  onClick={() => insertMarkdown("\n---\n", "", "")}
                  className="p-1.5 rounded-lg hover:bg-white hover:text-slate-900 hover:shadow-xs transition-all text-xs"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  title="Link ([title](url))"
                  onClick={() => insertMarkdown("[", "](https://example.com)", "Link Title")}
                  className="p-1.5 rounded-lg hover:bg-white hover:text-slate-900 hover:shadow-xs transition-all text-xs"
                >
                  <LinkIcon className="w-3.5 h-3.5" />
                </button>
              </div>

              <Textarea
                ref={textareaRef}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Write your update in Markdown (supports headers, code blocks, lists, bold, tables, links)..."
                className="min-h-[160px] border-slate-200 bg-slate-50 font-mono text-xs leading-relaxed placeholder:text-slate-400 placeholder:font-sans"
              />

              {/* Quick Emoji Bar & Stats */}
              <div className="flex items-center justify-between flex-wrap gap-2 pt-1">
                <div className="flex items-center gap-1">
                  <span className="text-xs font-semibold text-slate-400 mr-1">Quick Reactions:</span>
                  {EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => insertMarkdown(emoji, "", "")}
                      className="flex h-7 w-7 items-center justify-center rounded-lg hover:bg-slate-100 text-sm transition-transform hover:scale-110"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
                <div className="text-[11px] text-slate-400 font-mono">
                  {body.length} chars • {body.split(/\s+/).filter(Boolean).length} words
                </div>
              </div>
            </div>
          )}

          {/* PREVIEW MODE */}
          {composerViewMode === "preview" && (
            <div className="rounded-2xl border border-indigo-200 bg-slate-50/50 p-4 min-h-[180px] max-h-[300px] overflow-y-auto">
              <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-200">
                <span className="text-xs font-bold text-indigo-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5" />
                  Live Markdown Render Preview
                </span>
                <span className="text-[11px] text-slate-400">
                  {body ? `${body.length} characters` : "Empty draft"}
                </span>
              </div>
              {body.trim() ? (
                <MarkdownPostRenderer content={body} />
              ) : (
                <div className="text-xs text-slate-400 italic py-8 text-center">
                  Nothing to preview yet. Switch to the <strong>Write</strong> tab to draft your update!
                </div>
              )}
            </div>
          )}

          {/* RAW CODE MODE */}
          {composerViewMode === "raw" && (
            <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 min-h-[180px] max-h-[300px] overflow-y-auto relative text-slate-100">
              <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-800">
                <span className="text-xs font-bold text-slate-400 font-mono flex items-center gap-1.5">
                  <FileCode className="w-3.5 h-3.5 text-indigo-400" />
                  Raw Markdown Code View
                </span>
                <button
                  type="button"
                  onClick={handleCopyRaw}
                  className="text-xs font-bold px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center gap-1.5 transition-colors"
                >
                  {copiedRawCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedRawCode ? "Copied!" : "Copy Raw Code"}</span>
                </button>
              </div>
              {body.trim() ? (
                <pre className="font-mono text-xs leading-relaxed text-slate-300 whitespace-pre-wrap select-all">
                  {body}
                </pre>
              ) : (
                <div className="text-xs text-slate-500 italic py-8 text-center font-mono">
                  // No markdown content written yet
                </div>
              )}
            </div>
          )}

          {/* Media Attachments Section */}
          {canPostMedia && (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  Media &amp; References
                </p>
                <div className="inline-flex rounded-xl bg-slate-200/70 p-0.5 text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => setActiveMediaTab("images")}
                    className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1 transition-all ${
                      activeMediaTab === "images" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <ImageIcon className="h-3.5 w-3.5 text-blue-500" />
                    Images {images.length > 0 && `(${images.length})`}
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveMediaTab("videos")}
                    className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1 transition-all ${
                      activeMediaTab === "videos" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <VideoIcon className="h-3.5 w-3.5 text-rose-500" />
                    Videos {videos.length > 0 && `(${videos.length})`}
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveMediaTab("links")}
                    className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1 transition-all ${
                      activeMediaTab === "links" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <LinkIcon className="h-3.5 w-3.5 text-emerald-500" />
                    Links {links.length > 0 && `(${links.length})`}
                  </button>
                </div>
              </div>

              {/* Tab 1: Images */}
              {activeMediaTab === "images" && (
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <Input
                      value={newImageInput}
                      onChange={(e) => setNewImageInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddImage(); } }}
                      placeholder="Paste Image URL (Drive, Imgur, direct link)..."
                      className="border-slate-200 bg-white text-sm"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleAddImage}
                      disabled={!newImageInput.trim()}
                      className="border-slate-200"
                    >
                      <Plus className="mr-1.5 h-3.5 w-3.5" /> Add
                    </Button>
                  </div>

                  {images.length > 0 && (
                    <div className="grid gap-2.5 sm:grid-cols-3 pt-1">
                      {images.map((imgUrl, index) => (
                        <div key={index} className="group relative overflow-hidden rounded-xl border border-slate-200 bg-white">
                          <img
                            src={normalizeImageUrl(imgUrl)}
                            alt={`Preview ${index + 1}`}
                            className="h-28 w-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                          <button
                            type="button"
                            onClick={() => setImages((prev) => prev.filter((_, i) => i !== index))}
                            className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-white hover:bg-red-600 transition-colors"
                            title="Remove image"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Tab 2: Videos */}
              {activeMediaTab === "videos" && (
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <Input
                      value={newVideoInput}
                      onChange={(e) => setNewVideoInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddVideo(); } }}
                      placeholder="Paste Video URL (YouTube, Vimeo, Loom, Google Drive, MP4)..."
                      className="border-slate-200 bg-white text-sm"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleAddVideo}
                      disabled={!newVideoInput.trim()}
                      className="border-slate-200"
                    >
                      <Plus className="mr-1.5 h-3.5 w-3.5" /> Add
                    </Button>
                  </div>

                  {videos.length > 0 && (
                    <div className="space-y-2 pt-1">
                      {videos.map((vidUrl, index) => (
                        <div key={index} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3">
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-rose-50 text-rose-600">
                              <Play className="h-4 w-4 fill-current" />
                            </div>
                            <span className="truncate text-xs font-medium text-slate-700">{vidUrl}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setVideos((prev) => prev.filter((_, i) => i !== index))}
                            className="text-slate-400 hover:text-red-500 transition-colors p-1"
                            title="Remove video"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Tab 3: Reference Links */}
              {activeMediaTab === "links" && (
                <div className="space-y-3">
                  <div className="grid gap-2 sm:grid-cols-[1fr_1.5fr_auto]">
                    <Input
                      value={newLinkLabel}
                      onChange={(e) => setNewLinkLabel(e.target.value)}
                      placeholder="Label (e.g. Figma Prototype)"
                      className="border-slate-200 bg-white text-sm"
                    />
                    <Input
                      value={newLinkUrl}
                      onChange={(e) => setNewLinkUrl(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddLink(); } }}
                      placeholder="https://..."
                      className="border-slate-200 bg-white text-sm"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleAddLink}
                      disabled={!newLinkUrl.trim()}
                      className="border-slate-200"
                    >
                      <Plus className="mr-1.5 h-3.5 w-3.5" /> Add
                    </Button>
                  </div>

                  {links.length > 0 && (
                    <div className="space-y-2 pt-1">
                      {links.map((lnk, index) => (
                        <div key={index} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3">
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                              <LinkIcon className="h-4 w-4" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-xs font-semibold text-slate-800">{lnk.label}</p>
                              <p className="truncate text-[11px] text-slate-400">{lnk.url}</p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setLinks((prev) => prev.filter((_, i) => i !== index))}
                            className="text-slate-400 hover:text-red-500 transition-colors p-1"
                            title="Remove link"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" className="border-slate-200" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            className="bg-slate-900 hover:bg-slate-800"
            disabled={!body.trim() || isSubmitting}
            onClick={handleSubmit}
          >
            {isSubmitting ? "Saving..." : editingPost ? "Save Changes" : "Post to Timeline"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Timeline Stream Search & Filter Toolbar
// ─────────────────────────────────────────────────────────────────────────────

export function TimelineFilterBar({
  searchQuery,
  onSearchChange,
  selectedKind,
  onKindChange,
  sortOrder,
  onSortChange,
  totalCount,
  visibleCount,
}: {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedKind: string;
  onKindChange: (kind: string) => void;
  sortOrder: "desc" | "asc";
  onSortChange: (order: "desc" | "asc") => void;
  totalCount: number;
  visibleCount: number;
}) {
  return (
    <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search timeline by text, author, or link..."
            className="border-slate-200 bg-slate-50 pl-9 text-xs rounded-xl"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
            >
              ✕
            </button>
          )}
        </div>

        {/* Sort & Counter */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onSortChange(sortOrder === "desc" ? "asc" : "desc")}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
            title="Toggle sort order"
          >
            <ArrowUpDown className="h-3.5 w-3.5" />
            {sortOrder === "desc" ? "Newest First" : "Oldest First"}
          </button>
          <span className="text-[11px] font-medium text-slate-400">
            {visibleCount} of {totalCount}
          </span>
        </div>
      </div>

      {/* Filter Chips */}
      <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-100">
        {[
          { id: "all", label: "All Updates" },
          { id: "comment", label: "💬 Comments" },
          { id: "note", label: "📝 Notes" },
          { id: "question", label: "❓ Questions" },
          { id: "checkpoint", label: "🏁 Checkpoints" },
          { id: "media", label: "🖼️ With Media" },
        ].map((chip) => (
          <button
            key={chip.id}
            type="button"
            onClick={() => onKindChange(chip.id)}
            className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
              selectedKind === chip.id
                ? "bg-slate-900 text-white shadow-sm"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {chip.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Interactive Timeline Post Card (with reactions, Markdown rendering, raw mode, author-only edit)
// ─────────────────────────────────────────────────────────────────────────────

export function InteractiveTimelinePostCard({
  post,
  projectDetail,
  currentUserEmail,
  currentUserRole,
  onEditPost,
  onDeletePost,
}: {
  post: Extract<ProjectDetailRecord["timeline"][number], { itemType: "post" }>;
  projectDetail: ProjectDetailRecord;
  currentUserEmail: string;
  currentUserRole?: string;
  onEditPost?: (post: Extract<ProjectDetailRecord["timeline"][number], { itemType: "post" }>) => void;
  onDeletePost?: (entryId: string) => void;
}) {
  const toggleReactionMut = useMutation(api.projects.toggleEntryReaction);
  const [reacting, setReacting] = useState(false);
  const [reactionPickerOpen, setReactionPickerOpen] = useState(false);
  const [showRawMarkdown, setShowRawMarkdown] = useState(false);
  const [copiedRaw, setCopiedRaw] = useState(false);

  // ONLY the author who posted it can edit
  const isAuthor = Boolean(
    currentUserEmail &&
    post.authorEmail &&
    post.authorEmail.trim().toLowerCase() === currentUserEmail.trim().toLowerCase()
  );
  const isAdmin = currentUserRole === "ADMIN";
  const canEdit = isAuthor;
  const canDelete = isAuthor || isAdmin;

  const postStyle = getPostTypeStyle(post.kind);
  const authorMember = projectDetail.members.find((m) => m.userEmail.toLowerCase() === post.authorEmail.toLowerCase());
  const isEdited = Boolean(post.updatedAt && post.updatedAt !== post.createdAt);

  const handleCopyRaw = () => {
    navigator.clipboard.writeText(post.body);
    setCopiedRaw(true);
    toast.success("Copied raw Markdown to clipboard!");
    setTimeout(() => setCopiedRaw(false), 2000);
  };

  const handleReaction = async (emoji: string) => {
    if (reacting) return;
    setReacting(true);
    try {
      await toggleReactionMut({
        userEmail: currentUserEmail,
        projectId: projectDetail.projectId,
        entryId: post.id,
        emoji,
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to react");
    } finally {
      setReacting(false);
      setReactionPickerOpen(false);
    }
  };

  return (
    <div className="post-card group relative">
      <div className={postStyle.stripClass} />

      {/* Header with Author and Actions */}
      <div className="flex items-start justify-between gap-3">
        <PostAuthorHeader
          imageUrl={authorMember?.profileImageUrl}
          name={post.authorName}
          role={post.authorRole}
          kind={post.kind}
          createdAt={post.createdAt}
        />

        {/* Edit / Delete actions & Raw Markdown Toggle */}
        <div className="flex items-center gap-1.5 shrink-0 pt-1">
          {isEdited && (
            <span className="text-[10px] font-medium text-slate-400 italic mr-1" title={`Edited ${formatDateTime(post.updatedAt)}`}>
              (edited)
            </span>
          )}

          {/* Toggle View Raw Markdown button */}
          <button
            type="button"
            onClick={() => setShowRawMarkdown((prev) => !prev)}
            className={`flex h-7 px-2 items-center gap-1 rounded-lg text-xs font-semibold transition-colors ${
              showRawMarkdown
                ? "bg-slate-900 text-white"
                : "text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            }`}
            title={showRawMarkdown ? "Switch to rendered view" : "View raw Markdown code"}
          >
            <FileCode className="h-3.5 w-3.5" />
            <span className="text-[10px]">{showRawMarkdown ? "Rendered" : "Raw"}</span>
          </button>

          {/* Edit (Author Only) & Delete (Author or Admin) */}
          <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
            {canEdit && onEditPost && (
              <button
                type="button"
                onClick={() => onEditPost(post)}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                title="Edit my post"
              >
                <Edit3 className="h-3.5 w-3.5" />
              </button>
            )}
            {canDelete && onDeletePost && (
              <button
                type="button"
                onClick={() => onDeletePost(post.id)}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                title="Delete post"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Post Text Body: Markdown Rendered or Raw Code */}
      <div className="mt-2 pl-[3.25rem]">
        {showRawMarkdown ? (
          <div className="rounded-xl border border-slate-800 bg-slate-950 p-3 font-mono text-xs text-slate-300 relative group/raw">
            <div className="flex items-center justify-between pb-1.5 mb-2 border-b border-slate-800 text-[10px] text-slate-400 font-semibold">
              <span>RAW MARKDOWN CODE</span>
              <button
                type="button"
                onClick={handleCopyRaw}
                className="flex items-center gap-1 text-slate-300 hover:text-white bg-slate-800 px-2 py-0.5 rounded transition-colors"
              >
                {copiedRaw ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copiedRaw ? "Copied" : "Copy"}</span>
              </button>
            </div>
            <pre className="whitespace-pre-wrap select-all leading-relaxed">{post.body}</pre>
          </div>
        ) : (
          <MarkdownPostRenderer content={post.body} />
        )}
      </div>

      {/* Media Attachments (Images, Videos, Links) */}
      {(post.images?.length > 0 || post.videos?.length > 0 || post.links?.length > 0) && (
        <div className="mt-3.5 pl-[3.25rem]">
          <MediaList images={post.images} videos={post.videos} links={post.links} />
        </div>
      )}

      {/* Interactive Reactions Bar */}
      <div className="mt-3 pl-[3.25rem] flex flex-wrap items-center gap-1.5">
        {post.reactions?.map((reaction) => (
          <button
            key={reaction.emoji}
            type="button"
            onClick={() => handleReaction(reaction.emoji)}
            disabled={reacting}
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-all ${
              reaction.viewerReacted
                ? "border-blue-300 bg-blue-50/80 text-blue-700 shadow-xs"
                : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
            }`}
          >
            <span>{reaction.emoji}</span>
            <span>{reaction.count}</span>
          </button>
        ))}

        {/* Add Reaction Button */}
        <div className="relative inline-block">
          <button
            type="button"
            onClick={() => setReactionPickerOpen((prev) => !prev)}
            className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-dashed border-slate-300 text-slate-400 hover:border-slate-400 hover:text-slate-600 transition-colors text-xs"
            title="Add reaction"
          >
            +
          </button>

          {reactionPickerOpen && (
            <div className="absolute left-0 bottom-full mb-1 z-30 flex items-center gap-1 rounded-full border border-slate-200 bg-white p-1.5 shadow-lg">
              {EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => handleReaction(emoji)}
                  className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-slate-100 text-sm transition-transform hover:scale-125"
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Project Timeline Stream (Search, Filter, Sort, Pagination, and Render)
// ─────────────────────────────────────────────────────────────────────────────

export function ProjectTimelineStream({
  projectDetail,
  currentUserEmail,
  currentUserRole,
  onEditPost,
  onDeletePost,
  renderCustomItem,
}: {
  projectDetail: ProjectDetailRecord;
  currentUserEmail: string;
  currentUserRole?: string;
  onEditPost?: (post: Extract<ProjectDetailRecord["timeline"][number], { itemType: "post" }>) => void;
  onDeletePost?: (entryId: string) => void;
  renderCustomItem?: (item: ProjectDetailRecord["timeline"][number]) => React.ReactNode;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedKind, setSelectedKind] = useState("all");
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");
  const [pageLimit, setPageLimit] = useState(10);

  // Filter and sort items
  const filteredTimeline = useMemo(() => {
    return projectDetail.timeline.filter((item) => {
      // Kind Filter
      if (selectedKind === "comment" && (item.itemType !== "post" || item.kind !== "comment")) return false;
      if (selectedKind === "note" && (item.itemType !== "post" || item.kind !== "note")) return false;
      if (selectedKind === "question" && (item.itemType !== "post" || item.kind !== "question")) return false;
      if (selectedKind === "checkpoint" && item.itemType !== "checkpoint") return false;
      if (selectedKind === "media") {
        if (item.itemType !== "post") return false;
        if (!item.images?.length && !item.videos?.length && !item.links?.length) return false;
      }

      // Search Filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        if (item.itemType === "post") {
          const inBody = item.body.toLowerCase().includes(q);
          const inAuthor = item.authorName.toLowerCase().includes(q) || item.authorEmail.toLowerCase().includes(q);
          const inLinks = item.links?.some((l) => l.label.toLowerCase().includes(q) || l.url.toLowerCase().includes(q));
          if (!inBody && !inAuthor && !inLinks) return false;
        } else if (item.itemType === "checkpoint" || item.itemType === "system") {
          const inTitle = item.title.toLowerCase().includes(q);
          const inDesc = item.description?.toLowerCase().includes(q);
          if (!inTitle && !inDesc) return false;
        }
      }

      return true;
    }).sort((a, b) => {
      if (sortOrder === "desc") {
        return b.createdAt.localeCompare(a.createdAt);
      }
      return a.createdAt.localeCompare(b.createdAt);
    });
  }, [projectDetail.timeline, searchQuery, selectedKind, sortOrder]);

  const visibleItems = useMemo(() => {
    return filteredTimeline.slice(0, pageLimit);
  }, [filteredTimeline, pageLimit]);

  const remainingCount = filteredTimeline.length - visibleItems.length;

  return (
    <div className="space-y-4">
      {/* Search & Filter Toolbar */}
      <TimelineFilterBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedKind={selectedKind}
        onKindChange={setSelectedKind}
        sortOrder={sortOrder}
        onSortChange={setSortOrder}
        totalCount={projectDetail.timeline.length}
        visibleCount={filteredTimeline.length}
      />

      {/* Stream Items */}
      {filteredTimeline.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
          No updates match your filter criteria.
        </div>
      ) : (
        <div className="space-y-4">
          {visibleItems.map((item) => {
            if (item.itemType === "post") {
              return (
                <InteractiveTimelinePostCard
                  key={item.id}
                  post={item}
                  projectDetail={projectDetail}
                  currentUserEmail={currentUserEmail}
                  currentUserRole={currentUserRole}
                  onEditPost={onEditPost}
                  onDeletePost={onDeletePost}
                />
              );
            }
            if (renderCustomItem) {
              return renderCustomItem(item);
            }
            return null;
          })}
        </div>
      )}

      {/* Smooth Pagination / Load More */}
      {remainingCount > 0 && (
        <div className="pt-2 text-center">
          <Button
            variant="outline"
            onClick={() => setPageLimit((prev) => prev + 10)}
            className="rounded-full border-slate-200 bg-white px-6 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-xs"
          >
            Load more updates ({remainingCount} remaining)
          </Button>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Add Project Member Dialog (Search & add approved users)
// ─────────────────────────────────────────────────────────────────────────────

export function AddMemberDialog({
  open,
  onOpenChange,
  projectId,
  userEmail,
  currentMemberEmails,
  onMemberAdded,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  userEmail: string;
  currentMemberEmails: string[];
  onMemberAdded?: () => void;
}) {
  const [search, setSearch] = useState("");
  const [addingEmail, setAddingEmail] = useState<string | null>(null);

  const eligibleUsers = useQuery(
    api.projects.getEligibleProjectUsers,
    userEmail ? { userEmail } : "skip",
  );
  const addMemberMut = useMutation(api.projects.addProjectMember);

  const availableUsers = useMemo(() => {
    if (!eligibleUsers) return [];
    const currentSet = new Set(currentMemberEmails.map((e) => e.toLowerCase()));
    const needle = search.trim().toLowerCase();

    return eligibleUsers
      .filter((u) => !currentSet.has(u.email.toLowerCase()))
      .filter((u) => {
        if (!needle) return true;
        return (
          u.name.toLowerCase().includes(needle) ||
          u.email.toLowerCase().includes(needle)
        );
      });
  }, [eligibleUsers, currentMemberEmails, search]);

  const handleAdd = async (targetEmail: string) => {
    setAddingEmail(targetEmail);
    try {
      await addMemberMut({
        userEmail,
        projectId,
        newMemberEmail: targetEmail,
      });
      toast.success("Member added to project!");
      onMemberAdded?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add member");
    } finally {
      setAddingEmail(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-slate-200 bg-white sm:max-w-md max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-lg font-black flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-indigo-600" />
            Add Team Member
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-2 flex-1 min-h-0 flex flex-col">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or email..."
              className="border-slate-200 bg-slate-50 pl-9 rounded-xl text-sm"
            />
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pr-1 max-h-[340px]">
            {!eligibleUsers ? (
              <p className="text-center py-6 text-xs text-slate-400">Loading users...</p>
            ) : availableUsers.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-xs text-slate-400">
                {search ? "No matching users found" : "All eligible users are already in this project"}
              </div>
            ) : (
              availableUsers.map((u) => (
                <div
                  key={u.email}
                  className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/50 p-3 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <ProjectAvatar imageUrl={u.profileImageUrl} label={u.name} className="h-9 w-9" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-900">{u.name}</p>
                      <p className="truncate text-xs text-slate-400">{u.email}</p>
                    </div>
                  </div>

                  <Button
                    size="sm"
                    className="bg-slate-900 hover:bg-slate-800 text-xs rounded-lg shrink-0 h-8"
                    disabled={addingEmail === u.email}
                    onClick={() => handleAdd(u.email)}
                  >
                    {addingEmail === u.email ? "Adding..." : "Add"}
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" className="border-slate-200 w-full" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


