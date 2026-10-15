import React, { useState, useRef } from 'react';
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
} from 'lucide-react';
import { SCRIPT_URL, DRIVE_FOLDER_ID } from '@/config';
import { toast } from 'sonner';

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
    driveFolderName?: string;
    driveFolderId?: string;
    driveFolderUrl?: string;
    carriedOverActionItemIds?: string[];
    roles?: {
      chairperson?: { name: string };
      noteTaker?: { name: string };
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
  const actionItems = useQuery(api.forums.getAllActionItems, {}) || [];

  // Associated action items for this forum
  const associatedItems = actionItems.filter(
    (item: any) =>
      item.forumId === forum.forumId ||
      item.currentForumId === forum.forumId ||
      (forum.carriedOverActionItemIds || []).includes(item.itemId)
  );

  // Form State
  const [keyTakeaways, setKeyTakeaways] = useState('');
  
  // PDF Minutes State
  const [minutesPdfUrl, setMinutesPdfUrl] = useState('');
  const [minutesPdfName, setMinutesPdfName] = useState(`Minutes - Forum Edition ${forum.edition}.pdf`);
  const [isUploadingPdf, setIsUploadingPdf] = useState(false);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  // Photos State
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [coverPhotoUrl, setCoverPhotoUrl] = useState('');
  const [isUploadingPhotos, setIsUploadingPhotos] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  // Google Drive Folder State
  const targetFolderName = forum.driveFolderName || `Forum Edition ${forum.edition} - ${forum.date}`;
  const [driveFolderId, setDriveFolderId] = useState(forum.driveFolderId || '');
  const [driveFolderUrl, setDriveFolderUrl] = useState(
    forum.driveFolderUrl || (forum.driveFolderId ? `https://drive.google.com/drive/folders/${forum.driveFolderId}` : '')
  );

  // Action Items State
  const [resolvedItemIds, setResolvedItemIds] = useState<string[]>([]);
  const [newActionItems, setNewActionItems] = useState<
    { title: string; description: string; assignee: string; department: string; isResolved: boolean }[]
  >([]);
  const [newActionTitle, setNewActionTitle] = useState('');
  const [newActionDept, setNewActionDept] = useState('Technology');
  const [newActionAssignee, setNewActionAssignee] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Helper to convert File to Base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  // Upload Minutes PDF Handler
  const handlePdfSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.includes('pdf') && !file.name.endsWith('.pdf')) {
      toast.error('Please upload a valid PDF document for the meeting minutes.');
      return;
    }

    setIsUploadingPdf(true);
    setMinutesPdfName(file.name);

    try {
      const base64Data = await fileToBase64(file);
      const rawContent = base64Data.split(',')[1];

      // Try uploading directly to Google Drive via Google Apps Script
      try {
        const res = await fetch(SCRIPT_URL, {
          method: 'POST',
          body: JSON.stringify({
            action: 'uploadForumMedia',
            fileName: file.name,
            mimeType: 'application/pdf',
            content: rawContent,
            folderId: driveFolderId || undefined,
            folderName: targetFolderName,
            edition: forum.edition,
            date: forum.date,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            setMinutesPdfUrl(data.viewUrl || data.downloadUrl || base64Data);
            if (data.folderId) setDriveFolderId(data.folderId);
            if (data.folderUrl) setDriveFolderUrl(data.folderUrl);
            toast.success('Meeting minutes PDF uploaded to Google Drive folder!');
            return;
          }
        }
      } catch (scriptErr) {
        console.warn('Apps Script upload fallback to direct data storage:', scriptErr);
      }

      // Fallback to storing the data URL
      setMinutesPdfUrl(base64Data);
      toast.success('Meeting minutes PDF attached successfully!');
    } catch (err: any) {
      console.error('Error attaching PDF:', err);
      toast.error('Failed to attach PDF file');
    } finally {
      setIsUploadingPdf(false);
    }
  };

  // Upload Photos Handler
  const handlePhotosSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploadingPhotos(true);
    const newUrls: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const base64Data = await fileToBase64(file);
        const rawContent = base64Data.split(',')[1];

        // Upload to Drive folder
        let finalUrl = base64Data;
        try {
          const res = await fetch(SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({
              action: 'uploadForumMedia',
              fileName: file.name,
              mimeType: file.type || 'image/jpeg',
              content: rawContent,
              folderId: driveFolderId || undefined,
              folderName: targetFolderName,
              edition: forum.edition,
              date: forum.date,
            }),
          });

          if (res.ok) {
            const data = await res.json();
            if (data.success && (data.imageUrl || data.viewUrl)) {
              finalUrl = data.imageUrl || data.viewUrl;
              if (data.folderId && !driveFolderId) setDriveFolderId(data.folderId);
              if (data.folderUrl && !driveFolderUrl) setDriveFolderUrl(data.folderUrl);
            }
          }
        } catch (scriptErr) {
          console.warn('Apps Script photo fallback:', scriptErr);
        }

        newUrls.push(finalUrl);
      } catch (err) {
        console.error('Photo upload error:', err);
      }
    }

    const updated = [...photoUrls, ...newUrls];
    setPhotoUrls(updated);
    if (!coverPhotoUrl && updated.length > 0) {
      setCoverPhotoUrl(updated[0]);
    }
    setIsUploadingPhotos(false);
    toast.success(`${newUrls.length} session photo(s) attached!`);
  };

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!minutesPdfUrl) {
      toast.error('Please upload the Meeting Minutes (PDF) to complete this session.');
      return;
    }

    if (!keyTakeaways.trim()) {
      toast.error('Please enter key takeaways or highlights from the forum.');
      return;
    }

    setIsSubmitting(true);
    try {
      await completeForumMut({
        forumId: forum.forumId,
        minutesPdfUrl,
        minutesPdfName,
        coverImageUrl: coverPhotoUrl || photoUrls[0] || '',
        eventPhotos: photoUrls,
        driveFolderId: driveFolderId || undefined,
        driveFolderUrl: driveFolderUrl || (driveFolderId ? `https://drive.google.com/drive/folders/${driveFolderId}` : undefined),
        driveFolderName: targetFolderName,
        keyTakeaways: keyTakeaways.trim(),
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
              </div>
              <DialogTitle className="text-xl font-bold">
                Complete Session: {forum.title}
              </DialogTitle>
              <p className="text-xs text-muted-foreground">
                Upload official meeting minutes (PDF) and event photos to finalize records into Google Drive folder{' '}
                <span className="font-semibold text-foreground">"{targetFolderName}"</span>.
              </p>
            </div>
          </div>
        </DialogHeader>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Section 1: Minutes of Meeting (PDF) Upload */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                1. Minutes of the Meeting (PDF) <span className="text-red-500">*</span>
              </label>
              {minutesPdfUrl && (
                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  PDF Attached
                </span>
              )}
            </div>

            <input
              type="file"
              ref={pdfInputRef}
              accept="application/pdf,.pdf"
              onChange={handlePdfSelected}
              className="hidden"
            />

            {!minutesPdfUrl ? (
              <div
                onClick={() => pdfInputRef.current?.click()}
                className="border-2 border-dashed border-emerald-500/40 hover:border-emerald-500 bg-emerald-500/5 dark:bg-emerald-950/20 rounded-xl p-6 text-center cursor-pointer transition-all group"
              >
                {isUploadingPdf ? (
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
                    <p className="text-xs font-medium text-foreground">Uploading Minutes PDF to Google Drive...</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-12 h-12 rounded-xl bg-emerald-600/10 text-emerald-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                      <UploadCloud className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        Click to upload Minutes of Meeting (PDF)
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Will be saved directly to Google Drive folder "{targetFolderName}"
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-between p-3.5 rounded-xl border border-emerald-500/40 bg-emerald-500/10 dark:bg-emerald-950/30">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-emerald-600 text-white">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-foreground line-clamp-1">{minutesPdfName}</p>
                    <p className="text-[11px] text-muted-foreground flex items-center gap-2">
                      <span>Google Drive Folder: {targetFolderName}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => pdfInputRef.current?.click()}
                    className="text-xs h-8"
                  >
                    Replace PDF
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setMinutesPdfUrl('');
                      setMinutesPdfName('');
                    }}
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>

          <hr className="border-border" />

          {/* Section 2: Event Photos */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                <ImageIcon className="w-4 h-4" />
                2. Event Photos & Highlights
              </label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => photoInputRef.current?.click()}
                disabled={isUploadingPhotos}
                className="text-xs h-7 gap-1"
              >
                {isUploadingPhotos ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Plus className="w-3.5 h-3.5" />
                )}
                Add Photos
              </Button>
            </div>

            <input
              type="file"
              ref={photoInputRef}
              accept="image/*"
              multiple
              onChange={handlePhotosSelected}
              className="hidden"
            />

            {photoUrls.length === 0 ? (
              <div
                onClick={() => photoInputRef.current?.click()}
                className="border-2 border-dashed border-border hover:border-primary/40 rounded-xl p-5 text-center cursor-pointer transition-all bg-muted/20"
              >
                <ImageIcon className="w-8 h-8 text-muted-foreground mx-auto mb-1 opacity-60" />
                <p className="text-xs font-semibold text-foreground">Upload session photos</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Attach multiple presentation & crowd highlights to feature on the dashboard
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3">
                {photoUrls.map((url, idx) => {
                  const isCover = coverPhotoUrl === url || (!coverPhotoUrl && idx === 0);
                  return (
                    <div
                      key={idx}
                      className="group relative rounded-xl overflow-hidden border border-border bg-card aspect-video shadow-sm"
                    >
                      <img src={url} alt={`Session highlight ${idx + 1}`} className="w-full h-full object-cover" />
                      
                      {/* Cover Badge */}
                      {isCover && (
                        <div className="absolute top-1 left-1 bg-emerald-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow">
                          Cover
                        </div>
                      )}

                      {/* Hover Actions */}
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 p-1">
                        {!isCover && (
                          <button
                            type="button"
                            onClick={() => setCoverPhotoUrl(url)}
                            className="p-1 rounded bg-white/20 hover:bg-white text-white hover:text-black text-[10px] font-medium"
                            title="Set as Cover Photo"
                          >
                            <Star className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            const filtered = photoUrls.filter((_, i) => i !== idx);
                            setPhotoUrls(filtered);
                            if (coverPhotoUrl === url) {
                              setCoverPhotoUrl(filtered[0] || '');
                            }
                          }}
                          className="p-1 rounded bg-red-500/80 hover:bg-red-600 text-white text-[10px]"
                          title="Remove Photo"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <hr className="border-border" />

          {/* Section 3: Key Takeaways & Learned Points */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              3. Key Takeaways & Summary <span className="text-red-500">*</span>
            </label>
            <Textarea
              placeholder="Summarize key discoveries, student presentations, feedback received, and technical breakthroughs..."
              value={keyTakeaways}
              onChange={(e) => setKeyTakeaways(e.target.value)}
              rows={4}
              className="bg-card text-xs leading-relaxed"
              required
            />
          </div>

          <hr className="border-border" />

          {/* Section 4: Action Items & Follow-Up Resolution */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <label className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                  <CheckSquare className="w-4 h-4" />
                  4. Review & Resolve Action Items
                </label>
                <p className="text-[11px] text-muted-foreground">
                  Check items resolved in this session. Unchecked items will remain in the pool for future forums.
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

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                <Input
                  placeholder="New follow-up item title..."
                  value={newActionTitle}
                  onChange={(e) => setNewActionTitle(e.target.value)}
                  className="sm:col-span-6 h-8 text-xs bg-background"
                />
                <select
                  value={newActionDept}
                  onChange={(e) => setNewActionDept(e.target.value)}
                  className="sm:col-span-3 h-8 px-2 rounded-md border border-border bg-background text-xs"
                >
                  <option value="Technology">Technology</option>
                  <option value="FabLab">FabLab</option>
                  <option value="Astronomy">Astronomy</option>
                  <option value="General">General</option>
                </select>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleAddNewActionItem}
                  className="sm:col-span-3 h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  Add Item
                </Button>
              </div>

              {newActionItems.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  {newActionItems.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2 rounded-lg bg-muted/40 border border-border text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        <span className="font-medium text-foreground">{item.title}</span>
                        <span className="px-1.5 py-0.2 rounded text-[10px] bg-muted border">{item.department}</span>
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
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving & Completing...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Complete Session & Finalize Records
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
