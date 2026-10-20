import React, { useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  FileText,
  Download,
  ExternalLink,
  Calendar,
  User,
  Sparkles,
  Copy,
  Check,
  Folder,
  Printer,
  Crown,
  FileEdit,
  Clock,
  Timer,
  HelpCircle,
  Image as ImageIcon,
} from 'lucide-react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { toast } from 'sonner';

interface ForumMinutesViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  forum: {
    title: string;
    edition: number;
    editionLabel?: string;
    date: string;
    time?: string;
    location?: string;
    minutesMarkdown?: string;
    mediaDriveUrl?: string;
    minutesPdfUrl?: string;
    minutesPdfName?: string;
    driveFolderUrl?: string;
    keyTakeaways?: string;
    coverImageUrl?: string;
    eventPhotos?: string[];
    roles?: {
      chairperson?: { name: string; department?: string };
      noteTaker?: { name: string; department?: string };
      timeKeeper?: { name: string; department?: string };
      questionMaster?: { name: string; department?: string };
    };
  } | null;
}

export default function ForumMinutesViewerModal({
  isOpen,
  onClose,
  forum,
}: ForumMinutesViewerModalProps) {
  if (!forum) return null;

  const [copied, setCopied] = useState(false);
  const markdownContent = forum.minutesMarkdown || '';
  const driveMediaUrl = forum.mediaDriveUrl || forum.driveFolderUrl || '';

  // Render sanitized HTML from Markdown
  const renderedHtml = useMemo(() => {
    if (!markdownContent.trim()) return '';
    try {
      const parsed = marked.parse(markdownContent) as string;
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
        ADD_ATTR: ['target', 'rel', 'checked', 'type', 'disabled', 'class', 'href', 'src', 'alt', 'title'],
      });
    } catch (e) {
      console.error('Markdown parse error in minutes viewer:', e);
      return markdownContent;
    }
  }, [markdownContent]);

  // Copy Markdown content
  const handleCopy = () => {
    if (!markdownContent) return;
    navigator.clipboard.writeText(markdownContent);
    setCopied(true);
    toast.success('Meeting minutes copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  // Download as .md file
  const handleDownloadMd = () => {
    if (!markdownContent) return;
    const blob = new Blob([markdownContent], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Forum_Edition_${forum.edition}_Minutes.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('Markdown minutes downloaded!');
  };

  // Print view
  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-6xl w-full sm:w-[95vw] max-h-[94vh] flex flex-col p-0 overflow-hidden bg-background border border-border shadow-2xl rounded-2xl sm:rounded-3xl">
        {/* Header */}
        <DialogHeader className="p-5 pb-4 border-b border-border bg-gradient-to-r from-emerald-500/10 via-sky-500/10 to-indigo-500/10">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pr-6">
            <div className="space-y-1.5 flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider bg-emerald-600 text-white shadow-sm">
                  {forum.editionLabel || `Edition #${forum.edition}`}
                </span>
                <span className="text-xs text-muted-foreground flex items-center gap-1 font-medium">
                  <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                  {forum.date}
                </span>
                {forum.time && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1 font-medium">
                    <Clock className="w-3.5 h-3.5 text-sky-500" />
                    {forum.time}
                  </span>
                )}
                {forum.location && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1 font-medium">
                    📍 {forum.location}
                  </span>
                )}
              </div>

              <DialogTitle className="text-xl sm:text-2xl font-extrabold text-foreground tracking-tight leading-snug">
                {forum.title}
              </DialogTitle>
            </div>

            {/* Header Action Buttons */}
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {driveMediaUrl && (
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                  className="gap-1.5 text-xs bg-background hover:bg-muted border-border font-medium shadow-xs"
                >
                  <a href={driveMediaUrl} target="_blank" rel="noopener noreferrer">
                    <Folder className="w-3.5 h-3.5 text-sky-500" />
                    <span>Drive Media</span>
                    <ExternalLink className="w-3 h-3 text-muted-foreground" />
                  </a>
                </Button>
              )}

              {markdownContent && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopy}
                    className="gap-1.5 text-xs bg-background hover:bg-muted border-border shadow-xs"
                    title="Copy Markdown to Clipboard"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDownloadMd}
                    className="gap-1.5 text-xs bg-background hover:bg-muted border-border shadow-xs"
                    title="Download Markdown Document"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>.md</span>
                  </Button>
                </>
              )}
            </div>
          </div>
        </DialogHeader>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Prominent Student Officers Card */}
          <div className="p-4 rounded-2xl border border-border/80 bg-muted/20 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Crown className="w-3.5 h-3.5 text-amber-500" />
                Student Officers In Charge
              </span>
              <span className="text-[11px] text-muted-foreground font-medium">
                Collaborative Student Forum
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-xl bg-card border border-border/60 shadow-xs space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                  <Crown className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  Chairperson
                </div>
                <p className="text-sm font-bold text-foreground truncate">
                  {forum.roles?.chairperson?.name || 'TBD'}
                </p>
                {forum.roles?.chairperson?.department && (
                  <span className="inline-block text-[10px] text-muted-foreground font-medium bg-muted px-1.5 py-0.2 rounded">
                    {forum.roles.chairperson.department}
                  </span>
                )}
              </div>

              <div className="p-3 rounded-xl bg-card border border-border/60 shadow-xs space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                  <FileEdit className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                  Note Taker
                </div>
                <p className="text-sm font-bold text-foreground truncate">
                  {forum.roles?.noteTaker?.name || 'TBD'}
                </p>
                {forum.roles?.noteTaker?.department && (
                  <span className="inline-block text-[10px] text-muted-foreground font-medium bg-muted px-1.5 py-0.2 rounded">
                    {forum.roles.noteTaker.department}
                  </span>
                )}
              </div>

              <div className="p-3 rounded-xl bg-card border border-border/60 shadow-xs space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                  <Timer className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                  Time Keeper
                </div>
                <p className="text-sm font-bold text-foreground truncate">
                  {forum.roles?.timeKeeper?.name || 'TBD'}
                </p>
                {forum.roles?.timeKeeper?.department && (
                  <span className="inline-block text-[10px] text-muted-foreground font-medium bg-muted px-1.5 py-0.2 rounded">
                    {forum.roles.timeKeeper.department}
                  </span>
                )}
              </div>

              <div className="p-3 rounded-xl bg-card border border-border/60 shadow-xs space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                  <HelpCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                  Question Master
                </div>
                <p className="text-sm font-bold text-foreground truncate">
                  {forum.roles?.questionMaster?.name || 'TBD'}
                </p>
                {forum.roles?.questionMaster?.department && (
                  <span className="inline-block text-[10px] text-muted-foreground font-medium bg-muted px-1.5 py-0.2 rounded">
                    {forum.roles.questionMaster.department}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Embedded Forum Photos Gallery */}
          {forum.eventPhotos && forum.eventPhotos.length > 0 && (
            <div className="p-5 rounded-2xl border border-border bg-card shadow-xs space-y-3.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                  <ImageIcon className="w-4 h-4 text-emerald-500" />
                  <span>Session Photos & Highlights ({forum.eventPhotos.length})</span>
                </div>
                <span className="text-[11px] text-muted-foreground">Click any photo to view in high resolution</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {forum.eventPhotos.map((photo, i) => {
                  const isCover = forum.coverImageUrl === photo;
                  return (
                    <a
                      key={i}
                      href={photo}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`group relative aspect-video rounded-xl overflow-hidden border bg-muted/20 transition-all duration-200 shadow-xs hover:shadow-md ${
                        isCover ? 'ring-2 ring-emerald-500 border-emerald-500' : 'border-border/80 hover:border-emerald-500/60'
                      }`}
                      title={`Photo ${i + 1} (Click to open full size)`}
                    >
                      <img
                        src={photo}
                        alt={`Photo ${i + 1}`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                      />
                      {isCover && (
                        <span className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-600 text-white shadow-sm flex items-center gap-1 backdrop-blur-md">
                          <Crown className="w-2.5 h-2.5 text-amber-300 fill-amber-300" />
                          Cover
                        </span>
                      )}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <ExternalLink className="w-4 h-4 text-white drop-shadow" />
                      </div>
                    </a>
                  );
                })}
              </div>
            </div>
          )}
          {/* Key Takeaways Callout Card */}
          {forum.keyTakeaways && (
            <div className="p-4 rounded-2xl bg-emerald-500/10 dark:bg-emerald-950/30 border border-emerald-500/30 space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                Session Highlights & Key Takeaways
              </div>
              <p className="text-sm text-foreground/95 whitespace-pre-line leading-relaxed">
                {forum.keyTakeaways}
              </p>
            </div>
          )}

          {/* Markdown Minutes Document */}
          {markdownContent ? (
            <div className="p-6 rounded-2xl border border-border bg-card shadow-xs space-y-4">
              <div
                className="prose prose-sm dark:prose-invert max-w-none text-foreground leading-relaxed
                  prose-headings:font-bold prose-headings:tracking-tight prose-headings:text-foreground
                  prose-h1:text-xl prose-h1:border-b prose-h1:border-border/80 prose-h1:pb-2 prose-h1:mt-2
                  prose-h2:text-lg prose-h2:text-emerald-700 dark:prose-h2:text-emerald-400 prose-h2:mt-6 prose-h2:mb-3
                  prose-h3:text-base prose-h3:mt-4 prose-h3:mb-2
                  prose-p:text-xs sm:prose-p:text-sm prose-p:leading-relaxed prose-p:my-2
                  prose-ul:text-xs sm:prose-ul:text-sm prose-ul:my-2 prose-ul:space-y-1 prose-ul:list-disc prose-ul:pl-5
                  prose-ol:text-xs sm:prose-ol:text-sm prose-ol:my-2 prose-ol:space-y-1 prose-ol:list-decimal prose-ol:pl-5
                  prose-li:my-0.5
                  prose-blockquote:border-l-4 prose-blockquote:border-emerald-500/50 prose-blockquote:pl-4 prose-blockquote:italic prose-blockquote:text-muted-foreground
                  prose-code:text-[11px] prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:font-mono
                  prose-pre:bg-slate-900 prose-pre:text-slate-100 prose-pre:p-3.5 prose-pre:rounded-xl prose-pre:overflow-x-auto
                  prose-table:border-collapse prose-table:w-full prose-table:text-xs prose-table:my-3
                  prose-th:border prose-th:border-border prose-th:bg-muted/60 prose-th:p-2.5 prose-th:text-left prose-th:font-bold
                  prose-td:border prose-td:border-border prose-td:p-2.5"
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
                  This older forum was recorded with a PDF document ({forum.minutesPdfName || 'Minutes.pdf'}).
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
            <div className="text-center py-16 border-2 border-dashed border-border rounded-2xl space-y-2 bg-card/40">
              <FileText className="w-10 h-10 text-muted-foreground/50 mx-auto" />
              <p className="text-sm font-semibold text-foreground">No Minutes Documented Yet</p>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                The note taker or session moderator can add Markdown meeting minutes from the "Media & Minutes" action on the forum card.
              </p>
            </div>
          )}

          {/* Drive Media Shortcut Footer Card */}
          {driveMediaUrl && (
            <div className="p-4 rounded-xl border border-sky-500/30 bg-sky-500/5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400">
                  <Folder className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-foreground">Event Photos & Session Media</h4>
                  <p className="text-[11px] text-muted-foreground">
                    Access high-resolution event photography, presentation slides, and recordings in Google Drive.
                  </p>
                </div>
              </div>

              <Button size="sm" asChild className="gap-1.5 text-xs bg-sky-600 hover:bg-sky-700 text-white shrink-0">
                <a href={driveMediaUrl} target="_blank" rel="noopener noreferrer">
                  <span>Open Drive Folder</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
