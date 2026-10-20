import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  UploadCloud,
  FileText,
  Image as ImageIcon,
  CheckCircle2,
  Check,
  Plus,
  Trash2,
  ExternalLink,
  Sparkles,
  Calendar,
  Folder,
  Loader2,
  Star,
  CheckSquare,
  Square,
  X,
  Eye,
  Edit3,
  Bold,
  Italic,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Code,
  Table,
  FileSpreadsheet,
  Link as LinkIcon,
  Crown,
} from 'lucide-react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { toast } from 'sonner';
import { normalizeForumImageUrl, getDriveThumbnailFallbackUrl } from './forumUtils';

interface CompleteForumModalProps {
  isOpen: boolean;
  onClose: () => void;
  forum: {
    forumId: string;
    title: string;
    edition: number;
    editionLabel?: string;
    date: string;
    time?: string;
    location?: string;
    status?: 'UPCOMING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
    minutesMarkdown?: string;
    mediaDriveUrl?: string;
    minutesPdfUrl?: string;
    minutesPdfName?: string;
    coverImageUrl?: string;
    eventPhotos?: string[];
    driveFolderName?: string;
    driveFolderId?: string;
    driveFolderUrl?: string;
    keyTakeaways?: string;
    carriedOverActionItemIds?: string[];
    roles?: {
      chairperson?: { name: string; department?: string };
      noteTaker?: { name: string; department?: string };
      timeKeeper?: { name: string; department?: string };
      questionMaster?: { name: string; department?: string };
    };
  } | null;
  userEmail: string;
}

