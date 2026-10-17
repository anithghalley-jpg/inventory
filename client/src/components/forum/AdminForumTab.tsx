import React, { useState, useMemo } from 'react';
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
  Plus,
  Search,
  CheckCircle2,
  FileText,
  Folder,
  ExternalLink,
  Crown,
  Play,
  Check,
  Tag,
  ImageIcon,
  History,
  AlertCircle,
  Layers,
  ArrowUpRight,
  Filter,
  CheckSquare,
  UploadCloud,
  ListFilter,
  Flame,
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
  const allForums = useQuery(api.forums.getAll) || [];
  const openActionItems = useQuery(api.forums.getUnresolvedActionItems) || [];

  const updateStatusMut = useMutation(api.forums.updateForumStatus);
  const deleteForumMut = useMutation(api.forums.deleteForum);

  // Tab & Filter States
  const [activeTab, setActiveTab] = useState<'ALL' | 'UPCOMING' | 'IN_PROGRESS' | 'COMPLETED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'date-desc' | 'date-asc' | 'edition-desc' | 'edition-asc'>('date-desc');

  // Modals state
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [forumToEdit, setForumToEdit] = useState<any>(null);
  const [forumForMediaAndComplete, setForumForMediaAndComplete] = useState<any>(null);
  const [isActionItemsModalOpen, setIsActionItemsModalOpen] = useState(false);
  const [selectedForumForMinutes, setSelectedForumForMinutes] = useState<any>(null);
  const [selectedPhotosGallery, setSelectedPhotosGallery] = useState<{ photos: string[]; title: string } | null>(null);

  // Computed status metrics
  const upcomingCount = useMemo(
    () => allForums.filter((f: any) => f.status === 'UPCOMING').length,
    [allForums]
  );
  const inProgressCount = useMemo(
    () => allForums.filter((f: any) => f.status === 'IN_PROGRESS').length,
    [allForums]
  );
  const completedCount = useMemo(
    () => allForums.filter((f: any) => f.status === 'COMPLETED').length,
    [allForums]
  );
  const totalCount = allForums.length;
  const conductedPercentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // Active Live Session (if any)
  const activeLiveForum = useMemo(
    () => allForums.find((f: any) => f.status === 'IN_PROGRESS'),
    [allForums]
  );

  // Filtered & Sorted Forums List
  const filteredForums = useMemo(() => {
    return allForums
      .filter((f: any) => {
        if (activeTab === 'UPCOMING' && f.status !== 'UPCOMING') return false;
        if (activeTab === 'IN_PROGRESS' && f.status !== 'IN_PROGRESS') return false;
        if (activeTab === 'COMPLETED' && f.status !== 'COMPLETED') return false;

        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const inTitle = f.title?.toLowerCase().includes(q);
          const inTakeaways = f.keyTakeaways?.toLowerCase().includes(q);
          const inAgenda = f.agenda?.toLowerCase().includes(q);
          const inLocation = f.location?.toLowerCase().includes(q);
          const inChair = f.roles?.chairperson?.name?.toLowerCase().includes(q);
          const inNote = f.roles?.noteTaker?.name?.toLowerCase().includes(q);
          const inTime = f.roles?.timeKeeper?.name?.toLowerCase().includes(q);
          const inQ = f.roles?.questionMaster?.name?.toLowerCase().includes(q);
          const inEdition = String(f.edition).includes(q) || f.editionLabel?.toLowerCase().includes(q);
          return (
            inTitle ||
            inTakeaways ||
            inAgenda ||
            inLocation ||
            inChair ||
            inNote ||
            inTime ||
            inQ ||
            inEdition
          );
        }
        return true;
      })
      .sort((a: any, b: any) => {
        if (sortBy === 'edition-desc') return (b.edition || 0) - (a.edition || 0);
        if (sortBy === 'edition-asc') return (a.edition || 0) - (b.edition || 0);
        if (sortBy === 'date-asc') {
          const dateA = new Date(`${a.date}T${a.time || '00:00'}`).getTime();
          const dateB = new Date(`${b.date}T${b.time || '00:00'}`).getTime();
          return dateA - dateB;
        }
        // Default: newest date / in-progress first
        const dateA = new Date(`${a.date}T${a.time || '00:00'}`).getTime();
        const dateB = new Date(`${b.date}T${b.time || '00:00'}`).getTime();
        return dateB - dateA;
      });
  }, [allForums, activeTab, searchQuery, sortBy]);

  // Actions
  const handleScheduleNew = () => {
    setForumToEdit(null);
    setIsScheduleModalOpen(true);
  };

  const handleEditForum = (forum: any) => {
    setForumToEdit(forum);
    setIsScheduleModalOpen(true);
  };

  const handleStartSession = async (forumId: string) => {
    try {
      await updateStatusMut({
        forumId,
        status: 'IN_PROGRESS',
      });
      toast.success('Forum session started and marked IN PROGRESS! 🎙️');
    } catch (err: any) {
      toast.error(err.message || 'Failed to update status');
    }
  };

  const handleDeleteForum = async (forumId: string) => {
    if (!confirm('Are you sure you want to delete this forum edition?')) return;
    try {
      await deleteForumMut({ forumId });
      toast.success('Forum edition deleted');
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete forum');
    }
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      {/* 1. CLEAN TOP HEADER WITH ACTION ITEMS POOL & SCHEDULE BUTTONS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-extrabold tracking-tight text-foreground font-display">
              Collaborative Forums
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              {totalCount} Total
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Schedule sessions, document meeting minutes (PDF), upload event media, and manage cross-disciplinary action items.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 shrink-0">
          <Button
            onClick={() => setIsActionItemsModalOpen(true)}
            variant="outline"
            size="sm"
            className="gap-2 border-border hover:bg-muted text-xs font-semibold shadow-xs"
          >
            <CheckSquare className="w-3.5 h-3.5 text-emerald-500" />
            <span>Action Items Pool</span>
            {openActionItems.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-emerald-600 text-white">
                {openActionItems.length}
              </span>
            )}
          </Button>

          {canManage && (
            <Button
              onClick={handleScheduleNew}
              size="sm"
              className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-950/20"
            >
              <Plus className="w-3.5 h-3.5" />
              Schedule New Forum
            </Button>
          )}
        </div>
      </div>

      {/* 2. COMPACT OVERALL STATUS OF FORUMS CONDUCTED (Minimal Vertical Footprint) */}
      <div className="rounded-2xl border border-border/80 bg-card/60 backdrop-blur-md p-3 sm:px-4 sm:py-3 shadow-xs">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 items-center divide-y sm:divide-y-0 sm:divide-x divide-border/60">
          {/* Stat 1: Conducted / Completed */}
          <div
            onClick={() => setActiveTab('COMPLETED')}
            className="flex items-center gap-3 cursor-pointer group hover:opacity-85 transition-opacity px-1"
            title="Filter by Conducted Forums"
          >
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-base font-extrabold text-foreground leading-none">
                  {completedCount}
                </span>
                <span className="text-xs text-muted-foreground font-medium leading-none">
                  / {totalCount}
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                  {conductedPercentage}%
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground font-medium mt-0.5">
                Forums Conducted
              </p>
            </div>
          </div>

          {/* Stat 2: In-Progress / Live */}
          <div
            onClick={() => setActiveTab('IN_PROGRESS')}
            className="flex items-center gap-3 cursor-pointer group hover:opacity-85 transition-opacity pt-2 sm:pt-0 sm:pl-3 px-1"
            title="Filter by Live In-Progress Forums"
          >
            <div
              className={`p-2.5 rounded-xl shrink-0 ${
                inProgressCount > 0
                  ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 animate-pulse'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              <Play className="w-4 h-4 fill-current" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-base font-extrabold text-foreground leading-none">
                  {inProgressCount}
                </span>
                {inProgressCount > 0 && (
                  <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                  </span>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground font-medium mt-0.5">
                Live In-Progress
              </p>
            </div>
          </div>

          {/* Stat 3: Scheduled / Upcoming */}
          <div
            onClick={() => setActiveTab('UPCOMING')}
            className="flex items-center gap-3 cursor-pointer group hover:opacity-85 transition-opacity pt-2 sm:pt-0 sm:pl-3 px-1"
            title="Filter by Scheduled Forums"
          >
            <div className="p-2.5 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 shrink-0">
              <Calendar className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-base font-extrabold text-foreground leading-none">
                {upcomingCount}
              </span>
              <p className="text-[11px] text-muted-foreground font-medium mt-0.5">
                Scheduled Editions
              </p>
            </div>
          </div>

          {/* Stat 4: Pending Action Items */}
          <div
            onClick={() => setIsActionItemsModalOpen(true)}
            className="flex items-center gap-3 cursor-pointer group hover:opacity-85 transition-opacity pt-2 sm:pt-0 sm:pl-3 px-1"
            title="Open Action Items Pool"
          >
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0">
              <CheckSquare className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-base font-extrabold text-foreground leading-none">
                {openActionItems.length}
              </span>
              <p className="text-[11px] text-muted-foreground font-medium mt-0.5">
                Open Action Items
              </p>
            </div>
          </div>
        </div>

        {/* Slim Overall Progress Bar */}
        <div className="mt-2.5 pt-2 border-t border-border/40 flex items-center gap-3">
          <div className="flex-1 bg-muted rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-500"
              style={{ width: `${conductedPercentage}%` }}
            />
          </div>
          <span className="text-[10px] font-bold text-muted-foreground shrink-0">
            {completedCount} of {totalCount} Conducted ({conductedPercentage}%)
          </span>
        </div>
      </div>

      {/* 3. ACTIVE LIVE SESSION ALERT STRIP (Only shown when a session is In-Progress) */}
      {activeLiveForum && (
        <div className="p-3.5 rounded-2xl border border-rose-500/30 bg-gradient-to-r from-rose-500/10 via-amber-500/10 to-transparent flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <span className="flex h-3 w-3 relative shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
            </span>
            <div>
              <p className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <span className="text-rose-600 dark:text-rose-400 uppercase tracking-wide">
                  Active Live Session:
                </span>
                {activeLiveForum.title} ({activeLiveForum.editionLabel || `Edition #${activeLiveForum.edition}`})
              </p>
              <p className="text-[11px] text-muted-foreground">
                Time: {activeLiveForum.time || 'Ongoing'} • Location: {activeLiveForum.location || 'Collaborative Hub'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              size="sm"
              onClick={() => setForumForMediaAndComplete(activeLiveForum)}
              className="text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white gap-1.5 shadow-sm"
            >
              <UploadCloud className="w-3.5 h-3.5" />
              Update Media & Complete
            </Button>
          </div>
        </div>
      )}

      {/* 4. FILTER TABS & SEARCH BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 bg-muted/60 p-1 rounded-xl border border-border/80 w-fit">
          <button
            type="button"
            onClick={() => setActiveTab('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'ALL'
                ? 'bg-background text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            All ({totalCount})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('UPCOMING')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'UPCOMING'
                ? 'bg-sky-600 text-white shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Clock className="w-3 h-3" />
            Scheduled ({upcomingCount})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('IN_PROGRESS')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'IN_PROGRESS'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Play className="w-3 h-3 fill-current" />
            In Progress ({inProgressCount})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('COMPLETED')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'COMPLETED'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <CheckCircle2 className="w-3 h-3" />
            Completed ({completedCount})
          </button>
        </div>

        {/* Search & Sort Controls */}
        <div className="flex items-center gap-2.5">
          <div className="relative w-full sm:w-60">
            <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              placeholder="Search forums, agenda..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-8 text-xs bg-card"
            />
          </div>

          <select
            value={sortBy}
            onChange={(e: any) => setSortBy(e.target.value)}
            className="h-8 px-2.5 rounded-md border border-border bg-card text-xs text-foreground focus:outline-none"
          >
            <option value="date-desc">Newest Date</option>
            <option value="date-asc">Oldest Date</option>
            <option value="edition-desc">Edition (High-Low)</option>
            <option value="edition-asc">Edition (Low-High)</option>
          </select>
        </div>
      </div>

      {/* 5. ALL FORUMS CARDS GRID (Completed, In-Progress, and Scheduled) */}
      {filteredForums.length === 0 ? (
        <Card className="p-12 text-center border-2 border-dashed border-border rounded-2xl space-y-3 bg-card/40">
          <div className="w-12 h-12 rounded-2xl bg-muted/60 text-muted-foreground flex items-center justify-center mx-auto">
            <Calendar className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-foreground">
              {searchQuery
                ? 'No forums match your search'
                : activeTab === 'UPCOMING'
                ? 'No upcoming forums scheduled'
                : activeTab === 'IN_PROGRESS'
                ? 'No live forums in progress right now'
                : activeTab === 'COMPLETED'
                ? 'No completed forums recorded yet'
                : 'No forum sessions found'}
            </h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              {searchQuery
                ? 'Try clearing the search query or changing your filter criteria.'
                : 'Schedule a new collaborative forum to start documenting presentations and minutes.'}
            </p>
          </div>
          {canManage && (
            <Button
              onClick={handleScheduleNew}
              size="sm"
              className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              Schedule New Forum
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredForums.map((forum: any) => (
            <ForumCard
              key={forum.forumId}
              forum={forum}
              onViewMinutes={(f) => setSelectedForumForMinutes(f)}
              onUpdateMedia={(f) => setForumForMediaAndComplete(f)}
              onStartSession={handleStartSession}
              onMarkComplete={(f) => setForumForMediaAndComplete(f)}
              onEdit={handleEditForum}
              onDelete={canManage ? handleDeleteForum : undefined}
              onOpenPhotos={(photos, title) => setSelectedPhotosGallery({ photos, title })}
              canManage={canManage}
            />
          ))}
        </div>
      )}

      {/* MODALS */}
      {/* 1. Schedule / Edit Forum Modal */}
      <ScheduleForumModal
        isOpen={isScheduleModalOpen}
        onClose={() => {
          setIsScheduleModalOpen(false);
          setForumToEdit(null);
        }}
        forumToEdit={forumToEdit}
        userEmail={userEmail}
      />

      {/* 2. Media, Minutes & Complete Forum Modal (Available for any forum!) */}
      {forumForMediaAndComplete && (
        <CompleteForumModal
          isOpen={!!forumForMediaAndComplete}
          onClose={() => setForumForMediaAndComplete(null)}
          forum={forumForMediaAndComplete}
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
