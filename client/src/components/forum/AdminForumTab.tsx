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
import ForumDetailReportView from './ForumDetailReportView';
import { normalizeForumImageUrl } from './forumUtils';

interface AdminForumTabProps {
  userEmail?: string;
  canManage?: boolean;
}

export default function AdminForumTab({
  userEmail = 'admin@system.local',
  canManage = true,
}: AdminForumTabProps) {
  // Convex queries & mutations
  const allForumsQuery = useQuery(api.forums.getAll);
  const openActionItemsQuery = useQuery(api.forums.getUnresolvedActionItems);

  const allForums = allForumsQuery || [];
  const openActionItems = openActionItemsQuery || [];

  const updateStatusMut = useMutation(api.forums.updateForumStatus);
  const deleteForumMut = useMutation(api.forums.deleteForum);

  // Tab & Filter States (Platform is dedicated to record keeping: All, Scheduled, Completed)
  const [activeTab, setActiveTab] = useState<'ALL' | 'SCHEDULED' | 'COMPLETED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'date-desc' | 'date-asc' | 'edition-desc' | 'edition-asc'>('date-desc');

  // Selected forum for in-page full report view (similar to project report on projects tab)
  const [selectedForumId, setSelectedForumId] = useState<string | null>(null);

  // Modals state
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [forumToEdit, setForumToEdit] = useState<any>(null);
  const [forumForMediaAndComplete, setForumForMediaAndComplete] = useState<any>(null);
  const [isActionItemsModalOpen, setIsActionItemsModalOpen] = useState(false);
  const [selectedForumForMinutes, setSelectedForumForMinutes] = useState<any>(null);
  const [selectedPhotosGallery, setSelectedPhotosGallery] = useState<{ photos: string[]; title: string } | null>(null);

  const selectedForum = useMemo(
    () => allForums.find((f: any) => f.forumId === selectedForumId) || null,
    [allForums, selectedForumId]
  );

  // Computed status metrics
  const upcomingCount = useMemo(
    () => allForums.filter((f: any) => f.status !== 'COMPLETED').length,
    [allForums]
  );
  const completedCount = useMemo(
    () => allForums.filter((f: any) => f.status === 'COMPLETED').length,
    [allForums]
  );
  const totalCount = allForums.length;

  // Filtered & Sorted Forums List
  const filteredForums = useMemo(() => {
    return allForums
      .filter((f: any) => {
        if (activeTab === 'SCHEDULED' && f.status === 'COMPLETED') return false;
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
        // Default: newest date first
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

  const handleDeleteForum = async (forumId: string) => {
    if (!confirm('Are you sure you want to delete this forum edition?')) return;
    try {
      await deleteForumMut({ forumId });
      toast.success('Forum edition deleted');
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete forum');
    }
  };

  if (selectedForumId) {
    return (
      <div className="space-y-6">
        <ForumDetailReportView
          forumId={selectedForumId}
          initialForum={selectedForum}
          userEmail={userEmail}
          canManage={canManage}
          onBack={() => setSelectedForumId(null)}
          onEditForum={(f) => handleEditForum(f)}
          onUpdateMedia={(f) => setForumForMediaAndComplete(f)}
          onMarkComplete={(f) => setForumForMediaAndComplete(f)}
          onDeleteForum={(id) => {
            handleDeleteForum(id);
            setSelectedForumId(null);
          }}
        />

        {/* Schedule / Edit Forum Modal */}
        <ScheduleForumModal
          isOpen={isScheduleModalOpen}
          onClose={() => {
            setIsScheduleModalOpen(false);
            setForumToEdit(null);
          }}
          forumToEdit={forumToEdit}
          userEmail={userEmail}
        />

        {/* Media, Minutes & Complete Forum Modal */}
        {forumForMediaAndComplete && (
          <CompleteForumModal
            isOpen={!!forumForMediaAndComplete}
            onClose={() => setForumForMediaAndComplete(null)}
            forum={forumForMediaAndComplete}
            userEmail={userEmail}
          />
        )}
      </div>
    );
  }

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
            Schedule forum sessions, document meeting minutes in Markdown, record photo highlights, and track cross-disciplinary action items.
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

      {/* 2. COMPACT OVERALL FORUM RECORDS STATUS */}
      <div className="rounded-2xl border border-border/80 bg-card/60 backdrop-blur-md p-3 sm:px-4 sm:py-3 shadow-xs">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 items-center divide-y sm:divide-y-0 sm:divide-x divide-border/60">
          {/* Stat 1: Total Forums */}
          <div
            onClick={() => setActiveTab('ALL')}
            className="flex items-center gap-3 cursor-pointer group hover:opacity-85 transition-opacity px-1"
            title="Show All Forum Records"
          >
            <div className="p-2.5 rounded-xl bg-muted text-foreground shrink-0">
              <Layers className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="min-w-0">
              <span className="text-base font-extrabold text-foreground leading-none">
                {totalCount}
              </span>
              <p className="text-[11px] text-muted-foreground font-medium mt-0.5">
                Total Forum Records
              </p>
            </div>
          </div>

          {/* Stat 2: Scheduled Forums */}
          <div
            onClick={() => setActiveTab('SCHEDULED')}
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
                Scheduled Forums
              </p>
            </div>
          </div>

          {/* Stat 3: Completed Records */}
          <div
            onClick={() => setActiveTab('COMPLETED')}
            className="flex items-center gap-3 cursor-pointer group hover:opacity-85 transition-opacity pt-2 sm:pt-0 sm:pl-3 px-1"
            title="Filter by Completed Forums"
          >
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-base font-extrabold text-foreground leading-none">
                {completedCount}
              </span>
              <p className="text-[11px] text-muted-foreground font-medium mt-0.5">
                Completed Records
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
      </div>

      {/* 3. FILTER TABS & SEARCH BAR */}
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
            onClick={() => setActiveTab('SCHEDULED')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'SCHEDULED'
                ? 'bg-sky-600 text-white shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Clock className="w-3 h-3" />
            Scheduled ({upcomingCount})
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
      {allForumsQuery === undefined ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-72 rounded-2xl border border-border/80 bg-card/40 animate-pulse" />
          ))}
        </div>
      ) : filteredForums.length === 0 ? (
        <Card className="p-12 text-center border-2 border-dashed border-border rounded-2xl space-y-3 bg-card/40">
          <div className="w-12 h-12 rounded-2xl bg-muted/60 text-muted-foreground flex items-center justify-center mx-auto">
            <Calendar className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-foreground">
              {searchQuery
                ? 'No forums match your search'
                : activeTab === 'SCHEDULED'
                ? 'No scheduled forums found'
                : activeTab === 'COMPLETED'
                ? 'No completed forum records yet'
                : 'No forum records found'}
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
              onViewMinutes={(f) => setSelectedForumId(f.forumId)}
              onUpdateMedia={(f) => setForumForMediaAndComplete(f)}
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
                  <img
                    src={normalizeForumImageUrl(photo)}
                    alt={`Highlight ${i + 1}`}
                    referrerPolicy="no-referrer"
                    loading="lazy"
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