export default function CompleteForumModal({
  isOpen,
  onClose,
  forum,
  userEmail,
}: CompleteForumModalProps) {
  if (!forum) return null;

  // Convex mutations & queries
  const completeForumMut = useMutation(api.forums.completeForum);
  const updateForumMut = useMutation(api.forums.updateForum);
  const actionItems = useQuery(api.forums.getAllActionItems, {}) || [];

  // Associated action items for this forum
  const associatedItems = actionItems.filter(
    (item: any) =>
      item.forumId === forum.forumId ||
      item.currentForumId === forum.forumId ||
      (forum.carriedOverActionItemIds || []).includes(item.itemId)
  );

  // Form State
  const [minutesMarkdown, setMinutesMarkdown] = useState(forum.minutesMarkdown || '');
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');
  const [mediaDriveUrl, setMediaDriveUrl] = useState(
    forum.mediaDriveUrl || forum.driveFolderUrl || (forum.driveFolderId ? `https://drive.google.com/drive/folders/${forum.driveFolderId}` : '')
  );
  const [keyTakeaways, setKeyTakeaways] = useState(forum.keyTakeaways || '');

  // Helper to extract unique initial photos
  const getInitialImages = (f: any): string[] => {
    const list: string[] = [];
    if (f?.eventPhotos && Array.isArray(f.eventPhotos)) {
      for (const p of f.eventPhotos) {
        if (p && typeof p === 'string' && !list.includes(p)) list.push(p);
      }
    }
    if (f?.coverImageUrl && typeof f.coverImageUrl === 'string' && !list.includes(f.coverImageUrl)) {
      list.unshift(f.coverImageUrl);
    }
    return list;
  };

  // Image Links & Cover selection state
  const [imageLinks, setImageLinks] = useState<string[]>(() => getInitialImages(forum));
  const [selectedCoverUrl, setSelectedCoverUrl] = useState<string>(() => {
    const list = getInitialImages(forum);
    return forum?.coverImageUrl || (list.length > 0 ? list[0] : '');
  });
  const [newImageInput, setNewImageInput] = useState('');

  // Action Items State
  const [resolvedItemIds, setResolvedItemIds] = useState<string[]>([]);
  const [newActionItems, setNewActionItems] = useState<
    { title: string; description: string; assignee: string; department: string; isResolved: boolean }[]
  >([]);
  const [newActionTitle, setNewActionTitle] = useState('');
  const [newActionDept, setNewActionDept] = useState('Technology');
  const [newActionAssignee, setNewActionAssignee] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync state whenever the opened forum changes
  useEffect(() => {
    if (isOpen && forum) {
      setMinutesMarkdown(forum.minutesMarkdown || '');
      setMediaDriveUrl(
        forum.mediaDriveUrl || forum.driveFolderUrl || (forum.driveFolderId ? `https://drive.google.com/drive/folders/${forum.driveFolderId}` : '')
      );
      const list = getInitialImages(forum);
      setImageLinks(list);
      setSelectedCoverUrl(forum.coverImageUrl || (list.length > 0 ? list[0] : ''));
      setNewImageInput('');
      setKeyTakeaways(forum.keyTakeaways || '');
      setResolvedItemIds([]);
      setNewActionItems([]);
      setActiveTab('edit');
    }
  }, [isOpen, forum]);

  // Image management handlers
  const handleAddImageLinks = () => {
    if (!newImageInput.trim()) return;
    const splitUrls = newImageInput
      .split(/[\n,]/)
      .map((u) => u.trim())
      .filter((u) => u.length > 0);

    if (splitUrls.length === 0) return;

    const updated = [...imageLinks];
    let addedCount = 0;
    for (const rawUrl of splitUrls) {
      const url = normalizeForumImageUrl(rawUrl);
      if (url && !updated.includes(url)) {
        updated.push(url);
        addedCount++;
      }
    }

    setImageLinks(updated);
    if ((!selectedCoverUrl || !updated.includes(selectedCoverUrl)) && updated.length > 0) {
      setSelectedCoverUrl(updated[0]);
    }
    setNewImageInput('');
    if (addedCount > 0) {
      toast.success(`Added ${addedCount} image link${addedCount > 1 ? 's' : ''}`);
    } else {
      toast.info('Image link already in the list');
    }
  };

  const handleRemoveImageLink = (index: number) => {
    const removedUrl = imageLinks[index];
    const updated = imageLinks.filter((_, idx) => idx !== index);
    setImageLinks(updated);
    if (selectedCoverUrl === removedUrl) {
      setSelectedCoverUrl(updated.length > 0 ? updated[0] : '');
    }
  };

  // Insert standard minutes template
  const handleInsertTemplate = () => {
    const template = `# Forum Edition ${forum.edition} — Meeting Minutes

**Date:** ${forum.date} | **Time:** ${forum.time || '14:30'}  
**Location:** ${forum.location || 'FabLab Main Collaborative Hub'}  
**Chairperson:** ${forum.roles?.chairperson?.name || 'TBD'}  
**Note Taker:** ${forum.roles?.noteTaker?.name || 'TBD'}

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

    if (!minutesMarkdown.trim()) {
      setMinutesMarkdown(template);
      toast.success('Inserted standard meeting minutes template!');
    } else {
      if (confirm('This will append the standard template to your existing notes. Continue?')) {
        setMinutesMarkdown((prev) => prev + '\n\n' + template);
        toast.success('Template appended!');
      }
    }
  };

  // Helper to insert formatting at cursor
  const handleInsertFormatting = (prefix: string, suffix: string = '', defaultText: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = minutesMarkdown.substring(start, end) || defaultText;
    const replacement = `${prefix}${selected}${suffix}`;

    const updated = minutesMarkdown.substring(0, start) + replacement + minutesMarkdown.substring(end);
    setMinutesMarkdown(updated);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + prefix.length + selected.length);
    }, 0);
  };

  // Sanitize and render HTML from Markdown
  const renderedHtml = useMemo(() => {
    if (!minutesMarkdown.trim()) return '';
    try {
      const parsed = marked.parse(minutesMarkdown) as string;
      return DOMPurify.sanitize(parsed, {
        ADD_TAGS: ['table', 'thead', 'tbody', 'tr', 'th', 'td', 'input', 'img', 'a', 'span', 'b', 'i', 'code', 'pre', 'hr'],
        ADD_ATTR: ['target', 'rel', 'checked', 'type', 'disabled', 'class', 'href', 'src', 'alt', 'title'],
      });
    } catch (e) {
      console.error('Markdown parse error:', e);
      return minutesMarkdown;
    }
  }, [minutesMarkdown]);

  const handleToggleResolved = (itemId: string) => {
    if (resolvedItemIds.includes(itemId)) {
      setResolvedItemIds(resolvedItemIds.filter((id) => id !== itemId));
    } else {
      setResolvedItemIds([...resolvedItemIds, itemId]);
    }
  };

  const handleAddNewActionItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newActionTitle.trim()) return;

    setNewActionItems([
      ...newActionItems,
      {
        title: newActionTitle.trim(),
        description: '',
        assignee: newActionAssignee.trim(),
        department: newActionDept,
        isResolved: false,
      },
    ]);

    setNewActionTitle('');
    setNewActionAssignee('');
    toast.success('Action item queued for recording');
  };

  const handleRemoveNewActionItem = (index: number) => {
    setNewActionItems(newActionItems.filter((_, i) => i !== index));
  };

  // Save Media & Minutes without altering status to COMPLETED
  const handleSaveMediaOnly = async () => {
    setIsSubmitting(true);
    try {
      const effectiveCover =
        (selectedCoverUrl && imageLinks.includes(selectedCoverUrl))
          ? selectedCoverUrl
          : (imageLinks.length > 0 ? imageLinks[0] : '');

      await updateForumMut({
        forumId: forum.forumId,
        minutesMarkdown: minutesMarkdown.trim() || undefined,
        coverImageUrl: effectiveCover || (imageLinks.length > 0 ? imageLinks[0] : ''),
        eventPhotos: imageLinks,
        keyTakeaways: keyTakeaways.trim() || undefined,
      });

      toast.success(`Forum Edition #${forum.edition} media & minutes saved!`);
      onClose();
    } catch (err: any) {
      console.error('Error saving media:', err);
      toast.error(err.message || 'Failed to save media & minutes');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Complete forum session with records
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!minutesMarkdown.trim()) {
      toast.error('Please enter the meeting minutes in Markdown before marking completed.');
      return;
    }

    setIsSubmitting(true);
    try {
      const effectiveCover =
        (selectedCoverUrl && imageLinks.includes(selectedCoverUrl))
          ? selectedCoverUrl
          : (imageLinks.length > 0 ? imageLinks[0] : '');

      await completeForumMut({
        forumId: forum.forumId,
        minutesMarkdown: minutesMarkdown.trim(),
        coverImageUrl: effectiveCover || (imageLinks.length > 0 ? imageLinks[0] : ''),
        eventPhotos: imageLinks,
        keyTakeaways: keyTakeaways.trim() || 'Session concluded with cross-disciplinary presentations and discussions.',
        resolvedActionItemIds: resolvedItemIds,
        newActionItems: newActionItems,
        userEmail,
      });

      toast.success(`Forum Edition #${forum.edition} marked Complete with records saved!`);
      onClose();
    } catch (err: any) {
      console.error('Error completing forum:', err);
      toast.error(err.message || 'Failed to complete forum session');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[92vh] flex flex-col p-0 overflow-hidden bg-background border border-border shadow-2xl rounded-2xl">
        {/* Header */}
        <DialogHeader className="p-6 pb-4 border-b border-border bg-gradient-to-r from-emerald-500/15 via-sky-500/10 to-indigo-500/15">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pr-6">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-600 text-white shadow-sm">
                  {forum.editionLabel || `Edition #${forum.edition}`}
                </span>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  {forum.date}
                </span>
                {forum.time && (
                  <span className="text-xs text-muted-foreground">
                    • {forum.time}
                  </span>
                )}
              </div>
              <DialogTitle className="text-xl font-bold text-foreground">
                {forum.status === 'COMPLETED' ? 'Update Media & Minutes' : 'Manage Media, Minutes & Completion'}: {forum.title}
              </DialogTitle>
              <p className="text-xs text-muted-foreground">
                Document meeting minutes in Markdown and link event photos/media via Google Drive. Save updates at any time or mark complete.
              </p>
            </div>
          </div>
        </DialogHeader>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* SECTION 1: MEETING MINUTES IN MARKDOWN */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <label className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                1. Meeting Minutes (Markdown) <span className="text-red-500">*</span>
              </label>

              {/* Mode Switcher Tabs */}
              <div className="flex items-center gap-1.5">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleInsertTemplate}
                  className="h-7 text-[11px] gap-1 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10 font-medium"
                >
                  <Sparkles className="w-3 h-3 text-emerald-500" />
                  Insert Minutes Template
                </Button>

                <div className="flex items-center bg-muted/60 p-0.5 rounded-lg border border-border">
                  <button
                    type="button"
                    onClick={() => setActiveTab('edit')}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all flex items-center gap-1 ${
                      activeTab === 'edit'
                        ? 'bg-background text-foreground shadow-xs'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Edit3 className="w-3 h-3" />
                    Write
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('preview')}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all flex items-center gap-1 ${
                      activeTab === 'preview'
                        ? 'bg-background text-foreground shadow-xs'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Eye className="w-3 h-3" />
                    Preview
                  </button>
                </div>
              </div>
            </div>

            {/* Markdown Toolbar (when on Edit tab) */}
            {activeTab === 'edit' && (
              <div className="flex flex-wrap items-center gap-1 p-1.5 rounded-t-xl bg-muted/40 border border-b-0 border-border">
                <button
                  type="button"
                  onClick={() => handleInsertFormatting('**', '**', 'bold text')}
                  className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                  title="Bold (**text**)"
                >
                  <Bold className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleInsertFormatting('*', '*', 'italic text')}
                  className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                  title="Italic (*text*)"
                >
                  <Italic className="w-3.5 h-3.5" />
                </button>
                <div className="w-px h-4 bg-border mx-0.5" />
                <button
                  type="button"
                  onClick={() => handleInsertFormatting('## ', '', 'Section Title')}
                  className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                  title="Heading 2 (## Title)"
                >
                  <Heading2 className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleInsertFormatting('### ', '', 'Subsection')}
                  className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                  title="Heading 3 (### Title)"
                >
                  <Heading3 className="w-3.5 h-3.5" />
                </button>
                <div className="w-px h-4 bg-border mx-0.5" />
                <button
                  type="button"
                  onClick={() => handleInsertFormatting('- ', '', 'Bullet item')}
                  className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                  title="Bullet List (- item)"
                >
                  <List className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleInsertFormatting('1. ', '', 'Numbered item')}
                  className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                  title="Numbered List (1. item)"
                >
                  <ListOrdered className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleInsertFormatting('- [ ] ', '', 'Action item')}
                  className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                  title="Checklist Item (- [ ] item)"
                >
                  <CheckSquare className="w-3.5 h-3.5" />
                </button>
                <div className="w-px h-4 bg-border mx-0.5" />
                <button
                  type="button"
                  onClick={() => handleInsertFormatting('> ', '', 'Quoted text')}
                  className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                  title="Quote (> text)"
                >
                  <Quote className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleInsertFormatting('```\n', '\n```', 'code block')}
                  className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                  title="Code Block"
                >
                  <Code className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() =>
                    handleInsertFormatting(
                      '| Item | Discipline | Status |\n|---|---|---|\n| ',
                      ' | FabLab | Done |',
                      'Demo'
                    )
                  }
                  className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                  title="Insert Table"
                >
                  <Table className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Editor vs Live Preview */}
            {activeTab === 'edit' ? (
              <Textarea
                ref={textareaRef}
                value={minutesMarkdown}
                onChange={(e) => setMinutesMarkdown(e.target.value)}
                placeholder="Type or paste meeting minutes in Markdown... You can use headings (##), bullet points (-), checklists (- [ ]), and bold/italic text."
                rows={11}
                className="font-mono text-xs leading-relaxed bg-card rounded-t-none border-t-0 focus-visible:ring-emerald-500"
              />
            ) : (
              <div className="w-full min-h-[220px] max-h-[360px] overflow-y-auto p-5 rounded-xl border border-border bg-card/60">
                {renderedHtml ? (
                  <div
                    className="prose prose-sm dark:prose-invert max-w-none text-xs leading-relaxed space-y-3"
                    dangerouslySetInnerHTML={{ __html: renderedHtml }}
                  />
                ) : (
                  <div className="text-center py-12 text-muted-foreground text-xs italic">
                    No minutes written yet. Switch to "Write" tab or click "Insert Minutes Template" above.
                  </div>
                )}
              </div>
            )}
          </div>

          <hr className="border-border" />

          {/* SECTION 2: FORUM PHOTOS & COVER BANNER SELECTION */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                <ImageIcon className="w-4 h-4" />
                2. Forum Photos & Cover Banner
              </label>
              {selectedCoverUrl && (
                <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1 shrink-0 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  <Crown className="w-3 h-3 text-amber-500 fill-amber-500" />
                  Cover Banner Selected
                </span>
              )}
            </div>

            {/* Multiple Image Links & Cover Banner Selection */}
            <div className="p-4 rounded-xl border border-border bg-card/40 space-y-3">
              <p className="text-[11px] text-muted-foreground">
                Add multiple image links below. Click any image to choose it as the visual cover banner for the forum card.
              </p>

              {/* Add Image Link Input */}
              <div className="flex gap-2">
                <Input
                  value={newImageInput}
                  onChange={(e) => setNewImageInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddImageLinks();
                    }
                  }}
                  placeholder="Paste image URL (https://... or comma-separated URLs) and press Enter"
                  className="bg-card text-xs flex-1"
                />
                <Button
                  type="button"
                  onClick={handleAddImageLinks}
                  size="sm"
                  className="gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white shrink-0 font-medium"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Link
                </Button>
              </div>

              {/* Added Images Grid */}
              {imageLinks.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 pt-1">
                  {imageLinks.map((url, index) => {
                    const isCover = selectedCoverUrl === url;
                    return (
                      <div
                        key={index}
                        onClick={() => setSelectedCoverUrl(url)}
                        className={`group relative aspect-video rounded-xl overflow-hidden border cursor-pointer transition-all duration-200 bg-muted/30 ${
                          isCover
                            ? 'border-emerald-500 ring-2 ring-emerald-500/80 shadow-md scale-[1.02]'
                            : 'border-border/80 hover:border-emerald-500/60 hover:shadow-xs'
                        }`}
                        title={isCover ? 'Current Cover Banner (Click another to change)' : 'Click to select as Cover Banner'}
                      >
                        <img
                          src={normalizeForumImageUrl(url)}
                          alt={`Forum photo ${index + 1}`}
                          referrerPolicy="no-referrer"
                          loading="lazy"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                          onError={(e) => {
                            const fallback = getDriveThumbnailFallbackUrl(url);
                            if (fallback && e.currentTarget.src !== fallback) {
                              e.currentTarget.src = fallback;
                            } else {
                              (e.target as any).src =
                                'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="60" viewBox="0 0 100 60"><rect width="100" height="60" fill="%23222"/><text x="50" y="32" fill="%23888" font-size="10" text-anchor="middle">Broken Image</text></svg>';
                            }
                          }}
                        />

                        {/* Gradient shade */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent pointer-events-none" />

                        {/* Cover status badge */}
                        <div className="absolute top-1.5 left-1.5">
                          {isCover ? (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-600 text-white shadow-sm flex items-center gap-1 backdrop-blur-md">
                              <Crown className="w-2.5 h-2.5 text-amber-300 fill-amber-300" />
                              Cover
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded-full text-[9px] font-semibold bg-black/60 text-white/90 backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity">
                              Set Cover
                            </span>
                          )}
                        </div>

                        {/* Top-right Actions: external link + delete */}
                        <div className="absolute top-1.5 right-1.5 flex items-center gap-1">
                          <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="p-1 rounded-md bg-black/60 hover:bg-black/90 text-white shadow transition-colors"
                            title="Open full image in new tab"
                          >
                            <ExternalLink className="w-3 h-3" />
                          </a>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveImageLink(index);
                            }}
                            className="p-1 rounded-md bg-rose-600/80 hover:bg-rose-600 text-white shadow transition-colors"
                            title="Remove image link"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>

                        {/* Bottom image index/label */}
                        <div className="absolute bottom-1 left-2 right-2 flex items-center justify-between text-[10px] text-white/90 pointer-events-none">
                          <span className="truncate max-w-[80%] font-medium">#{index + 1}</span>
                          {isCover && <Check className="w-3 h-3 text-emerald-400 font-bold" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-6 border-2 border-dashed border-border rounded-xl bg-card/20 space-y-1">
                  <ImageIcon className="w-6 h-6 text-muted-foreground/60 mx-auto" />
                  <p className="text-xs font-medium text-foreground">No Image Links Added Yet</p>
                  <p className="text-[11px] text-muted-foreground max-w-xs mx-auto">
                    Paste one or more image links above to showcase photos and select a cover banner for forum cards.
                  </p>
                </div>
              )}
            </div>
          </div>

          <hr className="border-border" />

          {/* SECTION 3: KEY TAKEAWAYS */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              3. Key Takeaways & Highlights
            </label>
            <Textarea
              placeholder="Brief 1-3 highlights, feedback points, or breakthroughs for card previews..."
              value={keyTakeaways}
              onChange={(e) => setKeyTakeaways(e.target.value)}
              rows={3}
              className="bg-card text-xs leading-relaxed"
            />
          </div>

          <hr className="border-border" />

          {/* SECTION 4: ACTION ITEMS & RESOLUTION */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <label className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                  <CheckSquare className="w-4 h-4" />
                  4. Review & Resolve Action Items
                </label>
                <p className="text-[11px] text-muted-foreground">
                  Check items resolved in this session. Unchecked items remain in the pool for future forums.
                </p>
              </div>
            </div>

            {/* Existing / Carried-Over Items Checklist */}
            {associatedItems.length > 0 && (
              <div className="space-y-2 p-3 rounded-xl border border-border bg-muted/20">
                <div className="text-[11px] font-semibold text-muted-foreground uppercase">
                  Session Follow-Ups ({associatedItems.length})
                </div>
                {associatedItems.map((item: any) => {
                  const isChecked = resolvedItemIds.includes(item.itemId) || item.isResolved;
                  return (
                    <div
                      key={item.itemId}
                      onClick={() => handleToggleResolved(item.itemId)}
                      className={`flex items-start gap-2.5 p-2 rounded-lg border cursor-pointer transition-all ${
                        isChecked
                          ? 'bg-emerald-500/10 border-emerald-500/40 text-foreground'
                          : 'bg-background border-border/70 text-foreground/80'
                      }`}
                    >
                      <div className="mt-0.5">
                        {isChecked ? (
                          <CheckSquare className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <Square className="w-4 h-4 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex-1 space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-medium ${isChecked ? 'line-through text-muted-foreground' : ''}`}>
                            {item.title}
                          </span>
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-muted border">
                            {item.department || 'General'}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Add New Action Items Identified during this Forum */}
            <div className="p-3.5 rounded-xl border border-border bg-card space-y-3">
              <div className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5 text-emerald-600" />
                Add New Action Items from this Forum
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                <Input
                  placeholder="Action item title..."
                  value={newActionTitle}
                  onChange={(e) => setNewActionTitle(e.target.value)}
                  className="sm:col-span-2 text-xs bg-background"
                />
                <Input
                  placeholder="Assignee (Lead)..."
                  value={newActionAssignee}
                  onChange={(e) => setNewActionAssignee(e.target.value)}
                  className="text-xs bg-background"
                />
                <select
                  value={newActionDept}
                  onChange={(e) => setNewActionDept(e.target.value)}
                  className="h-9 px-2.5 rounded-md border border-border bg-background text-xs text-foreground focus:outline-none"
                >
                  <option value="Technology">Technology</option>
                  <option value="FabLab">FabLab</option>
                  <option value="Astronomy">Astronomy</option>
                  <option value="General">General</option>
                </select>
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddNewActionItem}
                disabled={!newActionTitle.trim()}
                className="gap-1.5 text-xs border-border hover:bg-muted"
              >
                <Plus className="w-3.5 h-3.5" />
                Queue Action Item
              </Button>

              {/* Staged New Action Items */}
              {newActionItems.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  {newActionItems.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground">{item.title}</span>
                        <span className="px-1.5 py-0.2 rounded text-[10px] bg-background border">
                          {item.department}
                        </span>
                        {item.assignee && (
                          <span className="text-[10px] text-muted-foreground">Lead: {item.assignee}</span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveNewActionItem(idx)}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-border">
            <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting} className="text-xs">
              Cancel
            </Button>
            <div className="flex items-center gap-2.5">
              <Button
                type="button"
                variant="outline"
                onClick={handleSaveMediaOnly}
                disabled={isSubmitting}
                className="gap-2 text-xs border-border hover:bg-muted font-medium"
              >
                {isSubmitting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <UploadCloud className="w-3.5 h-3.5 text-sky-500" />
                )}
                Save Draft Media & Minutes
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="gap-2 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-sm"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    {forum.status === 'COMPLETED' ? 'Update & Save Complete' : 'Mark as Complete'}
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
