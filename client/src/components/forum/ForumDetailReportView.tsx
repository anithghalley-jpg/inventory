import React, { useState, useMemo } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  ChevronLeft,
  Calendar,
  Clock,
  MapPin,
  Sparkles,
  Crown,
  FileEdit,
  Timer,
  HelpCircle,
  Folder,
  ExternalLink,
  FileText,
  Download,
  Copy,
  Check,
  Printer,
  Image as ImageIcon,
  Edit2,
  UploadCloud,
  CheckCircle2,
  Trash2,
  CheckSquare,
  Square,
  Layers,
  Plus,
  Loader2,
  Eye,
  X,
} from 'lucide-react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { toast } from 'sonner';
import {
  normalizeForumImageUrl,
  getDriveThumbnailFallbackUrl,
  extractGoogleDriveId,
} from './forumUtils';

interface ForumDetailReportViewProps {
  forumId: string;
  initialForum?: any;
  userEmail?: string;
  canManage?: boolean;
  onBack: () => void;
  onEditForum?: (forum: any) => void;
  onUpdateMedia?: (forum: any) => void;
  onMarkComplete?: (forum: any) => void;
  onDeleteForum?: (forumId: string) => void;
}

export default function ForumDetailReportView({
  forumId,
  initialForum,
  userEmail = 'admin@system.local',
  canManage = true,
  onBack,
  onEditForum,
  onUpdateMedia,
  onMarkComplete,
  onDeleteForum,
}: ForumDetailReportViewProps) {
  // Real-time query for full forum document + action items
  const forumQuery = useQuery(api.forums.getForumById, { forumId });
  const forum = forumQuery ?? initialForum;

  const toggleActionItemMut = useMutation(api.forums.toggleActionItemResolved);
  const createActionItemMut = useMutation(api.forums.createActionItem);
  const updateForumMut = useMutation(api.forums.updateForum);

  // Local states
  const [copied, setCopied] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [newActionTitle, setNewActionTitle] = useState('');
  const [newActionAssignee, setNewActionAssignee] = useState('');
  const [newActionDept, setNewActionDept] = useState('Technology');
  const [isAddingActionItem, setIsAddingActionItem] = useState(false);

  // Inline Minutes Editing States
  const [isEditingMinutes, setIsEditingMinutes] = useState(false);
  const [minutesDraft, setMinutesDraft] = useState('');
  const [editorTab, setEditorTab] = useState<'write' | 'preview'>('write');
  const [isSavingMinutes, setIsSavingMinutes] = useState(false);

  // Markdown rendering helper
  const renderMarkdownToSafeHtml = (markdown: string) => {
    if (!markdown || !markdown.trim()) return '';
    try {
      const parsed = marked.parse(markdown) as string;
      return DOMPurify.sanitize(parsed, {
        ADD_TAGS: [
          'table',
          'thead',
          'tbody',
          'tr',
          'th',
          'td',
          'input',
          'img',
          'a',
          'span',
          'b',
          'i',
          'code',
          'pre',
          'hr',
          'h1',
          'h2',
          'h3',
          'h4',
          'ul',
          'ol',
          'li',
          'blockquote',
        ],
        ADD_ATTR: [
          'target',
          'rel',
          'checked',
          'type',
          'disabled',
          'class',
          'href',
          'src',
          'alt',
          'title',
          'referrerpolicy',
        ],
      });
    } catch (e) {
      console.error('Markdown parse error:', e);
      return markdown;
    }
  };

  const markdownContent = forum?.minutesMarkdown || '';
  const renderedHtml = useMemo(
    () => renderMarkdownToSafeHtml(markdownContent),
    [markdownContent]
  );
  const renderedDraftHtml = useMemo(
    () => renderMarkdownToSafeHtml(minutesDraft),
    [minutesDraft]
  );

  // Metrics & Normalized Media
  const isCompleted = forum?.status === 'COMPLETED';
  const rawCoverImage =
    forum?.coverImageUrl?.trim() ||
    (forum?.eventPhotos && forum.eventPhotos.length > 0 ? forum.eventPhotos[0] : '');
  const coverImage = normalizeForumImageUrl(rawCoverImage);
  const driveMediaUrl = forum?.mediaDriveUrl || forum?.driveFolderUrl || '';
  const photos = forum?.eventPhotos || [];
  const actionItems: any[] = forum?.actionItems || [];
  const resolvedCount = actionItems.filter((i) => i.isResolved).length;

  const wordCount = useMemo(() => {
    if (!markdownContent) return 0;
    return markdownContent.trim().split(/\s+/).filter(Boolean).length;
  }, [markdownContent]);

  // Actions
  const handleCopyMarkdown = () => {
    if (!markdownContent) {
      toast.error('No minutes markdown to copy');
      return;
    }
    navigator.clipboard.writeText(markdownContent);
    setCopied(true);
    toast.success('Meeting minutes markdown copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadMarkdown = () => {
    if (!markdownContent || !forum) return;
    const blob = new Blob([markdownContent], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Forum_Edition_${forum.edition}_Minutes.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('Markdown minutes downloaded');
  };

  const handlePrint = () => {
    window.print();
  };

  // Inline Minutes Editing Handlers
  const startEditingMinutes = () => {
    setMinutesDraft(forum?.minutesMarkdown || '');
    setEditorTab('write');
    setIsEditingMinutes(true);
    setTimeout(() => {
      const textarea = document.getElementById('inline-minutes-textarea') as HTMLTextAreaElement;
      if (textarea) {
        textarea.focus();
        textarea.setSelectionRange(textarea.value.length, textarea.value.length);
      }
    }, 50);
  };

  const handleCancelEditMinutes = () => {
    setIsEditingMinutes(false);
    setMinutesDraft('');
  };

  const handleSaveMinutes = async () => {
    if (!forum) return;
    setIsSavingMinutes(true);
    try {
      await updateForumMut({
        forumId: forum.forumId,
        minutesMarkdown: minutesDraft.trim(),
      });
      toast.success('Meeting minutes saved successfully!');
      setIsEditingMinutes(false);
    } catch (err: any) {
      console.error('Error saving minutes:', err);
      toast.error(err.message || 'Failed to save meeting minutes');
    } finally {
      setIsSavingMinutes(false);
    }
  };

  const insertFormatting = (prefix: string, suffix: string = '', defaultText: string = '') => {
    const textarea = document.getElementById('inline-minutes-textarea') as HTMLTextAreaElement;
    if (!textarea) {
      setMinutesDraft((prev) => prev + prefix + defaultText + suffix);
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = minutesDraft.substring(start, end) || defaultText;
    const replacement = `${prefix}${selected}${suffix}`;

    const updated = minutesDraft.substring(0, start) + replacement + minutesDraft.substring(end);
    setMinutesDraft(updated);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + prefix.length + selected.length);
    }, 0);
  };

  const insertStandardMinutesTemplate = () => {
    const template = `# Forum Edition ${forum?.edition} — Meeting Minutes

**Date:** ${forum?.date} | **Time:** ${forum?.time || '14:30'}  
**Location:** ${forum?.location || 'FabLab Main Collaborative Hub'}  
**Chairperson:** ${forum?.roles?.chairperson?.name || 'TBD'}  
**Note Taker:** ${forum?.roles?.noteTaker?.name || 'TBD'}

---

## 1. Attendees & Disciplines Represented
- **Technology:** 
- **FabLab & Making:** 
- **Astronomy & Optics:** 

## 2. Agenda & Presentations Summary
- **Topic 1:** 
- **Topic 2:** 

## 3. Discussions, Questions & Key Discoveries
- 

## 4. Agreed Decisions & Next Steps
- [ ] 
`;

    if (!minutesDraft.trim()) {
      setMinutesDraft(template);
      toast.success('Standard minutes template inserted!');
    } else {
      if (confirm('This will append the standard template to your current draft. Continue?')) {
        setMinutesDraft((prev) => prev + '\n\n' + template);
        toast.success('Standard template appended!');
      }
    }
  };

  // Action Items
  const handleToggleActionItem = async (item: any) => {
    try {
      await toggleActionItemMut({
        itemId: item.itemId,
        isResolved: !item.isResolved,
        resolvedInForumId: forum?.forumId,
      });
      toast.success(
        item.isResolved ? 'Marked action item as open' : 'Marked action item as resolved'
      );
    } catch (err: any) {
      toast.error(err.message || 'Failed to update action item');
    }
  };

  const handleCreateActionItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newActionTitle.trim() || !forum) return;
    try {
      await createActionItemMut({
        title: newActionTitle.trim(),
        assignee: newActionAssignee.trim() || undefined,
        department: newActionDept,
        forumId: forum.forumId,
        forumEdition: forum.edition,
        userEmail,
      });
      setNewActionTitle('');
      setNewActionAssignee('');
      setIsAddingActionItem(false);
      toast.success('New action item recorded');
    } catch (err: any) {
      toast.error(err.message || 'Failed to create action item');
    }
  };

  if (!forum) {
    return (
      <div className="p-16 flex flex-col items-center justify-center text-center space-y-3 bg-card rounded-3xl border border-border">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
        <p className="text-sm font-semibold text-foreground">Loading meeting details & minutes...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300 print:space-y-4">
      {/* ── 1. STICKY TOP CONTROL TOOLBAR ── */}
      <div className="sticky top-16 z-30 p-3 sm:p-4 rounded-2xl sm:rounded-3xl bg-background/95 backdrop-blur-md border border-border shadow-md space-y-3 print:hidden">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Left: Back button & Breadcrumbs */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <Button
              size="sm"
              variant="outline"
              onClick={onBack}
              className="h-9 px-3 rounded-xl border-border hover:bg-muted text-xs font-bold shrink-0 shadow-2xs gap-1.5 cursor-pointer text-foreground"
            >
              <ChevronLeft className="h-4 w-4" />
              <span>Back to Forums</span>
            </Button>

            <div className="h-4 w-[1px] bg-border mx-1 hidden sm:block" />

            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider bg-emerald-600 text-white shadow-2xs">
                {forum.editionLabel || `Edition #${forum.edition}`}
              </span>
              <span className="text-xs text-muted-foreground font-medium hidden md:inline truncate max-w-[280px]">
                {forum.title}
              </span>
            </div>
          </div>

          {/* Right: Quick Actions */}
          <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
            {/* Drive Link */}
            {driveMediaUrl && (
              <Button
                size="sm"
                variant="outline"
                asChild
                className="h-8 px-2.5 rounded-xl border-border text-xs font-semibold gap-1.5 hover:bg-muted text-sky-600 dark:text-sky-400"
              >
                <a href={driveMediaUrl} target="_blank" rel="noopener noreferrer">
                  <Folder className="h-3.5 w-3.5" />
                  <span className="hidden md:inline">Drive Media</span>
                  <ExternalLink className="h-3 w-3 text-muted-foreground" />
                </a>
              </Button>
            )}

            {/* Copy Markdown */}
            {markdownContent && !isEditingMinutes && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleCopyMarkdown}
                className="h-8 px-2.5 rounded-xl border-border text-xs font-semibold gap-1.5 hover:bg-muted"
                title="Copy Markdown minutes to clipboard"
              >
                {copied ? (
                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
                <span>{copied ? 'Copied' : 'Copy .md'}</span>
              </Button>
            )}

            {/* Download .md */}
            {markdownContent && !isEditingMinutes && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleDownloadMarkdown}
                className="h-8 px-2.5 rounded-xl border-border text-xs font-semibold gap-1.5 hover:bg-muted"
                title="Download .md file"
              >
                <Download className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Download</span>
              </Button>
            )}

            {/* Print */}
            <Button
              size="sm"
              variant="outline"
              onClick={handlePrint}
              className="h-8 px-2.5 rounded-xl border-border text-xs font-semibold gap-1.5 hover:bg-muted hidden sm:flex"
              title="Print meeting minutes report"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Print</span>
            </Button>

            {/* Inline Edit Minutes Shortcut */}
            {canManage && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  startEditingMinutes();
                  const el = document.getElementById('meeting-minutes-section');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }}
                className={`h-8 px-2.5 rounded-xl border-border text-xs font-semibold gap-1.5 hover:bg-muted ${
                  isEditingMinutes ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/40' : ''
                }`}
              >
                <FileEdit className="w-3.5 h-3.5 text-emerald-600" />
                <span>{isEditingMinutes ? 'Editing...' : 'Edit Minutes'}</span>
              </Button>
            )}

            {/* Edit Forum Details */}
            {canManage && onEditForum && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onEditForum(forum)}
                className="h-8 px-2.5 rounded-xl border-border text-xs font-semibold gap-1.5 hover:bg-muted"
              >
                <Edit2 className="w-3.5 h-3.5 text-amber-500" />
                <span className="hidden sm:inline">Edit Details</span>
              </Button>
            )}

            {/* Manage Media & Photos */}
            {canManage && onUpdateMedia && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onUpdateMedia(forum)}
                className="h-8 px-2.5 rounded-xl border-border text-xs font-semibold gap-1.5 hover:bg-muted text-sky-600 dark:text-sky-400"
              >
                <UploadCloud className="w-3.5 h-3.5 text-sky-500" />
                <span>Media & Photos</span>
              </Button>
            )}

            {/* Mark Complete */}
            {canManage && !isCompleted && onMarkComplete && (
              <Button
                size="sm"
                onClick={() => onMarkComplete(forum)}
                className="h-8 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold gap-1.5 shadow-2xs"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Mark Completed</span>
              </Button>
            )}

            {/* Delete Forum */}
            {canManage && onDeleteForum && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onDeleteForum(forum.forumId)}
                className="h-8 px-2 rounded-xl border-rose-200 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-semibold"
                title="Delete this forum"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* ── 2. EXECUTIVE HERO HEADER BANNER ── */}
      <div className="relative rounded-3xl overflow-hidden border border-border shadow-xl bg-slate-950 min-h-[260px] sm:min-h-[300px] flex flex-col justify-end">
        {/* Cover Image Background with Robust Google Drive CDN support */}
        {coverImage ? (
          <img
            src={coverImage}
            alt={forum.title}
            referrerPolicy="no-referrer"
            loading="lazy"
            onError={(e) => {
              const fallback = getDriveThumbnailFallbackUrl(rawCoverImage);
              if (fallback && e.currentTarget.src !== fallback) {
                e.currentTarget.src = fallback;
              }
            }}
            className="absolute inset-0 w-full h-full object-cover object-center transition-transform duration-700 hover:scale-105"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 flex items-center justify-center">
            <Sparkles className="w-24 h-24 text-emerald-500/10" />
          </div>
        )}

        {/* Gradient scrim for high readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/70 to-slate-950/30" />

        {/* Hero Content */}
        <div className="relative p-6 sm:p-8 space-y-4 max-w-5xl">
          {/* Top badges */}
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-black/60 text-white border border-white/20 shadow-lg backdrop-blur-md">
              {forum.editionLabel || `Edition #${forum.edition}`}
            </span>

            {isCompleted ? (
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-600 text-white shadow-md flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Completed Record
              </span>
            ) : (
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-sky-600 text-white shadow-md flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                Scheduled Forum
              </span>
            )}

            {forum.departments && forum.departments.length > 0 && (
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-white/10 text-white/90 border border-white/15 backdrop-blur-md flex items-center gap-1">
                <Layers className="w-3.5 h-3.5 text-emerald-400" />
                {forum.departments.join(' • ')}
              </span>
            )}
          </div>

          {/* Title */}
          <h1 className="text-2xl sm:text-4xl md:text-5xl font-black text-white tracking-tight leading-tight drop-shadow-md">
            {forum.title}
          </h1>

          {/* Metadata Row */}
          <div className="flex flex-wrap items-center gap-y-2 gap-x-5 text-xs sm:text-sm text-white/90 font-medium pt-1">
            <span className="flex items-center gap-1.5 bg-black/40 px-3 py-1 rounded-xl backdrop-blur-md border border-white/10">
              <Calendar className="w-4 h-4 text-emerald-400" />
              {forum.date}
            </span>

            {forum.time && (
              <span className="flex items-center gap-1.5 bg-black/40 px-3 py-1 rounded-xl backdrop-blur-md border border-white/10">
                <Clock className="w-4 h-4 text-sky-400" />
                {forum.time}
              </span>
            )}

            {forum.location && (
              <span className="flex items-center gap-1.5 bg-black/40 px-3 py-1 rounded-xl backdrop-blur-md border border-white/10">
                <MapPin className="w-4 h-4 text-rose-400" />
                {forum.location}
              </span>
            )}

            {photos.length > 0 && (
              <span className="flex items-center gap-1.5 bg-black/40 px-3 py-1 rounded-xl backdrop-blur-md border border-white/10">
                <ImageIcon className="w-4 h-4 text-amber-400" />
                {photos.length} Photo{photos.length !== 1 ? 's' : ''}
              </span>
            )}

            {actionItems.length > 0 && (
              <span className="flex items-center gap-1.5 bg-black/40 px-3 py-1 rounded-xl backdrop-blur-md border border-white/10">
                <CheckSquare className="w-4 h-4 text-emerald-400" />
                {resolvedCount}/{actionItems.length} Action Items Resolved
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── 3. STUDENT OFFICERS IN CHARGE ── */}
      <Card className="p-5 sm:p-6 rounded-2xl sm:rounded-3xl border border-border bg-card shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/60 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Crown className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">Student Officers In Charge</h2>
              <p className="text-xs text-muted-foreground">
                Appointed student leadership and moderation team for this collaborative edition
              </p>
            </div>
          </div>
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Leadership Roster
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Chairperson */}
          <div className="p-4 rounded-2xl bg-muted/40 border border-border/70 space-y-2 hover:border-amber-500/50 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Crown className="w-3.5 h-3.5 text-amber-500" />
                Chairperson
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-300">
                Moderator
              </span>
            </div>
            <p className="text-base font-extrabold text-foreground truncate">
              {forum.roles?.chairperson?.name || 'TBD'}
            </p>
            <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
              <span className="truncate">
                {forum.roles?.chairperson?.department || 'Department TBD'}
              </span>
            </div>
          </div>

          {/* Note Taker */}
          <div className="p-4 rounded-2xl bg-muted/40 border border-border/70 space-y-2 hover:border-sky-500/50 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <FileEdit className="w-3.5 h-3.5 text-sky-500" />
                Note Taker
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-700 dark:text-sky-300">
                Minutes
              </span>
            </div>
            <p className="text-base font-extrabold text-foreground truncate">
              {forum.roles?.noteTaker?.name || 'TBD'}
            </p>
            <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
              <span className="truncate">
                {forum.roles?.noteTaker?.department || 'Department TBD'}
              </span>
            </div>
          </div>

          {/* Time Keeper */}
          <div className="p-4 rounded-2xl bg-muted/40 border border-border/70 space-y-2 hover:border-indigo-500/50 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Timer className="w-3.5 h-3.5 text-indigo-500" />
                Time Keeper
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-700 dark:text-indigo-300">
                Pacing
              </span>
            </div>
            <p className="text-base font-extrabold text-foreground truncate">
              {forum.roles?.timeKeeper?.name || 'TBD'}
            </p>
            <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
              <span className="truncate">
                {forum.roles?.timeKeeper?.department || 'Department TBD'}
              </span>
            </div>
          </div>

          {/* Question Master */}
          <div className="p-4 rounded-2xl bg-muted/40 border border-border/70 space-y-2 hover:border-rose-500/50 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5 text-rose-500" />
                Question Master
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-700 dark:text-rose-300">
                Q&A Lead
              </span>
            </div>
            <p className="text-base font-extrabold text-foreground truncate">
              {forum.roles?.questionMaster?.name || 'TBD'}
            </p>
            <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
              <span className="truncate">
                {forum.roles?.questionMaster?.department || 'Department TBD'}
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* ── 4. KEY TAKEAWAYS & AGENDA CALLOUTS ── */}
      {(forum.keyTakeaways || forum.agenda || forum.description) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Key Takeaways */}
          {forum.keyTakeaways && (
            <div className="p-5 sm:p-6 rounded-2xl sm:rounded-3xl bg-emerald-500/10 dark:bg-emerald-950/30 border border-emerald-500/30 space-y-2.5">
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Session Highlights & Key Takeaways</span>
              </div>
              <p className="text-sm text-foreground/95 whitespace-pre-line leading-relaxed">
                {forum.keyTakeaways}
              </p>
            </div>
          )}

          {/* Agenda / Overview */}
          {(forum.agenda || forum.description) && (
            <div className="p-5 sm:p-6 rounded-2xl sm:rounded-3xl bg-muted/40 border border-border space-y-2.5">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                <FileText className="w-4 h-4 text-sky-500" />
                <span>Session Agenda & Discussion Topics</span>
              </div>
              <p className="text-sm text-foreground/90 whitespace-pre-line leading-relaxed">
                {forum.agenda || forum.description}
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── 5. EMBEDDED SESSION PHOTOS GALLERY ── */}
      <Card className="p-5 sm:p-6 rounded-2xl sm:rounded-3xl border border-border bg-card shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/60 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400">
              <ImageIcon className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">
                Session Photos & Media Highlights ({photos.length})
              </h2>
              <p className="text-xs text-muted-foreground">
                Visual documentation, exhibition photos, and presentations captured during the event
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {driveMediaUrl && (
              <Button
                variant="outline"
                size="sm"
                asChild
                className="h-8 text-xs border-border gap-1.5 hover:bg-muted"
              >
                <a href={driveMediaUrl} target="_blank" rel="noopener noreferrer">
                  <Folder className="w-3.5 h-3.5 text-sky-500" />
                  <span>Google Drive Folder</span>
                  <ExternalLink className="w-3 h-3 text-muted-foreground" />
                </a>
              </Button>
            )}

            {canManage && onUpdateMedia && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onUpdateMedia(forum)}
                className="h-8 text-xs border-border gap-1.5 hover:bg-muted"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Manage Photos</span>
              </Button>
            )}
          </div>
        </div>

        {photos.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
            {photos.map((rawPhoto: string, index: number) => {
              const photoUrl = normalizeForumImageUrl(rawPhoto);
              const isCover =
                forum.coverImageUrl === rawPhoto ||
                coverImage === photoUrl ||
                (index === 0 && !forum.coverImageUrl);

              return (
                <div
                  key={index}
                  onClick={() => setSelectedPhoto(rawPhoto)}
                  className={`group relative aspect-video rounded-xl sm:rounded-2xl overflow-hidden border bg-muted/30 cursor-pointer transition-all duration-200 shadow-xs hover:shadow-lg hover:scale-[1.02] ${
                    isCover
                      ? 'ring-2 ring-emerald-500 border-emerald-500'
                      : 'border-border/80 hover:border-emerald-500/60'
                  }`}
                  title="Click to view full photo"
                >
                  <img
                    src={photoUrl}
                    alt={`Highlight photo ${index + 1}`}
                    referrerPolicy="no-referrer"
                    loading="lazy"
                    onError={(e) => {
                      const fallback = getDriveThumbnailFallbackUrl(rawPhoto);
                      if (fallback && e.currentTarget.src !== fallback) {
                        e.currentTarget.src = fallback;
                      }
                    }}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  {isCover && (
                    <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-600 text-white shadow-md flex items-center gap-1 backdrop-blur-md">
                      <Crown className="w-2.5 h-2.5 text-amber-300 fill-amber-300" />
                      Cover Banner
                    </span>
                  )}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Eye className="w-5 h-5 text-white drop-shadow" />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-10 border-2 border-dashed border-border rounded-2xl bg-muted/20 space-y-2">
            <ImageIcon className="w-8 h-8 text-muted-foreground/60 mx-auto" />
            <p className="text-sm font-semibold text-foreground">No Session Photos Attached Yet</p>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Add image links or Google Drive links to showcase the student collaborative forum in action.
            </p>
            {canManage && onUpdateMedia && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onUpdateMedia(forum)}
                className="mt-2 text-xs gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Photos & Media
              </Button>
            )}
          </div>
        )}
      </Card>

      {/* ── 6. COMPREHENSIVE MEETING MINUTES (MARKDOWN WITH INLINE EDITING & FULL WIDTH) ── */}
      <Card
        id="meeting-minutes-section"
        className="p-5 sm:p-8 rounded-2xl sm:rounded-3xl border border-border bg-card shadow-xs space-y-6"
      >
        {/* Minutes Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/80 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black tracking-tight text-foreground">
                  Meeting Minutes & Records
                </h2>
                {isEditingMinutes ? (
                  <Badge className="bg-amber-500 text-white text-[11px] font-bold">
                    Editing Mode
                  </Badge>
                ) : wordCount > 0 ? (
                  <Badge variant="outline" className="text-[11px] font-mono">
                    {wordCount} words
                  </Badge>
                ) : null}
              </div>
              <p className="text-xs text-muted-foreground">
                Documented discussion notes, student presentation minutes, and formal proceedings
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            {isEditingMinutes ? (
              <>
                {/* Write vs Preview Tabs */}
                <div className="inline-flex rounded-xl bg-muted p-0.5 border border-border text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => setEditorTab('write')}
                    className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer ${
                      editorTab === 'write'
                        ? 'bg-background text-foreground shadow-2xs font-bold'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <FileEdit className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Write</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditorTab('preview')}
                    className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer ${
                      editorTab === 'preview'
                        ? 'bg-background text-foreground shadow-2xs font-bold'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Eye className="w-3.5 h-3.5 text-sky-500" />
                    <span>Live Preview</span>
                  </button>
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCancelEditMinutes}
                  disabled={isSavingMinutes}
                  className="h-8 px-3 rounded-xl border-border text-xs font-semibold hover:bg-muted"
                >
                  <X className="w-3.5 h-3.5 mr-1" />
                  <span>Cancel</span>
                </Button>

                <Button
                  size="sm"
                  onClick={handleSaveMinutes}
                  disabled={isSavingMinutes}
                  className="h-8 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold gap-1.5 shadow-2xs"
                >
                  {isSavingMinutes ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Check className="w-3.5 h-3.5" />
                  )}
                  <span>Save Minutes</span>
                </Button>
              </>
            ) : (
              <>
                {markdownContent && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleCopyMarkdown}
                      className="h-8 px-2.5 rounded-xl border-border text-xs font-semibold gap-1.5 hover:bg-muted"
                    >
                      {copied ? (
                        <Check className="h-3.5 w-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                      <span>{copied ? 'Copied' : 'Copy'}</span>
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleDownloadMarkdown}
                      className="h-8 px-2.5 rounded-xl border-border text-xs font-semibold gap-1.5 hover:bg-muted"
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span>.md</span>
                    </Button>
                  </>
                )}

                {canManage && (
                  <Button
                    size="sm"
                    onClick={startEditingMinutes}
                    className="h-8 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold gap-1.5 shadow-2xs"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>{markdownContent ? 'Edit Minutes' : 'Write Minutes'}</span>
                  </Button>
                )}
              </>
            )}
          </div>
        </div>

        {/* ── Minutes Field (Inline Editor OR Full-Width Preview) ── */}
        {isEditingMinutes ? (
          <div className="space-y-3 animate-in fade-in duration-200 w-full">
            {editorTab === 'write' ? (
              <div className="space-y-2.5 w-full">
                {/* Formatting Quick-Toolbar */}
                <div className="flex flex-wrap items-center gap-1 p-1.5 rounded-xl bg-muted/60 border border-border text-xs">
                  <button
                    type="button"
                    onClick={() => insertFormatting('# ', '', 'Heading 1')}
                    className="px-2 py-1 rounded hover:bg-background font-bold text-foreground transition-colors"
                    title="Heading 1"
                  >
                    H1
                  </button>
                  <button
                    type="button"
                    onClick={() => insertFormatting('## ', '', 'Heading 2')}
                    className="px-2 py-1 rounded hover:bg-background font-bold text-foreground transition-colors"
                    title="Heading 2"
                  >
                    H2
                  </button>
                  <button
                    type="button"
                    onClick={() => insertFormatting('### ', '', 'Heading 3')}
                    className="px-2 py-1 rounded hover:bg-background font-bold text-foreground transition-colors"
                    title="Heading 3"
                  >
                    H3
                  </button>
                  <div className="h-4 w-[1px] bg-border mx-1" />
                  <button
                    type="button"
                    onClick={() => insertFormatting('**', '**', 'bold text')}
                    className="px-2 py-1 rounded hover:bg-background font-bold text-foreground transition-colors"
                    title="Bold"
                  >
                    B
                  </button>
                  <button
                    type="button"
                    onClick={() => insertFormatting('*', '*', 'italic text')}
                    className="px-2 py-1 rounded hover:bg-background italic text-foreground transition-colors"
                    title="Italic"
                  >
                    I
                  </button>
                  <div className="h-4 w-[1px] bg-border mx-1" />
                  <button
                    type="button"
                    onClick={() => insertFormatting('- ', '', 'Bullet point')}
                    className="px-2 py-1 rounded hover:bg-background text-foreground transition-colors"
                    title="Bullet List"
                  >
                    • List
                  </button>
                  <button
                    type="button"
                    onClick={() => insertFormatting('1. ', '', 'Numbered item')}
                    className="px-2 py-1 rounded hover:bg-background text-foreground transition-colors"
                    title="Numbered List"
                  >
                    1. List
                  </button>
                  <button
                    type="button"
                    onClick={() => insertFormatting('- [ ] ', '', 'Action item')}
                    className="px-2 py-1 rounded hover:bg-background text-foreground transition-colors"
                    title="Task Checklist"
                  >
                    ☑ Task
                  </button>
                  <div className="h-4 w-[1px] bg-border mx-1" />
                  <button
                    type="button"
                    onClick={() => insertFormatting('> ', '', 'Quote or highlight')}
                    className="px-2 py-1 rounded hover:bg-background text-foreground transition-colors"
                    title="Blockquote"
                  >
                    " Quote
                  </button>
                  <button
                    type="button"
                    onClick={() => insertFormatting('`', '`', 'code')}
                    className="px-2 py-1 rounded hover:bg-background font-mono text-foreground transition-colors"
                    title="Inline Code"
                  >
                    `code`
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      insertFormatting(
                        '\n| Column 1 | Column 2 | Column 3 |\n| --- | --- | --- |\n| Value 1 | Value 2 | Value 3 |\n',
                        ''
                      )
                    }
                    className="px-2 py-1 rounded hover:bg-background text-foreground transition-colors"
                    title="Insert Markdown Table"
                  >
                    ⊞ Table
                  </button>
                  <button
                    type="button"
                    onClick={() => insertFormatting('\n---\n', '')}
                    className="px-2 py-1 rounded hover:bg-background text-foreground transition-colors"
                    title="Horizontal Divider"
                  >
                    ― Divider
                  </button>

                  <div className="flex-1" />

                  <button
                    type="button"
                    onClick={insertStandardMinutesTemplate}
                    className="px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-semibold text-[11px] transition-colors"
                  >
                    + Standard Template
                  </button>
                </div>

                {/* Inline Textarea Field (Taking 100% full width) */}
                <textarea
                  id="inline-minutes-textarea"
                  value={minutesDraft}
                  onChange={(e) => setMinutesDraft(e.target.value)}
                  placeholder={`Write meeting minutes in Markdown...\n\n# Forum Edition ${forum.edition} — Meeting Minutes\n\n## 1. Attendees\n- John Doe (Technology)\n\n## 2. Key Discussions\n- Presentation of solar tracking project\n\n## 3. Decisions & Actions\n- [ ] FabLab to machine mounting brackets`}
                  className="w-full min-h-[460px] p-4 sm:p-6 font-mono text-xs sm:text-sm leading-relaxed rounded-2xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-emerald-500/50 shadow-inner resize-y text-foreground"
                />

                <div className="flex items-center justify-between text-xs text-muted-foreground px-1 pt-1">
                  <span>Markdown format supported with headings, lists, tables, and task checkboxes</span>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleCancelEditMinutes}
                      className="h-8 text-xs text-muted-foreground hover:text-foreground"
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSaveMinutes}
                      disabled={isSavingMinutes}
                      className="h-8 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                    >
                      {isSavingMinutes ? (
                        <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                      ) : (
                        <Check className="w-3.5 h-3.5 mr-1" />
                      )}
                      Save Minutes
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              /* Live Preview while editing (Full width) */
              <div className="space-y-3 w-full">
                <div className="w-full rounded-2xl border border-border/80 bg-background/60 p-5 sm:p-8 shadow-2xs overflow-x-auto min-h-[420px]">
                  {minutesDraft.trim() ? (
                    <div
                      className="report-markdown timeline-markdown markdown-preview w-full min-w-full text-foreground leading-relaxed text-sm sm:text-base space-y-3"
                      dangerouslySetInnerHTML={{ __html: renderedDraftHtml }}
                    />
                  ) : (
                    <p className="text-muted-foreground italic text-sm">
                      Preview will appear here once you type markdown notes.
                    </p>
                  )}
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setEditorTab('write')}
                    className="h-8 text-xs"
                  >
                    <FileEdit className="w-3.5 h-3.5 mr-1" />
                    Back to Write
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSaveMinutes}
                    disabled={isSavingMinutes}
                    className="h-8 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                  >
                    Save Minutes
                  </Button>
                </div>
              </div>
            )}
          </div>
        ) : markdownContent ? (
          /* Full-Width Rendered Preview */
          <div className="w-full rounded-2xl border border-border/80 bg-background/60 p-5 sm:p-8 shadow-2xs overflow-x-auto">
            <div
              className="report-markdown timeline-markdown markdown-preview w-full min-w-full text-foreground leading-relaxed text-sm sm:text-base space-y-3"
              dangerouslySetInnerHTML={{ __html: renderedHtml }}
            />
          </div>
        ) : forum.minutesPdfUrl ? (
          /* Legacy PDF Fallback */
          <div className="p-8 text-center border border-border rounded-2xl bg-card space-y-3">
            <FileText className="w-10 h-10 text-emerald-600 mx-auto" />
            <div>
              <h4 className="font-bold text-foreground text-base">
                Legacy PDF Document Available
              </h4>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                This edition was saved with a PDF attachment ({forum.minutesPdfName || 'Minutes.pdf'}).
              </p>
            </div>
            <Button asChild className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white">
              <a href={forum.minutesPdfUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-4 h-4" />
                Open Legacy PDF Document
              </a>
            </Button>
          </div>
        ) : (
          /* Empty state */
          <div className="text-center py-16 border-2 border-dashed border-border rounded-2xl space-y-3 bg-muted/20">
            <FileText className="w-10 h-10 text-muted-foreground/50 mx-auto" />
            <div className="space-y-1">
              <h3 className="text-base font-bold text-foreground">No Minutes Documented Yet</h3>
              <p className="text-xs text-muted-foreground max-w-md mx-auto">
                Document discussion notes, student presentations, and decisions for this forum.
              </p>
            </div>
            {canManage && (
              <Button
                onClick={startEditingMinutes}
                className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
              >
                <Edit2 className="w-3.5 h-3.5" />
                Write Meeting Minutes Here
              </Button>
            )}
          </div>
        )}
      </Card>

      {/* ── 7. ASSOCIATED ACTION ITEMS & RESOLUTIONS ── */}
      <Card className="p-5 sm:p-6 rounded-2xl sm:rounded-3xl border border-border bg-card shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/60 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <CheckSquare className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-foreground">
                  Action Items & Deliverables ({actionItems.length})
                </h2>
                {actionItems.length > 0 && (
                  <Badge variant="outline" className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                    {resolvedCount}/{actionItems.length} Resolved
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Tasks assigned during this forum or carried over from previous editions
              </p>
            </div>
          </div>

          {canManage && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsAddingActionItem((prev) => !prev)}
              className="h-8 text-xs border-border gap-1.5 hover:bg-muted"
            >
              <Plus className="w-3.5 h-3.5 text-emerald-500" />
              <span>{isAddingActionItem ? 'Cancel' : 'Add Action Item'}</span>
            </Button>
          )}
        </div>

        {/* Inline Add Action Item Form */}
        {isAddingActionItem && (
          <form
            onSubmit={handleCreateActionItem}
            className="p-4 rounded-2xl bg-muted/40 border border-border space-y-3 animate-in fade-in"
          >
            <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5 text-emerald-500" />
              <span>Record New Action Item for Edition #{forum.edition}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div className="sm:col-span-2">
                <Input
                  placeholder="Task title or deliverable..."
                  value={newActionTitle}
                  onChange={(e) => setNewActionTitle(e.target.value)}
                  className="h-9 text-xs bg-card"
                  required
                />
              </div>
              <div>
                <Input
                  placeholder="Assignee name (optional)"
                  value={newActionAssignee}
                  onChange={(e) => setNewActionAssignee(e.target.value)}
                  className="h-9 text-xs bg-card"
                />
              </div>
            </div>
            <div className="flex items-center justify-between gap-2 pt-1">
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-muted-foreground font-medium">Department:</span>
                <select
                  value={newActionDept}
                  onChange={(e) => setNewActionDept(e.target.value)}
                  className="h-7 px-2 rounded-lg border border-border bg-card text-xs text-foreground focus:outline-none"
                >
                  <option value="Technology">Technology</option>
                  <option value="FabLab">FabLab</option>
                  <option value="Astronomy">Astronomy</option>
                  <option value="General">General</option>
                </select>
              </div>

              <Button
                type="submit"
                size="sm"
                className="h-7 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
              >
                Save Action Item
              </Button>
            </div>
          </form>
        )}

        {/* Action Items List */}
        {actionItems.length > 0 ? (
          <div className="space-y-2">
            {actionItems.map((item: any) => {
              const isResolved = item.isResolved;
              return (
                <div
                  key={item.itemId}
                  className={`p-3.5 rounded-xl border transition-all flex items-start gap-3 ${
                    isResolved
                      ? 'bg-muted/30 border-border/60 opacity-80'
                      : 'bg-card border-border hover:border-emerald-500/50 shadow-2xs'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => canManage && handleToggleActionItem(item)}
                    disabled={!canManage}
                    className="mt-0.5 text-emerald-600 hover:text-emerald-700 transition-colors shrink-0 disabled:cursor-default"
                    title={isResolved ? 'Mark as Open' : 'Mark as Resolved'}
                  >
                    {isResolved ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 fill-emerald-600/20" />
                    ) : (
                      <Square className="w-4 h-4 text-muted-foreground hover:text-emerald-500" />
                    )}
                  </button>

                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`text-xs font-bold ${
                          isResolved ? 'line-through text-muted-foreground' : 'text-foreground'
                        }`}
                      >
                        {item.title}
                      </span>

                      {item.department && (
                        <span className="px-2 py-0.2 rounded-md text-[10px] font-bold bg-muted text-muted-foreground border border-border">
                          {item.department}
                        </span>
                      )}

                      {item.forumEdition && item.forumEdition !== forum.edition && (
                        <span className="px-2 py-0.2 rounded-md text-[10px] font-medium bg-amber-500/10 text-amber-700 dark:text-amber-300">
                          Carried over from #{item.forumEdition}
                        </span>
                      )}
                    </div>

                    {item.description && (
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {item.description}
                      </p>
                    )}

                    {item.assignee && (
                      <div className="text-[11px] text-muted-foreground flex items-center gap-1 font-medium">
                        <span>Assignee:</span>
                        <span className="text-foreground font-semibold">{item.assignee}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 border border-dashed border-border rounded-xl bg-muted/20 space-y-1">
            <CheckSquare className="w-6 h-6 text-muted-foreground/50 mx-auto" />
            <p className="text-xs font-semibold text-foreground">No Action Items Logged</p>
            <p className="text-[11px] text-muted-foreground max-w-sm mx-auto">
              Action items can be tracked across departments to ensure decisions from this meeting are completed.
            </p>
          </div>
        )}
      </Card>

      {/* ── 8. BOTTOM RETURN FOOTER ── */}
      <div className="p-4 rounded-2xl border border-border bg-card/60 backdrop-blur-md flex flex-col sm:flex-row items-center justify-between gap-3 print:hidden">
        <Button
          size="sm"
          variant="outline"
          onClick={onBack}
          className="gap-2 border-border hover:bg-muted text-xs font-bold"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Back to Collaborative Forums</span>
        </Button>

        <div className="flex items-center gap-2">
          {canManage && (
            <Button
              size="sm"
              onClick={() => {
                startEditingMinutes();
                const el = document.getElementById('meeting-minutes-section');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
              className="gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
            >
              <FileEdit className="w-3.5 h-3.5" />
              <span>Edit Minutes</span>
            </Button>
          )}

          <Button
            size="sm"
            variant="outline"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="text-xs font-semibold"
          >
            ↑ Top
          </Button>
        </div>
      </div>

      {/* ── 9. PHOTO LIGHTBOX MODAL ── */}
      {selectedPhoto && (
        <Dialog open={!!selectedPhoto} onOpenChange={() => setSelectedPhoto(null)}>
          <DialogContent className="max-w-4xl p-2 bg-black/95 border-none rounded-2xl overflow-hidden flex flex-col items-center">
            <div className="relative w-full max-h-[85vh] flex items-center justify-center p-2">
              <img
                src={normalizeForumImageUrl(selectedPhoto)}
                alt="Enlarged session highlight"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  const fallback = getDriveThumbnailFallbackUrl(selectedPhoto);
                  if (fallback && e.currentTarget.src !== fallback) {
                    e.currentTarget.src = fallback;
                  }
                }}
                className="max-h-[80vh] w-auto max-w-full rounded-xl object-contain shadow-2xl"
              />
            </div>
            <div className="w-full flex items-center justify-between px-4 pb-2 text-white/80 text-xs">
              <span>{forum.title}</span>
              <Button
                variant="ghost"
                size="sm"
                asChild
                className="text-white hover:bg-white/20 text-xs gap-1"
              >
                <a
                  href={
                    extractGoogleDriveId(selectedPhoto)
                      ? `https://drive.google.com/file/d/${extractGoogleDriveId(selectedPhoto)}/view`
                      : selectedPhoto
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <span>Open Full Size</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
