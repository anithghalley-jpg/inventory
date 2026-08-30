import { useState, useRef, useEffect, useMemo } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Send,
  Bold,
  Italic,
  Code,
  List,
  CheckSquare,
  Heading2,
  Quote,
  Link as LinkIcon,
  Image as ImageIcon,
  Edit3,
  Trash2,
  Eye,
  FileText,
  CornerDownLeft,
  ChevronDown,
  MessageSquare,
  HelpCircle,
  Sparkles,
  Paperclip,
  X,
  Plus,
  Copy,
  Check,
  PanelRightOpen,
  PanelRightClose,
  Maximize2,
} from "lucide-react";
import {
  formatDateTime,
  formatDateOnly,
  MarkdownPostRenderer,
  ProjectAvatar,
  ImageWithLightbox,
  insertMarkdownFormatting,
  normalizeImageUrl,
  type ProjectDetailRecord,
  type TimelinePostKind,
} from "./projectShared";

interface ProjectChatPanelProps {
  projectDetail: ProjectDetailRecord;
  userEmail: string;
}

export default function ProjectChatPanel({
  projectDetail,
  userEmail,
}: ProjectChatPanelProps) {
  const [postBody, setPostBody] = useState("");
  const [postKind, setPostKind] = useState<TimelinePostKind>("note");
  const [composerTab, setComposerTab] = useState<"write" | "preview">("write");
  const [postImages, setPostImages] = useState<string[]>([]);
  const [showImageInput, setShowImageInput] = useState(false);
  const [imageUrlDraft, setImageUrlDraft] = useState("");
  const [showLivePreviewPanel, setShowLivePreviewPanel] = useState(false);

  // In-place edit state: entryId -> draft state
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editBodyDraft, setEditBodyDraft] = useState("");
  const [editTab, setEditTab] = useState<"write" | "preview">("write");
  const [isSaving, setIsSaving] = useState(false);

  // References for scrolling
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const composerTextareaRef = useRef<HTMLTextAreaElement>(null);
  const editTextareaRef = useRef<HTMLTextAreaElement>(null);

  const addTimelinePostMut = useMutation(api.projects.addTimelinePost);
  const updateTimelinePostMut = useMutation(api.projects.updateTimelinePost);
  const deleteTimelinePostMut = useMutation(api.projects.deleteTimelinePost);

  // Extract all timeline posts in chronological order (oldest to newest for chat stream)
  const posts = useMemo(() => {
    return projectDetail.timeline
      .filter((t) => t.itemType === "post")
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }, [projectDetail.timeline]);

  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  // Scroll to bottom on initial mount and when posts length changes
  useEffect(() => {
    scrollToBottom("auto");
  }, [posts.length]);

  const handlePublishPost = async () => {
    const trimmed = postBody.trim();
    if (!trimmed) {
      toast.error("Message content cannot be empty");
      return;
    }

    try {
      await addTimelinePostMut({
        userEmail,
        projectId: projectDetail.projectId,
        kind: postKind,
        body: trimmed,
        images: postImages.filter(Boolean),
      });

      setPostBody("");
      setPostImages([]);
      setShowImageInput(false);
      setImageUrlDraft("");
      setComposerTab("write");
      toast.success("Update posted to timeline");
      setTimeout(() => scrollToBottom("smooth"), 100);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to post message");
    }
  };

  const handleStartEdit = (post: any) => {
    setEditingPostId(post.id);
    setEditBodyDraft(post.body);
    setEditTab("write");
  };

  const handleCancelEdit = () => {
    setEditingPostId(null);
    setEditBodyDraft("");
  };

  const handleSaveEdit = async (entryId: string) => {
    const trimmed = editBodyDraft.trim();
    if (!trimmed) {
      toast.error("Message content cannot be empty");
      return;
    }

    setIsSaving(true);
    try {
      await updateTimelinePostMut({
        userEmail,
        projectId: projectDetail.projectId,
        entryId,
        body: trimmed,
      });

      toast.success("Post updated successfully");
      setEditingPostId(null);
      setEditBodyDraft("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update post");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeletePost = async (entryId: string) => {
    if (!confirm("Are you sure you want to delete this message?")) return;
    try {
      await deleteTimelinePostMut({
        userEmail,
        projectId: projectDetail.projectId,
        entryId,
      });
      toast.success("Message deleted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete message");
    }
  };

  const handleAddImage = () => {
    if (!imageUrlDraft.trim()) return;
    setPostImages((prev) => [...prev, imageUrlDraft.trim()]);
    setImageUrlDraft("");
    setShowImageInput(false);
  };

  const handleRemoveImage = (index: number) => {
    setPostImages((prev) => prev.filter((_, i) => i !== index));
  };

  // Quick formatting insertion
  const applyComposerFormat = (before: string, after = "", defaultText = "text") => {
    const updated = insertMarkdownFormatting(composerTextareaRef.current, before, after, defaultText);
    if (updated) setPostBody(updated);
  };

  const applyEditFormat = (before: string, after = "", defaultText = "text") => {
    const updated = insertMarkdownFormatting(editTextareaRef.current, before, after, defaultText);
    if (updated) setEditBodyDraft(updated);
  };

  const getKindBadge = (kind: TimelinePostKind) => {
    switch (kind) {
      case "question":
        return (
          <Badge variant="outline" className="text-[10px] uppercase tracking-wider border-indigo-200 bg-indigo-50 text-indigo-700 font-semibold gap-1">
            <HelpCircle className="h-3 w-3" /> Question
          </Badge>
        );
      case "comment":
        return (
          <Badge variant="outline" className="text-[10px] uppercase tracking-wider border-blue-200 bg-blue-50 text-blue-700 font-semibold gap-1">
            <MessageSquare className="h-3 w-3" /> Comment
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-[10px] uppercase tracking-wider border-slate-200 bg-slate-100 text-slate-700 font-semibold gap-1">
            <FileText className="h-3 w-3" /> Note / Update
          </Badge>
        );
    }
  };

  return (
    <div className="flex flex-col h-[760px] max-h-[82vh] neumorph-card overflow-hidden bg-slate-50/50 relative">
      {/* ── Fixed Top Chat Stream Header ── */}
      <div className="flex items-center justify-between px-6 py-3.5 border-b border-slate-200/80 bg-white/95 backdrop-blur-sm shrink-0 z-10 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-700 shadow-xs">
            <MessageSquare className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              Project Timeline & Chat Stream
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                {posts.length} {posts.length === 1 ? "cell" : "cells"}
              </span>
            </h3>
            <p className="text-[11px] text-slate-500">
              Real-time Markdown discussions, progress updates, and notes
            </p>
          </div>
        </div>

        {/* Live Preview Side Panel Toggle */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowLivePreviewPanel((prev) => !prev)}
          className={`h-8 text-xs font-semibold rounded-xl gap-1.5 transition-all ${
            showLivePreviewPanel
              ? "bg-indigo-50 border-indigo-200 text-indigo-700 shadow-xs"
              : "neumorph-btn text-slate-700"
          }`}
          title={showLivePreviewPanel ? "Close live preview panel" : "Open live Markdown preview side panel"}
        >
          {showLivePreviewPanel ? (
            <PanelRightClose className="h-3.5 w-3.5 text-indigo-600" />
          ) : (
            <PanelRightOpen className="h-3.5 w-3.5 text-slate-500" />
          )}
          <span>{showLivePreviewPanel ? "Close Live Panel" : "Live Markdown Panel"}</span>
        </Button>
      </div>

      {/* ── Main Content Area: Left Chat Stream + Right Side Panel ── */}
      <div className="flex-1 flex min-h-0 overflow-hidden relative">
        {/* Left Column: Chat Stream + Fixed Bottom Composer */}
        <div className="flex-1 min-w-0 flex flex-col h-full overflow-hidden">
          {/* Scrollable Chat Stream (middle scrolls while top & bottom remain fixed) */}
          <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
            {posts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-16 space-y-3">
                <div className="h-12 w-12 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center justify-center text-slate-400">
                  <MessageSquare className="h-6 w-6" />
                </div>
                <p className="text-sm font-semibold text-slate-700">No timeline updates yet</p>
                <p className="text-xs text-slate-400 max-w-sm">
                  Use the Markdown composer below to post the first update, note, or discussion point for this project.
                </p>
              </div>
            ) : (
              posts.map((post) => {
                const isEditing = editingPostId === post.id;
                const isAuthor = post.authorEmail.toLowerCase() === userEmail.toLowerCase();
                const canManage =
                  isAuthor ||
                  projectDetail.permissions.canModerateTimeline ||
                  projectDetail.permissions.canApproveBuiltInStages;
                const authorMember = projectDetail.members.find(
                  (m) => m.userEmail.toLowerCase() === post.authorEmail.toLowerCase()
                );
                const avatarUrl = authorMember?.profileImageUrl;

                return (
                  <div
                    key={post.id}
                    className="neumorph-chat-cell p-4 md:p-5 transition-all duration-200"
                  >
                    {/* Message Header */}
                    <div className="flex items-start justify-between gap-3 pb-2.5 mb-2.5 border-b border-slate-100">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <ProjectAvatar
                          imageUrl={avatarUrl}
                          label={post.authorName}
                          className="h-9 w-9 border border-white shadow-xs shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-slate-900 text-sm">{post.authorName}</span>
                            <Badge
                              variant="outline"
                              className="text-[9px] uppercase tracking-wider py-0 px-1.5 border-slate-200 text-slate-500 font-medium"
                            >
                              {post.authorRole}
                            </Badge>
                            {getKindBadge(post.kind)}
                          </div>
                          <span className="text-[11px] text-slate-400">
                            {formatDateTime(post.createdAt)}
                            {post.updatedAt !== post.createdAt && " (edited)"}
                          </span>
                        </div>
                      </div>

                      {/* Actions (Edit / Delete) */}
                      {canManage && !isEditing && (
                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg"
                            title="Edit Markdown"
                            onClick={() => handleStartEdit(post)}
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                            title="Delete post"
                            onClick={() => handleDeletePost(post.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Message Body or In-place Editor */}
                    {isEditing ? (
                      <div className="space-y-3 pt-1">
                        <div className="flex items-center justify-between gap-2">
                          {/* Mini Toolbar */}
                          <div className="flex items-center gap-1 flex-wrap">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-slate-600 rounded-md"
                              title="Bold"
                              onClick={() => applyEditFormat("**", "**", "bold text")}
                            >
                              <Bold className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-slate-600 rounded-md"
                              title="Italic"
                              onClick={() => applyEditFormat("*", "*", "italic text")}
                            >
                              <Italic className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-slate-600 rounded-md"
                              title="Heading"
                              onClick={() => applyEditFormat("### ", "", "Heading")}
                            >
                              <Heading2 className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-slate-600 rounded-md"
                              title="Code Block"
                              onClick={() => applyEditFormat("```\n", "\n```", "code")}
                            >
                              <Code className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-slate-600 rounded-md"
                              title="Bullet List"
                              onClick={() => applyEditFormat("- ", "", "item")}
                            >
                              <List className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-slate-600 rounded-md"
                              title="Task Checklist"
                              onClick={() => applyEditFormat("- [ ] ", "", "task item")}
                            >
                              <CheckSquare className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-slate-600 rounded-md"
                              title="Quote"
                              onClick={() => applyEditFormat("> ", "", "quote")}
                            >
                              <Quote className="h-3.5 w-3.5" />
                            </Button>
                          </div>

                          {/* Edit / Preview tab switcher */}
                          <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-0.5 text-xs">
                            <button
                              type="button"
                              className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                                editTab === "write" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500"
                              }`}
                              onClick={() => setEditTab("write")}
                            >
                              Write
                            </button>
                            <button
                              type="button"
                              className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                                editTab === "preview" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500"
                              }`}
                              onClick={() => setEditTab("preview")}
                            >
                              Preview
                            </button>
                          </div>
                        </div>

                        {editTab === "write" ? (
                          <Textarea
                            ref={editTextareaRef}
                            value={editBodyDraft}
                            onChange={(e) => setEditBodyDraft(e.target.value)}
                            className="neumorph-inset min-h-[120px] font-mono text-sm border-slate-200 bg-white"
                            placeholder="Write markdown message..."
                          />
                        ) : (
                          <div className="neumorph-inset p-4 rounded-xl min-h-[120px] bg-slate-50">
                            <MarkdownPostRenderer content={editBodyDraft || "*No content*"} />
                          </div>
                        )}

                        <div className="flex justify-end gap-2 pt-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={handleCancelEdit}
                            className="rounded-lg border-slate-200 text-xs"
                          >
                            Cancel
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleSaveEdit(post.id)}
                            disabled={isSaving}
                            className="bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs"
                          >
                            {isSaving ? "Saving..." : "Save & Compile"}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {/* Compiled Markdown Content */}
                        <div className="text-slate-800 text-sm leading-relaxed max-w-full overflow-hidden">
                          <MarkdownPostRenderer content={post.body} />
                        </div>

                        {/* Attached Images */}
                        {post.images && post.images.length > 0 && (
                          <div className="flex flex-wrap gap-2 pt-1">
                            {post.images.map((img: string, idx: number) => (
                              <div
                                key={idx}
                                className="h-36 w-36 rounded-xl overflow-hidden border border-slate-200 bg-slate-100 shadow-xs"
                              >
                                <ImageWithLightbox
                                  src={normalizeImageUrl(img)}
                                  alt="Post attachment"
                                  className="h-full w-full object-cover"
                                />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* ── Fixed Bottom Markdown Composer (Pinned below message stream) ── */}
          <div className="p-3 md:p-4 bg-white border-t border-slate-200/90 shadow-sm shrink-0 z-10">
            <div className="neumorph-inset p-3 rounded-2xl space-y-2 bg-slate-50/80">
              {/* Header Row: Post Kind + Toolbar + Preview Tab */}
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <Select value={postKind} onValueChange={(val) => setPostKind(val as TimelinePostKind)}>
                    <SelectTrigger className="h-7 w-32 text-xs border-slate-200 bg-white font-medium rounded-lg">
                      <SelectValue placeholder="Kind" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="note">Note / Update</SelectItem>
                      <SelectItem value="comment">Discussion</SelectItem>
                      <SelectItem value="question">Question</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* Formatting Toolbar */}
                  <div className="flex items-center gap-0.5 border-l border-slate-200 pl-2 ml-1 flex-wrap">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-slate-500 hover:text-slate-900 rounded-md"
                      title="Bold (**text**)"
                      onClick={() => applyComposerFormat("**", "**", "bold")}
                    >
                      <Bold className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-slate-500 hover:text-slate-900 rounded-md"
                      title="Italic (*text*)"
                      onClick={() => applyComposerFormat("*", "*", "italic")}
                    >
                      <Italic className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-slate-500 hover:text-slate-900 rounded-md"
                      title="Heading (### Header)"
                      onClick={() => applyComposerFormat("### ", "", "Header")}
                    >
                      <Heading2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-slate-500 hover:text-slate-900 rounded-md"
                      title="Code Block"
                      onClick={() => applyComposerFormat("```\n", "\n```", "code block")}
                    >
                      <Code className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-slate-500 hover:text-slate-900 rounded-md"
                      title="Bullet List (- item)"
                      onClick={() => applyComposerFormat("- ", "", "item")}
                    >
                      <List className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-slate-500 hover:text-slate-900 rounded-md"
                      title="Task List (- [ ] item)"
                      onClick={() => applyComposerFormat("- [ ] ", "", "task")}
                    >
                      <CheckSquare className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-slate-500 hover:text-slate-900 rounded-md"
                      title="Quote (> quote)"
                      onClick={() => applyComposerFormat("> ", "", "quote")}
                    >
                      <Quote className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-slate-500 hover:text-slate-900 rounded-md"
                      title="Attach Image Link"
                      onClick={() => setShowImageInput((prev) => !prev)}
                    >
                      <ImageIcon className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                {/* Right controls: Write / Preview tab toggle + Live Panel toggle */}
                <div className="flex items-center gap-1.5">
                  <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-0.5 text-xs">
                    <button
                      type="button"
                      className={`px-2 py-0.5 rounded-md font-semibold transition-all ${
                        composerTab === "write" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500"
                      }`}
                      onClick={() => setComposerTab("write")}
                    >
                      Write
                    </button>
                    <button
                      type="button"
                      className={`px-2 py-0.5 rounded-md font-semibold transition-all ${
                        composerTab === "preview" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500"
                      }`}
                      onClick={() => setComposerTab("preview")}
                    >
                      Preview
                    </button>
                  </div>
                </div>
              </div>

              {/* Image URL attachment input */}
              {showImageInput && (
                <div className="flex items-center gap-2 p-2 bg-white rounded-xl border border-slate-200">
                  <ImageIcon className="h-4 w-4 text-slate-400 shrink-0" />
                  <Input
                    value={imageUrlDraft}
                    onChange={(e) => setImageUrlDraft(e.target.value)}
                    placeholder="Paste image URL (https://drive.google.com/... or https://...)"
                    className="h-8 text-xs border-none shadow-none bg-transparent"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddImage();
                      }
                    }}
                  />
                  <Button
                    size="sm"
                    onClick={handleAddImage}
                    className="h-7 text-xs bg-slate-900 hover:bg-slate-800 text-white rounded-lg"
                  >
                    Add
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowImageInput(false)}
                    className="h-7 w-7 p-0 text-slate-400 rounded-lg"
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}

              {/* Attached image preview badges */}
              {postImages.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {postImages.map((img, idx) => (
                    <div
                      key={idx}
                      className="relative group h-14 w-14 rounded-lg overflow-hidden border border-slate-200 bg-white"
                    >
                      <img src={normalizeImageUrl(img)} alt="Attachment" className="h-full w-full object-cover" />
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(idx)}
                        className="absolute top-0.5 right-0.5 h-4 w-4 rounded-full bg-slate-900/80 text-white flex items-center justify-center text-[10px] hover:bg-rose-600"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Composer Body: Write vs Preview */}
              {composerTab === "write" ? (
                <Textarea
                  ref={composerTextareaRef}
                  value={postBody}
                  onChange={(e) => setPostBody(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                      e.preventDefault();
                      handlePublishPost();
                    }
                  }}
                  placeholder="Write a timeline update in Markdown... (Supports ![Img](https://drive.google.com/...) - Ctrl+Enter to post)"
                  className="min-h-[75px] max-h-[180px] border-none shadow-none bg-white rounded-xl text-sm font-sans resize-y focus-visible:ring-1 focus-visible:ring-slate-300"
                />
              ) : (
                <div className="p-3 bg-white rounded-xl border border-slate-200/80 min-h-[75px] max-h-[180px] overflow-y-auto text-sm">
                  <MarkdownPostRenderer content={postBody || "*Nothing to preview yet. Type markdown above.*"} />
                </div>
              )}

              {/* Bottom Actions Row */}
              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] text-slate-400 font-medium">
                  Supports GFM Markdown: **bold**, *italic*, `code`, lists, quotes, tables, Google Drive images
                </span>
                <Button
                  size="sm"
                  onClick={handlePublishPost}
                  disabled={!postBody.trim()}
                  className="bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl text-xs gap-1.5 h-8 px-3.5 shadow-xs"
                >
                  <Send className="h-3.5 w-3.5" />
                  Post Update
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* ── Right Column: Live Compiled Markdown Preview Side Panel ── */}
        {showLivePreviewPanel && (
          <div className="w-full md:w-[420px] lg:w-[480px] shrink-0 border-l border-slate-200/90 bg-white flex flex-col h-full overflow-hidden animate-in slide-in-from-right-4 duration-300 z-10 shadow-lg">
            {/* Side Panel Header */}
            <div className="px-4 py-3 border-b border-slate-200 bg-slate-50/90 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
                  <Eye className="h-3.5 w-3.5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Live Markdown Preview
                  </h4>
                  <p className="text-[10px] text-slate-400">Real-time compilation of current composer text</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-slate-400 hover:text-slate-700 rounded-lg"
                onClick={() => setShowLivePreviewPanel(false)}
                title="Close Live Preview"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Live Rendered Content */}
            <div className="flex-1 overflow-y-auto p-4 md:p-5 space-y-4 bg-slate-50/30">
              <div className="neumorph-inset p-4 rounded-2xl bg-white min-h-[300px] max-w-full overflow-hidden">
                <MarkdownPostRenderer
                  content={
                    postBody ||
                    "*Type markdown in the composer to see live compiled preview here with formatted headings, code blocks, tables, and Google Drive images.*"
                  }
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
