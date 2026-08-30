import { useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  formatDateTime,
  formatDateOnly,
  getStatusBadgeClass,
  getStatusLabel,
  MarkdownPostRenderer,
  HISTORY_ACTION_LABELS,
  HistoryActionIcon,
  normalizeImageUrl,
  type ProjectDetailRecord,
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
} from "lucide-react";
import jsPDF from "jspdf";
import { toast } from "sonner";

interface ProjectReportGeneratorProps {
  projectId: string;
  userEmail: string;
  projectDetail: ProjectDetailRecord;
}

export default function ProjectReportGenerator({
  projectId,
  userEmail,
  projectDetail,
}: ProjectReportGeneratorProps) {
  const reportData = useQuery(api.projects.getProjectReportData, { userEmail, projectId });
  const [activeMode, setActiveMode] = useState<"preview" | "raw">("preview");
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copiedPostId, setCopiedPostId] = useState<string | null>(null);

  const handleCopyPostId = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedPostId(id);
    toast.success("Post ID copied to clipboard");
    setTimeout(() => setCopiedPostId(null), 2000);
  };

  // Generate collated Markdown text
  const collatedMarkdown = useMemo(() => {
    if (!reportData) return "";
    const { project, history } = reportData;

    const posts = project.timeline
      .filter((t) => t.itemType === "post")
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    const checkpoints = project.timeline.filter((t) => t.itemType === "checkpoint");

    let md = `# ${project.name} - Project Report\n\n`;
    md += `**Status:** ${getStatusLabel(project.status)}  \n`;
    md += `**Created Date:** ${formatDateOnly(project.createdAt)}  \n`;
    if (project.status === "COMPLETED") {
      md += `**Completion Date:** ${formatDateOnly(project.updatedAt)}  \n`;
    }
    md += `**Last Activity:** ${formatDateTime(project.lastActivityAt || project.updatedAt)}  \n\n`;

    md += `---\n\n`;

    // 1. Team Members
    md += `## 1. Project Team\n\n`;
    md += `| Member Name | Role | Email | Project Note |\n`;
    md += `| :--- | :--- | :--- | :--- |\n`;
    project.members.forEach((m) => {
      md += `| **${m.userName}** | ${m.userRole} | ${m.userEmail} | ${m.projectNote || "-"} |\n`;
    });
    md += `\n`;

    // 2. Inventory Items
    if (project.items.length > 0) {
      md += `## 2. Materials & Inventory Items\n\n`;
      md += `| Item Name | Quantity | Tagged By | Date |\n`;
      md += `| :--- | :--- | :--- | :--- |\n`;
      project.items.forEach((item) => {
        md += `| **${item.itemName}** | ${item.quantity} | ${item.userEmail} | ${formatDateOnly(item.taggedAt)} |\n`;
      });
      md += `\n`;
    }

    // 3. Milestones & History
    if (history.length > 0) {
      md += `## 3. Milestones & Event Log\n\n`;
      history.forEach((h) => {
        const label = HISTORY_ACTION_LABELS[h.action]?.label || h.action.replace(/_/g, " ");
        md += `- **${label}** (${formatDateOnly(h.createdAt)}) — by *${h.actorName}*\n`;
      });
      md += `\n`;
    }

    // 4. Checkpoints if any
    if (checkpoints.length > 0) {
      md += `## 4. Project Checkpoints\n\n`;
      checkpoints.forEach((cp) => {
        md += `### Checkpoint: ${cp.title}\n`;
        if (cp.description) md += `${cp.description}\n\n`;
        if (cp.responses && cp.responses.length > 0) {
          md += `**Responses:**\n`;
          cp.responses.forEach((resp) => {
            md += `- **${resp.submittedByName}** (${resp.submittedByRole}):\n`;
            resp.values.forEach((v) => {
              md += `  - *${v.label}:* ${v.singleValue || (v.multiValues || []).join(", ") || "-"}\n`;
            });
          });
        }
        md += `\n`;
      });
    }

    // 5. Timeline Stream & Messages
    md += `## 5. Timeline Updates & Discussions Log\n\n`;
    if (posts.length === 0) {
      md += `*No timeline updates recorded yet.*\n\n`;
    } else {
      posts.forEach((p, idx) => {
        const dateStr = formatDateTime(p.createdAt);
        md += `### ${idx + 1}. ${p.authorName} (${p.authorRole}) — ${dateStr}\n`;
        md += `**Post ID:** \`${p.id}\` | *Kind: ${p.kind.toUpperCase()}*\n\n`;
        md += `${p.body}\n\n`;
        if (p.images && p.images.length > 0) {
          p.images.forEach((img: string) => {
            md += `![Attachment](${img})\n\n`;
          });
        }
        md += `---\n\n`;
      });
    }

    return md;
  }, [reportData]);

  const handleCopyMarkdown = () => {
    if (!collatedMarkdown) return;
    navigator.clipboard.writeText(collatedMarkdown);
    setCopied(true);
    toast.success("Collated Markdown copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadMarkdown = () => {
    if (!collatedMarkdown || !reportData) return;
    const blob = new Blob([collatedMarkdown], { type: "text/markdown;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${reportData.project.name.replace(/\s+/g, "_")}_Report.md`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Markdown file downloaded");
  };

  const handleGeneratePdf = () => {
    if (!reportData) return;
    setIsGeneratingPdf(true);

    try {
      const { project, history } = reportData;
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const margin = 20;
      let y = margin;

      const addNewPage = () => {
        doc.addPage();
        y = margin;
      };

      // Header
      doc.setFontSize(22);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30, 41, 59);
      doc.text("Project Report", margin, y);
      y += 9;

      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(15, 23, 42);
      doc.text(project.name, margin, y);
      y += 12;

      // Status info
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 116, 139);
      doc.text(`Status: ${getStatusLabel(project.status)} | Created: ${formatDateOnly(project.createdAt)}`, margin, y);
      y += 10;

      // Team
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30, 41, 59);
      doc.text("Project Team", margin, y);
      y += 8;

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(51, 65, 85);
      project.members.forEach((m) => {
        if (y > 270) addNewPage();
        doc.text(`• ${m.userName} (${m.userRole}) - ${m.userEmail}`, margin + 4, y);
        y += 6;
      });
      y += 8;

      // Items
      if (project.items.length > 0) {
        if (y > 250) addNewPage();
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(30, 41, 59);
        doc.text("Inventory Items Used", margin, y);
        y += 8;

        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(51, 65, 85);
        project.items.forEach((item) => {
          if (y > 270) addNewPage();
          doc.text(`• ${item.quantity}x ${item.itemName} (Tagged by ${item.userEmail})`, margin + 4, y);
          y += 6;
        });
        y += 8;
      }

      // Milestones
      if (history.length > 0) {
        if (y > 240) addNewPage();
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(30, 41, 59);
        doc.text("Key Milestones", margin, y);
        y += 8;

        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        history.slice(0, 15).forEach((h) => {
          if (y > 270) addNewPage();
          const label = HISTORY_ACTION_LABELS[h.action]?.label || h.action;
          doc.text(`• ${label} (${formatDateOnly(h.createdAt)}) - by ${h.actorName}`, margin + 4, y);
          y += 6;
        });
        y += 8;
      }

      // Timeline Posts
      const posts = project.timeline.filter((t) => t.itemType === "post");
      if (posts.length > 0) {
        addNewPage();
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(30, 41, 59);
        doc.text("Timeline Updates & Discussions", margin, y);
        y += 8;

        posts.forEach((p, idx) => {
          if (y > 250) addNewPage();
          doc.setFontSize(11);
          doc.setFont("helvetica", "bold");
          doc.setTextColor(15, 23, 42);
          doc.text(`${idx + 1}. ${p.authorName} - ${formatDateOnly(p.createdAt)}`, margin + 4, y);
          y += 6;

          doc.setFontSize(9);
          doc.setFont("helvetica", "normal");
          doc.setTextColor(71, 85, 105);
          const splitBody = doc.splitTextToSize(p.body, 160);
          doc.text(splitBody, margin + 4, y);
          y += splitBody.length * 5 + 6;
        });
      }

      doc.save(`${project.name.replace(/\s+/g, "_")}_Report.pdf`);
      toast.success("PDF Report generated");
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate PDF");
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  if (!reportData) {
    return (
      <div className="p-16 flex flex-col items-center justify-center text-center space-y-3">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        <p className="text-sm font-medium text-slate-500">Synthesizing project report & Markdown collation...</p>
      </div>
    );
  }

  const { project, history } = reportData;

  return (
    <div className="space-y-6">
      {/* ── Control Header ── */}
      <div className="neumorph-card p-4 md:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-700 shadow-xs">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">Project Collated Report</h3>
            <p className="text-xs text-slate-500">
              Aggregated documentation, team responsibilities, and timeline messages
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto justify-start sm:justify-end">
          {/* Preview vs Raw Code Toggle */}
          <div className="neumorph-tab-group p-1">
            <button
              type="button"
              className={`neumorph-tab-item ${activeMode === "preview" ? "active" : ""}`}
              onClick={() => setActiveMode("preview")}
            >
              <Eye className="h-3.5 w-3.5" />
              Preview
            </button>
            <button
              type="button"
              className={`neumorph-tab-item ${activeMode === "raw" ? "active" : ""}`}
              onClick={() => setActiveMode("raw")}
            >
              <FileCode className="h-3.5 w-3.5" />
              Markdown
            </button>
          </div>

          <Button
            size="sm"
            variant="outline"
            className="neumorph-btn h-8 text-xs font-semibold text-slate-700 gap-1.5"
            onClick={handleCopyMarkdown}
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? "Copied" : "Copy Code"}
          </Button>

          <Button
            size="sm"
            variant="outline"
            className="neumorph-btn h-8 text-xs font-semibold text-slate-700 gap-1.5"
            onClick={handleDownloadMarkdown}
          >
            <Download className="h-3.5 w-3.5" />
            .MD File
          </Button>

          <Button
            size="sm"
            onClick={handleGeneratePdf}
            disabled={isGeneratingPdf}
            className="bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl text-xs gap-1.5 h-8 shadow-xs"
          >
            {isGeneratingPdf ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
            PDF Report
          </Button>
        </div>
      </div>

      {/* ── Document View ── */}
      {activeMode === "preview" ? (
        <div className="neumorph-card p-6 md:p-10 bg-white space-y-8">
          {/* Header Banner */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
            <div>
              <span className="text-[10px] uppercase tracking-[0.24em] text-slate-400 font-bold">
                Official Project Report
              </span>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">
                {project.name}
              </h1>
              <div className="flex items-center gap-2 mt-2 flex-wrap text-xs text-slate-500">
                <Badge className={getStatusBadgeClass(project.status)}>
                  {getStatusLabel(project.status)}
                </Badge>
                <span>•</span>
                <span>Created {formatDateOnly(project.createdAt)}</span>
                {project.status === "COMPLETED" && (
                  <>
                    <span>•</span>
                    <span className="text-emerald-700 font-semibold">
                      Completed {formatDateOnly(project.updatedAt)}
                    </span>
                  </>
                )}
              </div>
            </div>
            {project.teamImageUrl && (
              <img
                src={project.teamImageUrl}
                alt={project.name}
                className="h-16 w-24 object-cover rounded-xl border border-slate-200"
              />
            )}
          </div>

          {/* 1. Team Section */}
          <div className="space-y-3">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2 uppercase tracking-wide">
              <Users className="h-4 w-4 text-slate-500" />
              1. Project Team
            </h2>
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="p-3">Member</th>
                    <th className="p-3">Role</th>
                    <th className="p-3">Email</th>
                    <th className="p-3">Project Note</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {project.members.map((m) => (
                    <tr key={m.userEmail} className="hover:bg-slate-50/50">
                      <td className="p-3 font-semibold text-slate-800">{m.userName}</td>
                      <td className="p-3">
                        <Badge variant="outline" className="text-[10px] uppercase font-semibold">
                          {m.userRole}
                        </Badge>
                      </td>
                      <td className="p-3 text-slate-500 font-mono text-[11px]">{m.userEmail}</td>
                      <td className="p-3 text-slate-600">{m.projectNote || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 2. Materials & Items Used */}
          {project.items.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2 uppercase tracking-wide">
                <Package className="h-4 w-4 text-slate-500" />
                2. Inventory Items & Materials
              </h2>
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                    <tr>
                      <th className="p-3">Item Name</th>
                      <th className="p-3">Quantity</th>
                      <th className="p-3">Tagged By</th>
                      <th className="p-3">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {project.items.map((item) => (
                      <tr key={item.requestId} className="hover:bg-slate-50/50">
                        <td className="p-3 font-semibold text-slate-800">{item.itemName}</td>
                        <td className="p-3 font-bold text-slate-700">{item.quantity}</td>
                        <td className="p-3 text-slate-500">{item.userEmail}</td>
                        <td className="p-3 text-slate-500">{formatDateOnly(item.taggedAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 3. Milestones & Events */}
          {history.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2 uppercase tracking-wide">
                <Activity className="h-4 w-4 text-slate-500" />
                3. Key Milestones & Event Journey
              </h2>
              <div className="grid sm:grid-cols-2 gap-3">
                {history.map((h) => (
                  <div
                    key={h.historyId}
                    className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 flex items-center gap-3 text-xs"
                  >
                    <div className="h-7 w-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-700 shadow-xs shrink-0">
                      <HistoryActionIcon action={h.action} className="h-3.5 w-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-slate-800 truncate">
                        {HISTORY_ACTION_LABELS[h.action]?.label || h.action}
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {formatDateOnly(h.createdAt)} by {h.actorName}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 4. Complete Collated Timeline / Chat Log */}
          <div className="space-y-4">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2 uppercase tracking-wide">
              <FileText className="h-4 w-4 text-slate-500" />
              4. Complete Timeline Updates & Discussion Stream
            </h2>
            <div className="space-y-3">
              {project.timeline.filter((t) => t.itemType === "post").length === 0 ? (
                <p className="text-xs text-slate-400 italic">No timeline updates recorded.</p>
              ) : (
                project.timeline
                  .filter((t) => t.itemType === "post")
                  .map((post: any, idx: number) => (
                    <div
                      key={post.id}
                      className="p-4 rounded-xl border border-slate-200 bg-slate-50/40 space-y-3"
                    >
                      {/* Post Header */}
                      <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-200/80 flex-wrap gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-slate-900">
                            {idx + 1}. {post.authorName}
                          </span>
                          <span className="text-slate-500">({post.authorRole})</span>
                          <Badge variant="outline" className="text-[9px] uppercase font-semibold">
                            {post.kind}
                          </Badge>
                          <span className="text-slate-400 text-[11px]">
                            {formatDateTime(post.createdAt)}
                          </span>
                        </div>

                        {/* Post ID Badge & 1-Click Copy */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-[10px] text-slate-400 font-mono">ID:</span>
                          <button
                            type="button"
                            onClick={() => handleCopyPostId(post.id)}
                            className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white border border-slate-200 text-[11px] font-mono text-slate-700 hover:bg-slate-100 hover:border-slate-300 transition-colors shadow-2xs"
                            title="Copy Post ID to edit or delete from Project Post tab"
                          >
                            {copiedPostId === post.id ? (
                              <>
                                <Check className="h-3 w-3 text-emerald-600" />
                                <span className="text-emerald-700 font-semibold">Copied ID</span>
                              </>
                            ) : (
                              <>
                                <Copy className="h-3 w-3 text-slate-400" />
                                <span>{post.id}</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Compiled Markdown Body */}
                      <div className="text-slate-800 text-sm">
                        <MarkdownPostRenderer content={post.body} />
                      </div>

                      {/* Post Images if any */}
                      {post.images && post.images.length > 0 && (
                        <div className="flex flex-wrap gap-2 pt-1">
                          {post.images.map((img: string, i: number) => (
                            <div key={i} className="h-28 w-28 rounded-xl overflow-hidden border border-slate-200 bg-white">
                              <img src={normalizeImageUrl(img)} alt="Attachment" className="h-full w-full object-cover" />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Raw Markdown Source Code Box */
        <div className="neumorph-card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 bg-slate-900 text-slate-300 text-xs font-mono border-b border-slate-800">
            <span>collated_project_report.md</span>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleCopyMarkdown}
              className="h-6 text-xs text-slate-300 hover:text-white hover:bg-slate-800 gap-1"
            >
              {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
              {copied ? "Copied" : "Copy Markdown"}
            </Button>
          </div>
          <div className="p-6 bg-slate-950 text-emerald-400 font-mono text-xs overflow-x-auto leading-relaxed max-h-[600px] select-all whitespace-pre-wrap">
            {collatedMarkdown}
          </div>
        </div>
      )}
    </div>
  );
}
