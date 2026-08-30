import { useState, useRef, useMemo } from "react";
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
  Image as ImageIcon,
  Edit3,
  Trash2,
  Eye,
  FileText,
  MessageSquare,
  HelpCircle,
  Sparkles,
  X,
  Copy,
  Check,
  Search,
  PanelRightOpen,
  PanelRightClose,
  History,
  RotateCcw,
  ExternalLink,
  Tag,
  ArrowRight,
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

interface ProjectPostPanelProps {
  projectDetail: ProjectDetailRecord;
  userEmail: string;
}

export default function ProjectPostPanel({
  projectDetail,
  userEmail,
}: ProjectPostPanelProps) {
  // Main Post Composer & Editor State
  const [postBody, setPostBody] = useState("");
  const [postKind, setPostKind] = useState<TimelinePostKind>("note");
  const [composerMode, setComposerMode] = useState<"write" | "preview">("write");
  const [postImages, setPostImages] = useState<string[]>([]);
  const [showImageInput, setShowImageInput] = useState(false);
  const [imageUrlDraft, setImageUrlDraft] = useState("");

  // Post Search / Load state for Edit & Delete
  const [searchPostId, setSearchPostId] = useState("");
  const [loadedPost, setLoadedPost] = useState<any | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Right Side Panel (Individual's Post & Contribution History)
  const [showHistoryPanel, setShowHistoryPanel] = useState(true);
  const [historyFilter, setHistoryFilter] = useState<"my" | "all">("my");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const addTimelinePostMut = useMutation(api.projects.addTimelinePost);
  const updateTimelinePostMut = useMutation(api.projects.updateTimelinePost);
  const deleteTimelinePostMut = useMutation(api.projects.deleteTimelinePost);

  // All timeline posts
  const allPosts = useMemo(() => {
    return projectDetail.timeline
      .filter((t) => t.itemType === "post")
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [projectDetail.timeline]);

  // Posts filtered for the history panel
  const historyPosts = useMemo(() => {
    if (historyFilter === "my") {
      return allPosts.filter(
        (p) => p.authorEmail.toLowerCase() === userEmail.toLowerCase()
      );
    }
    return allPosts;
  }, [allPosts, historyFilter, userEmail]);

  // Load a post into the editor by ID or object
  const loadPostForEditing = (post: any) => {
    const isAuthor = post.authorEmail.toLowerCase() === userEmail.toLowerCase();
    const canManage =
      isAuthor ||
      projectDetail.permissions.canModerateTimeline ||
      projectDetail.permissions.canApproveBuiltInStages;

    if (!canManage) {
      toast.error("You can only edit or delete posts that you authored.");
      return;
    }

    setLoadedPost(post);
    setPostBody(post.body || "");
    setPostKind(post.kind || "note");
    setPostImages(post.images || []);
    setComposerMode("write");
    setSearchPostId(post.id);
    toast.success(`Loaded post ${post.id.substring(0, 12)}... into editor`);

    // Focus textarea
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 50);
  };

  // Search by Post ID entered in search input
  const handleSearchAndLoadPost = () => {
    const trimmed = searchPostId.trim();
    if (!trimmed) {
      toast.error("Please enter a Post ID");
      return;
    }

    const found = allPosts.find(
      (p) => p.id.toLowerCase() === trimmed.toLowerCase() || p.id.includes(trimmed)
    );

    if (!found) {
      toast.error(`No post found matching ID "${trimmed}". Check Project Report for post IDs.`);
      return;
    }

    loadPostForEditing(found);
  };

  // Reset editor to clean "New Post" mode
  const handleResetToNew = () => {
    setLoadedPost(null);
    setPostBody("");
    setPostKind("note");
    setPostImages([]);
    setSearchPostId("");
    setShowImageInput(false);
    setImageUrlDraft("");
    setComposerMode("write");
    toast.info("Editor reset to New Post mode");
  };

  // Copy Post ID helper
  const handleCopyPostId = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    toast.success("Post ID copied to clipboard");
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Publish New Post
  const handlePublishPost = async () => {
    const trimmed = postBody.trim();
    if (!trimmed) {
      toast.error("Post markdown content cannot be empty");
      return;
    }

    setIsSubmitting(true);
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
      setComposerMode("write");
      toast.success("Post successfully published to Project Report timeline!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to publish post");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Update existing loaded post
  const handleUpdateLoadedPost = async () => {
    if (!loadedPost) return;
    const trimmed = postBody.trim();
    if (!trimmed) {
      toast.error("Post markdown content cannot be empty");
      return;
    }

    setIsSubmitting(true);
    try {
      await updateTimelinePostMut({
        userEmail,
        projectId: projectDetail.projectId,
        entryId: loadedPost.id,
        body: trimmed,
      });

      toast.success("Post updated successfully! Changes reflect on Project Report.");
      handleResetToNew();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update post");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete loaded post
  const handleDeleteLoadedPost = async () => {
    if (!loadedPost) return;
    if (!confirm(`Are you sure you want to delete this post (${loadedPost.id}) from the Project Report?`)) {
      return;
    }

    setIsSubmitting(true);
    try {
      await deleteTimelinePostMut({
        userEmail,
        projectId: projectDetail.projectId,
        entryId: loadedPost.id,
      });

      toast.success("Post deleted from Project Report.");
      handleResetToNew();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete post");
    } finally {
      setIsSubmitting(false);
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

  const applyFormat = (before: string, after = "", defaultText = "text") => {
    const updated = insertMarkdownFormatting(textareaRef.current, before, after, defaultText);
    if (updated) setPostBody(updated);
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
    <div className="flex flex-col h-[780px] max-h-[85vh] neumorph-card overflow-hidden bg-slate-50/40">
      {/* ── Top Header ── */}
      <div className="flex items-center justify-between px-6 py-3.5 border-b border-slate-200/90 bg-white/95 backdrop-blur shadow-xs shrink-0 z-10">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-xs">
            <Edit3 className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              Project Post Studio
              {loadedPost ? (
                <Badge className="bg-amber-100 text-amber-900 border-amber-300 font-semibold text-[10px] uppercase">
                  Editing Post: {loadedPost.id.substring(0, 10)}...
                </Badge>
              ) : (
                <Badge variant="outline" className="text-[10px] uppercase font-semibold text-slate-500">
                  New Timeline Post
                </Badge>
              )}
            </h3>
            <p className="text-[11px] text-slate-500">
              Write and manage Markdown posts that compile directly into the Project Report timeline
            </p>
          </div>
        </div>

        {/* History Side Panel Toggle */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowHistoryPanel((prev) => !prev)}
          className={`h-8 text-xs font-semibold rounded-xl gap-1.5 transition-all ${
            showHistoryPanel
              ? "bg-indigo-50 border-indigo-200 text-indigo-700 shadow-xs"
              : "neumorph-btn text-slate-700"
          }`}
          title="Toggle your post contributions history panel"
        >
          <History className="h-3.5 w-3.5 text-indigo-600" />
          <span>{showHistoryPanel ? "Hide History" : "My Post History"}</span>
        </Button>
      </div>

      {/* ── Main 2-Column Split: Left Post Editor Studio + Right Contribution History ── */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* ── Left Panel: Markdown Writer & Search-to-Update/Delete ── */}
        <div className="flex-1 min-w-0 flex flex-col h-full overflow-y-auto p-4 md:p-6 space-y-4">
          {/* Post ID Search & Loader Bar */}
          <div className="neumorph-inset p-3.5 rounded-2xl bg-white space-y-2 border border-slate-200/80">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Search className="h-3.5 w-3.5 text-slate-500" />
                Find & Update / Delete Post by ID
              </span>
              <span className="text-[11px] text-slate-400">
                (Post IDs are displayed at the top of each post in the Report)
              </span>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Input
                  value={searchPostId}
                  onChange={(e) => setSearchPostId(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleSearchAndLoadPost();
                    }
                  }}
                  placeholder="Paste Post ID here (e.g. j5789... or copy from Project Report)..."
                  className="h-9 text-xs font-mono bg-slate-50 border-slate-200 rounded-xl pr-8"
                />
                {searchPostId && (
                  <button
                    type="button"
                    onClick={() => setSearchPostId("")}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 text-xs"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={handleSearchAndLoadPost}
                className="h-9 px-3.5 text-xs font-semibold rounded-xl bg-white hover:bg-slate-50 border-slate-200 shrink-0 gap-1.5"
              >
                <Search className="h-3.5 w-3.5 text-slate-600" />
                Load Post
              </Button>
              {loadedPost && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleResetToNew}
                  className="h-9 px-3 text-xs text-slate-500 hover:text-slate-800 rounded-xl shrink-0 gap-1"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  New Post
                </Button>
              )}
            </div>

            {loadedPost && (
              <div className="p-2.5 bg-amber-50/80 rounded-xl border border-amber-200 text-xs flex items-center justify-between gap-3 text-amber-900">
                <div className="min-w-0">
                  <p className="font-semibold truncate">
                    Loaded Post ID: <span className="font-mono">{loadedPost.id}</span>
                  </p>
                  <p className="text-[11px] text-amber-700 mt-0.5">
                    Authored by {loadedPost.authorName} ({formatDateTime(loadedPost.createdAt)})
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleResetToNew}
                  className="h-7 text-xs bg-white border-amber-300 text-amber-900 rounded-lg hover:bg-amber-100"
                >
                  Cancel Edit
                </Button>
              </div>
            )}
          </div>

          {/* Main Markdown Studio Card */}
          <div className="neumorph-card p-4 md:p-5 bg-white flex flex-col flex-1 min-h-[440px] space-y-3">
            {/* Top Toolbar Row */}
            <div className="flex items-center justify-between gap-3 flex-wrap pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2 flex-wrap">
                {/* Kind Selector */}
                <Select value={postKind} onValueChange={(val) => setPostKind(val as TimelinePostKind)}>
                  <SelectTrigger className="h-8 w-36 text-xs border-slate-200 bg-white font-medium rounded-xl">
                    <SelectValue placeholder="Kind" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="note">Note / Update</SelectItem>
                    <SelectItem value="comment">Discussion</SelectItem>
                    <SelectItem value="question">Question</SelectItem>
                  </SelectContent>
                </Select>

                {/* Markdown Formatting Controls */}
                <div className="flex items-center gap-0.5 border-l border-slate-200 pl-2 ml-1 flex-wrap">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-slate-600 hover:text-slate-900 rounded-lg"
                    title="Bold (**text**)"
                    onClick={() => applyFormat("**", "**", "bold")}
                  >
                    <Bold className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-slate-600 hover:text-slate-900 rounded-lg"
                    title="Italic (*text*)"
                    onClick={() => applyFormat("*", "*", "italic")}
                  >
                    <Italic className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-slate-600 hover:text-slate-900 rounded-lg"
                    title="Heading 2 (## Header)"
                    onClick={() => applyFormat("## ", "", "Section Title")}
                  >
                    <Heading2 className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-slate-600 hover:text-slate-900 rounded-lg"
                    title="Code Block"
                    onClick={() => applyFormat("```\n", "\n```", "code block")}
                  >
                    <Code className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-slate-600 hover:text-slate-900 rounded-lg"
                    title="Bullet List (- item)"
                    onClick={() => applyFormat("- ", "", "list item")}
                  >
                    <List className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-slate-600 hover:text-slate-900 rounded-lg"
                    title="Task Checklist (- [ ] item)"
                    onClick={() => applyFormat("- [ ] ", "", "task checklist item")}
                  >
                    <CheckSquare className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-slate-600 hover:text-slate-900 rounded-lg"
                    title="Blockquote (> quote)"
                    onClick={() => applyFormat("> ", "", "quote text")}
                  >
                    <Quote className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-slate-600 hover:text-slate-900 rounded-lg"
                    title="Attach Image Link"
                    onClick={() => setShowImageInput((prev) => !prev)}
                  >
                    <ImageIcon className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Write vs Preview Toggle Switcher */}
              <div className="inline-flex rounded-xl border border-slate-200 bg-slate-100 p-0.5 text-xs shrink-0">
                <button
                  type="button"
                  className={`px-3 py-1 rounded-lg font-bold transition-all ${
                    composerMode === "write" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500"
                  }`}
                  onClick={() => setComposerMode("write")}
                >
                  Write Code
                </button>
                <button
                  type="button"
                  className={`px-3 py-1 rounded-lg font-bold transition-all ${
                    composerMode === "preview" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500"
                  }`}
                  onClick={() => setComposerMode("preview")}
                >
                  Compiled Preview
                </button>
              </div>
            </div>

            {/* Image link input */}
            {showImageInput && (
              <div className="flex items-center gap-2 p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                <ImageIcon className="h-4 w-4 text-slate-400 shrink-0" />
                <Input
                  value={imageUrlDraft}
                  onChange={(e) => setImageUrlDraft(e.target.value)}
                  placeholder="Image URL: https://drive.google.com/thumbnail?id=FILE_ID&sz=w800 or https://..."
                  className="h-8 text-xs bg-white rounded-lg border-slate-200"
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
                  className="h-8 text-xs bg-slate-900 hover:bg-slate-800 text-white rounded-lg"
                >
                  Add
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowImageInput(false)}
                  className="h-8 w-8 p-0 text-slate-400 rounded-lg"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}

            {/* Attached images badges */}
            {postImages.length > 0 && (
              <div className="flex flex-wrap gap-2">
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

            {/* Editor Body: Write Mode vs Live Preview Mode */}
            <div className="flex-1 flex flex-col min-h-[260px]">
              {composerMode === "write" ? (
                <Textarea
                  ref={textareaRef}
                  value={postBody}
                  onChange={(e) => setPostBody(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                      e.preventDefault();
                      if (loadedPost) handleUpdateLoadedPost();
                      else handlePublishPost();
                    }
                  }}
                  placeholder="Write your project post in Markdown...&#10;&#10;Examples:&#10;## Progress Update&#10;- [x] Finished initial CAD design&#10;- [ ] Tagged required inventory items&#10;&#10;![Prototype](https://drive.google.com/thumbnail?id=FILE_ID&sz=w800)&#10;&#10;(Press Ctrl+Enter to publish)"
                  className="flex-1 w-full p-4 font-mono text-sm border border-slate-200 rounded-2xl bg-slate-50/50 resize-y focus-visible:ring-1 focus-visible:ring-slate-400"
                />
              ) : (
                <div className="flex-1 w-full p-5 rounded-2xl border border-slate-200 bg-white overflow-y-auto min-h-[260px]">
                  <MarkdownPostRenderer
                    content={postBody || "*Type Markdown code in 'Write Code' mode to see the compiled preview here.*"}
                  />
                </div>
              )}
            </div>

            {/* Bottom Actions Bar */}
            <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-100 flex-wrap">
              <span className="text-[11px] text-slate-400 font-medium">
                Tip: Use Google Drive images format <code className="bg-slate-100 px-1 py-0.5 rounded text-[10px]">![Alt](https://drive.google.com/thumbnail?id=...)</code>
              </span>

              <div className="flex items-center gap-2">
                {loadedPost ? (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleDeleteLoadedPost}
                      disabled={isSubmitting}
                      className="border-rose-200 text-rose-600 hover:bg-rose-50 rounded-xl text-xs h-9 px-3 gap-1.5"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete from Report
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleUpdateLoadedPost}
                      disabled={isSubmitting || !postBody.trim()}
                      className="bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl text-xs h-9 px-4 gap-1.5 shadow-xs"
                    >
                      <Check className="h-3.5 w-3.5" />
                      {isSubmitting ? "Updating..." : "Update Post in Report"}
                    </Button>
                  </>
                ) : (
                  <Button
                    size="sm"
                    onClick={handlePublishPost}
                    disabled={isSubmitting || !postBody.trim()}
                    className="bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl text-xs h-9 px-4 gap-1.5 shadow-xs"
                  >
                    <Send className="h-3.5 w-3.5" />
                    {isSubmitting ? "Publishing..." : "Publish Post to Timeline"}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── Right Panel: Individual's Post & Contribution History ── */}
        {showHistoryPanel && (
          <div className="w-full md:w-[380px] lg:w-[420px] shrink-0 border-l border-slate-200 bg-white flex flex-col h-full overflow-hidden animate-in slide-in-from-right-4 duration-300 z-10 shadow-lg">
            {/* History Panel Header */}
            <div className="px-4 py-3.5 border-b border-slate-200 bg-slate-50/90 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <div className="h-7 w-7 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                  <History className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider truncate">
                    Contributions History
                  </h4>
                  <p className="text-[10px] text-slate-400 truncate">
                    {historyPosts.length} recorded {historyPosts.length === 1 ? "post" : "posts"}
                  </p>
                </div>
              </div>

              {/* Filter Tabs: My Posts vs All Posts */}
              <div className="flex items-center gap-1.5">
                <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 text-[10px]">
                  <button
                    type="button"
                    className={`px-2 py-0.5 rounded-md font-bold transition-all ${
                      historyFilter === "my" ? "bg-slate-900 text-white" : "text-slate-500"
                    }`}
                    onClick={() => setHistoryFilter("my")}
                  >
                    Mine
                  </button>
                  <button
                    type="button"
                    className={`px-2 py-0.5 rounded-md font-bold transition-all ${
                      historyFilter === "all" ? "bg-slate-900 text-white" : "text-slate-500"
                    }`}
                    onClick={() => setHistoryFilter("all")}
                  >
                    All Team
                  </button>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-slate-400 hover:text-slate-700 rounded-lg"
                  onClick={() => setShowHistoryPanel(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* History Posts List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/40">
              {historyPosts.length === 0 ? (
                <div className="text-center py-12 px-4 space-y-2">
                  <FileText className="h-8 w-8 mx-auto text-slate-300" />
                  <p className="text-xs font-bold text-slate-600">No posts found</p>
                  <p className="text-[11px] text-slate-400">
                    {historyFilter === "my"
                      ? "You haven't published any timeline updates yet. Write your first post on the left!"
                      : "No team members have published posts to this project yet."}
                  </p>
                </div>
              ) : (
                historyPosts.map((post) => {
                  const isAuthor = post.authorEmail.toLowerCase() === userEmail.toLowerCase();
                  const canManage =
                    isAuthor ||
                    projectDetail.permissions.canModerateTimeline ||
                    projectDetail.permissions.canApproveBuiltInStages;

                  return (
                    <div
                      key={post.id}
                      className={`neumorph-inset p-3.5 rounded-2xl bg-white space-y-2.5 transition-all border ${
                        loadedPost?.id === post.id ? "border-amber-400 ring-2 ring-amber-100" : "border-slate-200/70"
                      }`}
                    >
                      {/* Post Header with Post ID & Copy Button */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-xs text-slate-900 truncate">
                              {post.authorName}
                            </span>
                            {getKindBadge(post.kind)}
                          </div>
                          <span className="text-[10px] text-slate-400 mt-0.5 block">
                            {formatDateTime(post.createdAt)}
                          </span>
                        </div>

                        {/* Post ID Pill + Copy */}
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleCopyPostId(post.id)}
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 text-[10px] font-mono text-slate-600 transition-colors"
                            title="Click to copy Post ID"
                          >
                            {copiedId === post.id ? (
                              <Check className="h-3 w-3 text-emerald-600" />
                            ) : (
                              <Copy className="h-3 w-3 text-slate-400" />
                            )}
                            <span>{post.id.substring(0, 8)}...</span>
                          </button>
                        </div>
                      </div>

                      {/* Snippet */}
                      <div className="text-xs text-slate-600 line-clamp-3 bg-slate-50/70 p-2 rounded-xl font-mono text-[11px] leading-relaxed">
                        {post.body}
                      </div>

                      {/* Action to Load into Editor */}
                      {canManage && (
                        <div className="flex justify-end pt-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => loadPostForEditing(post)}
                            className="h-7 text-[11px] font-semibold text-slate-700 bg-white hover:bg-slate-50 border-slate-200 rounded-lg gap-1"
                          >
                            <Edit3 className="h-3 w-3 text-slate-500" />
                            {loadedPost?.id === post.id ? "Currently Editing" : "Load into Editor"}
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
