import React, { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import ProjectBannerModal from "./ProjectBannerModal";
import {
  formatDateOnly,
  getStatusBadgeClass,
  getStatusLabel,
  normalizeImageUrl,
  extractBannerOverlayOpacity,
  ProjectAvatar,
  GoogleDriveIcon,
  type ProjectStatus,
  type ProjectCardMember,
  type ProjectDetailRecord,
} from "./projectShared";
import {
  Calendar,
  Clock,
  FileText,
  Package,
  ChevronDown,
  Edit3,
} from "lucide-react";

interface ProjectHeroBannerProps {
  projectDetail: {
    projectId: string;
    name: string;
    status: ProjectStatus;
    createdAt: string;
    updatedAt: string;
    teamImageUrl?: string;
    boxImageUrl?: string;
    driveFolderId?: string;
    driveFolderUrl?: string;
    members: ProjectCardMember[];
    items?: {
      requestId: string;
      itemName: string;
      quantity: number;
      userEmail: string;
      taggedAt?: string;
    }[];
    timeline?: { itemType: string }[];
    permissions?: {
      isMember?: boolean;
    };
    viewerIsMember?: boolean;
  };
  userEmail: string;
  isMember?: boolean;
}

export default function ProjectHeroBanner({
  projectDetail,
  userEmail,
  isMember = false,
}: ProjectHeroBannerProps) {
  const [bannerModalOpen, setBannerModalOpen] = useState(false);
  const [showBomDrawer, setShowBomDrawer] = useState(false);

  // Check if current user is an authorized team member
  const isTeamMember =
    isMember ||
    Boolean(projectDetail.permissions?.isMember) ||
    Boolean(projectDetail.viewerIsMember) ||
    Boolean(
      projectDetail.members?.some(
        (m) => m.userEmail?.toLowerCase() === userEmail?.toLowerCase()
      )
    );

  // Calculate project duration and post stats
  const projectStats = useMemo(() => {
    const start = new Date(projectDetail.createdAt).getTime();
    const end = projectDetail.status === "COMPLETED"
      ? new Date(projectDetail.updatedAt).getTime()
      : Date.now();
    const days = Math.max(1, Math.round((end - start) / (1000 * 60 * 60 * 24)));

    let totalPosts = 0;
    (projectDetail.timeline || []).forEach((t) => {
      if (t.itemType === "post") {
        totalPosts++;
      }
    });

    return {
      start: formatDateOnly(projectDetail.createdAt),
      end: projectDetail.status === "COMPLETED" ? formatDateOnly(projectDetail.updatedAt) : "Present",
      days,
      totalPosts,
    };
  }, [projectDetail]);

  const coverImage = projectDetail.teamImageUrl || projectDetail.boxImageUrl || "";
  const overlayOpacity = extractBannerOverlayOpacity(coverImage);

  return (
    <>
      <div className="relative overflow-hidden rounded-3xl text-white p-6 sm:p-8 shadow-xl border border-slate-800 print:bg-white print:text-slate-900 print:border-slate-300 print:p-4 min-h-[220px] flex flex-col justify-between">
        {coverImage ? (
          <>
            <div
              className="absolute inset-0 bg-cover bg-center transition-transform duration-700 hover:scale-105"
              style={{ backgroundImage: `url(${normalizeImageUrl(coverImage)})` }}
            />
            <div
              className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/80 to-slate-950/60 transition-opacity duration-300"
              style={{ opacity: overlayOpacity / 100 }}
            />
          </>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950" />
        )}

        {/* Decorative glow */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-20 w-60 h-60 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />

        {/* ── Top-Right Corner Action Controls (Strictly for Authorized Team Members Only) ── */}
        {isTeamMember && (
          <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-20 flex items-center gap-2 print:hidden">
            {projectDetail.driveFolderUrl && (
              <a
                href={projectDetail.driveFolderUrl}
                target="_blank"
                rel="noreferrer"
                title="Open Project Google Drive Folder"
                className="h-9 w-9 rounded-2xl bg-white/15 hover:bg-white/25 border border-white/20 hover:border-white/40 flex items-center justify-center transition-all backdrop-blur-md shadow-md cursor-pointer hover:scale-105"
              >
                <GoogleDriveIcon className="h-4.5 w-4.5" />
              </a>
            )}

            <button
              type="button"
              onClick={() => setBannerModalOpen(true)}
              title="Change Banner Background Image"
              className="h-9 w-9 rounded-2xl bg-white/15 hover:bg-white/25 border border-white/20 hover:border-white/40 text-white flex items-center justify-center transition-all backdrop-blur-md shadow-md cursor-pointer hover:scale-105"
            >
              <Edit3 className="h-4 w-4 text-white" />
            </button>
          </div>
        )}

        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          {/* Project Title & Badges */}
          <div className="space-y-3 max-w-2xl min-w-0 pr-0 sm:pr-20 lg:pr-0">
            {/* Title with Status Badge right after it */}
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-white print:text-slate-900 drop-shadow-sm">
                {projectDetail.name}
              </h1>
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border shadow-xs ${getStatusBadgeClass(projectDetail.status)}`}>
                <span className="h-2 w-2 rounded-full bg-current animate-pulse" />
                <span>{getStatusLabel(projectDetail.status)}</span>
              </span>
            </div>

            {/* Time & Duration stats */}
            <div className="flex items-center gap-3 sm:gap-4 flex-wrap text-xs text-slate-300 print:text-slate-600 font-medium">
              <div className="flex items-center gap-1.5 bg-white/5 px-2.5 py-1 rounded-xl border border-white/10">
                <Calendar className="h-3.5 w-3.5 text-emerald-400" />
                <span>{projectStats.start} → {projectStats.end}</span>
              </div>
              <div className="flex items-center gap-1.5 bg-white/5 px-2.5 py-1 rounded-xl border border-white/10">
                <Clock className="h-3.5 w-3.5 text-indigo-400" />
                <span>{projectStats.days} Development Day{projectStats.days === 1 ? "" : "s"}</span>
              </div>
              <div className="flex items-center gap-1.5 bg-white/5 px-2.5 py-1 rounded-xl border border-white/10">
                <FileText className="h-3.5 w-3.5 text-cyan-400" />
                <span>{projectStats.totalPosts} Journal Updates</span>
              </div>
            </div>

            {/* Team Roster Avatars Row */}
            <div className="pt-2 flex items-center gap-3 flex-wrap">
              <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Team:</span>
              <div className="flex items-center -space-x-2">
                {projectDetail.members.map((m) => (
                  <div key={m.userEmail} title={`${m.userName} (${m.userRole})`} className="relative group">
                    <ProjectAvatar
                      imageUrl={m.profileImageUrl}
                      label={m.userName}
                      seed={m.userEmail}
                      className="h-8 w-8 rounded-full border-2 border-slate-900 text-white text-xs font-bold shadow"
                    />
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-1.5 flex-wrap text-xs text-slate-300">
                {projectDetail.members.map((m, i) => (
                  <span key={m.userEmail} className="inline-flex items-center gap-1 font-medium">
                    <span className="text-white font-bold">{m.userName}</span>
                    <span className="text-slate-400 text-[10px]">({m.userRole})</span>
                    {i < projectDetail.members.length - 1 && <span className="text-slate-600">•</span>}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Quick Actions: BOM Summary Drawer Toggle */}
          <div className="flex flex-col sm:flex-row lg:flex-col items-start lg:items-end gap-2.5 w-full lg:w-auto shrink-0 print:hidden">
            {projectDetail.items && projectDetail.items.length > 0 && (
              <button
                type="button"
                onClick={() => setShowBomDrawer(!showBomDrawer)}
                className="w-full sm:w-auto inline-flex items-center justify-between sm:justify-start gap-2.5 px-4 py-2 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/10 text-xs font-bold text-slate-200 transition-all cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-amber-400" />
                  <span>{projectDetail.items.length} Hardware Component{projectDetail.items.length === 1 ? "" : "s"} Tagged</span>
                </div>
                <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showBomDrawer ? "rotate-180 text-amber-400" : "text-slate-400"}`} />
              </button>
            )}
          </div>
        </div>

        {/* Expandable Bill of Materials Drawer */}
        {showBomDrawer && projectDetail.items && projectDetail.items.length > 0 && (
          <div className="mt-6 pt-6 border-t border-white/10 animate-in slide-in-from-top-3 duration-200 relative z-10">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-amber-300 flex items-center gap-2">
                <Package className="h-3.5 w-3.5" />
                Bill of Materials & Tagged Hardware Inventory
              </h4>
              <span className="text-[11px] text-slate-400">Total: {projectDetail.items.reduce((acc, it) => acc + it.quantity, 0)} Units</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
              {projectDetail.items.map((item) => (
                <div
                  key={item.requestId}
                  className="p-3 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="min-w-0">
                    <p className="font-bold text-white truncate">{item.itemName}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5 truncate">Tagged by {item.userEmail}</p>
                  </div>
                  <Badge className="bg-amber-400/20 border-amber-400/40 text-amber-300 font-mono font-bold shrink-0">
                    Qty: {item.quantity}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Google Drive Banner Background Customization Modal (Only opens if team member) */}
      {isTeamMember && (
        <ProjectBannerModal
          open={bannerModalOpen}
          onOpenChange={setBannerModalOpen}
          projectId={projectDetail.projectId}
          userEmail={userEmail}
          projectName={projectDetail.name}
          currentBannerUrl={coverImage}
          driveFolderId={projectDetail.driveFolderId}
          driveFolderUrl={projectDetail.driveFolderUrl}
        />
      )}
    </>
  );
}
