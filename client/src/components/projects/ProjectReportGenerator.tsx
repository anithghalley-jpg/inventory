import React, { useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  formatDateTime,
  formatDateOnly,
  getStatusBadgeClass,
  getStatusLabel,
  MarkdownPostRenderer,
  HISTORY_ACTION_LABELS,
  HistoryActionIcon,
  normalizeImageUrl,
  ProjectAvatar,
  ImageWithLightbox,
  LinkReferenceCard,
  type ProjectDetailRecord,
  type ProjectHistoryEntry,
  type ProjectTimelinePostRecord,
  type ProjectTimelineCheckpointRecord,
} from "./projectShared";
import {
  Download,
  FileText,
  Printer,
  Eye,
  FileCode,
  Copy,
  Check,
  Loader2,
  Calendar,
  Users,
  Package,
  Activity,
  Sparkles,
  ExternalLink,
  Folder,
  Search,
  ArrowUpDown,
  Tag,
  Clock,
  CheckSquare,
  MessageSquare,
  HelpCircle,
  AlertCircle,
  CheckCircle2,
  Star,
  ChevronDown,
  Layers,
  Code,
  SlidersHorizontal,
  X,
  Plus,
  ChevronLeft,
  Image as ImageIcon,
  FolderKanban,
  Edit3,
} from "lucide-react";
import { toast } from "sonner";
import ProjectHeroBanner from "./ProjectHeroBanner";

interface ProjectReportGeneratorProps {
  projectId: string;
  userEmail: string;
  projectDetail: ProjectDetailRecord;
  onBack?: () => void;
  isMember?: boolean;
  activeTab?: "profile" | "post" | "report";
  onTabChange?: (tab: "profile" | "post" | "report") => void;
}

type TimelineFilterKind = "all" | "post" | "milestone" | "checkpoint" | "note" | "issue";

interface UnifiedTimelineEntry {
  id: string;
  itemType: "post" | "checkpoint" | "history_milestone";
  createdAt: string;
  postKind?: string;
  title?: string;
  authorName?: string;
  authorEmail?: string;
  authorRole?: string;
  body?: string;
  images?: string[];
  videos?: string[];
  links?: { label: string; url: string }[];
  tags?: string[];
  checkpointData?: ProjectTimelineCheckpointRecord;
  historyData?: ProjectHistoryEntry;
}

