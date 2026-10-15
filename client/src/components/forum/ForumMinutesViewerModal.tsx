import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FileText, Download, ExternalLink, X, Calendar, User, Sparkles } from 'lucide-react';

interface ForumMinutesViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  forum: {
    title: string;
    edition: number;
    editionLabel?: string;
    date: string;
    minutesPdfUrl?: string;
    minutesPdfName?: string;
    driveFolderUrl?: string;
    keyTakeaways?: string;
    roles?: {
      chairperson?: { name: string; department?: string };
      noteTaker?: { name: string; department?: string };
    };
  } | null;
}

export default function ForumMinutesViewerModal({
  isOpen,
  onClose,
  forum,
}: ForumMinutesViewerModalProps) {
  if (!forum) return null;

  const pdfUrl = forum.minutesPdfUrl || '';
  const isGoogleDriveView = pdfUrl.includes('drive.google.com') || pdfUrl.includes('/file/d/');
  
  // Format embeddable Google Drive preview URL if applicable
  let embedUrl = pdfUrl;
  if (isGoogleDriveView && pdfUrl.includes('/view')) {
    embedUrl = pdfUrl.replace('/view', '/preview');
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[92vh] flex flex-col p-0 overflow-hidden bg-background border border-border shadow-2xl rounded-2xl">
        {/* Header */}
        <DialogHeader className="p-5 pb-4 border-b border-border bg-gradient-to-r from-emerald-500/10 via-sky-500/10 to-indigo-500/10">
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
              </div>
              <DialogTitle className="text-xl font-bold text-foreground">
                Minutes of the Meeting: {forum.title}
              </DialogTitle>
              {forum.roles?.noteTaker?.name && (
                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-muted-foreground" />
                  Recorded by Note Taker: <span className="font-semibold text-foreground">{forum.roles.noteTaker.name}</span>
                </p>
              )}
            </div>

            <div className="flex items-center gap-2">
              {forum.driveFolderUrl && (
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                  className="gap-1.5 text-xs bg-background/80 hover:bg-background border-border"
                >
                  <a href={forum.driveFolderUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-3.5 h-3.5 text-sky-500" />
                    Open Drive Folder
                  </a>
                </Button>
              )}

              {pdfUrl && (
                <Button
                  size="sm"
                  asChild
                  className="gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white shadow"
                >
                  <a href={pdfUrl} target="_blank" rel="noopener noreferrer" download={forum.minutesPdfName || 'forum_minutes.pdf'}>
                    <Download className="w-3.5 h-3.5" />
                    Download PDF
                  </a>
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Key takeaways summary if available */}
          {forum.keyTakeaways && (
            <div className="p-4 rounded-xl bg-muted/50 border border-border/80 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                <Sparkles className="w-4 h-4" />
                Session Highlights & Key Takeaways
              </div>
              <p className="text-sm text-foreground/90 whitespace-pre-line leading-relaxed">
                {forum.keyTakeaways}
              </p>
            </div>
          )}

          {/* PDF Viewer / Document Preview */}
          {pdfUrl ? (
            <div className="w-full h-[540px] rounded-xl overflow-hidden border border-border bg-muted/20 relative shadow-inner">
              {pdfUrl.startsWith('data:application/pdf') || pdfUrl.endsWith('.pdf') || embedUrl.includes('drive.google.com') ? (
                <iframe
                  src={embedUrl}
                  title="Meeting Minutes PDF"
                  className="w-full h-full border-0"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center space-y-4">
                  <div className="w-16 h-16 rounded-2xl bg-emerald-100 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600">
                    <FileText className="w-8 h-8" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground text-base">
                      {forum.minutesPdfName || 'Meeting Minutes Document'}
                    </h4>
                    <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                      Click below to view or download the meeting minutes record directly.
                    </p>
                  </div>
                  <Button asChild className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white">
                    <a href={pdfUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="w-4 h-4" />
                      Open Minutes Document
                    </a>
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12 border-2 border-dashed border-border rounded-xl">
              <FileText className="w-10 h-10 text-muted-foreground mx-auto mb-2 opacity-50" />
              <p className="text-sm text-muted-foreground">No PDF minutes document uploaded yet.</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
