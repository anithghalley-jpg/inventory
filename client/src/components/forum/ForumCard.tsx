import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Calendar,
  Clock,
  MapPin,
  FileText,
  ExternalLink,
  Crown,
  FileEdit,
  Timer,
  HelpCircle,
  Cpu,
  Compass,
  Telescope,
  Sparkles,
  Folder,
  Image as ImageIcon,
  MoreVertical,
  Trash2,
  Edit2,
  CheckCircle2,
  Play,
  UploadCloud,
  Check,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export interface ForumCardProps {
  forum: {
    forumId: string;
    title: string;
    edition: number;
    editionLabel?: string;
    date: string;
    time?: string;
    location?: string;
    description?: string;
    agenda?: string;
    departments?: string[];
    roles: {
      chairperson: { name: string; email?: string; department?: string };
      noteTaker: { name: string; email?: string; department?: string };
      timeKeeper: { name: string; email?: string; department?: string };
      questionMaster: { name: string; email?: string; department?: string };
    };
    status: 'UPCOMING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
    minutesPdfUrl?: string;
    minutesPdfName?: string;
    coverImageUrl?: string;
    eventPhotos?: string[];
    driveFolderName?: string;
    driveFolderId?: string;
    driveFolderUrl?: string;
    keyTakeaways?: string;
    completedAt?: number;
  };
  onViewMinutes: (forum: any) => void;
  onUpdateMedia?: (forum: any) => void;
  onStartSession?: (forumId: string) => void;
  onMarkComplete?: (forum: any) => void;
  onEdit?: (forum: any) => void;
  onDelete?: (forumId: string) => void;
  onOpenPhotos?: (photos: string[], title: string) => void;
  canManage?: boolean;
}