export default function ProjectReportGenerator({
  projectId,
  userEmail,
  projectDetail,
  onBack,
  isMember = false,
  activeTab = "report",
  onTabChange,
}: ProjectReportGeneratorProps) {
  const reportData = useQuery(api.projects.getProjectReportData, { userEmail, projectId });
  const [activeMode, setActiveMode] = useState<"timeline" | "raw">("timeline");
  const [copiedAll, setCopiedAll] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedMilestones, setExpandedMilestones] = useState<Record<string, boolean>>({});

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedKindFilter, setSelectedKindFilter] = useState<TimelineFilterKind>("all");
  const [showFilterPills, setShowFilterPills] = useState(false);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc"); // Default: Journey order (Day 1 -> latest)

  const handleCopyPostId = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    toast.success(`Post ID "${id}" copied to clipboard`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCopyPostMarkdown = (post: UnifiedTimelineEntry) => {
    let md = `### ${post.authorName} (${post.authorRole}) — ${formatDateTime(post.createdAt)}\n`;
    md += `**Post ID:** \`${post.id}\` | *Kind: ${(post.postKind || "post").toUpperCase()}*\n\n`;
    md += `${post.body || ""}\n\n`;
    if (post.images && post.images.length > 0) {
      post.images.forEach((img) => {
        md += `![Attachment](${img})\n\n`;
      });
    }
    navigator.clipboard.writeText(md);
    toast.success("Post Markdown copied to clipboard");
  };

  // User profile lookup map for author avatars
  const memberProfileMap = useMemo(() => {
    const map = new Map<string, { profileImageUrl?: string; userName?: string }>();
    (reportData?.project?.members || projectDetail?.members || []).forEach((m) => {
      if (m.userEmail) {
        map.set(m.userEmail.toLowerCase(), {
          profileImageUrl: m.profileImageUrl,
          userName: m.userName,
        });
      }
    });
    return map;
  }, [reportData?.project?.members, projectDetail?.members]);

  // ── Unified Chronological Stream ──
  const unifiedTimeline = useMemo(() => {
    if (!reportData) return [];
    const { project, history } = reportData;
    const items: UnifiedTimelineEntry[] = [];

    // 1. Posts & Checkpoints from project.timeline
    (project.timeline || []).forEach((t) => {
      if (t.itemType === "post") {
        const p = t as ProjectTimelinePostRecord;
        items.push({
          id: p.id,
          itemType: "post",
          createdAt: p.createdAt,
          postKind: p.kind || "update",
          authorName: p.authorName,
          authorEmail: p.authorEmail,
          authorRole: p.authorRole,
          body: p.body,
          images: p.images || [],
          videos: p.videos || [],
          links: p.links || [],
          tags: (p as any).tags || [],
        });
      } else if (t.itemType === "checkpoint") {
        const cp = t as ProjectTimelineCheckpointRecord;
        items.push({
          id: cp.id,
          itemType: "checkpoint",
          createdAt: cp.createdAt,
          title: cp.title,
          body: cp.description,
          checkpointData: cp,
        });
      }
    });

    // 2. Key History Milestones
    (history || []).forEach((h) => {
      items.push({
        id: h.historyId || `hist_${h.createdAt}`,
        itemType: "history_milestone",
        createdAt: h.createdAt,
        authorName: h.actorName,
        authorEmail: h.actorEmail,
        historyData: h,
      });
    });

    // Sort by timestamp
    items.sort((a, b) => {
      const diff = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      return sortDirection === "asc" ? diff : -diff;
    });

    return items;
  }, [reportData, sortDirection]);

  // Filtered timeline stream based on search and kind filter
  const filteredTimeline = useMemo(() => {
    return unifiedTimeline.filter((item) => {
      // 1. Kind filter
      if (selectedKindFilter === "post" && item.itemType !== "post") return false;
      if (selectedKindFilter === "checkpoint" && item.itemType !== "checkpoint") return false;
      if (selectedKindFilter === "milestone") {
        if (item.itemType === "history_milestone") return true;
        if (item.itemType === "post" && item.postKind === "milestone") return true;
        return false;
      }
      if (selectedKindFilter === "note" && (item.itemType !== "post" || item.postKind !== "note")) return false;
      if (selectedKindFilter === "issue" && (item.itemType !== "post" || (item.postKind !== "issue" && item.postKind !== "question"))) return false;

      // 2. Search query filter
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();

      if (item.authorName?.toLowerCase().includes(q)) return true;
      if (item.authorEmail?.toLowerCase().includes(q)) return true;
      if (item.body?.toLowerCase().includes(q)) return true;
      if (item.title?.toLowerCase().includes(q)) return true;
      if (item.id.toLowerCase().includes(q)) return true;
      if (item.postKind?.toLowerCase().includes(q)) return true;
      if (item.historyData?.details?.toLowerCase().includes(q)) return true;
      if (item.historyData?.action?.toLowerCase().includes(q)) return true;

      return false;
    });
  }, [unifiedTimeline, selectedKindFilter, searchQuery]);

  // Group consecutive milestone items into clusters (collapse if > 2)
  const groupedTimelineBlocks = useMemo(() => {
    type TimelineBlock =
      | { kind: "single"; item: UnifiedTimelineEntry }
      | { kind: "milestones"; items: UnifiedTimelineEntry[]; id: string };

    const blocks: TimelineBlock[] = [];
    let currentMilestones: UnifiedTimelineEntry[] = [];

    const flushMilestones = () => {
      if (currentMilestones.length > 0) {
        blocks.push({
          kind: "milestones",
          items: [...currentMilestones],
          id: `milestone_cluster_${currentMilestones[0].id}`,
        });
        currentMilestones = [];
      }
    };

    filteredTimeline.forEach((entry) => {
      if (entry.itemType === "history_milestone") {
        currentMilestones.push(entry);
      } else {
        flushMilestones();
        blocks.push({ kind: "single", item: entry });
      }
    });

    flushMilestones();
    return blocks;
  }, [filteredTimeline]);

  // Dynamic filter pill counts
  const filterPills = useMemo(() => {
    const counts = {
      all: unifiedTimeline.length,
      post: unifiedTimeline.filter((i) => i.itemType === "post").length,
      milestone: unifiedTimeline.filter(
        (i) => i.itemType === "history_milestone" || (i.itemType === "post" && i.postKind === "milestone"),
      ).length,
      checkpoint: unifiedTimeline.filter((i) => i.itemType === "checkpoint").length,
      note: unifiedTimeline.filter((i) => i.itemType === "post" && i.postKind === "note").length,
      issue: unifiedTimeline.filter(
        (i) => i.itemType === "post" && (i.postKind === "issue" || i.postKind === "question"),
      ).length,
    };

    return [
      { id: "all" as const, label: "All Updates", count: counts.all, icon: SlidersHorizontal },
      { id: "post" as const, label: "Posts", count: counts.post, icon: FileText },
      { id: "milestone" as const, label: "Milestones", count: counts.milestone, icon: Star },
      { id: "checkpoint" as const, label: "Checkpoints", count: counts.checkpoint, icon: CheckSquare },
      { id: "note" as const, label: "Notes", count: counts.note, icon: MessageSquare },
      { id: "issue" as const, label: "Issues / Q&A", count: counts.issue, icon: AlertCircle },
    ];
  }, [unifiedTimeline]);

  // Calculate project date stats
  const projectStats = useMemo(() => {
    if (!reportData) return { start: "", end: "", days: 1, totalPosts: 0, totalMedia: 0 };
    const { project } = reportData;
    const start = new Date(project.createdAt).getTime();
    const end = project.status === "COMPLETED"
      ? new Date(project.updatedAt).getTime()
      : Date.now();
    const days = Math.max(1, Math.round((end - start) / (1000 * 60 * 60 * 24)));

    let totalPosts = 0;
    let totalMedia = 0;
    (project.timeline || []).forEach((t) => {
      if (t.itemType === "post") {
        totalPosts++;
        totalMedia += (t.images?.length || 0);
      }
    });

    return {
      start: formatDateOnly(project.createdAt),
      end: project.status === "COMPLETED" ? formatDateOnly(project.updatedAt) : "Present",
      days,
      totalPosts,
      totalMedia,
    };
  }, [reportData]);

  // Helper to get Day Number for an entry
  const getDayNumber = (timestamp: string) => {
    if (!reportData) return 1;
    const start = new Date(reportData.project.createdAt).getTime();
    const current = new Date(timestamp).getTime();
    return Math.max(1, Math.floor((current - start) / (1000 * 60 * 60 * 24)) + 1);
  };

  // ── Collated Markdown Text ──
  const collatedMarkdown = useMemo(() => {
    if (!reportData) return "";
    const { project, history } = reportData;

    let md = `# ${project.name} — Project Documentation Timeline\n\n`;
    md += `> **Status:** ${getStatusLabel(project.status)} | **Duration:** ${projectStats.start} → ${projectStats.end} (${projectStats.days} Days)\n`;
    if (project.driveFolderUrl) {
      md += `> **Google Drive Media Folder:** [projects/${project.name}](${project.driveFolderUrl})\n`;
    }
    md += `\n---\n\n`;

    // 1. Team Roster
    md += `## Project Team & Members\n\n`;
    md += `| Member Name | Role | Email | Project Note |\n`;
    md += `| :--- | :--- | :--- | :--- |\n`;
    project.members.forEach((m) => {
      md += `| **${m.userName}** | ${m.userRole} | ${m.userEmail} | ${m.projectNote || "-"} |\n`;
    });
    md += `\n`;

    // 2. Bill of Materials
    if (project.items.length > 0) {
      md += `## Bill of Materials & Inventory Items\n\n`;
      md += `| Item Name | Quantity | Tagged By | Tagged Date |\n`;
      md += `| :--- | :--- | :--- | :--- |\n`;
      project.items.forEach((item) => {
        md += `| **${item.itemName}** | ${item.quantity} | ${item.userEmail} | ${formatDateOnly(item.taggedAt)} |\n`;
      });
      md += `\n`;
    }

    // 3. Chronological Documentation Stream
    md += `## Chronological Documentation Stream\n\n`;

    const chronologicalItems = [...unifiedTimeline].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    chronologicalItems.forEach((entry, idx) => {
      const dayNum = getDayNumber(entry.createdAt);
      const dateStr = formatDateTime(entry.createdAt);

      if (entry.itemType === "post") {
        md += `### [Day ${dayNum}] ${idx + 1}. ${entry.authorName} (${entry.authorRole}) — ${dateStr}\n`;
        md += `*Post ID:* \`${entry.id}\` | *Kind:* \`${(entry.postKind || "update").toUpperCase()}\`\n\n`;
        md += `${entry.body || ""}\n\n`;

        if (entry.images && entry.images.length > 0) {
          entry.images.forEach((img) => {
            md += `![Attachment](${img})\n\n`;
          });
        }
        if (entry.links && entry.links.length > 0) {
          entry.links.forEach((l) => {
            md += `- [${l.label || l.url}](${l.url})\n`;
          });
          md += `\n`;
        }
        md += `---\n\n`;
      } else if (entry.itemType === "checkpoint" && entry.checkpointData) {
        const cp = entry.checkpointData;
        md += `### [Day ${dayNum}] 🏁 Checkpoint Deliverable: ${cp.title} — ${dateStr}\n\n`;
        if (cp.description) md += `${cp.description}\n\n`;
        if (cp.responses && cp.responses.length > 0) {
          cp.responses.forEach((resp: any) => {
            md += `**Submitted by ${resp.submittedByName} (${resp.submittedByRole}):**\n`;
            resp.values.forEach((v: any) => {
              md += `- **${v.label}:** ${v.singleValue || (v.multiValues || []).join(", ") || "-"}\n`;
            });
            md += `\n`;
          });
        }
        md += `---\n\n`;
      } else if (entry.itemType === "history_milestone" && entry.historyData) {
        const h = entry.historyData;
        const label = HISTORY_ACTION_LABELS[h.action]?.label || h.action.replace(/_/g, " ");
        md += `> ⚡ **Milestone:** ${label} — *${h.actorName}* (${dateStr})\n\n`;
      }
    });

    return md;
  }, [reportData, unifiedTimeline, projectStats]);

  const handleCopyMarkdown = () => {
    if (!collatedMarkdown) return;
    navigator.clipboard.writeText(collatedMarkdown);
    setCopiedAll(true);
    toast.success("Collated Markdown documentation copied to clipboard!");
    setTimeout(() => setCopiedAll(false), 2000);
  };

  const handleDownloadMarkdown = () => {
    if (!collatedMarkdown || !reportData) return;
    const blob = new Blob([collatedMarkdown], { type: "text/markdown;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${reportData.project.name.replace(/\s+/g, "_")}_Documentation.md`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Markdown file downloaded");
  };

  if (!reportData) {
    return (
      <div className="p-16 flex flex-col items-center justify-center text-center space-y-3 bg-white rounded-3xl border border-slate-200">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
        <p className="text-sm font-semibold text-slate-700">Synthesizing chronological project documentation...</p>
      </div>
    );
  }

  const { project } = reportData;
  const coverImage = project.teamImageUrl || project.boxImageUrl || "";

  return (
    <div className="space-y-6 print:space-y-4">
      {/* ── 1. Executive Project Header Banner ── */}
      <ProjectHeroBanner
        projectDetail={project}
        userEmail={userEmail}
        isMember={isMember}
      />

      {/* ── 2. Floating Sticky Control Toolbar (Back Button, Tabs, Wide Search, Filter Categories, Sort, Markdown Export) ── */}
      <div className="sticky top-20 z-30 p-3 sm:p-4 rounded-3xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200/90 dark:border-slate-800 shadow-md space-y-3 print:hidden">
        {/* Main Toolbar Row: Back button, Tabs, Wide Search Bar, Sort & Markdown Export */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Left: Back Button, Tab Group (if Member), and Mode Switcher */}
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            {onBack && (
              <Button
                size="sm"
                variant="outline"
                onClick={onBack}
                className="h-9 px-3.5 rounded-xl border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-bold shrink-0 shadow-2xs gap-1.5 cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4" />
                <span>Back</span>
              </Button>
            )}

            {/* Member Tab Switcher */}
            {isMember && onTabChange && (
              <div className="inline-flex rounded-xl bg-slate-100 dark:bg-slate-800 p-0.5 border border-slate-200 text-xs font-semibold shrink-0">
                <button
                  type="button"
                  onClick={() => onTabChange("profile")}
                  className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                    activeTab === "profile"
                      ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs font-bold"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  <FolderKanban className="h-3.5 w-3.5 text-indigo-600" />
                  <span>Profile</span>
                </button>
                <button
                  type="button"
                  onClick={() => onTabChange("post")}
                  className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                    activeTab === "post"
                      ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs font-bold"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  <Edit3 className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Post</span>
                </button>
                <button
                  type="button"
                  onClick={() => onTabChange("report")}
                  className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                    activeTab === "report"
                      ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs font-bold"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  <FileText className="h-3.5 w-3.5 text-cyan-600" />
                  <span>Report</span>
                </button>
              </div>
            )}

            {/* Mode Switcher: Visual Timeline vs Raw Markdown */}
            <div className="inline-flex rounded-xl bg-slate-100 dark:bg-slate-800 p-0.5 border border-slate-200 text-xs font-semibold shrink-0">
              <button
                type="button"
                onClick={() => setActiveMode("timeline")}
                className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                  activeMode === "timeline"
                    ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs font-bold"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <Clock className="h-3.5 w-3.5 text-indigo-600" />
                <span>Timeline Stream</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveMode("raw")}
                className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                  activeMode === "raw"
                    ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs font-bold"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <FileCode className="h-3.5 w-3.5 text-cyan-600" />
                <span>Raw Markdown</span>
              </button>
            </div>
          </div>

          {/* Middle: Expanded Wide Search Bar */}
          <div className="relative flex-1 min-w-[200px] max-w-xl">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search timeline notes, author, tags, or media..."
              className="h-9 pl-9 pr-8 text-xs bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 rounded-xl focus-visible:ring-emerald-500 w-full"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Right: Sort Direction and Filter Toggle */}
          <div className="flex items-center gap-2 shrink-0 justify-end">
            {activeMode === "timeline" && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"))}
                className="h-9 px-3 text-xs font-bold rounded-xl border-slate-200 text-slate-700 gap-1.5 hover:bg-slate-50 shadow-2xs cursor-pointer"
                title="Toggle timeline direction"
              >
                <ArrowUpDown className="h-3.5 w-3.5 text-slate-500" />
                <span className="hidden sm:inline">{sortDirection === "asc" ? "Journey (Day 1 → Now)" : "Latest First"}</span>
              </Button>
            )}

            {activeMode === "timeline" && (
              <Button
                size="sm"
                variant={showFilterPills || selectedKindFilter !== "all" ? "default" : "outline"}
                onClick={() => setShowFilterPills((prev) => !prev)}
                className={`h-9 px-3.5 text-xs font-bold rounded-xl gap-1.5 shadow-2xs cursor-pointer transition-all ${
                  showFilterPills || selectedKindFilter !== "all"
                    ? "bg-slate-900 text-white hover:bg-slate-800"
                    : "border-slate-200 text-slate-700 hover:bg-slate-50"
                }`}
                title="Toggle timeline category filter pills"
              >
                <SlidersHorizontal className={`h-3.5 w-3.5 ${showFilterPills || selectedKindFilter !== "all" ? "text-emerald-400" : "text-indigo-600"}`} />
                <span>Filters</span>
                {selectedKindFilter !== "all" && (
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                )}
              </Button>
            )}
          </div>
        </div>

        {/* Bottom Row: Category Filter Pills (Shown only when Filter button is clicked) */}
        {activeMode === "timeline" && showFilterPills && (
          <div className="flex items-center gap-2 overflow-x-auto pb-0.5 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs no-scrollbar animate-in slide-in-from-top-2 duration-150">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0 mr-1 flex items-center gap-1.5">
              <SlidersHorizontal className="h-3.5 w-3.5 text-slate-400" /> Filter:
            </span>
            {filterPills.map((pill) => {
              const isSelected = selectedKindFilter === pill.id;
              const Icon = pill.icon;
              return (
                <button
                  key={pill.id}
                  type="button"
                  onClick={() => setSelectedKindFilter(pill.id)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer flex items-center gap-2 ${
                    isSelected
                      ? "bg-slate-900 text-white shadow-xs scale-100"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{pill.label}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono font-bold ${
                      isSelected ? "bg-white/20 text-white" : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 shadow-2xs"
                    }`}
                  >
                    {pill.count}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── 4. Continuous Chronological Documentation Stream ── */}
      {activeMode === "timeline" ? (
        <div className="relative pl-6 sm:pl-8 space-y-6">
          {/* Continuous vertical timeline spine line */}
          <div className="absolute left-2.5 sm:left-3.5 top-3 bottom-3 w-0.5 bg-gradient-to-b from-emerald-500 via-indigo-500 to-slate-200" />

          {groupedTimelineBlocks.length === 0 ? (
            <div className="p-12 text-center rounded-3xl bg-white border border-slate-200 shadow-xs space-y-2">
              <FileText className="h-8 w-8 text-slate-300 mx-auto" />
              <h4 className="text-sm font-bold text-slate-800">No matching timeline entries found</h4>
              <p className="text-xs text-slate-400">Try adjusting your search terms or filter pills.</p>
            </div>
          ) : (
            groupedTimelineBlocks.map((block) => {
              if (block.kind === "single") {
                const entry = block.item;
                const dayNum = getDayNumber(entry.createdAt);
                const isPost = entry.itemType === "post";
                const isCheckpoint = entry.itemType === "checkpoint";

                return (
                  <div key={entry.id} className="relative group">
                    {/* Timeline Spine Node Icon */}
                    <div
                      className={`absolute -left-6 sm:-left-8 top-4 h-6 w-6 rounded-full border-2 border-white shadow-md flex items-center justify-center z-10 transition-transform group-hover:scale-110 ${
                        entry.postKind === "milestone"
                          ? "bg-amber-500 text-white ring-4 ring-amber-100"
                          : entry.postKind === "note"
                          ? "bg-cyan-500 text-white ring-4 ring-cyan-100"
                          : entry.postKind === "issue" || entry.postKind === "question"
                          ? "bg-rose-500 text-white ring-4 ring-rose-100"
                          : isCheckpoint
                          ? "bg-indigo-600 text-white ring-4 ring-indigo-100"
                          : "bg-emerald-600 text-white ring-4 ring-emerald-100"
                      }`}
                    >
                      {entry.postKind === "milestone" ? (
                        <Star className="h-3 w-3 fill-white" />
                      ) : entry.postKind === "note" ? (
                        <MessageSquare className="h-3 w-3" />
                      ) : entry.postKind === "issue" || entry.postKind === "question" ? (
                        <HelpCircle className="h-3 w-3" />
                      ) : isCheckpoint ? (
                        <CheckSquare className="h-3 w-3" />
                      ) : (
                        <FileText className="h-3 w-3" />
                      )}
                    </div>

                    {/* ── CARD TYPE 1: TIMELINE POST JOURNAL ENTRY ── */}
                    {isPost && (
                      <div className="rounded-3xl bg-white border border-slate-200/90 shadow-xs hover:shadow-md transition-all p-5 sm:p-7 space-y-4">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                          <div className="flex items-center gap-3">
                            <ProjectAvatar
                              imageUrl={memberProfileMap.get(entry.authorEmail?.toLowerCase() || "")?.profileImageUrl}
                              label={entry.authorName || "Member"}
                              seed={entry.authorEmail || entry.authorName}
                              className="h-10 w-10 rounded-2xl text-white font-bold shadow-xs shrink-0"
                            />
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h5 className="text-sm font-bold text-slate-900 truncate">
                                  {entry.authorName}
                                </h5>
                                <Badge
                                  variant="outline"
                                  className="text-[10px] uppercase font-bold text-slate-600 bg-slate-50 border-slate-200"
                                >
                                  {entry.authorRole}
                                </Badge>
                                <Badge
                                  className={`text-[9px] uppercase font-extrabold px-2 py-0.5 ${
                                    entry.postKind === "milestone"
                                      ? "bg-amber-100 text-amber-800 border-amber-300"
                                      : entry.postKind === "note"
                                      ? "bg-cyan-100 text-cyan-800 border-cyan-300"
                                      : entry.postKind === "issue" || entry.postKind === "question"
                                      ? "bg-rose-100 text-rose-800 border-rose-300"
                                      : "bg-emerald-100 text-emerald-800 border-emerald-300"
                                  }`}
                                >
                                  {(entry.postKind || "update").toUpperCase()}
                                </Badge>
                              </div>
                              <p className="text-xs text-slate-400 mt-0.5 truncate">{entry.authorEmail}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 self-end sm:self-auto flex-wrap">
                            <span className="text-[11px] font-mono font-bold bg-slate-900 text-white px-2.5 py-1 rounded-xl shadow-xs">
                              Day {dayNum}
                            </span>
                            <span className="text-xs text-slate-500 font-medium">
                              {formatDateTime(entry.createdAt)}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(entry.id);
                                toast.success(`Post ID ${entry.id} copied!`);
                              }}
                              className="text-[10px] font-mono font-bold text-slate-400 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded-lg transition-colors cursor-pointer"
                              title="Copy Post ID"
                            >
                              #{entry.id.slice(-6)}
                            </button>
                          </div>
                        </div>

                        <div className="text-slate-800 text-sm leading-relaxed prose prose-slate max-w-none">
                          <MarkdownPostRenderer content={entry.body || ""} />
                        </div>

                        {entry.images && entry.images.length > 0 && (
                          <div className="pt-2">
                            {entry.images.length === 1 ? (
                              <div className="flex justify-center bg-slate-50/60 p-2 rounded-2xl border border-slate-100">
                                <ImageWithLightbox
                                  src={entry.images[0]}
                                  alt="Post attachment"
                                  className="rounded-xl object-contain max-h-[460px] w-auto max-w-full cursor-zoom-in shadow-xs transition-transform hover:scale-[1.01]"
                                />
                              </div>
                            ) : (
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                                {entry.images.map((img, i) => (
                                  <div
                                    key={i}
                                    className="relative aspect-video rounded-xl overflow-hidden border border-slate-200 bg-slate-50 group cursor-zoom-in shadow-2xs"
                                  >
                                    <ImageWithLightbox
                                      src={img}
                                      alt={`Attachment ${i + 1}`}
                                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                    />
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {entry.videos && entry.videos.length > 0 && (
                          <div className="pt-2 space-y-2">
                            {entry.videos.map((vidUrl, i) => (
                              <div
                                key={i}
                                className="rounded-2xl overflow-hidden border border-slate-200 bg-black aspect-video max-h-[420px] mx-auto shadow-md"
                              >
                                {vidUrl.includes("drive.google.com") ? (
                                  <iframe
                                    src={vidUrl.replace(/\/view.*$/, "/preview")}
                                    className="w-full h-full border-0"
                                    allow="autoplay; fullscreen"
                                    title={`Video Attachment ${i + 1}`}
                                  />
                                ) : (
                                  <video src={vidUrl} controls className="w-full h-full object-contain" />
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        {entry.links && entry.links.length > 0 && (
                          <div className="pt-2 flex flex-wrap gap-2 border-t border-slate-100">
                            {entry.links.map((lnk, i) => (
                              <LinkReferenceCard key={i} link={lnk} />
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* ── CARD TYPE 2: CHECKPOINT DELIVERABLE NODE ── */}
                    {isCheckpoint && entry.checkpointData && (
                      <div className="rounded-3xl bg-indigo-50/40 border border-indigo-200/90 shadow-xs p-5 sm:p-7 space-y-4">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-3 border-b border-indigo-100">
                          <div className="flex items-center gap-2.5">
                            <div className="h-9 w-9 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                              <CheckSquare className="h-5 w-5" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="text-base font-black text-indigo-950">
                                  {entry.checkpointData.title}
                                </h4>
                                <Badge className="bg-indigo-600 text-white text-[10px] font-bold">
                                  DELIVERABLE CHECKPOINT
                                </Badge>
                              </div>
                              <p className="text-xs text-indigo-700/80 mt-0.5">
                                {entry.checkpointData.description || "Required stage milestone"}
                              </p>
                            </div>
                          </div>
                          <span className="text-[11px] font-mono font-bold bg-indigo-950 text-white px-2.5 py-1 rounded-xl shadow-xs self-end sm:self-auto">
                            Day {dayNum} • {formatDateOnly(entry.createdAt)}
                          </span>
                        </div>

                        {entry.checkpointData.responses && entry.checkpointData.responses.length > 0 && (
                          <div className="space-y-3 pt-1">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-900 block">
                              Recorded Submissions ({entry.checkpointData.responses.length}):
                            </span>
                            {entry.checkpointData.responses.map((resp: any, rIdx: number) => {
                              const submitterProfile = memberProfileMap.get(resp.submittedByEmail?.toLowerCase() || "");
                              return (
                                <div
                                  key={rIdx}
                                  className="p-4 rounded-2xl bg-white/90 border border-indigo-100 shadow-2xs space-y-2.5"
                                >
                                  <div className="flex items-center justify-between text-xs pb-2 border-b border-indigo-50">
                                    <div className="flex items-center gap-2">
                                      <ProjectAvatar
                                        imageUrl={submitterProfile?.profileImageUrl}
                                        label={resp.submittedByName || "Member"}
                                        seed={resp.submittedByEmail || resp.submittedByName}
                                        className="h-6 w-6 rounded-lg text-white text-[10px] font-bold shrink-0"
                                      />
                                      <span className="font-bold text-slate-900">{resp.submittedByName}</span>
                                      <Badge variant="outline" className="text-[9px] py-0 px-1 border-indigo-200 text-indigo-700">
                                        {resp.submittedByRole}
                                      </Badge>
                                    </div>
                                    <span className="text-slate-400 text-[11px]">{formatDateTime(resp.submittedAt)}</span>
                                  </div>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                                    {resp.values.map((val: any, vIdx: number) => (
                                      <div key={vIdx} className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{val.label}</p>
                                        <p className="font-semibold text-slate-800 mt-0.5">
                                          {val.singleValue || (val.multiValues || []).join(", ") || "-"}
                                        </p>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              }

              // ── CARD TYPE 3: MILESTONE CLUSTER (Collapses if > 2) ──
              const clusterItems = block.items;
              const isExpanded = !!expandedMilestones[block.id];
              const visibleItems = isExpanded || clusterItems.length <= 2
                ? clusterItems
                : clusterItems.slice(0, 2);
              const hiddenCount = clusterItems.length - 2;

              return (
                <div key={block.id} className="space-y-3">
                  {visibleItems.map((entry) => {
                    const dayNum = getDayNumber(entry.createdAt);
                    return (
                      <div key={entry.id} className="relative group">
                        {/* Timeline Spine Node Icon */}
                        <div className="absolute -left-6 sm:-left-8 top-4 h-6 w-6 rounded-full border-2 border-white shadow-md flex items-center justify-center z-10 transition-transform group-hover:scale-110 bg-amber-500 text-white ring-4 ring-amber-100">
                          <Star className="h-3 w-3 fill-white" />
                        </div>

                        {entry.historyData && (
                          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-50/90 via-slate-50 to-white border border-amber-200/80 flex items-center justify-between gap-3 shadow-2xs text-xs">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="h-7 w-7 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                                <HistoryActionIcon action={entry.historyData.action} className="h-3.5 w-3.5" />
                              </div>
                              <div className="min-w-0">
                                <p className="font-bold text-slate-900 truncate">
                                  {HISTORY_ACTION_LABELS[entry.historyData.action]?.label || entry.historyData.action.replace(/_/g, " ")}
                                </p>
                                <div className="text-[11px] text-slate-500 flex items-center gap-1.5 flex-wrap mt-0.5">
                                  <span>Logged by</span>
                                  <div className="inline-flex items-center gap-1">
                                    <ProjectAvatar
                                      imageUrl={memberProfileMap.get(entry.authorEmail?.toLowerCase() || "")?.profileImageUrl}
                                      label={entry.historyData.actorName || "System"}
                                      seed={entry.authorEmail || entry.historyData.actorName}
                                      className="h-4 w-4 rounded-full text-[8px] shrink-0"
                                    />
                                    <strong className="text-slate-700">{entry.historyData.actorName}</strong>
                                  </div>
                                  {entry.historyData.details ? <span>— {entry.historyData.details}</span> : null}
                                </div>
                              </div>
                            </div>

                            <span className="text-[11px] text-amber-800 font-mono font-bold bg-amber-100/80 px-2.5 py-1 rounded-lg shrink-0">
                              Day {dayNum} • {formatDateOnly(entry.createdAt)}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Collapse / Expand Toggle Button for Milestones exceeding 2 */}
                  {clusterItems.length > 2 && (
                    <div className="pl-0 sm:pl-2">
                      <button
                        type="button"
                        onClick={() => setExpandedMilestones((prev) => ({ ...prev, [block.id]: !prev[block.id] }))}
                        className="w-full py-2 px-4 rounded-2xl bg-amber-50/90 hover:bg-amber-100 border border-amber-200/80 text-amber-900 text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-2xs cursor-pointer"
                      >
                        <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${isExpanded ? "rotate-180 text-amber-700" : "text-amber-600"}`} />
                        <span>
                          {isExpanded
                            ? `Collapse milestones (${hiddenCount} hidden)`
                            : `Show ${hiddenCount} more milestone${hiddenCount === 1 ? "" : "s"} (${clusterItems.length} total)`}
                        </span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      ) : (
        /* ── 5. Raw Collated Markdown Source View ── */
        <div className="rounded-3xl overflow-hidden border border-slate-800 bg-slate-950 shadow-2xl">
          <div className="flex items-center justify-between px-5 py-3.5 bg-slate-900 text-slate-300 text-xs font-mono border-b border-slate-800">
            <div className="flex items-center gap-2">
              <FileCode className="h-4 w-4 text-emerald-400" />
              <span>{project.name.toLowerCase().replace(/[^a-z0-9]+/g, "_")}_documentation.md</span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={handleCopyMarkdown}
                className="h-7 text-xs text-slate-300 hover:text-white hover:bg-slate-800 gap-1"
              >
                {copiedAll ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copiedAll ? "Copied" : "Copy Markdown"}</span>
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleDownloadMarkdown}
                className="h-7 text-xs text-slate-300 hover:text-white hover:bg-slate-800 gap-1"
              >
                <Download className="h-3.5 w-3.5 text-indigo-400" />
                <span>Download .md</span>
              </Button>
            </div>
          </div>

          <pre className="p-6 text-emerald-300 font-mono text-xs overflow-x-auto leading-relaxed max-h-[650px] select-all whitespace-pre-wrap">
            {collatedMarkdown}
          </pre>
        </div>
      )}
    </div>
  );
}
