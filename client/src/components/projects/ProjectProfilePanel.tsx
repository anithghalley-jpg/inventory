import { useState, useMemo } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
import { toast } from "sonner";
import {
  Users,
  MessageSquare,
  Package,
  Clock,
  CheckCircle2,
  AlertCircle,
  UserPlus,
  Trash2,
  Sparkles,
  CalendarDays,
  Shield,
  Activity,
  Sliders,
  CheckSquare,
  ChevronRight,
  History,
  Tag,
} from "lucide-react";
import {
  formatDateOnly,
  formatDateTime,
  getProjectProgress,
  getStatusBadgeClass,
  getStatusLabel,
  normalizeImageUrl,
  ProjectAvatar,
  AddMemberDialog,
  HistoryActionIcon,
  HISTORY_ACTION_LABELS,
  type ProjectDetailRecord,
  type ProjectStatus,
  type ProjectHistoryEntry,
} from "./projectShared";

interface ProjectProfilePanelProps {
  projectDetail: ProjectDetailRecord;
  userEmail: string;
}

export default function ProjectProfilePanel({
  projectDetail,
  userEmail,
}: ProjectProfilePanelProps) {
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [progressDialogOpen, setProgressDialogOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<ProjectStatus>(projectDetail.status);
  const [selectedHistoryEntry, setSelectedHistoryEntry] = useState<ProjectHistoryEntry | null>(null);

  const removeMemberMut = useMutation(api.projects.removeProjectMember);
  const setLifecycleStatusMut = useMutation(api.projects.setLifecycleStatus);
  const historyData = useQuery(api.projects.getProjectHistory, {
    userEmail,
    projectId: projectDetail.projectId,
  });

  const progress = getProjectProgress(projectDetail.status);

  // Calculate active days
  const daysActive = useMemo(() => {
    const start = new Date(projectDetail.createdAt).getTime();
    const end = projectDetail.status === "COMPLETED"
      ? new Date(projectDetail.updatedAt).getTime()
      : Date.now();
    return Math.max(1, Math.round((end - start) / (1000 * 60 * 60 * 24)));
  }, [projectDetail.createdAt, projectDetail.updatedAt, projectDetail.status]);

  // Timeline stats
  const timelineStats = useMemo(() => {
    const posts = projectDetail.timeline.filter((t) => t.itemType === "post");
    const checkpoints = projectDetail.timeline.filter((t) => t.itemType === "checkpoint");
    const completedCheckpoints = checkpoints.filter((c) => c.status === "COMPLETED" || c.responses.length > 0);
    return {
      postsCount: posts.length,
      checkpointsCount: checkpoints.length,
      completedCheckpointsCount: completedCheckpoints.length,
    };
  }, [projectDetail.timeline]);

  // Breakdown of tasks / responses / items tagged per member
  const memberBreakdown = useMemo(() => {
    return projectDetail.members.map((member) => {
      const memberItems = projectDetail.items.filter(
        (item) => item.userEmail.toLowerCase() === member.userEmail.toLowerCase()
      );
      const memberResponses = projectDetail.timeline
        .filter((t) => t.itemType === "checkpoint")
        .flatMap((cp) => cp.responses)
        .filter((r) => r.submittedByEmail.toLowerCase() === member.userEmail.toLowerCase());

      return {
        ...member,
        itemsCount: memberItems.length,
        itemsList: memberItems,
        responsesCount: memberResponses.length,
      };
    });
  }, [projectDetail.members, projectDetail.items, projectDetail.timeline]);

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

  const handleUpdateStatus = async () => {
    try {
      if (selectedStatus === "ACTIVE" || selectedStatus === "COMPLETED" || selectedStatus === "ARCHIVED") {
        await setLifecycleStatusMut({
          actorEmail: userEmail,
          projectId: projectDetail.projectId,
          status: selectedStatus,
        });
        toast.success(`Project status updated to ${selectedStatus}`);
        setProgressDialogOpen(false);
      } else {
        toast.info("Status changes for setup stages are governed by setup approval.");
        setProgressDialogOpen(false);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update project status");
    }
  };

  const isPrivileged = projectDetail.permissions.canApproveBuiltInStages || projectDetail.permissions.canModerateTimeline;
  const canManageMembers = projectDetail.permissions.canRenameProject || projectDetail.permissions.canApproveBuiltInStages;

  return (
    <div className="space-y-6">
      {/* ── Top Snapshot: Metrics & Visual Progress Gauge ── */}
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* Mild Neumorphic Metrics Grid */}
        <div className="neumorph-card p-6 flex flex-col justify-center">
          <div className="mb-4 flex items-center justify-between">
            <span className="text-xs uppercase tracking-[0.24em] text-slate-400 font-bold">
              Project Performance Snapshot
            </span>
            <span className="text-xs font-semibold text-slate-500">
              Active for {daysActive} {daysActive === 1 ? "day" : "days"}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="neumorph-inset p-4 rounded-2xl flex flex-col items-center justify-center text-center">
              <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 mb-2">
                <Users className="h-4 w-4" />
              </div>
              <span className="text-2xl font-black text-slate-800 tracking-tight">
                {projectDetail.members.length}
              </span>
              <span className="text-[10px] uppercase tracking-[0.14em] text-slate-400 font-semibold mt-0.5">
                Team Members
              </span>
            </div>

            <div className="neumorph-inset p-4 rounded-2xl flex flex-col items-center justify-center text-center">
              <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 mb-2">
                <MessageSquare className="h-4 w-4" />
              </div>
              <span className="text-2xl font-black text-slate-800 tracking-tight">
                {timelineStats.postsCount}
              </span>
              <span className="text-[10px] uppercase tracking-[0.14em] text-slate-400 font-semibold mt-0.5">
                Chat Updates
              </span>
            </div>

            <div className="neumorph-inset p-4 rounded-2xl flex flex-col items-center justify-center text-center">
              <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 mb-2">
                <Package className="h-4 w-4" />
              </div>
              <span className="text-2xl font-black text-slate-800 tracking-tight">
                {projectDetail.items.length}
              </span>
              <span className="text-[10px] uppercase tracking-[0.14em] text-slate-400 font-semibold mt-0.5">
                Tagged Items
              </span>
            </div>

            <div className="neumorph-inset p-4 rounded-2xl flex flex-col items-center justify-center text-center">
              <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 mb-2">
                <CheckSquare className="h-4 w-4" />
              </div>
              <span className="text-2xl font-black text-slate-800 tracking-tight">
                {timelineStats.completedCheckpointsCount}/{timelineStats.checkpointsCount || 0}
              </span>
              <span className="text-[10px] uppercase tracking-[0.14em] text-slate-400 font-semibold mt-0.5">
                Checkpoints
              </span>
            </div>
          </div>
        </div>

        {/* Visual Progress Ring Gauge */}
        <div className="neumorph-card p-6 flex flex-col items-center justify-center text-center">
          <div className="relative flex items-center justify-center">
            <svg width="124" height="124" className="project-progress-ring">
              <circle
                cx="62"
                cy="62"
                r="52"
                fill="transparent"
                strokeWidth="10"
                className="stroke-slate-100"
              />
              <circle
                cx="62"
                cy="62"
                r="52"
                fill="transparent"
                strokeWidth="10"
                strokeDasharray="326.72"
                strokeDashoffset={326.72 - (326.72 * (progress.percent / 100))}
                strokeLinecap="round"
                className="stroke-indigo-600 transition-all duration-700 ease-out"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-2xl font-black text-slate-900 tracking-tight">{progress.percent}%</span>
              <span className="text-[9px] uppercase tracking-[0.18em] text-slate-400 font-bold">Progress</span>
            </div>
          </div>

          <div className="mt-3 flex items-center gap-2">
            <Badge className={getStatusBadgeClass(projectDetail.status)}>
              {getStatusLabel(projectDetail.status)}
            </Badge>
            {isPrivileged && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg"
                onClick={() => setProgressDialogOpen(true)}
              >
                <Sliders className="h-3 w-3 mr-1" />
                Update
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* ── Middle: Team Roster & Task Breakdown ── */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Team Members Roster & Responsibility Breakdown */}
        <div className="neumorph-card p-6 space-y-4">
          <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-100">
            <div>
              <h3 className="text-sm uppercase tracking-[0.2em] text-slate-400 font-bold">
                Project Team & Responsibilities
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {projectDetail.members.length} active contributors assigned
              </p>
            </div>
            {canManageMembers && (
              <Button
                size="sm"
                variant="outline"
                className="neumorph-btn h-8 text-xs font-semibold text-slate-700 gap-1.5"
                onClick={() => setAddMemberOpen(true)}
              >
                <UserPlus className="h-3.5 w-3.5 text-slate-500" />
                Add Member
              </Button>
            )}
          </div>

          <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
            {memberBreakdown.map((member) => (
              <div
                key={member.userEmail}
                className="neumorph-inset p-3.5 rounded-2xl flex flex-col gap-2.5 transition-all hover:bg-slate-100/60"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <ProjectAvatar
                      imageUrl={member.profileImageUrl}
                      label={member.userName}
                      className="h-10 w-10 border border-white shadow-xs shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate font-bold text-slate-800 text-sm">{member.userName}</p>
                        <Badge variant="outline" className="text-[10px] uppercase tracking-wider py-0 px-1.5 border-slate-200 text-slate-500 font-medium">
                          {member.userRole}
                        </Badge>
                      </div>
                      <p className="truncate text-xs text-slate-500 mt-0.5">
                        {member.projectNote || member.userEmail}
                      </p>
                    </div>
                  </div>

                  {canManageMembers && projectDetail.members.length > 1 && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg shrink-0"
                      title={`Remove ${member.userName}`}
                      onClick={() => handleRemoveMember(member.userEmail, member.userName)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>

                {/* Sub-breakdown of tasks & tagged items */}
                <div className="flex items-center gap-4 text-xs text-slate-500 pt-1 border-t border-slate-200/60">
                  <span className="flex items-center gap-1">
                    <Package className="h-3 w-3 text-slate-400" />
                    <span className="font-semibold text-slate-700">{member.itemsCount}</span> tagged items
                  </span>
                  <span className="flex items-center gap-1">
                    <CheckSquare className="h-3 w-3 text-slate-400" />
                    <span className="font-semibold text-slate-700">{member.responsesCount}</span> checkpoint entries
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Visual Timeline of Events & Milestones */}
        <div className="neumorph-card p-6 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div>
              <h3 className="text-sm uppercase tracking-[0.2em] text-slate-400 font-bold">
                Milestone & Event Timeline
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Audit log of all major project actions
              </p>
            </div>
            <div className="h-7 w-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
              <Activity className="h-3.5 w-3.5" />
            </div>
          </div>

          <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
            {!historyData ? (
              <div className="p-8 text-center text-sm text-slate-400 animate-pulse">
                Loading event timeline...
              </div>
            ) : historyData.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-400 italic">
                No events recorded yet.
              </div>
            ) : (
              historyData.map((entry) => {
                const config = HISTORY_ACTION_LABELS[entry.action] || {
                  label: entry.action.replace(/_/g, " "),
                  color: "slate",
                };

                return (
                  <div
                    key={entry.historyId}
                    onClick={() => setSelectedHistoryEntry(entry)}
                    className="neumorph-inset p-3 rounded-2xl flex items-start gap-3.5 cursor-pointer hover:bg-slate-100/80 transition-all"
                  >
                    <div className="h-8 w-8 rounded-full bg-white border border-slate-200/80 flex items-center justify-center text-slate-700 shadow-xs shrink-0 mt-0.5">
                      <HistoryActionIcon action={entry.action} className="h-4 w-4" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-bold text-slate-800 truncate">{config.label}</p>
                        <span className="text-[10px] text-slate-400 shrink-0 font-medium">
                          {formatDateOnly(entry.createdAt)}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        By <span className="font-semibold text-slate-700">{entry.actorName}</span>
                      </p>
                    </div>

                    <ChevronRight className="h-3.5 w-3.5 text-slate-400 shrink-0 self-center opacity-60" />
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* ── Dialogs: Add Member, Progress Updater & History Detail ── */}
      <AddMemberDialog
        open={addMemberOpen}
        onOpenChange={setAddMemberOpen}
        projectId={projectDetail.projectId}
        userEmail={userEmail}
        currentMemberEmails={projectDetail.members.map((m) => m.userEmail)}
      />

      {/* Update Progress Dialog */}
      <Dialog open={progressDialogOpen} onOpenChange={setProgressDialogOpen}>
        <DialogContent className="neumorph-card sm:max-w-md bg-white border-slate-200">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Sliders className="h-5 w-5 text-indigo-600" />
              Update Project Status
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <p className="text-xs text-slate-500">
              Set the project lifecycle stage to reflect current execution progress.
            </p>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Lifecycle Stage
              </label>
              <Select value={selectedStatus} onValueChange={(val) => setSelectedStatus(val as ProjectStatus)}>
                <SelectTrigger className="border-slate-200 bg-slate-50 rounded-xl">
                  <SelectValue placeholder="Select Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DRAFT">Draft (Setup Phase)</SelectItem>
                  <SelectItem value="ACTIVE">Active (Timeline & Tasks Unlocked)</SelectItem>
                  <SelectItem value="COMPLETED">Completed (Finished)</SelectItem>
                  <SelectItem value="ARCHIVED">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setProgressDialogOpen(false)} className="rounded-xl border-slate-200">
              Cancel
            </Button>
            <Button onClick={handleUpdateStatus} className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl">
              Save Status
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Event Detail Modal */}
      <Dialog open={!!selectedHistoryEntry} onOpenChange={(open) => { if (!open) setSelectedHistoryEntry(null); }}>
        <DialogContent className="neumorph-card sm:max-w-lg bg-white border-slate-200">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <History className="h-5 w-5 text-indigo-600" />
              Event Details
            </DialogTitle>
          </DialogHeader>

          {selectedHistoryEntry && (
            <div className="space-y-4 py-2">
              <div className="neumorph-inset p-4 rounded-2xl flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-800">
                  <HistoryActionIcon action={selectedHistoryEntry.action} className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900">
                    {HISTORY_ACTION_LABELS[selectedHistoryEntry.action]?.label || selectedHistoryEntry.action}
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {formatDateTime(selectedHistoryEntry.createdAt)}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-slate-400 font-semibold uppercase tracking-wider block text-[10px]">
                    Actor
                  </span>
                  <span className="font-bold text-slate-800 mt-1 block">
                    {selectedHistoryEntry.actorName}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-slate-400 font-semibold uppercase tracking-wider block text-[10px]">
                    Email
                  </span>
                  <span className="font-medium text-slate-700 mt-1 block truncate">
                    {selectedHistoryEntry.actorEmail}
                  </span>
                </div>
              </div>

              {selectedHistoryEntry.details && (
                <div className="space-y-1.5">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                    Payload Details
                  </span>
                  <div className="neumorph-inset p-3 rounded-xl overflow-x-auto text-xs font-mono text-slate-700 max-h-40">
                    {selectedHistoryEntry.details}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