export default function ForumCard({
  forum,
  onViewMinutes,
  onUpdateMedia,
  onStartSession,
  onMarkComplete,
  onEdit,
  onDelete,
  onOpenPhotos,
  canManage = false,
}: ForumCardProps) {
  const isCompleted = forum.status === 'COMPLETED';
  const isInProgress = forum.status === 'IN_PROGRESS';
  const isUpcoming = forum.status === 'UPCOMING';

  const coverImage = forum.coverImageUrl || (forum.eventPhotos && forum.eventPhotos[0]) || '';
  const photosCount = forum.eventPhotos?.length || 0;

  // Default Drive URL if folder ID exists or direct URL
  const driveUrl =
    forum.driveFolderUrl ||
    (forum.driveFolderId ? `https://drive.google.com/drive/folders/${forum.driveFolderId}` : null);

  const getDeptIcon = (dept: string) => {
    switch (dept) {
      case 'Technology':
        return <Cpu className="w-3 h-3 text-cyan-500" />;
      case 'FabLab':
        return <Compass className="w-3 h-3 text-amber-500" />;
      case 'Astronomy':
        return <Telescope className="w-3 h-3 text-indigo-500" />;
      default:
        return <Sparkles className="w-3 h-3 text-emerald-500" />;
    }
  };

  return (
    <Card
      className={`overflow-hidden border bg-card hover:shadow-xl transition-all duration-200 flex flex-col group rounded-2xl ${
        isInProgress
          ? 'border-rose-500/50 shadow-md ring-1 ring-rose-500/20'
          : isCompleted
          ? 'border-border/80 hover:border-emerald-500/40'
          : 'border-border/80 hover:border-sky-500/40'
      }`}
    >
      {/* Top Banner / Cover Photo */}
      <div className="relative h-44 w-full bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 overflow-hidden">
        {coverImage ? (
          <img
            src={coverImage}
            alt={forum.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center text-white/70">
            <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-md mb-2">
              <Sparkles className="w-7 h-7 text-emerald-400" />
            </div>
            <span className="text-xs font-semibold uppercase tracking-widest text-emerald-300/90">
              Forum Edition #{forum.edition}
            </span>
          </div>
        )}

        {/* Gradient Overlay for Text Readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/20" />

        {/* Edition & Status Badges */}
        <div className="absolute top-3 left-3 flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-black/60 text-white border border-white/20 shadow-lg backdrop-blur-md">
            {forum.editionLabel || `Edition #${forum.edition}`}
          </span>

          {isInProgress && (
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-500 text-white shadow-sm flex items-center gap-1.5 animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
              Live In-Progress
            </span>
          )}

          {isCompleted && (
            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-600 text-white shadow-sm flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              Completed
            </span>
          )}

          {isUpcoming && (
            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-sky-600/90 text-white shadow-sm flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Scheduled
            </span>
          )}
        </div>

        {/* Admin Menu / Photos Badge */}
        <div className="absolute top-3 right-3 flex items-center gap-2">
          {photosCount > 0 && onOpenPhotos && (
            <button
              type="button"
              onClick={() => onOpenPhotos(forum.eventPhotos || [], forum.title)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-black/60 hover:bg-black/80 text-white backdrop-blur-md transition-colors"
            >
              <ImageIcon className="w-3.5 h-3.5 text-emerald-400" />
              <span>{photosCount} photos</span>
            </button>
          )}

          {canManage && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 rounded-full bg-black/60 hover:bg-black/80 text-white shadow"
                >
                  <MoreVertical className="w-3.5 h-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                {onUpdateMedia && (
                  <DropdownMenuItem onClick={() => onUpdateMedia(forum)} className="text-xs gap-2">
                    <UploadCloud className="w-3.5 h-3.5 text-sky-500" />
                    Media & Minutes
                  </DropdownMenuItem>
                )}

                {onEdit && (
                  <DropdownMenuItem onClick={() => onEdit(forum)} className="text-xs gap-2">
                    <Edit2 className="w-3.5 h-3.5 text-amber-500" />
                    Edit Details
                  </DropdownMenuItem>
                )}

                {isUpcoming && onStartSession && (
                  <DropdownMenuItem
                    onClick={() => onStartSession(forum.forumId)}
                    className="text-xs gap-2 text-rose-600 dark:text-rose-400"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    Start Session
                  </DropdownMenuItem>
                )}

                {!isCompleted && onMarkComplete && (
                  <DropdownMenuItem
                    onClick={() => onMarkComplete(forum)}
                    className="text-xs gap-2 text-emerald-600 dark:text-emerald-400"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Mark Completed
                  </DropdownMenuItem>
                )}

                {onDelete && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => onDelete(forum.forumId)}
                      className="text-xs gap-2 text-destructive focus:text-destructive"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Delete Forum
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Title over image */}
        <div className="absolute bottom-3 left-3 right-3">
          <h3 className="text-base font-bold text-white line-clamp-1 drop-shadow-md">
            {forum.title}
          </h3>
          <div className="flex flex-wrap items-center gap-3 text-white/85 text-xs mt-1">
            <span className="flex items-center gap-1 font-medium">
              <Calendar className="w-3.5 h-3.5 text-emerald-400" />
              {forum.date}
            </span>
            {forum.time && (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-sky-400" />
                {forum.time}
              </span>
            )}
            {forum.location && (
              <span className="flex items-center gap-1 truncate max-w-[140px]">
                <MapPin className="w-3 h-3 text-rose-400" />
                {forum.location}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Card Body */}
      <div className="p-4 flex-1 flex flex-col justify-between space-y-3.5">
        {/* Status Indicators Pill Row */}
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            {forum.minutesPdfUrl ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <FileText className="w-3 h-3" />
                Minutes Attached
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-muted text-muted-foreground border border-border">
                No Minutes Yet
              </span>
            )}

            {photosCount > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
                <ImageIcon className="w-3 h-3" />
                {photosCount} Photos
              </span>
            )}
          </div>

          {driveUrl && (
            <a
              href={driveUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1"
              title="Open Google Drive folder"
            >
              <Folder className="w-3 h-3 text-sky-500" />
              Drive
            </a>
          )}
        </div>

        {/* Key Takeaways or Agenda Preview */}
        {forum.keyTakeaways ? (
          <div className="p-2.5 rounded-xl bg-muted/40 border border-border/60 text-xs text-foreground/90 space-y-1">
            <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              <Sparkles className="w-3 h-3" />
              Key Takeaways
            </div>
            <p className="line-clamp-2 leading-relaxed text-muted-foreground text-[11px]">
              {forum.keyTakeaways}
            </p>
          </div>
        ) : forum.agenda ? (
          <div className="p-2.5 rounded-xl bg-muted/30 border border-border/60 text-xs text-foreground/90 space-y-1">
            <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              <FileText className="w-3 h-3 text-sky-500" />
              Agenda
            </div>
            <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
              {forum.agenda}
            </p>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground italic">
            Collaborative student presentations & discussions.
          </p>
        )}

        {/* Assigned Student Roles */}
        <div className="pt-2 border-t border-border/60 space-y-1">
          <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Student Officers
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center gap-1.5 truncate">
              <Crown className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span className="text-muted-foreground text-[11px]">Chair:</span>
              <span className="font-semibold text-foreground truncate text-[11px]">
                {forum.roles?.chairperson?.name || 'TBD'}
              </span>
            </div>
            <div className="flex items-center gap-1.5 truncate">
              <FileEdit className="w-3.5 h-3.5 text-sky-500 shrink-0" />
              <span className="text-muted-foreground text-[11px]">Notes:</span>
              <span className="font-semibold text-foreground truncate text-[11px]">
                {forum.roles?.noteTaker?.name || 'TBD'}
              </span>
            </div>
            <div className="flex items-center gap-1.5 truncate">
              <Timer className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
              <span className="text-muted-foreground text-[11px]">Time:</span>
              <span className="font-semibold text-foreground truncate text-[11px]">
                {forum.roles?.timeKeeper?.name || 'TBD'}
              </span>
            </div>
            <div className="flex items-center gap-1.5 truncate">
              <HelpCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
              <span className="text-muted-foreground text-[11px]">Q&A:</span>
              <span className="font-semibold text-foreground truncate text-[11px]">
                {forum.roles?.questionMaster?.name || 'TBD'}
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-3 border-t border-border flex flex-wrap items-center gap-2">
          {/* Minutes View Button */}
          {forum.minutesPdfUrl ? (
            <Button
              onClick={() => onViewMinutes(forum)}
              size="sm"
              className="flex-1 min-w-[110px] gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-xs"
            >
              <FileText className="w-3.5 h-3.5" />
              View Minutes
            </Button>
          ) : (
            <Button
              onClick={() => onViewMinutes(forum)}
              variant="outline"
              size="sm"
              className="flex-1 min-w-[110px] gap-1.5 text-xs text-muted-foreground"
            >
              <FileText className="w-3.5 h-3.5" />
              Overview
            </Button>
          )}

          {/* Update Media & Minutes Button */}
          {canManage && onUpdateMedia && (
            <Button
              onClick={() => onUpdateMedia(forum)}
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs border-border hover:bg-muted font-medium"
              title="Update media, minutes, and records"
            >
              <UploadCloud className="w-3.5 h-3.5 text-sky-500" />
              <span className="hidden sm:inline">Media & Min</span>
            </Button>
          )}

          {/* Quick Mark Complete Button for active/scheduled */}
          {canManage && !isCompleted && onMarkComplete && (
            <Button
              onClick={() => onMarkComplete(forum)}
              size="sm"
              className="gap-1.5 text-xs bg-emerald-600/10 hover:bg-emerald-600 text-emerald-700 hover:text-white dark:text-emerald-400 dark:hover:text-white border border-emerald-500/30 font-semibold"
              title="Mark Complete"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Complete</span>
            </Button>
          )}

          {/* If In-Progress, option to complete */}
          {canManage && isUpcoming && onStartSession && (
            <Button
              onClick={() => onStartSession(forum.forumId)}
              size="sm"
              variant="outline"
              className="gap-1 text-xs border-rose-500/30 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10"
              title="Start Session (Mark In Progress)"
            >
              <Play className="w-3 h-3 fill-current" />
              <span>Start</span>
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
