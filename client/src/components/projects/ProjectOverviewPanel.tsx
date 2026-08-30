import { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { toast } from "sonner";
import {
  formatDateOnly,
  formatDateTime,
  getProjectProgress,
  getStatusBadgeClass,
  normalizeImageUrl,
  ProjectAvatar,
  type ProjectDetailRecord,
  AddMemberDialog,
} from "./projectShared";
import { CalendarDays, CheckCircle2, Package, Users, MessageSquare, Heart, Clock, UserPlus, Trash2 } from "lucide-react";


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
                className="project-progress-ring-circle project-progress-ring-fill"
                style={{
                  strokeDasharray: "326.72",
                  strokeDashoffset: `${326.72 - (326.72 * (progress.percent / 100))}`,
                }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-2xl font-black text-slate-800">{progress.percent}%</span>
            </div>
          </div>
          <span className="text-[0.65rem] uppercase tracking-[0.15em] text-slate-400 font-semibold mt-4">Completion</span>
        </Card>
      </div>

      {/* Stage Overview & Identity */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="card-soft p-6 md:col-span-2">
          <h3 className="text-sm uppercase tracking-[0.22em] text-slate-400 font-bold mb-4">
            Project Status & Identity
          </h3>
          <div className="flex flex-col sm:flex-row gap-6 items-start">
            {projectDetail.teamImageUrl && (
              <img
                src={normalizeImageUrl(projectDetail.teamImageUrl)}
                alt={projectDetail.name}
                className="w-full sm:w-48 h-32 object-cover rounded-2xl border border-slate-200"
              />
            )}
            <div className="space-y-3 flex-1">
              <div>
                <h4 className="text-xl font-bold text-slate-800">{projectDetail.name}</h4>
                <p className="text-sm text-slate-500 mt-1">Created on {formatDateTime(projectDetail.createdAt)}</p>
              </div>
              <div className="flex flex-wrap gap-2 pt-2">
                <Badge className={getStatusBadgeClass(projectDetail.status)}>{projectDetail.status}</Badge>
                {projectDetail.status === "COMPLETED" && (
                  <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">
                    Finished {formatDateOnly(projectDetail.updatedAt)}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </Card>

        <Card className="card-soft p-6 flex flex-col justify-between">
          <div>
            <h3 className="text-sm uppercase tracking-[0.22em] text-slate-400 font-bold mb-4">
              Workflow Status
            </h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm font-medium mb-1">
                  <span className="text-slate-600">Progress</span>
                  <span className="text-slate-900 font-bold">{progress.percent}%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="bg-indigo-600 h-2.5 rounded-full transition-all duration-500"
                    style={{ width: `${progress.percent}%` }}
                  />
                </div>
              </div>
              <p className="text-xs text-slate-500 font-medium">Status: {projectDetail.status}</p>
            </div>

          </div>
          <div className="pt-4 border-t border-slate-100 text-xs text-slate-400">
            {projectDetail.status === "ACTIVE" && <p>Project is active: timeline & checkpoints unlocked</p>}
            {projectDetail.status === "DRAFT" && <p>Team setup in progress</p>}
            {projectDetail.status === "SETUP_PENDING" && <p>Team setup pending admin review</p>}
            {projectDetail.status === "COMPLETED" && <p>Project completed</p>}
          </div>
        </Card>
      </div>

      {/* Team Members & Recent Activity */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Team Members Card */}
        <Card className="card-soft p-6">
          <div className="flex items-center justify-between gap-2 mb-4">
            <h3 className="text-sm uppercase tracking-[0.22em] text-slate-400 font-bold">
              Project Team ({projectDetail.members.length})
            </h3>
            <Button
              size="sm"
              variant="outline"
              className="border-slate-200 text-xs rounded-lg gap-1.5 h-8"
              onClick={() => setAddMemberOpen(true)}
            >
              <UserPlus className="h-3.5 w-3.5" />
              Add Member
            </Button>
          </div>

          <div className="space-y-3">
            {projectDetail.members.map((member) => (
              <div
                key={member.userEmail}
                className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/50 p-2.5"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <ProjectAvatar imageUrl={member.profileImageUrl} label={member.userName} className="h-9 w-9" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-slate-800 text-sm">{member.userName}</p>
                    <p className="truncate text-xs text-slate-500">{member.projectNote || member.userRole}</p>
                  </div>
                </div>

                {projectDetail.members.length > 1 && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                    title={`Remove ${member.userName} from project`}
                    onClick={() => handleRemoveMember(member.userEmail, member.userName)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </Card>

        {/* Recent Activity Card */}
        <Card className="card-soft p-6">
          <h3 className="text-sm uppercase tracking-[0.22em] text-slate-400 font-bold mb-4">
            Recent Activity
          </h3>
          <div className="space-y-4">
            {recentTimeline.length > 0 ? (
              recentTimeline.map((item) => (
                <div key={item.id} className="flex gap-3 text-sm">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-2 shrink-0" />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-800">
                        {item.itemType === "post"
                          ? item.authorName
                          : item.itemType === "checkpoint"
                          ? item.createdByName
                          : "System"}
                      </span>
                      <span className="text-xs text-slate-400">{formatDateOnly(item.createdAt)}</span>
                    </div>
                    <p className="text-slate-600 line-clamp-2 mt-0.5">
                      {item.itemType === "post" ? item.body : item.title}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500 text-center py-4">No recent activity</p>
            )}
          </div>
        </Card>
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

