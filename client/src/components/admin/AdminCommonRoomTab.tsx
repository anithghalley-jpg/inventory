import React, { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Plus,
  Trash2,
  Edit2,
  Video,
  Mic,
  Tag,
  Mail,
  User,
  Users,
  ExternalLink,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Film,
  Play,
  Image as ImageIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  extractDriveId,
  getGoogleDriveEmbedUrl,
  getThumbnailUrl,
  getThumbnailFallback,
} from '@/lib/driveUtils';

interface GuestEntry {
  name: string;
  email: string;
}

interface CommonRoomFormData {
  podcastId?: string;
  podcastNumber: number;
  title: string;
  videoUrl: string;
  tagsString: string;
  description: string;
  guests: GuestEntry[];
  coverImageUrl?: string;
}

interface AdminCommonRoomTabProps {
  showAddForm: boolean;
  setShowAddForm: (show: boolean) => void;
}

export default function AdminCommonRoomTab({
  showAddForm,
  setShowAddForm,
}: AdminCommonRoomTabProps) {
  const podcasts = useQuery(api.commonRoom.getAll) || [];
  const upsertPodcastMut = useMutation(api.commonRoom.upsert);
  const removePodcastMut = useMutation(api.commonRoom.remove);

  const [formData, setFormData] = useState<CommonRoomFormData>({
    podcastNumber: (podcasts.length > 0 ? Math.max(...podcasts.map((p) => p.podcastNumber || 0)) + 1 : 1),
    title: '',
    videoUrl: '',
    tagsString: '',
    description: '',
    guests: [{ name: '', email: '' }],
    coverImageUrl: '',
  });

  const resetForm = () => {
    const nextNumber = podcasts.length > 0 ? Math.max(...podcasts.map((p) => p.podcastNumber || 0)) + 1 : 1;
    setFormData({
      podcastId: undefined,
      podcastNumber: nextNumber,
      title: '',
      videoUrl: '',
      tagsString: '',
      description: '',
      guests: [{ name: '', email: '' }],
      coverImageUrl: '',
    });
  };

  const handleEdit = (podcast: any) => {
    setFormData({
      podcastId: podcast.podcastId,
      podcastNumber: podcast.podcastNumber || 1,
      title: podcast.title || '',
      videoUrl: podcast.videoUrl || '',
      tagsString: (podcast.tags || []).join(', '),
      description: podcast.description || '',
      guests: podcast.guests && podcast.guests.length > 0 ? podcast.guests : [{ name: '', email: '' }],
      coverImageUrl: podcast.coverImageUrl || '',
    });
    setShowAddForm(true);
  };

  const handleDelete = async (podcastId: string) => {
    if (!confirm('Are you sure you want to delete this Common Room podcast episode?')) return;
    try {
      await removePodcastMut({ podcastId });
      toast.success('Podcast episode removed from Common Room');
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete podcast');
    }
  };

  const handleAddGuest = () => {
    setFormData((prev) => ({
      ...prev,
      guests: [...prev.guests, { name: '', email: '' }],
    }));
  };

  const handleRemoveGuest = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      guests: prev.guests.filter((_, i) => i !== index),
    }));
  };

  const handleGuestChange = (index: number, field: 'name' | 'email', value: string) => {
    setFormData((prev) => {
      const updatedGuests = [...prev.guests];
      updatedGuests[index] = { ...updatedGuests[index], [field]: value };
      return { ...prev, guests: updatedGuests };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      toast.error('Please enter a podcast title');
      return;
    }
    if (!formData.videoUrl.trim()) {
      toast.error('Please enter the Google Drive video link');
      return;
    }
    if (!formData.description.trim()) {
      toast.error('Please enter a short description');
      return;
    }

    // Filter valid guests
    const validGuests = formData.guests
      .map((g) => ({ name: g.name.trim(), email: g.email.trim() }))
      .filter((g) => g.name || g.email);

    if (validGuests.length === 0) {
      toast.error('Please add at least one guest name and email ID');
      return;
    }

    const tagsArray = formData.tagsString
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    try {
      await upsertPodcastMut({
        podcastId: formData.podcastId,
        podcastNumber: Number(formData.podcastNumber) || 1,
        title: formData.title.trim(),
        videoUrl: formData.videoUrl.trim(),
        tags: tagsArray,
        description: formData.description.trim(),
        guests: validGuests,
        coverImageUrl: formData.coverImageUrl?.trim() || undefined,
        published: true,
      });

      toast.success(
        formData.podcastId
          ? `Podcast #${formData.podcastNumber} updated successfully!`
          : `Podcast #${formData.podcastNumber} added to Common Room!`
      );
      resetForm();
      setShowAddForm(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to save podcast');
    }
  };

  const embedPreview = getGoogleDriveEmbedUrl(formData.videoUrl);

  return (
    <div className="space-y-6">
      {/* ADD / EDIT FORM */}
      {showAddForm && (
        <form
          onSubmit={handleSubmit}
          className="p-5 border-2 border-emerald-500/40 rounded-2xl bg-emerald-500/5 dark:bg-emerald-950/20 space-y-4 shadow-sm animate-in fade-in slide-in-from-top-2 duration-200"
        >
          <div className="flex items-center justify-between border-b pb-2">
            <h3 className="font-bold text-base flex items-center gap-2 text-foreground">
              <Mic className="w-5 h-5 text-emerald-600" />
              {formData.podcastId ? `Edit Podcast #${formData.podcastNumber}` : 'New Common Room Podcast Entry'}
            </h3>
            <span className="text-xs text-muted-foreground">
              Will be showcased under Learning &gt; Common Room
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">
                Podcast Number <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">
                  #
                </span>
                <Input
                  type="number"
                  min="1"
                  value={formData.podcastNumber}
                  onChange={(e) => setFormData({ ...formData, podcastNumber: parseInt(e.target.value) || 1 })}
                  className="pl-7 bg-background font-bold text-sm"
                  required
                />
              </div>
            </div>

            <div className="md:col-span-3 space-y-1">
              <label className="text-xs font-semibold text-foreground">
                Podcast Title <span className="text-red-500">*</span>
              </label>
              <Input
                placeholder="e.g. Navigating Autonomous Robotics & FabLab Micro-Controllers"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="bg-background text-sm font-medium"
                required
              />
            </div>
          </div>

          {/* Video Link, Thumbnail & Tags */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Video className="w-3.5 h-3.5 text-emerald-600" />
                Google Drive Video Link <span className="text-red-500">*</span>
              </label>
              <Input
                placeholder="https://drive.google.com/file/d/.../view"
                value={formData.videoUrl}
                onChange={(e) => setFormData({ ...formData, videoUrl: e.target.value })}
                className="bg-background text-xs font-mono"
                required
              />
              <p className="text-[11px] text-muted-foreground">
                Paste shared Google Drive file view or preview link.
              </p>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Film className="w-3.5 h-3.5 text-amber-500" />
                Thumbnail / Cover Image Link
              </label>
              <Input
                placeholder="https://... (Image link for video thumbnail)"
                value={formData.coverImageUrl || ''}
                onChange={(e) => setFormData({ ...formData, coverImageUrl: e.target.value })}
                className="bg-background text-xs font-mono"
              />
              <p className="text-[11px] text-muted-foreground">
                Shown as the video thumbnail with a play icon before the user clicks to play.
              </p>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-sky-600" />
                Tags (Comma-separated)
              </label>
              <Input
                placeholder="Technology, Robotics, FabLab, Astronomy, Hardware"
                value={formData.tagsString}
                onChange={(e) => setFormData({ ...formData, tagsString: e.target.value })}
                className="bg-background text-xs"
              />
              <p className="text-[11px] text-muted-foreground">
                Tags will display as colored badges on the podcast card.
              </p>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-foreground">
              Short Description <span className="text-red-500">*</span>
            </label>
            <Textarea
              placeholder="Provide a concise summary of the podcast discussion, key topics covered, insights shared, and presentation highlights..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="bg-background text-xs leading-relaxed"
              required
            />
          </div>

          {/* Guests List (Name + Email ID) */}
          <div className="space-y-2 pt-1 border-t border-border/80">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" />
                Guest Names & Email IDs <span className="text-red-500">*</span>
              </label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddGuest}
                className="h-7 text-xs gap-1 border-dashed"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Another Guest
              </Button>
            </div>

            <div className="space-y-2">
              {formData.guests.map((guest, idx) => (
                <div key={idx} className="flex items-center gap-2 bg-background/80 p-2 rounded-xl border border-border">
                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div className="relative">
                      <User className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2" />
                      <Input
                        placeholder="Guest Name (e.g. Dr. Alex Mercer)"
                        value={guest.name}
                        onChange={(e) => handleGuestChange(idx, 'name', e.target.value)}
                        className="pl-8 h-8 text-xs bg-background"
                        required
                      />
                    </div>
                    <div className="relative">
                      <Mail className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2" />
                      <Input
                        type="email"
                        placeholder="Guest Email ID (e.g. alex@university.edu)"
                        value={guest.email}
                        onChange={(e) => handleGuestChange(idx, 'email', e.target.value)}
                        className="pl-8 h-8 text-xs bg-background"
                        required
                      />
                    </div>
                  </div>

                  {formData.guests.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveGuest(idx)}
                      className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
                      title="Remove Guest"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Previews: Thumbnail & Video */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {formData.coverImageUrl && (
              <div className="p-3 rounded-xl border border-border bg-background/60 space-y-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Film className="w-3.5 h-3.5 text-amber-500" />
                  Thumbnail Preview (Shown before click-to-play)
                </span>
                <div className="relative aspect-video w-full rounded-lg overflow-hidden border bg-slate-900 group">
                  {extractDriveId(formData.coverImageUrl) ? (
                    <iframe
                      src={`https://drive.google.com/file/d/${extractDriveId(formData.coverImageUrl)}/preview`}
                      title="Thumbnail preview"
                      className="w-full h-full border-0 pointer-events-none"
                    />
                  ) : (
                    <img
                      src={formData.coverImageUrl}
                      alt="Thumbnail preview"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
              </div>
            )}

            {embedPreview && (
              <div className="p-3 rounded-xl border border-border bg-background/60 space-y-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Film className="w-3.5 h-3.5 text-emerald-600" />
                  Google Drive Video Embed Preview
                </span>
                <div className="relative aspect-video w-full rounded-lg overflow-hidden border bg-slate-900">
                  <iframe
                    src={embedPreview}
                    title="Video Preview"
                    className="w-full h-full border-0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              </div>
            )}
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                resetForm();
                setShowAddForm(false);
              }}
            >
              Cancel
            </Button>
            <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold">
              <CheckCircle2 className="w-4 h-4 mr-1.5" />
              {formData.podcastId ? 'Save Changes' : 'Publish to Common Room'}
            </Button>
          </div>
        </form>
      )}

      {/* PODCASTS LIST */}
      <div className="space-y-3">
        {podcasts.length === 0 ? (
          <div className="p-8 border-2 border-dashed rounded-2xl text-center space-y-2 bg-muted/10">
            <Mic className="w-10 h-10 text-muted-foreground/40 mx-auto" />
            <h4 className="text-sm font-semibold text-foreground">No Common Room Podcasts Added Yet</h4>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Add podcast episodes with Google Drive video links, tags, descriptions, and guest speaker details.
            </p>
            <Button
              size="sm"
              onClick={() => {
                resetForm();
                setShowAddForm(true);
              }}
              className="mt-2 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <Plus className="w-4 h-4 mr-1.5" /> Add First Podcast
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {podcasts.map((podcast) => {
              const embedUrl = getGoogleDriveEmbedUrl(podcast.videoUrl);
              return (
                <div
                  key={podcast.podcastId}
                  className="p-4 border rounded-2xl bg-card hover:border-emerald-500/40 hover:shadow-sm transition-all flex flex-col md:flex-row gap-4 justify-between items-start"
                >
                  {/* Thumbnail / Video Preview Thumbnail */}
                  <div className="w-full md:w-44 h-28 rounded-xl overflow-hidden shrink-0 border bg-slate-900 relative group flex items-center justify-center">
                    {extractDriveId(podcast.coverImageUrl || '') ? (
                      <iframe
                        src={`https://drive.google.com/file/d/${extractDriveId(podcast.coverImageUrl || '')}/preview`}
                        title={podcast.title}
                        className="w-full h-full border-0 pointer-events-none"
                      />
                    ) : podcast.coverImageUrl ? (
                      <img
                        src={podcast.coverImageUrl}
                        alt={podcast.title}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex flex-col items-center justify-center text-slate-500 text-[10px] gap-1 p-2 text-center">
                        <Film className="w-5 h-5 text-indigo-400/40" />
                        <span>Google Drive Video</span>
                      </div>
                    )}
                  </div>

                  <div className="flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider bg-purple-600 text-white shadow-xs">
                        Podcast #{podcast.podcastNumber}
                      </span>
                      <h4 className="text-base font-bold text-foreground">
                        {podcast.title}
                      </h4>
                    </div>

                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {podcast.description}
                    </p>

                    {/* Tags */}
                    {podcast.tags && podcast.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-0.5">
                        {podcast.tags.map((tag: string, tIdx: number) => (
                          <span
                            key={tIdx}
                            className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Guests List with Name & Email */}
                    {podcast.guests && podcast.guests.length > 0 && (
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <span className="text-[11px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                          <Users className="w-3 h-3 text-emerald-600" /> Guests:
                        </span>
                        {podcast.guests.map((guest: { name: string; email: string }, gIdx: number) => (
                          <span
                            key={gIdx}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs bg-muted/60 border border-border"
                          >
                            <span className="font-semibold text-foreground">{guest.name}</span>
                            <span className="text-muted-foreground text-[11px]">({guest.email})</span>
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Drive Link */}
                    {podcast.videoUrl && (
                      <div className="pt-1">
                        <a
                          href={podcast.videoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs text-emerald-700 hover:text-emerald-800 font-medium hover:underline"
                        >
                          <Video className="w-3.5 h-3.5" />
                          <span>Watch on Google Drive</span>
                          <ExternalLink className="w-3 h-3 ml-0.5" />
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0 self-start md:self-center">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0"
                      onClick={() => handleEdit(podcast)}
                      title="Edit Podcast"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                      onClick={() => handleDelete(podcast.podcastId)}
                      title="Delete Podcast"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
