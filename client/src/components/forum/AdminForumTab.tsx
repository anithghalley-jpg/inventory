import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Sparkles,
  Calendar,
  Clock,
  MapPin,
  Users,
  Plus,
  Search,
  CheckCircle2,
  FileText,
  Folder,
  ExternalLink,
  Crown,
  FileEdit,
  Timer,
  HelpCircle,
  Cpu,
  Compass,
  Telescope,
  ChevronRight,
  CheckSquare,
  Square,
  Play,
  Check,
  Tag,
  ImageIcon,
  History,
  AlertCircle,
  Layers,
  ArrowUpRight,
  Filter,
} from 'lucide-react';
import { toast } from 'sonner';
import ScheduleForumModal from './ScheduleForumModal';
import CompleteForumModal from './CompleteForumModal';
import ActionItemsPoolModal from './ActionItemsPoolModal';
import ForumMinutesViewerModal from './ForumMinutesViewerModal';
import ForumCard from './ForumCard';

interface AdminForumTabProps {
  userEmail?: string;
  canManage?: boolean;
}

export default function AdminForumTab({
  userEmail = 'admin@system.local',
  canManage = true,
}: AdminForumTabProps) {
  // Convex queries & mutations
  const upcomingForum = useQuery(api.forums.getUpcoming);
  const historyForums = useQuery(api.forums.getHistory) || [];
  const allForums = useQuery(api.forums.getAll) || [];
  const openActionItems = useQuery(api.forums.getUnresolvedActionItems) || [];
  const allActionItems = useQuery(api.forums.getAllActionItems, {}) || [];

  const updateStatusMut = useMutation(api.forums.updateForumStatus);
  const toggleActionItemMut = useMutation(api.forums.toggleActionItemResolved);
  const deleteForumMut = useMutation(api.forums.deleteForum);

  // Modals state
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false);
  const [isActionItemsModalOpen, setIsActionItemsModalOpen] = useState(false);
  const [selectedForumForMinutes, setSelectedForumForMinutes] = useState<any>(null);
  const [selectedPhotosGallery, setSelectedPhotosGallery] = useState<{ photos: string[]; title: string } | null>(null);

  // History search and filters
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('ALL');

  // Countdown timer for next upcoming forum
  const [timeLeft, setTimeLeft] = useState<{ days: number; hours: number; minutes: number; seconds: number } | null>(null);

  useEffect(() => {
    if (!upcomingForum?.date) {
      setTimeLeft(null);
      return;
    }

    const targetDateStr = `${upcomingForum.date}T${upcomingForum.time || '09:00'}:00`;
    const calculateTime = () => {
      const now = new Date().getTime();
      const target = new Date(targetDateStr).getTime();
      const difference = target - now;

      if (difference <= 0) {
        setTimeLeft(null);
        return;
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);

      setTimeLeft({ days, hours, minutes, seconds });
    };

    calculateTime();
    const interval = setInterval(calculateTime, 1000);
    return () => clearInterval(interval);
  }, [upcomingForum]);

  // Handle Action Item Toggle
  const handleToggleActionItem = async (itemId: string, isResolved: boolean) => {
    try {
      await toggleActionItemMut({
        itemId,
        isResolved: !isResolved,
      });
      toast.success(!isResolved ? 'Action item resolved!' : 'Action item reopened');
    } catch (err: any) {
      toast.error(err.message || 'Failed to update action item');
    }
  };

  // Handle Mark In-Progress / Start Session
  const handleStartSession = async (forumId: string) => {
    try {
      await updateStatusMut({
        forumId,
        status: 'IN_PROGRESS',
      });
      toast.success('Forum session is now IN PROGRESS! 🎙️');
    } catch (err: any) {
      toast.error(err.message || 'Failed to update status');
    }
  };

  // Handle Delete Forum
  const handleDeleteForum = async (forumId: string) => {
    if (!confirm('Are you sure you want to delete this forum edition?')) return;
    try {
      await deleteForumMut({ forumId });
      toast.success('Forum edition deleted');
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete forum');
    }
  };

  // Filtered History
  const filteredHistory = useMemo(() => {
    return historyForums.filter((f: any) => {
      if (departmentFilter !== 'ALL') {
        if (!f.departments || !f.departments.includes(departmentFilter)) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const inTitle = f.title?.toLowerCase().includes(q);
        const inTakeaways = f.keyTakeaways?.toLowerCase().includes(q);
        const inAgenda = f.agenda?.toLowerCase().includes(q);
        const inChair = f.roles?.chairperson?.name?.toLowerCase().includes(q);
        const inNote = f.roles?.noteTaker?.name?.toLowerCase().includes(q);
        return inTitle || inTakeaways || inAgenda || inChair || inNote;
      }
      return true;
    });
  }, [historyForums, departmentFilter, searchQuery]);

  // Action items associated with the upcoming forum
  const upcomingActionItems = useMemo(() => {
    if (!upcomingForum) return [];
    return allActionItems.filter(
      (item: any) =>
        item.forumId === upcomingForum.forumId ||
        item.currentForumId === upcomingForum.forumId ||
        (upcomingForum.carriedOverActionItemIds || []).includes(item.itemId)
    );
  }, [upcomingForum, allActionItems]);

  const upcomingDriveUrl =
    upcomingForum?.driveFolderUrl ||
    (upcomingForum?.driveFolderId
      ? `https://drive.google.com/drive/folders/${upcomingForum.driveFolderId}`
      : null);

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-r from-slate-900 via-indigo-950 to-emerald-950 text-white p-6 sm:p-8 shadow-xl">
        {/* Background glow accents */}
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 rounded-full bg-emerald-500/20 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-8 w-64 h-64 rounded-full bg-cyan-500/20 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 backdrop-blur-md">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                Collaborative Hub
              </span>
              <div className="flex items-center gap-1 text-xs text-white/80">
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/10">
                  <Cpu className="w-3 h-3 text-cyan-400" /> Technology
                </span>
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/10">
                  <Compass className="w-3 h-3 text-amber-400" /> FabLab
                </span>
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/10">
                  <Telescope className="w-3 h-3 text-indigo-400" /> Astronomy
                </span>
              </div>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Student Collaborative Forum
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed">
              Bringing together students from Technology, FabLab, and Astronomy for interactive
              presentations, multi-disciplinary discussions, meeting minutes documentation, and continuous follow-up action items.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-3">
            <Button
              onClick={() => setIsActionItemsModalOpen(true)}
              variant="outline"
              size="sm"
              className="gap-2 bg-white/10 hover:bg-white/20 text-white border-white/20 shadow-md backdrop-blur-md"
            >
              <CheckSquare className="w-4 h-4 text-emerald-400" />
              <span>Action Items Pool</span>
              {openActionItems.length > 0 && (
                <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-emerald-500 text-white">
                  {openActionItems.length}
                </span>
              )}
            </Button>

            {canManage && (
              <Button
                onClick={() => setIsScheduleModalOpen(true)}
                size="sm"
                className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-lg shadow-emerald-900/40"
              >
                <Plus className="w-4 h-4" />
                Schedule New Forum
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Quick Stats Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="p-4 border-border/80 bg-card flex items-center gap-3.5 shadow-sm">
          <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium">Upcoming Session</p>
            <p className="text-lg font-bold text-foreground">
              {upcomingForum ? upcomingForum.editionLabel || `Edition #${upcomingForum.edition}` : 'None scheduled'}
            </p>
          </div>
        </Card>

        <Card className="p-4 border-border/80 bg-card flex items-center gap-3.5 shadow-sm">
          <div className="p-3 rounded-2xl bg-sky-500/10 text-sky-600 dark:text-sky-400">
            <History className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium">Completed Forums</p>
            <p className="text-lg font-bold text-foreground">{historyForums.length}</p>
          </div>
        </Card>

        <Card className="p-4 border-border/80 bg-card flex items-center gap-3.5 shadow-sm">
          <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <CheckSquare className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium">Open Action Items</p>
            <p className="text-lg font-bold text-foreground">{openActionItems.length}</p>
          </div>
        </Card>

        <Card className="p-4 border-border/80 bg-card flex items-center gap-3.5 shadow-sm">
          <div className="p-3 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium">Disciplines Active</p>
            <p className="text-lg font-bold text-foreground">3 / 3</p>
          </div>
        </Card>
      </div>

      {/* TOP SECTION: NEXT UPCOMING / IN-PROGRESS FORUM SPOTLIGHT */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <h2 className="text-lg font-bold text-foreground">
              {upcomingForum?.status === 'IN_PROGRESS'
                ? 'Current Live Forum Session'
                : 'Next Upcoming Forum'}
            </h2>
          </div>
          {upcomingForum && (
            <span className="text-xs text-muted-foreground">
              Folder: <span className="font-semibold text-foreground">{upcomingForum.driveFolderName || `Forum Edition ${upcomingForum.edition}`}</span>
            </span>
          )}
        </div>

        {upcomingForum ? (
          <Card className="overflow-hidden border-2 border-emerald-500/40 bg-gradient-to-br from-card via-card to-emerald-500/5 shadow-xl rounded-3xl p-6 sm:p-8 space-y-6">
            <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
              {/* Left Column: Title, Dates, Disciplines & Agenda */}
              <div className="space-y-4 flex-1">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-emerald-600 text-white shadow">
                    {upcomingForum.editionLabel || `Edition #${upcomingForum.edition}`}
                  </span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                      upcomingForum.status === 'IN_PROGRESS'
                        ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 animate-pulse'
                        : 'bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/30'
                    }`}
                  >
                    {upcomingForum.status === 'IN_PROGRESS' ? '● In Progress' : 'Upcoming'}
                  </span>

                  {/* Disciplines */}
                  {(upcomingForum.departments || ['Technology', 'FabLab', 'Astronomy']).map((dept: string) => (
                    <span
                      key={dept}
                      className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-muted text-muted-foreground border border-border"
                    >
                      {dept}
                    </span>
                  ))}
                </div>

                <div>
                  <h3 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
                    {upcomingForum.title}
                  </h3>
                  <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground mt-2">
                    <span className="flex items-center gap-1.5 font-medium text-foreground">
                      <Calendar className="w-4 h-4 text-emerald-600" />
                      {upcomingForum.date}
                    </span>
                    {upcomingForum.time && (
                      <span className="flex items-center gap-1.5 font-medium text-foreground">
                        <Clock className="w-4 h-4 text-sky-500" />
                        {upcomingForum.time}
                      </span>
                    )}
                    {upcomingForum.location && (
                      <span className="flex items-center gap-1.5 text-muted-foreground">
                        <MapPin className="w-4 h-4 text-rose-500" />
                        {upcomingForum.location}
                      </span>
                    )}
                  </div>
                </div>

                {upcomingForum.agenda && (
                  <div className="p-3.5 rounded-2xl bg-muted/40 border border-border/80 text-xs space-y-1">
                    <div className="font-bold text-foreground flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-emerald-600" />
                      Session Agenda & Topics
                    </div>
                    <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
                      {upcomingForum.agenda}
                    </p>
                  </div>
                )}
              </div>

              {/* Right Column: Countdown Timer & Main Action CTA */}
              <div className="flex flex-col items-center sm:items-end justify-between gap-4 lg:w-80">
                {/* Live Countdown Clock */}
                {timeLeft && upcomingForum.status !== 'IN_PROGRESS' && (
                  <div className="w-full p-4 rounded-2xl bg-muted/60 border border-border text-center space-y-1.5 shadow-inner">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                      Session Starts In
                    </p>
                    <div className="grid grid-cols-4 gap-1.5 text-foreground">
                      <div className="p-2 rounded-xl bg-background border shadow-xs">
                        <span className="text-lg font-black block">{timeLeft.days}</span>
                        <span className="text-[9px] uppercase font-bold text-muted-foreground">Days</span>
                      </div>
                      <div className="p-2 rounded-xl bg-background border shadow-xs">
                        <span className="text-lg font-black block">{timeLeft.hours}</span>
                        <span className="text-[9px] uppercase font-bold text-muted-foreground">Hours</span>
                      </div>
                      <div className="p-2 rounded-xl bg-background border shadow-xs">
                        <span className="text-lg font-black block">{timeLeft.minutes}</span>
                        <span className="text-[9px] uppercase font-bold text-muted-foreground">Mins</span>
                      </div>
                      <div className="p-2 rounded-xl bg-background border shadow-xs">
                        <span className="text-lg font-black block text-emerald-600">{timeLeft.seconds}</span>
                        <span className="text-[9px] uppercase font-bold text-muted-foreground">Secs</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Main Action Bar */}
                <div className="w-full flex flex-col gap-2 pt-2">
                  {canManage && upcomingForum.status === 'UPCOMING' && (
                    <Button
                      onClick={() => handleStartSession(upcomingForum.forumId)}
                      variant="outline"
                      className="w-full gap-2 border-emerald-500/40 hover:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-semibold"
                    >
                      <Play className="w-4 h-4 fill-current" />
                      Start Session / Mark In-Progress
                    </Button>
                  )}

                  {canManage && (
                    <Button
                      onClick={() => setIsCompleteModalOpen(true)}
                      className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-lg shadow-emerald-900/30"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Complete Session & Upload Minutes
                    </Button>
                  )}

                  {upcomingDriveUrl && (
                    <Button
                      variant="ghost"
                      size="sm"
                      asChild
                      className="w-full text-xs text-muted-foreground hover:text-foreground gap-1.5"
                    >
                      <a href={upcomingDriveUrl} target="_blank" rel="noopener noreferrer">
                        <Folder className="w-3.5 h-3.5 text-sky-500" />
                        Open Google Drive Folder
                        <ExternalLink className="w-3 h-3 ml-auto" />
                      </a>
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Assigned Student Roles Cards */}
            <div className="pt-4 border-t border-border/80 space-y-2.5">
              <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-600" />
                Assigned Student Roles
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                {/* Chairperson */}
                <div className="p-3 rounded-2xl border border-amber-500/30 bg-amber-500/5 dark:bg-amber-950/20 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1">
                      <Crown className="w-3.5 h-3.5" />
                      Chairperson
                    </span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-700 dark:text-amber-300 font-medium">
                      {upcomingForum.roles?.chairperson?.department || 'Tech'}
                    </span>
                  </div>
                  <p className="text-sm font-bold text-foreground truncate">
                    {upcomingForum.roles?.chairperson?.name || 'Unassigned'}
                  </p>
                  {upcomingForum.roles?.chairperson?.email && (
                    <p className="text-[10px] text-muted-foreground truncate">
                      {upcomingForum.roles.chairperson.email}
                    </p>
                  )}
                </div>

                {/* Note Taker */}
                <div className="p-3 rounded-2xl border border-sky-500/30 bg-sky-500/5 dark:bg-sky-950/20 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400 flex items-center gap-1">
                      <FileEdit className="w-3.5 h-3.5" />
                      Note Taker
                    </span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-sky-500/10 text-sky-700 dark:text-sky-300 font-medium">
                      {upcomingForum.roles?.noteTaker?.department || 'FabLab'}
                    </span>
                  </div>
                  <p className="text-sm font-bold text-foreground truncate">
                    {upcomingForum.roles?.noteTaker?.name || 'Unassigned'}
                  </p>
                  {upcomingForum.roles?.noteTaker?.email && (
                    <p className="text-[10px] text-muted-foreground truncate">
                      {upcomingForum.roles.noteTaker.email}
                    </p>
                  )}
                </div>

                {/* Time Keeper */}
                <div className="p-3 rounded-2xl border border-indigo-500/30 bg-indigo-500/5 dark:bg-indigo-950/20 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                      <Timer className="w-3.5 h-3.5" />
                      Time Keeper
                    </span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 font-medium">
                      {upcomingForum.roles?.timeKeeper?.department || 'Astro'}
                    </span>
                  </div>
                  <p className="text-sm font-bold text-foreground truncate">
                    {upcomingForum.roles?.timeKeeper?.name || 'Unassigned'}
                  </p>
                  {upcomingForum.roles?.timeKeeper?.email && (
                    <p className="text-[10px] text-muted-foreground truncate">
                      {upcomingForum.roles.timeKeeper.email}
                    </p>
                  )}
                </div>

                {/* Question Master */}
                <div className="p-3 rounded-2xl border border-rose-500/30 bg-rose-500/5 dark:bg-rose-950/20 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 flex items-center gap-1">
                      <HelpCircle className="w-3.5 h-3.5" />
                      Question Master
                    </span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-500/10 text-rose-700 dark:text-rose-300 font-medium">
                      {upcomingForum.roles?.questionMaster?.department || 'General'}
                    </span>
                  </div>
                  <p className="text-sm font-bold text-foreground truncate">
                    {upcomingForum.roles?.questionMaster?.name || 'Unassigned'}
                  </p>
                  {upcomingForum.roles?.questionMaster?.email && (
                    <p className="text-[10px] text-muted-foreground truncate">
                      {upcomingForum.roles.questionMaster.email}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Carried-Over Action Items Checklist */}
            {upcomingActionItems.length > 0 && (
              <div className="pt-4 border-t border-border/80 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <CheckSquare className="w-4 h-4 text-emerald-600" />
                    Carried-Over Follow-Ups for this Session ({upcomingActionItems.length})
                  </div>
                  <span className="text-[11px] text-muted-foreground">
                    Checked items will be resolved
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {upcomingActionItems.map((item: any) => (
                    <div
                      key={item.itemId}
                      onClick={() => handleToggleActionItem(item.itemId, item.isResolved)}
                      className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${
                        item.isResolved
                          ? 'bg-muted/30 border-border/60 text-muted-foreground'
                          : 'bg-background border-border hover:border-emerald-500/40 hover:shadow-xs'
                      }`}
                    >
                      <button
                        type="button"
                        className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                          item.isResolved
                            ? 'bg-emerald-600 border-emerald-600 text-white'
                            : 'border-muted-foreground/40 bg-background'
                        }`}
                      >
                        {item.isResolved && <Check className="w-3 h-3 stroke-[3]" />}
                      </button>
                      <div className="flex-1 space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-xs font-medium ${
                              item.isResolved ? 'line-through text-muted-foreground' : 'text-foreground'
                            }`}
                          >
                            {item.title}
                          </span>
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-muted border">
                            {item.department || 'General'}
                          </span>
                        </div>
                        {item.assignee && (
                          <p className="text-[10px] text-muted-foreground">Lead: {item.assignee}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>
        ) : (
          <Card className="p-8 border-2 border-dashed border-border rounded-3xl text-center space-y-4 bg-muted/20">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center mx-auto">
              <Calendar className="w-8 h-8" />
            </div>
            <div className="space-y-1 max-w-md mx-auto">
              <h3 className="text-lg font-bold text-foreground">No Upcoming Forum Scheduled</h3>
              <p className="text-xs text-muted-foreground">
                Plan the next interactive session bringing together students from Technology, FabLab, and Astronomy.
              </p>
            </div>
            {canManage && (
              <Button
                onClick={() => setIsScheduleModalOpen(true)}
                className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
              >
                <Plus className="w-4 h-4" />
                Schedule Next Forum Edition
              </Button>
            )}
          </Card>
        )}
      </div>

      {/* HISTORY & VISUAL ARCHIVE SECTION */}
      <div className="space-y-5 pt-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
              <History className="w-5 h-5 text-emerald-600" />
              Forum History & Visual Archive
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Explore completed forum sessions, meeting minutes (PDF), presentation highlights, and historical takeaways.
            </p>
          </div>

          {/* Search & Filter Controls */}
          <div className="flex items-center gap-2.5">
            <div className="relative w-48 sm:w-64">
              <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                placeholder="Search history, topics..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-xs bg-card"
              />
            </div>

            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="h-9 px-3 rounded-md border border-border bg-card text-xs text-foreground focus:outline-none"
            >
              <option value="ALL">All Disciplines</option>
              <option value="Technology">Technology</option>
              <option value="FabLab">FabLab</option>
              <option value="Astronomy">Astronomy</option>
            </select>
          </div>
        </div>

        {filteredHistory.length === 0 ? (
          <div className="p-12 text-center border-2 border-dashed border-border rounded-2xl space-y-2 bg-card/40">
            <FileText className="w-10 h-10 text-muted-foreground/50 mx-auto" />
            <p className="text-sm font-semibold text-foreground">No completed forum records yet</p>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Once you finish an upcoming forum and submit the meeting minutes (PDF), it will appear in this visual archive.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredHistory.map((forum: any) => (
              <ForumCard
                key={forum.forumId}
                forum={forum}
                onViewMinutes={(f) => setSelectedForumForMinutes(f)}
                onDelete={canManage ? handleDeleteForum : undefined}
                onOpenPhotos={(photos, title) => setSelectedPhotosGallery({ photos, title })}
                canManage={canManage}
              />
            ))}
          </div>
        )}
      </div>

      {/* MODALS */}
      {/* 1. Schedule Forum Modal */}
      <ScheduleForumModal
        isOpen={isScheduleModalOpen}
        onClose={() => setIsScheduleModalOpen(false)}
        userEmail={userEmail}
      />

      {/* 2. Complete Forum Modal */}
      {upcomingForum && (
        <CompleteForumModal
          isOpen={isCompleteModalOpen}
          onClose={() => setIsCompleteModalOpen(false)}
          forum={upcomingForum}
          userEmail={userEmail}
        />
      )}

      {/* 3. Action Items Pool Modal */}
      <ActionItemsPoolModal
        isOpen={isActionItemsModalOpen}
        onClose={() => setIsActionItemsModalOpen(false)}
        userEmail={userEmail}
      />

      {/* 4. Meeting Minutes Viewer Modal */}
      <ForumMinutesViewerModal
        isOpen={!!selectedForumForMinutes}
        onClose={() => setSelectedForumForMinutes(null)}
        forum={selectedForumForMinutes}
      />

      {/* 5. Photos Gallery Lightbox Modal */}
      {selectedPhotosGallery && (
        <Dialog open={!!selectedPhotosGallery} onOpenChange={() => setSelectedPhotosGallery(null)}>
          <DialogContent className="max-w-4xl p-6 bg-background border border-border rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold">
                Photo Highlights: {selectedPhotosGallery.title}
              </DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 max-h-[75vh] overflow-y-auto pt-4">
              {selectedPhotosGallery.photos.map((photo, i) => (
                <div key={i} className="rounded-xl overflow-hidden border border-border aspect-video bg-card shadow-sm">
                  <img src={photo} alt={`Highlight ${i + 1}`} className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
