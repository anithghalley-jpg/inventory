import React, { useState, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  GraduationCap,
  FileText,
  CheckCircle2,
  Clock,
  Users,
  Star,
  ExternalLink,
  Search,
  Download,
  Calendar,
  Tag,
  MapPin,
  Layers,
  Award,
  ChevronRight,
  TrendingUp,
  History,
  Check,
  X,
  Sparkles,
  Printer
} from "lucide-react";
import { getOptimizedImageUrl } from "@/lib/utils";

export default function AdminLearningReportsTab() {
  const reportData = useQuery(api.learningPlans.getLearningReport);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "DRAFT" | "PUBLISHED" | "COMPLETED">("ALL");
  const [activeViewTab, setActiveViewTab] = useState<"plans" | "attendees" | "submissions">("plans");
  const [selectedPlanDetail, setSelectedPlanDetail] = useState<any>(null);
  const [selectedPlanEditionTab, setSelectedPlanEditionTab] = useState<string>("current");
  const [attendeeSearchQuery, setAttendeeSearchQuery] = useState("");
  const [submissionStatusFilter, setSubmissionStatusFilter] = useState<"ALL" | "APPROVED" | "PENDING" | "REJECTED">("ALL");

  const summary = reportData?.summary || {
    totalPlans: 0,
    draftCount: 0,
    publishedCount: 0,
    completedCount: 0,
    totalEditions: 0,
    totalRegistrations: 0,
    totalAttended: 0,
    totalSubmissions: 0,
    totalApprovedSubmissions: 0,
    totalPendingSubmissions: 0,
    totalRejectedSubmissions: 0,
    uniqueAttendeesCount: 0,
    approvalRate: 0,
    attendanceRate: 0,
  };

  const plans = reportData?.plans || [];
  const attendees = reportData?.attendees || [];

  // Filtered Plans
  const filteredPlans = useMemo(() => {
    return plans.filter((plan: any) => {
      const matchesStatus =
        statusFilter === "ALL"
          ? true
          : statusFilter === "DRAFT"
          ? plan.status === "DRAFT"
          : statusFilter === "COMPLETED"
          ? plan.isEffectivelyCompleted
          : plan.status === "PUBLISHED" && !plan.isEffectivelyCompleted;

      if (!matchesStatus) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      const inTitle = plan.title?.toLowerCase().includes(q);
      const inAuthor = plan.authorName?.toLowerCase().includes(q) || plan.authorEmail?.toLowerCase().includes(q);
      const inLocation = plan.location?.toLowerCase().includes(q);
      const inTags = (plan.tags || []).some((t: string) => t.toLowerCase().includes(q));
      const inAttendees = (plan.registeredUsers || []).some(
        (u: any) => u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q)
      );
      const inPastAttendees = (plan.pastEditions || []).some((ed: any) =>
        (ed.registeredUsers || []).some(
          (u: any) => u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q)
        )
      );

      return inTitle || inAuthor || inLocation || inTags || inAttendees || inPastAttendees;
    });
  }, [plans, statusFilter, searchQuery]);

  // Filtered Attendees Directory
  const filteredAttendees = useMemo(() => {
    if (!attendeeSearchQuery.trim()) return attendees;
    const q = attendeeSearchQuery.toLowerCase().trim();
    return attendees.filter(
      (a: any) =>
        a.name?.toLowerCase().includes(q) ||
        a.email?.toLowerCase().includes(q) ||
        a.plans?.some((p: any) => p.planTitle?.toLowerCase().includes(q))
    );
  }, [attendees, attendeeSearchQuery]);

  // All Flattened Submissions
  const allSubmissions = useMemo(() => {
    const list: Array<{
      planId: string;
      planTitle: string;
      editionNumber: number;
      curatorName: string;
      curatorEmail: string;
      studentName: string;
      studentEmail: string;
      submissionUrl: string;
      submissionStatus: "APPROVED" | "PENDING" | "REJECTED";
      submittedAt?: number;
      feedbackNote?: string;
    }> = [];

    plans.forEach((plan: any) => {
      // Current Edition submissions
      (plan.registeredUsers || []).forEach((u: any) => {
        if (u.submissionUrl) {
          list.push({
            planId: plan._id,
            planTitle: plan.title,
            editionNumber: plan.edition || 1,
            curatorName: plan.authorName,
            curatorEmail: plan.authorEmail,
            studentName: u.name,
            studentEmail: u.email,
            submissionUrl: u.submissionUrl,
            submissionStatus: u.submissionStatus || "PENDING",
            submittedAt: u.submittedAt,
            feedbackNote: u.feedbackNote,
          });
        }
      });

      // Past Editions submissions
      (plan.pastEditions || []).forEach((ed: any) => {
        (ed.registeredUsers || []).forEach((u: any) => {
          if (u.submissionUrl) {
            list.push({
              planId: plan._id,
              planTitle: plan.title,
              editionNumber: ed.editionNumber,
              curatorName: plan.authorName,
              curatorEmail: plan.authorEmail,
              studentName: u.name,
              studentEmail: u.email,
              submissionUrl: u.submissionUrl,
              submissionStatus: u.submissionStatus || "PENDING",
              submittedAt: u.submittedAt,
              feedbackNote: u.feedbackNote,
            });
          }
        });
      });
    });

    return list.filter((sub) => {
      if (submissionStatusFilter !== "ALL" && sub.submissionStatus !== submissionStatusFilter) {
        return false;
      }
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      return (
        sub.planTitle.toLowerCase().includes(q) ||
        sub.studentName.toLowerCase().includes(q) ||
        sub.studentEmail.toLowerCase().includes(q) ||
        sub.curatorName.toLowerCase().includes(q)
      );
    });
  }, [plans, submissionStatusFilter, searchQuery]);

  // Export to CSV Function
  const handleExportCSV = (type: "plans" | "sessions" | "attendees" | "submissions") => {
    let csvContent = "";
    let fileName = "";

    if (type === "sessions" || type === "plans") {
      fileName = `learning_sessions_report_${new Date().toISOString().slice(0, 10)}.csv`;
      csvContent = "Plan ID,Title,Status,Curator Name,Curator Email,Scheduled Date,Scheduled Time,Location,Capacity,Editions Count,Total Registrations,Total Attended,Submissions Count,Approved Submissions\n";

      plans.forEach((p: any) => {
        const row = [
          `"${p.planId || p._id}"`,
          `"${(p.title || "").replace(/"/g, '""')}"`,
          `"${p.status}"`,
          `"${(p.authorName || "").replace(/"/g, '""')}"`,
          `"${p.authorEmail || ""}"`,
          `"${p.date || ""}"`,
          `"${p.time || ""}"`,
          `"${(p.location || "").replace(/"/g, '""')}"`,
          p.maxParticipants || 20,
          p.metrics?.editionsCount || 1,
          p.metrics?.registrationsCount || 0,
          p.metrics?.attendedCount || 0,
          p.metrics?.submissionsCount || 0,
          p.metrics?.approvedSubmissionsCount || 0,
        ];
        csvContent += row.join(",") + "\n";
      });
    } else if (type === "attendees") {
      fileName = `learning_attendees_matrix_${new Date().toISOString().slice(0, 10)}.csv`;
      csvContent = "Student Name,Student Email,Total Registered Sessions,Total Attended Sessions,Total Approved Submissions\n";

      attendees.forEach((a: any) => {
        const row = [
          `"${(a.name || "").replace(/"/g, '""')}"`,
          `"${a.email || ""}"`,
          a.totalRegistered,
          a.totalAttended,
          a.totalApproved,
        ];
        csvContent += row.join(",") + "\n";
      });
    } else {
      fileName = `learning_submissions_report_${new Date().toISOString().slice(0, 10)}.csv`;
      csvContent = "Session Title,Edition,Student Name,Student Email,Curator Name,Submission URL,Review Status,Feedback Note,Submission Date\n";

      allSubmissions.forEach((s) => {
        const row = [
          `"${(s.planTitle || "").replace(/"/g, '""')}"`,
          s.editionNumber,
          `"${(s.studentName || "").replace(/"/g, '""')}"`,
          `"${s.studentEmail || ""}"`,
          `"${(s.curatorName || "").replace(/"/g, '""')}"`,
          `"${(s.submissionUrl || "").replace(/"/g, '""')}"`,
          `"${s.submissionStatus}"`,
          `"${(s.feedbackNote || "").replace(/"/g, '""')}"`,
          s.submittedAt ? `"${new Date(s.submittedAt).toLocaleDateString()}"` : '""',
        ];
        csvContent += row.join(",") + "\n";
      });
    }

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* ── Page Header & Controls ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-2 border-b border-border/40">
        <div>
          <h2 className="text-2xl font-bold font-display tracking-tight text-foreground flex items-center gap-2.5">
            <GraduationCap className="w-6 h-6 text-emerald-600" />
            Learning Experiences & Session Reports
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Administrative report on drafts, published workshops, completed sessions, verified attendees, and approved project submissions.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleExportCSV(activeViewTab)}
            className="font-semibold text-xs rounded-xl gap-1.5 h-9 cursor-pointer shadow-2xs hover:bg-muted"
          >
            <Download className="w-3.5 h-3.5 text-emerald-600" />
            <span>Export CSV</span>
          </Button>
          <Button
            size="sm"
            onClick={() => window.print()}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs gap-1.5 h-9 cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Report</span>
          </Button>
        </div>
      </div>

      {/* ── Top Executive KPI Metrics Grid ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3.5">
        {/* Total Sessions */}
        <Card className="p-4 rounded-2xl border-slate-200/80 bg-white shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Plans</span>
            <FileText className="w-4 h-4 text-slate-400" />
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-slate-900">{summary.totalPlans}</span>
            <p className="text-[10px] text-slate-500 mt-0.5">{summary.totalEditions} Total Editions Hosted</p>
          </div>
        </Card>

        {/* In Draft */}
        <Card className="p-4 rounded-2xl border-amber-200/80 bg-amber-50/40 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-amber-800">
            <span className="text-[11px] font-bold uppercase tracking-wider">In Draft</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-amber-950">{summary.draftCount}</span>
            <p className="text-[10px] text-amber-800 font-medium mt-0.5">Unpublished sessions</p>
          </div>
        </Card>

        {/* Published / Active */}
        <Card className="p-4 rounded-2xl border-emerald-200/80 bg-emerald-50/40 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-emerald-800">
            <span className="text-[11px] font-bold uppercase tracking-wider">Upcoming / Active</span>
            <Sparkles className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-emerald-950">{summary.publishedCount}</span>
            <p className="text-[10px] text-emerald-800 font-medium mt-0.5">Open for registration</p>
          </div>
        </Card>

        {/* Completed */}
        <Card className="p-4 rounded-2xl border-purple-200/80 bg-purple-50/40 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-purple-800">
            <span className="text-[11px] font-bold uppercase tracking-wider">Completed</span>
            <CheckCircle2 className="w-4 h-4 text-purple-600" />
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-purple-950">{summary.completedCount}</span>
            <p className="text-[10px] text-purple-800 font-medium mt-0.5">Finished sessions</p>
          </div>
        </Card>

        {/* Verified Attendees */}
        <Card className="p-4 rounded-2xl border-indigo-200/80 bg-indigo-50/40 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-indigo-800">
            <span className="text-[11px] font-bold uppercase tracking-wider">Attendees</span>
            <Users className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-indigo-950">{summary.totalAttended}</span>
            <p className="text-[10px] text-indigo-800 font-medium mt-0.5">
              {summary.totalRegistrations} total spots filled
            </p>
          </div>
        </Card>

        {/* Approved Submissions */}
        <Card className="p-4 rounded-2xl border-amber-300 bg-amber-400/10 shadow-xs flex flex-col justify-between ring-1 ring-amber-300/60">
          <div className="flex items-center justify-between text-amber-900">
            <span className="text-[11px] font-black uppercase tracking-wider flex items-center gap-1">
              <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-600" />
              Approved Proofs
            </span>
            <Award className="w-4 h-4 text-amber-600" />
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-amber-950">{summary.totalApprovedSubmissions}</span>
            <p className="text-[10px] text-amber-900 font-bold mt-0.5">
              of {summary.totalSubmissions} submissions ({summary.approvalRate}%)
            </p>
          </div>
        </Card>

        {/* Unique Students */}
        <Card className="p-4 rounded-2xl border-slate-200/80 bg-white shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">Unique Learners</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-slate-900">{summary.uniqueAttendeesCount}</span>
            <p className="text-[10px] text-slate-500 mt-0.5">{summary.attendanceRate}% Attendance Rate</p>
          </div>
        </Card>
      </div>

      {/* ── Sub-Navigation & Filters Bar ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 hide-scrollbar">
          <button
            type="button"
            onClick={() => setActiveViewTab("plans")}
            className={`px-4 py-2 rounded-2xl text-xs font-extrabold transition-all shrink-0 cursor-pointer flex items-center gap-2 ${
              activeViewTab === "plans"
                ? "bg-slate-900 text-white shadow-md"
                : "bg-slate-100 hover:bg-slate-200 text-slate-700"
            }`}
          >
            <Layers className="w-4 h-4 text-emerald-400" />
            <span>Session Plans Breakdown ({plans.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveViewTab("attendees")}
            className={`px-4 py-2 rounded-2xl text-xs font-extrabold transition-all shrink-0 cursor-pointer flex items-center gap-2 ${
              activeViewTab === "attendees"
                ? "bg-slate-900 text-white shadow-md"
                : "bg-slate-100 hover:bg-slate-200 text-slate-700"
            }`}
          >
            <Users className="w-4 h-4 text-indigo-400" />
            <span>Attendees Directory ({attendees.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveViewTab("submissions")}
            className={`px-4 py-2 rounded-2xl text-xs font-extrabold transition-all shrink-0 cursor-pointer flex items-center gap-2 ${
              activeViewTab === "submissions"
                ? "bg-slate-900 text-white shadow-md"
                : "bg-slate-100 hover:bg-slate-200 text-slate-700"
            }`}
          >
            <Star className="w-4 h-4 fill-amber-400 text-amber-500" />
            <span>Submissions & Approvals Log ({summary.totalSubmissions})</span>
          </button>
        </div>

        {/* Global Search Bar */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder={
              activeViewTab === "attendees"
                ? "Search student name, email..."
                : "Search title, curator, attendee, tags..."
            }
            value={activeViewTab === "attendees" ? attendeeSearchQuery : searchQuery}
            onChange={(e) => {
              if (activeViewTab === "attendees") setAttendeeSearchQuery(e.target.value);
              else setSearchQuery(e.target.value);
            }}
            className="pl-9 h-9 text-xs rounded-xl bg-white border-slate-200 shadow-xs"
          />
        </div>
      </div>

      {/* ── TAB 1: Session Plans Detailed Breakdown ── */}
      {activeViewTab === "plans" && (
        <div className="space-y-4">
          {/* Status Filter Subtabs */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-slate-500 mr-1">Status:</span>
            <button
              type="button"
              onClick={() => setStatusFilter("ALL")}
              className={`px-3 py-1 rounded-xl text-xs font-semibold cursor-pointer transition-colors ${
                statusFilter === "ALL"
                  ? "bg-slate-800 text-white font-bold"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              All ({plans.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("DRAFT")}
              className={`px-3 py-1 rounded-xl text-xs font-semibold cursor-pointer transition-colors ${
                statusFilter === "DRAFT"
                  ? "bg-amber-600 text-white font-bold"
                  : "bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100"
              }`}
            >
              Drafts ({summary.draftCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("PUBLISHED")}
              className={`px-3 py-1 rounded-xl text-xs font-semibold cursor-pointer transition-colors ${
                statusFilter === "PUBLISHED"
                  ? "bg-emerald-600 text-white font-bold"
                  : "bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100"
              }`}
            >
              Published / Upcoming ({summary.publishedCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("COMPLETED")}
              className={`px-3 py-1 rounded-xl text-xs font-semibold cursor-pointer transition-colors ${
                statusFilter === "COMPLETED"
                  ? "bg-purple-600 text-white font-bold"
                  : "bg-purple-50 text-purple-800 border border-purple-200 hover:bg-purple-100"
              }`}
            >
              Completed ({summary.completedCount})
            </button>
          </div>

          {/* Plans Table / Cards List */}
          {filteredPlans.length === 0 ? (
            <Card className="p-12 text-center rounded-3xl border-dashed border-2 border-slate-200 bg-slate-50/50">
              <GraduationCap className="w-12 h-12 mx-auto text-slate-300 mb-3" />
              <h3 className="text-base font-bold text-slate-800 mb-1">No learning sessions found</h3>
              <p className="text-xs text-slate-500">Try adjusting your filters or search keywords.</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-3.5">
              {filteredPlans.map((plan: any) => {
                const metrics = plan.metrics || {};
                const isCompleted = plan.isEffectivelyCompleted;
                const statusBadgeClass =
                  plan.status === "DRAFT"
                    ? "bg-amber-100 text-amber-800 border-amber-300"
                    : isCompleted
                    ? "bg-purple-100 text-purple-800 border-purple-300"
                    : "bg-emerald-100 text-emerald-800 border-emerald-300";

                return (
                  <Card
                    key={plan._id}
                    className="p-4 sm:p-5 rounded-3xl border border-slate-200 bg-white hover:border-slate-300 hover:shadow-md transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 group"
                  >
                    {/* Left: Metadata */}
                    <div className="space-y-2 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border shadow-xs ${statusBadgeClass}`}>
                          {plan.status === "PUBLISHED" && isCompleted ? "COMPLETED (AUTO)" : plan.status}
                        </span>
                        <span className="text-[10px] font-extrabold text-purple-700 bg-purple-50 border border-purple-200 px-2.5 py-0.5 rounded-full">
                          Edition {plan.edition || 1}
                          {metrics.editionsCount > 1 && ` (${metrics.editionsCount} Total Editions)`}
                        </span>
                        {metrics.approvedSubmissionsCount > 0 && (
                          <span className="text-[10px] font-black text-amber-950 bg-amber-400 border border-amber-300 px-2.5 py-0.5 rounded-full shadow-xs flex items-center gap-1">
                            <Star className="w-3 h-3 fill-slate-950" />
                            {metrics.approvedSubmissionsCount} Approved Submission{metrics.approvedSubmissionsCount === 1 ? '' : 's'}
                          </span>
                        )}
                      </div>

                      <div>
                        <h3 className="text-lg font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
                          {plan.title}
                        </h3>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 mt-1">
                          <span>Curator: <strong className="text-slate-800">{plan.authorName}</strong> ({plan.authorEmail})</span>
                          {plan.date && <span>📅 {plan.date} {plan.time ? `at ${plan.time}` : ''}</span>}
                          {plan.location && <span>📍 {plan.location}</span>}
                          <span>👥 Max: {plan.maxParticipants || 20}</span>
                        </div>
                      </div>

                      {/* Tags */}
                      {plan.tags && plan.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {plan.tags.map((tag: string) => (
                            <span key={tag} className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Middle: Key Roster Statistics */}
                    <div className="grid grid-cols-3 sm:grid-cols-3 gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-200/80 shrink-0 text-center min-w-[280px]">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Registered</span>
                        <span className="text-base font-black text-slate-800">{metrics.registrationsCount || 0}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Attended</span>
                        <span className="text-base font-black text-emerald-700">{metrics.attendedCount || 0}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Approved</span>
                        <span className="text-base font-black text-amber-600">
                          {metrics.approvedSubmissionsCount || 0}
                          <span className="text-[10px] font-normal text-slate-400">/{metrics.submissionsCount || 0}</span>
                        </span>
                      </div>
                    </div>

                    {/* Right: Action Button */}
                    <div className="shrink-0 self-end md:self-center">
                      <Button
                        size="sm"
                        onClick={() => {
                          setSelectedPlanDetail(plan);
                          setSelectedPlanEditionTab("current");
                        }}
                        className="bg-slate-900 hover:bg-emerald-600 text-white font-bold text-xs rounded-xl shadow-xs gap-1.5 h-9 px-4 transition-all cursor-pointer"
                      >
                        <span>Full Report & Roster</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 2: Attendees Directory Matrix ── */}
      {activeViewTab === "attendees" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Showing {filteredAttendees.length} unique learners across all sessions</span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleExportCSV("attendees")}
              className="text-xs rounded-xl border-slate-200 h-8 gap-1 cursor-pointer"
            >
              <Download className="w-3 h-3 text-slate-500" />
              <span>Export Attendees List</span>
            </Button>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="px-5 py-3.5">Learner Name & Email</th>
                    <th className="px-4 py-3.5 text-center">Sessions Joined</th>
                    <th className="px-4 py-3.5 text-center">Verified Attended</th>
                    <th className="px-4 py-3.5 text-center">Proofs Approved</th>
                    <th className="px-5 py-3.5">Learning History Summary</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredAttendees.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-5 py-8 text-center text-slate-400">
                        No attendees match your search.
                      </td>
                    </tr>
                  ) : (
                    filteredAttendees.map((att: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-5 py-3.5 font-medium">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center shrink-0 border border-emerald-200">
                              {att.name ? att.name.charAt(0).toUpperCase() : '?'}
                            </div>
                            <div>
                              <p className="font-bold text-slate-900">{att.name}</p>
                              <p className="text-[11px] text-slate-500">{att.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-center font-bold text-slate-800">
                          {att.totalRegistered}
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <span className="font-extrabold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                            {att.totalAttended}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <span className="font-extrabold text-amber-950 bg-amber-100 border border-amber-300 px-2.5 py-0.5 rounded-full inline-flex items-center gap-1">
                            <Star className="w-3 h-3 fill-amber-500 text-amber-600" />
                            {att.totalApproved}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex flex-wrap gap-1 max-w-md">
                            {(att.plans || []).map((p: any, pIdx: number) => {
                              const isApproved = p.submissionStatus === "APPROVED";
                              return (
                                <span
                                  key={pIdx}
                                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border flex items-center gap-1 ${
                                    isApproved
                                      ? "bg-amber-50 text-amber-950 border-amber-300"
                                      : p.attended
                                      ? "bg-purple-50 text-purple-900 border-purple-200"
                                      : "bg-slate-100 text-slate-600 border-slate-200"
                                  }`}
                                  title={`Edition ${p.editionNumber} • ${isApproved ? 'Approved Submission' : p.attended ? 'Attended' : 'Registered'}`}
                                >
                                  {isApproved && <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-600" />}
                                  {p.planTitle} (Ed. {p.editionNumber})
                                </span>
                              );
                            })}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 3: Submissions & Approvals Log ── */}
      {activeViewTab === "submissions" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-slate-500">Review Status:</span>
              <button
                type="button"
                onClick={() => setSubmissionStatusFilter("ALL")}
                className={`px-3 py-1 rounded-xl text-xs font-semibold cursor-pointer transition-colors ${
                  submissionStatusFilter === "ALL" ? "bg-slate-800 text-white font-bold" : "bg-slate-100 text-slate-600"
                }`}
              >
                All ({summary.totalSubmissions})
              </button>
              <button
                type="button"
                onClick={() => setSubmissionStatusFilter("APPROVED")}
                className={`px-3 py-1 rounded-xl text-xs font-semibold cursor-pointer transition-colors ${
                  submissionStatusFilter === "APPROVED" ? "bg-amber-500 text-slate-950 font-black shadow-xs" : "bg-amber-50 text-amber-900 border border-amber-200"
                }`}
              >
                Approved ⭐ ({summary.totalApprovedSubmissions})
              </button>
              <button
                type="button"
                onClick={() => setSubmissionStatusFilter("PENDING")}
                className={`px-3 py-1 rounded-xl text-xs font-semibold cursor-pointer transition-colors ${
                  submissionStatusFilter === "PENDING" ? "bg-amber-600 text-white font-bold shadow-xs" : "bg-amber-50 text-amber-800 border border-amber-200"
                }`}
              >
                Pending ⏳ ({summary.totalPendingSubmissions})
              </button>
              <button
                type="button"
                onClick={() => setSubmissionStatusFilter("REJECTED")}
                className={`px-3 py-1 rounded-xl text-xs font-semibold cursor-pointer transition-colors ${
                  submissionStatusFilter === "REJECTED" ? "bg-rose-600 text-white font-bold shadow-xs" : "bg-rose-50 text-rose-800 border border-rose-200"
                }`}
              >
                Revision ❌ ({summary.totalRejectedSubmissions})
              </button>
            </div>

            <Button
              size="sm"
              variant="outline"
              onClick={() => handleExportCSV("submissions")}
              className="text-xs rounded-xl border-slate-200 h-8 gap-1 shrink-0 cursor-pointer"
            >
              <Download className="w-3 h-3 text-slate-500" />
              <span>Export Submissions</span>
            </Button>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="px-5 py-3.5">Learner</th>
                    <th className="px-5 py-3.5">Session / Workshop</th>
                    <th className="px-4 py-3.5">Submission Link</th>
                    <th className="px-4 py-3.5 text-center">Status</th>
                    <th className="px-5 py-3.5">Curator Feedback / Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {allSubmissions.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-5 py-8 text-center text-slate-400">
                        No submissions match the selected filter.
                      </td>
                    </tr>
                  ) : (
                    allSubmissions.map((sub, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-5 py-3.5 font-medium">
                          <p className="font-bold text-slate-900">{sub.studentName}</p>
                          <p className="text-[11px] text-slate-500">{sub.studentEmail}</p>
                        </td>
                        <td className="px-5 py-3.5 font-medium">
                          <p className="font-bold text-slate-900">{sub.planTitle}</p>
                          <p className="text-[11px] text-slate-500">Edition {sub.editionNumber} • Host: {sub.curatorName}</p>
                        </td>
                        <td className="px-4 py-3.5">
                          <a
                            href={sub.submissionUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-emerald-700 hover:text-emerald-900 underline font-semibold flex items-center gap-1 truncate max-w-xs"
                          >
                            <span className="truncate">{sub.submissionUrl}</span>
                            <ExternalLink className="w-3 h-3 shrink-0" />
                          </a>
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          {sub.submissionStatus === "APPROVED" ? (
                            <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950 border border-amber-300 inline-flex items-center gap-1 shadow-xs">
                              <Star className="w-3 h-3 fill-slate-950" />
                              Approved ⭐
                            </span>
                          ) : sub.submissionStatus === "REJECTED" ? (
                            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200">
                              Revision Needed ❌
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                              Pending Review ⏳
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-slate-600">
                          {sub.feedbackNote ? (
                            <p className="italic bg-slate-50 p-2 rounded-lg border border-slate-200/80 text-[11px] text-slate-800">
                              "{sub.feedbackNote}"
                            </p>
                          ) : (
                            <span className="text-slate-400 italic">No note provided</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── Deep Dive Plan Details & Full Attendees Modal ── */}
      <Dialog open={!!selectedPlanDetail} onOpenChange={(open) => !open && setSelectedPlanDetail(null)}>
        <DialogContent className="max-w-4xl lg:max-w-5xl max-h-[92vh] overflow-y-auto p-6 md:p-8">
          {selectedPlanDetail && (
            <div className="space-y-6">
              <DialogHeader>
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border shadow-xs ${
                    selectedPlanDetail.status === "DRAFT"
                      ? "bg-amber-100 text-amber-800 border-amber-300"
                      : selectedPlanDetail.isEffectivelyCompleted
                      ? "bg-purple-100 text-purple-800 border-purple-300"
                      : "bg-emerald-100 text-emerald-800 border-emerald-300"
                  }`}>
                    {selectedPlanDetail.status}
                  </span>
                  <span className="text-[10px] font-bold text-purple-800 bg-purple-100 px-2.5 py-0.5 rounded-full border border-purple-200">
                    Edition {selectedPlanDetail.edition || 1}
                  </span>
                </div>
                <DialogTitle className="text-2xl font-black text-slate-900 pt-1">
                  {selectedPlanDetail.title}
                </DialogTitle>
              </DialogHeader>

              {/* Plan Logistics Info */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                <div>
                  <span className="text-slate-400 font-bold block uppercase text-[10px]">Curator / Host</span>
                  <span className="font-bold text-slate-900">{selectedPlanDetail.authorName}</span>
                  <p className="text-[11px] text-slate-500">{selectedPlanDetail.authorEmail}</p>
                </div>
                <div>
                  <span className="text-slate-400 font-bold block uppercase text-[10px]">Schedule & Location</span>
                  <span className="font-semibold text-slate-800">
                    {selectedPlanDetail.date || "Not set"} {selectedPlanDetail.time ? `at ${selectedPlanDetail.time}` : ""}
                  </span>
                  <p className="text-[11px] text-slate-500">{selectedPlanDetail.location || "Venue TBD"}</p>
                </div>
                <div>
                  <span className="text-slate-400 font-bold block uppercase text-[10px]">Capacity & Editions</span>
                  <span className="font-semibold text-slate-800">
                    Max: {selectedPlanDetail.maxParticipants || 20} spots
                  </span>
                  <p className="text-[11px] text-purple-700 font-bold">
                    {(selectedPlanDetail.pastEditions?.length || 0) + 1} Total Editions
                  </p>
                </div>
                <div>
                  <span className="text-slate-400 font-bold block uppercase text-[10px]">Collaborators</span>
                  <span className="font-semibold text-slate-700">
                    {selectedPlanDetail.collaboratorEmails?.length > 0
                      ? selectedPlanDetail.collaboratorEmails.join(", ")
                      : "None"}
                  </span>
                </div>
              </div>

              {/* Description & Tags */}
              <div className="space-y-2">
                <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">
                  {selectedPlanDetail.description}
                </p>
                {selectedPlanDetail.tags && selectedPlanDetail.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {selectedPlanDetail.tags.map((t: string) => (
                      <span key={t} className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                        {t}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* ── Edition Tabs Selector ── */}
              <div className="border-t border-slate-200 pt-5">
                <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
                  <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <Users className="w-4 h-4 text-emerald-600" />
                    Edition Participant Roster & Attendance
                  </h4>
                  <div className="flex gap-1.5 overflow-x-auto">
                    <button
                      type="button"
                      onClick={() => setSelectedPlanEditionTab("current")}
                      className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        selectedPlanEditionTab === "current"
                          ? "bg-slate-900 text-white shadow-xs"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      Edition {selectedPlanDetail.edition || 1} (Current)
                    </button>
                    {(selectedPlanDetail.pastEditions || []).map((ed: any) => (
                      <button
                        key={ed.editionNumber}
                        type="button"
                        onClick={() => setSelectedPlanEditionTab(`past-${ed.editionNumber}`)}
                        className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          selectedPlanEditionTab === `past-${ed.editionNumber}`
                            ? "bg-purple-700 text-white shadow-xs"
                            : "bg-purple-50 text-purple-800 hover:bg-purple-100 border border-purple-200"
                        }`}
                      >
                        Edition {ed.editionNumber} (Past)
                      </button>
                    ))}
                  </div>
                </div>

                {/* Active Edition Attendees Table */}
                {(() => {
                  const isViewingPast = selectedPlanEditionTab.startsWith("past-");
                  const pastNum = isViewingPast ? parseInt(selectedPlanEditionTab.replace("past-", ""), 10) : null;
                  const activePast = pastNum ? (selectedPlanDetail.pastEditions || []).find((p: any) => p.editionNumber === pastNum) : null;
                  const rawRoster = isViewingPast ? (activePast?.registeredUsers || []) : (selectedPlanDetail.registeredUsers || []);
                  const attendedCount = rawRoster.filter((u: any) => u.attended).length;
                  const approvedCount = rawRoster.filter((u: any) => u.attended && u.submissionStatus === "APPROVED").length;

                  return (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-xs text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
                        <span>Total Registered: <strong className="text-slate-800">{rawRoster.length}</strong></span>
                        <span>Attended: <strong className="text-emerald-700">{attendedCount}</strong></span>
                        <span>Approved Submissions: <strong className="text-amber-700">{approvedCount}</strong></span>
                      </div>

                      {rawRoster.length === 0 ? (
                        <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-400">
                          No registered participants found for this edition.
                        </div>
                      ) : (
                        <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-slate-100/80 text-slate-500 font-bold uppercase text-[10px] border-b border-slate-200">
                              <tr>
                                <th className="px-4 py-2.5">Participant Name & Email</th>
                                <th className="px-3 py-2.5 text-center">Attendance</th>
                                <th className="px-4 py-2.5">Submission Link</th>
                                <th className="px-3 py-2.5 text-center">Approval Status</th>
                                <th className="px-4 py-2.5">Curator Note</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white">
                              {rawRoster.map((u: any, uIdx: number) => {
                                const isApproved = u.attended && u.submissionStatus === "APPROVED";
                                return (
                                  <tr key={uIdx} className={`hover:bg-slate-50/80 ${isApproved ? 'bg-amber-50/30' : ''}`}>
                                    <td className="px-4 py-3 font-medium">
                                      <p className="font-bold text-slate-900">{u.name}</p>
                                      <p className="text-[11px] text-slate-500">{u.email}</p>
                                    </td>
                                    <td className="px-3 py-3 text-center">
                                      {u.attended ? (
                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 inline-flex items-center gap-1">
                                          <Check className="w-3 h-3 text-emerald-600" />
                                          Attended
                                        </span>
                                      ) : (
                                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                                          Absent
                                        </span>
                                      )}
                                    </td>
                                    <td className="px-4 py-3">
                                      {u.submissionUrl ? (
                                        <a
                                          href={u.submissionUrl}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-emerald-700 hover:text-emerald-900 underline font-semibold flex items-center gap-1 truncate max-w-[200px]"
                                        >
                                          <span className="truncate">{u.submissionUrl}</span>
                                          <ExternalLink className="w-3 h-3 shrink-0" />
                                        </a>
                                      ) : (
                                        <span className="text-slate-400 italic text-[11px]">No link submitted</span>
                                      )}
                                    </td>
                                    <td className="px-3 py-3 text-center">
                                      {isApproved ? (
                                        <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950 border border-amber-300 inline-flex items-center gap-1 shadow-xs">
                                          <Star className="w-3 h-3 fill-slate-950" />
                                          Approved ⭐
                                        </span>
                                      ) : u.submissionStatus === "REJECTED" ? (
                                        <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200">
                                          Revision ❌
                                        </span>
                                      ) : u.submissionStatus === "PENDING" ? (
                                        <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                                          Pending ⏳
                                        </span>
                                      ) : (
                                        <span className="text-[10px] text-slate-400">—</span>
                                      )}
                                    </td>
                                    <td className="px-4 py-3 text-slate-600 text-[11px]">
                                      {u.feedbackNote ? (
                                        <span className="italic">"{u.feedbackNote}"</span>
                                      ) : (
                                        <span className="text-slate-300">—</span>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
