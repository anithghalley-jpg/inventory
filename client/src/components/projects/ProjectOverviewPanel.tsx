import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  formatDateOnly,
  formatDateTime,
  getProjectProgress,
  getStatusBadgeClass,
  normalizeImageUrl,
  ProjectAvatar,
  type ProjectDetailRecord,
} from "./projectShared";
import { CalendarDays, CheckCircle2, Package, Users, MessageSquare, Heart, Clock } from "lucide-react";

export default function ProjectOverviewPanel({
  projectDetail,
  userEmail,
}: {
  projectDetail: ProjectDetailRecord;
  userEmail: string;
}) {
  const progress = getProjectProgress(projectDetail.status);
  
  const daysActive = useMemo(() => {
    const start = new Date(projectDetail.createdAt).getTime();
    const end = projectDetail.status === "COMPLETED" 
      ? new Date(projectDetail.updatedAt).getTime() 
      : Date.now();
    return Math.max(1, Math.round((end - start) / (1000 * 60 * 60 * 24)));
  }, [projectDetail.createdAt, projectDetail.updatedAt, projectDetail.status]);

  const timelineStats = useMemo(() => {
    const posts = projectDetail.timeline.filter(t => t.itemType === "post");
    const checkpoints = projectDetail.timeline.filter(t => t.itemType === "checkpoint");
    return {
      postsCount: posts.length,
      checkpointsCount: checkpoints.length
    };
  }, [projectDetail.timeline]);

  const recentTimeline = [...projectDetail.timeline]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Top Stats & Progress row */}
      <div className="grid gap-6 md:grid-cols-[1fr_300px]">
        {/* Quick Stats */}
        <Card className="card-soft overflow-hidden p-6 flex flex-col justify-center">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 divide-x divide-slate-100">
            <div className="flex flex-col items-center justify-center text-center p-2">
              <Users className="h-6 w-6 text-slate-400 mb-2" />
              <span className="text-2xl font-black text-slate-800">{projectDetail.members.length}</span>
              <span className="text-[0.65rem] uppercase tracking-[0.1em] text-slate-400 font-semibold mt-1">Members</span>
            </div>
            <div className="flex flex-col items-center justify-center text-center p-2">
              <MessageSquare className="h-6 w-6 text-slate-400 mb-2" />
              <span className="text-2xl font-black text-slate-800">{timelineStats.postsCount}</span>
              <span className="text-[0.65rem] uppercase tracking-[0.1em] text-slate-400 font-semibold mt-1">Posts</span>
            </div>
            <div className="flex flex-col items-center justify-center text-center p-2">
              <Package className="h-6 w-6 text-slate-400 mb-2" />
              <span className="text-2xl font-black text-slate-800">{projectDetail.items.length}</span>
              <span className="text-[0.65rem] uppercase tracking-[0.1em] text-slate-400 font-semibold mt-1">Items</span>
            </div>
            <div className="flex flex-col items-center justify-center text-center p-2">
              <Clock className="h-6 w-6 text-slate-400 mb-2" />
              <span className="text-2xl font-black text-slate-800">{daysActive}</span>
              <span className="text-[0.65rem] uppercase tracking-[0.1em] text-slate-400 font-semibold mt-1">Days</span>
            </div>
          </div>
        </Card>

        {/* Progress Ring */}
        <Card className="card-soft p-6 flex flex-col items-center justify-center">
          <div className="relative flex items-center justify-center">
            <svg width="120" height="120" className="project-progress-ring">
              <circle
                cx="60"
                cy="60"
                r="52"
                fill="transparent"
                strokeWidth="12"
                className="project-progress-ring-bg"
              />
              <circle
                cx="60"
                cy="60"
                r="52"
                fill="transparent"
                strokeWidth="12"
                strokeDasharray="326.72"
                strokeDashoffset={326.72 - (326.72 * progress.percent)}
                className="project-progress-ring-circle project-progress-ring-fill"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-2xl font-black text-slate-800">{Math.round(progress.percent * 100)}%</span>
            </div>
          </div>
          <span className="text-[0.65rem] uppercase tracking-[0.15em] text-slate-400 font-semibold mt-4">Completion</span>
        </Card>
      </div>

      {/* Stage Cards Grid */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className={`project-stage-card ${progress.step >= 1 ? 'completed' : progress.step >= 0.5 ? 'pending' : 'active'}`}>
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-display font-bold text-slate-800">1. Team Setup</h3>
            <Badge variant="outline" className={progress.step >= 1 ? 'bg-emerald-100 text-emerald-800' : progress.step >= 0.5 ? 'bg-amber-100 text-amber-800' : ''}>
              {progress.step >= 1 ? 'Approved' : progress.step >= 0.5 ? 'Pending' : 'In Progress'}
            </Badge>
          </div>
          <div className="space-y-1 text-sm text-slate-500">
            {projectDetail.setupSubmittedAt && <p>Submitted: {formatDateOnly(projectDetail.setupSubmittedAt)}</p>}
            {projectDetail.setupApprovedAt && <p>Approved: {formatDateOnly(projectDetail.setupApprovedAt)}</p>}
            {!projectDetail.setupSubmittedAt && <p>Waiting for team to setup profiles</p>}
          </div>
        </div>

        <div className={`project-stage-card ${progress.step >= 2 ? 'completed' : progress.step >= 1.5 ? 'pending' : progress.step >= 1 ? 'active' : 'locked'}`}>
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-display font-bold text-slate-800">2. Project Box</h3>
            <Badge variant="outline" className={progress.step >= 2 ? 'bg-emerald-100 text-emerald-800' : progress.step >= 1.5 ? 'bg-amber-100 text-amber-800' : ''}>
              {progress.step >= 2 ? 'Approved' : progress.step >= 1.5 ? 'Pending' : progress.step >= 1 ? 'In Progress' : 'Locked'}
            </Badge>
          </div>
          <div className="space-y-1 text-sm text-slate-500">
            {projectDetail.boxSubmittedAt && <p>Submitted: {formatDateOnly(projectDetail.boxSubmittedAt)}</p>}
            {projectDetail.boxApprovedAt && <p>Approved: {formatDateOnly(projectDetail.boxApprovedAt)}</p>}
            {progress.step >= 1 && !projectDetail.boxSubmittedAt && <p>Waiting for box submission</p>}
          </div>
        </div>

        <div className={`project-stage-card ${progress.step >= 3 ? 'completed' : progress.step >= 2.5 ? 'pending' : progress.step >= 2 ? 'active' : 'locked'}`}>
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-display font-bold text-slate-800">3. Planning</h3>
            <Badge variant="outline" className={progress.step >= 3 ? 'bg-emerald-100 text-emerald-800' : progress.step >= 2.5 ? 'bg-amber-100 text-amber-800' : ''}>
              {progress.step >= 3 ? 'Approved' : progress.step >= 2.5 ? 'Pending' : progress.step >= 2 ? 'In Progress' : 'Locked'}
            </Badge>
          </div>
          <div className="space-y-1 text-sm text-slate-500">
            {projectDetail.planSubmittedAt && <p>Submitted: {formatDateOnly(projectDetail.planSubmittedAt)}</p>}
            {projectDetail.planApprovedAt && <p>Approved: {formatDateOnly(projectDetail.planApprovedAt)}</p>}
            {progress.step >= 2 && !projectDetail.planSubmittedAt && <p>Waiting for plan submission</p>}
          </div>
        </div>

        <div className={`project-stage-card ${progress.step >= 4 ? 'completed' : progress.step >= 3 ? 'active' : 'locked'}`}>
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-display font-bold text-slate-800">4. Active Building</h3>
            <Badge variant="outline" className={progress.step >= 4 ? 'bg-emerald-100 text-emerald-800' : ''}>
              {progress.step >= 4 ? 'Completed' : progress.step >= 3 ? 'In Progress' : 'Locked'}
            </Badge>
          </div>
          <div className="space-y-1 text-sm text-slate-500">
            {projectDetail.planApprovedAt && <p>Started: {formatDateOnly(projectDetail.planApprovedAt)}</p>}
            {projectDetail.status === "COMPLETED" && <p>Finished: {formatDateOnly(projectDetail.updatedAt)}</p>}
            {progress.step >= 3 && projectDetail.status !== "COMPLETED" && <p>Currently building</p>}
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Team Members */}
        <Card className="card-soft p-6">
          <h3 className="text-sm uppercase tracking-[0.22em] text-slate-400 font-bold mb-4">Project Team</h3>
          <div className="space-y-4">
            {projectDetail.members.map(member => (
              <div key={member.userEmail} className="flex items-center gap-3">
                <ProjectAvatar imageUrl={member.profileImageUrl} label={member.userName} className="h-10 w-10" />
                <div>
                  <p className="font-semibold text-slate-800 text-sm">{member.userName}</p>
                  <p className="text-xs text-slate-500">{member.userRole}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Recent Activity */}
        <Card className="card-soft p-6">
          <h3 className="text-sm uppercase tracking-[0.22em] text-slate-400 font-bold mb-4">Recent Activity</h3>
          <div className="space-y-4">
            {recentTimeline.length > 0 ? recentTimeline.map(item => (
              <div key={item.id} className="flex gap-3 text-sm">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-2 shrink-0" />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-800">
                      {item.itemType === 'post' ? item.authorName : item.itemType === 'checkpoint' ? item.createdByName : 'System'}
                    </span>
                    <span className="text-xs text-slate-400">{formatDateOnly(item.createdAt)}</span>
                  </div>
                  <p className="text-slate-600 line-clamp-2 mt-0.5">
                    {item.itemType === 'post' ? item.body : item.title}
                  </p>
                </div>
              </div>
            )) : (
              <p className="text-sm text-slate-500 text-center py-4">No recent activity</p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
