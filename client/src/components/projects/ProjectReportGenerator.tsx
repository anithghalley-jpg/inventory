import { useRef, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  formatDateTime,
  formatDateOnly,
  getStatusBadgeClass,
  normalizeImageUrl,
  type ProjectDetailRecord,
  type ProjectHistoryEntry,
  ProjectAvatar,
  HISTORY_ACTION_LABELS,
} from "./projectShared";
import { Download, FileText, Printer, Eye, Loader2 } from "lucide-react";
import jsPDF from "jspdf";
import { toast } from "sonner";

export default function ProjectReportGenerator({
  projectId,
  userEmail,
  projectDetail,
}: {
  projectId: string;
  userEmail: string;
  projectDetail: ProjectDetailRecord;
}) {
  const reportData = useQuery(api.projects.getProjectReportData, { userEmail, projectId });
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGeneratePdf = () => {
    if (!reportData) return;
    setIsGenerating(true);
    
    try {
      const { project, history } = reportData;
      // Use landscape or portrait A4
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4"
      });

      const margin = 20;
      const pageWidth = doc.internal.pageSize.getWidth();
      let y = margin;
      
      const addNewPage = () => {
        doc.addPage();
        y = margin;
      };

      // Title
      doc.setFontSize(24);
      doc.setFont("helvetica", "bold");
      doc.text("Project Report", margin, y);
      y += 10;

      // Project Name
      doc.setFontSize(18);
      doc.setTextColor(50, 50, 50);
      doc.text(project.name, margin, y);
      y += 15;
      
      // Basic Info
      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 100, 100);
      doc.text(`Status: ${project.status.replace("_", " ")}`, margin, y);
      y += 7;
      doc.text(`Created: ${formatDateOnly(project.createdAt)}`, margin, y);
      y += 7;
      if (project.status === "COMPLETED") {
        doc.text(`Completed: ${formatDateOnly(project.updatedAt)}`, margin, y);
        y += 7;
      }
      y += 10;

      // Team Section
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30, 30, 30);
      doc.text("Project Team", margin, y);
      y += 10;
      
      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      project.members.forEach(member => {
        if (y > 270) addNewPage();
        doc.text(`• ${member.userName} - ${member.userRole}`, margin + 5, y);
        y += 7;
      });
      y += 10;

      // Items Section
      if (project.items.length > 0) {
        if (y > 250) addNewPage();
        doc.setFontSize(16);
        doc.setFont("helvetica", "bold");
        doc.text("Assigned Inventory Items", margin, y);
        y += 10;

        doc.setFontSize(11);
        doc.setFont("helvetica", "normal");
        project.items.forEach(item => {
          if (y > 270) addNewPage();
          doc.text(`• ${item.quantity}x ${item.itemName} (by ${item.userEmail})`, margin + 5, y);
          y += 7;
        });
        y += 10;
      }

      // Timeline entries
      addNewPage();
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text("Project Journey / Milestones", margin, y);
      y += 10;

      doc.setFontSize(11);
      const milestones = history.filter(h => ["PROJECT_CREATED", "SETUP_APPROVED", "BOX_APPROVED", "PLAN_APPROVED", "MARKED_COMPLETED"].includes(h.action));
      
      milestones.forEach(m => {
        if (y > 270) addNewPage();
        doc.setFont("helvetica", "bold");
        doc.text(HISTORY_ACTION_LABELS[m.action]?.label || m.action, margin, y);
        y += 6;
        doc.setFont("helvetica", "normal");
        doc.setTextColor(100, 100, 100);
        doc.text(`${formatDateOnly(m.createdAt)} - by ${m.actorName}`, margin, y);
        doc.setTextColor(30, 30, 30);
        y += 12;
      });

      // Save PDF
      doc.save(`${project.name.replace(/\s+/g, '_')}_Report_${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success("PDF Report generated successfully");
    } catch (error) {
      console.error(error);
      toast.error("Failed to generate PDF");
    } finally {
      setIsGenerating(false);
    }
  };

  if (!reportData) {
    return <div className="p-12 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-slate-400" /></div>;
  }

  const { project, history } = reportData;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-blue-100 p-2 rounded-lg text-blue-600">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-display font-bold text-slate-800">Project Final Report</h3>
            <p className="text-xs text-slate-500">Comprehensive summary of the project</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="mr-2 h-4 w-4" />
            Print Preview
          </Button>
          <Button size="sm" onClick={handleGeneratePdf} disabled={isGenerating}>
            {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
            Download PDF
          </Button>
        </div>
      </div>

      <div className="project-report-preview shadow-sm">
        <div className="flex items-start justify-between">
          <div>
            <h1>{project.name}</h1>
            <div className="flex gap-2 items-center mt-2">
              <Badge className={getStatusBadgeClass(project.status)}>
                {project.status.replace("_", " ")}
              </Badge>
              <span className="text-sm text-slate-500">
                Created on {formatDateOnly(project.createdAt)}
              </span>
            </div>
          </div>
          {project.teamImageUrl && (
            <img src={normalizeImageUrl(project.teamImageUrl)} alt="Team" className="h-20 w-20 rounded-xl object-cover border border-slate-200" />
          )}
        </div>

        <h2>Project Team</h2>
        <table className="report-table">
          <thead>
            <tr>
              <th>Member Name</th>
              <th>Role</th>
              <th>Email</th>
            </tr>
          </thead>
          <tbody>
            {project.members.map(m => (
              <tr key={m.userEmail}>
                <td className="font-medium text-slate-800">{m.userName}</td>
                <td>{m.userRole}</td>
                <td className="text-slate-500">{m.userEmail}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {project.items.length > 0 && (
          <>
            <h2>Inventory Items Used</h2>
            <table className="report-table">
              <thead>
                <tr>
                  <th>Item Name</th>
                  <th>Quantity</th>
                  <th>Tagged By</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {project.items.map(item => (
                  <tr key={item.requestId}>
                    <td className="font-medium text-slate-800">{item.itemName}</td>
                    <td>{item.quantity}</td>
                    <td>{item.userEmail}</td>
                    <td>{formatDateOnly(item.taggedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        <h2>Key Milestones</h2>
        <div className="space-y-4">
          {history.filter(h => ["PROJECT_CREATED", "SETUP_APPROVED", "BOX_APPROVED", "PLAN_APPROVED", "MARKED_COMPLETED"].includes(h.action)).map(entry => (
            <div key={entry.historyId} className="flex gap-4">
              <div className="text-xl bg-slate-50 h-10 w-10 flex items-center justify-center rounded-full border border-slate-100 shrink-0">
                {HISTORY_ACTION_LABELS[entry.action]?.icon || "✅"}
              </div>
              <div className="pt-1">
                <h3 className="!mt-0 !mb-0">{HISTORY_ACTION_LABELS[entry.action]?.label || entry.action}</h3>
                <p className="text-sm text-slate-500">
                  {formatDateOnly(entry.createdAt)} by {entry.actorName}
                </p>
              </div>
            </div>
          ))}
        </div>

        <h2>Project Timeline Posts</h2>
        <div className="space-y-4 mt-4">
          {project.timeline.filter(t => t.itemType === 'post').map((post: any) => (
            <div key={post.id} className="report-entry">
              <div className="report-entry-header">
                <span className={`report-badge ${post.kind}`}>{post.kind}</span>
                <span>•</span>
                <span className="font-medium text-slate-700">{post.authorName}</span>
                <span>•</span>
                <span>{formatDateTime(post.createdAt)}</span>
              </div>
              <p className="text-slate-800 font-medium">{post.body}</p>
            </div>
          ))}
          {project.timeline.filter(t => t.itemType === 'post').length === 0 && (
            <p className="text-slate-500 italic">No timeline posts recorded.</p>
          )}
        </div>
      </div>
    </div>
  );
}
