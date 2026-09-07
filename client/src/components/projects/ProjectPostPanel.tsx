import { useState, useRef, useMemo, useEffect, useCallback } from "react";
import { useMutation } from "convex/react";
import { toast } from "sonner";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SCRIPT_URL } from "@/config";
import ProjectMediaModal from "./ProjectMediaModal";
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
  Camera,
  Upload,
  Folder,
  FolderPlus,
  Link as LinkIcon,
  Loader2,
  RefreshCw,
  Plus,
  ZoomIn,
  Video,
  Play,
} from "lucide-react";
import {
  formatDateTime,
  formatDateOnly,
  MarkdownPostRenderer,
  ProjectAvatar,
  ImageWithLightbox,
  insertMarkdownFormatting,
  normalizeImageUrl,
  isVideoMedia,
  buildDriveMarkdownVideo,
  getDriveMediaEmbedCode,
  type ProjectDetailRecord,
  type TimelinePostKind,
  type ProjectDriveMediaFile,
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

  // Right Side Panel: Dual Mode (Contributions History vs Google Drive Media)
  const [showRightPanel, setShowRightPanel] = useState(true);
  const [rightPanelTab, setRightPanelTab] = useState<"history" | "drive">("drive");
  const [historyFilter, setHistoryFilter] = useState<"my" | "all">("my");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Google Drive Media Gallery State
  const [driveFiles, setDriveFiles] = useState<ProjectDriveMediaFile[]>([]);
  const [isLoadingDriveFiles, setIsLoadingDriveFiles] = useState(false);
  const [driveSearchQuery, setDriveSearchQuery] = useState("");
  const [copiedFileId, setCopiedFileId] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<{ url: string; title: string } | null>(null);
  const [previewVideo, setPreviewVideo] = useState<{ url: string; title: string; fileId: string } | null>(null);

  // Active background upload tasks
  interface ActiveUploadTask {
    id: string;
    fileName: string;
    altText: string;
    previewUrl: string;
    status: "uploading" | "success" | "error";
    errorMessage?: string;
    isVideo?: boolean;
  }
  const [activeUploads, setActiveUploads] = useState<ActiveUploadTask[]>([]);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const addTimelinePostMut = useMutation(api.projects.addTimelinePost);
  const updateTimelinePostMut = useMutation(api.projects.updateTimelinePost);
  const deleteTimelinePostMut = useMutation(api.projects.deleteTimelinePost);
  const setProjectDriveFolderMut = useMutation(api.projects.setProjectDriveFolder);

  // Google Drive Folder & Media Modal State
  const [isCreatingDriveFolder, setIsCreatingDriveFolder] = useState(false);
  const [mediaModalOpen, setMediaModalOpen] = useState(false);
  const [mediaModalTab, setMediaModalTab] = useState<"camera" | "video" | "upload" | "driveLink">("camera");

  // Fetch Project Media files directly from Google Drive via Google Apps Script
  const fetchProjectDriveFiles = useCallback(async () => {
    if (!projectDetail.name) return;
    setIsLoadingDriveFiles(true);
    try {
      const response = await fetch(SCRIPT_URL, {
        method: "POST",
        body: JSON.stringify({
          action: "getProjectMediaFiles",
          projectName: projectDetail.name,
          projectId: projectDetail.projectId,
          folderId: projectDetail.driveFolderId || "",
        }),
      });

      if (!response.ok) {
        throw new Error(`Google Server Error (${response.status})`);
      }

      const result = await response.json();
      if (result.success && Array.isArray(result.files)) {
        setDriveFiles(result.files);

        // Auto-sync folder info if not already saved in Convex
        if (
          result.folderId &&
          result.folderUrl &&
          (!projectDetail.driveFolderId || !projectDetail.driveFolderUrl)
        ) {
          setProjectDriveFolderMut({
            userEmail,
            projectId: projectDetail.projectId,
            driveFolderId: result.folderId,
            driveFolderUrl: result.folderUrl,
          }).catch((err) => console.warn("Auto-sync folder error:", err));
        }
      }
    } catch (err: any) {
      console.warn("Could not retrieve project media files from Google Drive:", err);
    } finally {
      setIsLoadingDriveFiles(false);
    }
  }, [
    projectDetail.name,
    projectDetail.projectId,
    projectDetail.driveFolderId,
    projectDetail.driveFolderUrl,
    userEmail,
    setProjectDriveFolderMut,
  ]);

  // Handle background media upload
  const handleStartUpload = async ({
    base64Data,
    fileName,
    altText,
    mimeType = "image/png",
    isVideo = false,
  }: {
    base64Data: string;
    fileName: string;
    altText: string;
    mimeType?: string;
    isVideo?: boolean;
  }) => {
    const uploadId = `upload_${Date.now()}`;
    const previewUrl = base64Data.startsWith("data:")
      ? base64Data
      : `data:${mimeType};base64,${base64Data}`;

    // Ensure right panel is visible on drive tab so user sees active progress
    setShowRightPanel(true);
    setRightPanelTab("drive");

    const newTask: ActiveUploadTask = {
      id: uploadId,
      fileName,
      altText,
      previewUrl,
      status: "uploading",
      isVideo,
    };

    setActiveUploads((prev) => [newTask, ...prev]);

    try {
      const cleanBase64 = base64Data.includes(",")
        ? base64Data.split(",")[1]
        : base64Data;

      const response = await fetch(SCRIPT_URL, {
        method: "POST",
        body: JSON.stringify({
          action: "uploadProjectMedia",
          projectName: projectDetail.name,
          projectId: projectDetail.projectId,
          folderId: projectDetail.driveFolderId || "",
          fileName,
          imageTitle: fileName,
          mimeType,
          content: cleanBase64,
        }),
      });

      if (!response.ok) {
        throw new Error(`Google Server Error (${response.status})`);
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.message || "Failed to upload media to project folder");
      }

      const fileId = result.fileId;
      const finalFileName = result.fileName || fileName;
      const desc = altText.trim() || finalFileName.replace(/\.[^/.]+$/, "");
      const directLink = result.thumbnailUrl || `https://drive.google.com/thumbnail?id=${fileId}&sz=w800`;
      const viewUrl = result.viewUrl || `https://drive.google.com/file/d/${fileId}/view?usp=sharing`;
      const downloadUrl = result.downloadUrl || `https://drive.google.com/uc?export=download&id=${fileId}`;
      const isVideoFile = isVideo || result.isVideo === true || mimeType.startsWith("video/");
      const markdownSnippet = isVideoFile
        ? buildDriveMarkdownVideo(fileId)
        : (result.markdownSnippet || `![${desc}](${directLink})`);

      const newDriveFile: ProjectDriveMediaFile = {
        fileId,
        fileName: finalFileName,
        label: desc,
        mimeType,
        isVideo: isVideoFile,
        thumbnailUrl: directLink,
        viewUrl,
        downloadUrl,
        dateCreated: new Date().toISOString(),
        markdownSnippet,
      };

      // Place newly uploaded file right at the top of the Google Drive media gallery
      setDriveFiles((prev) => [
        newDriveFile,
        ...prev.filter((f) => f.fileId !== fileId),
      ]);

      // Transition upload task to success
      setActiveUploads((prev) =>
        prev.map((t) => (t.id === uploadId ? { ...t, status: "success" } : t))
      );

      toast.success(`${isVideoFile ? "Video" : "Image"} "${finalFileName}" uploaded to Google Drive!`);

      // Automatically remove task badge after 3.5 seconds
      setTimeout(() => {
        setActiveUploads((prev) => prev.filter((t) => t.id !== uploadId));
      }, 3500);

      // Trigger sync
      fetchProjectDriveFiles();
    } catch (err: any) {
      console.error("Upload error:", err);
      setActiveUploads((prev) =>
        prev.map((t) =>
          t.id === uploadId
            ? { ...t, status: "error", errorMessage: err.message || "Upload failed" }
            : t
        )
      );
      toast.error(err.message || `Failed to upload "${fileName}" to Google Drive`);
    }
  };

  // Load files on mount and when project changes
  useEffect(() => {
    fetchProjectDriveFiles();
  }, [fetchProjectDriveFiles]);

  // Create or initialize Google Drive Project Folder
  const handleCreateDriveFolder = async () => {
    setIsCreatingDriveFolder(true);
    try {
      const response = await fetch(SCRIPT_URL, {
        method: "POST",
        body: JSON.stringify({
          action: "createProjectFolder",
          projectName: projectDetail.name,
          projectId: projectDetail.projectId,
        }),
      });

      if (!response.ok) {
        throw new Error(`Google Server Error (${response.status})`);
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.message || "Failed to create project folder on Google Drive");
      }

      await setProjectDriveFolderMut({
        userEmail,
        projectId: projectDetail.projectId,
        driveFolderId: result.folderId,
        driveFolderUrl: result.folderUrl,
      });

      toast.success(`Google Drive folder "projects/${projectDetail.name}" created and linked!`);
      fetchProjectDriveFiles();
    } catch (err: any) {
      console.error("Error creating project folder:", err);
      toast.error(err.message || "Failed to initialize project folder on Google Drive");
    } finally {
      setIsCreatingDriveFolder(false);
    }
  };

  // Insert generated Markdown snippet at current textarea cursor position
  const handleInsertMarkdownSnippet = (snippet: string) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      setPostBody((prev) => (prev ? `${prev}\n\n${snippet}\n` : `${snippet}\n`));
      return;
    }

    const start = textarea.selectionStart ?? postBody.length;
    const end = textarea.selectionEnd ?? postBody.length;
    const before = postBody.substring(0, start);
    const after = postBody.substring(end);

    const prefix = before.length > 0 && !before.endsWith("\n") ? "\n\n" : "";
    const suffix = after.length > 0 && !after.startsWith("\n") ? "\n\n" : "\n";
    const nextBody = `${before}${prefix}${snippet}${suffix}${after}`;

    setPostBody(nextBody);
    setTimeout(() => {
      textarea.focus();
      const newCursor = start + prefix.length + snippet.length + suffix.length;
      textarea.setSelectionRange(newCursor, newCursor);
    }, 50);
  };

  // Copy Markdown/Embed snippet from a media file
  const handleCopyMediaMarkdown = (file: ProjectDriveMediaFile) => {
    const snippet = getDriveMediaEmbedCode(file);
    navigator.clipboard.writeText(snippet);
    setCopiedFileId(file.fileId);
    toast.success(isVideoMedia(file) ? `Video embed code for "${file.label}" copied!` : `Markdown image code for "${file.label}" copied!`);
    setTimeout(() => setCopiedFileId(null), 2000);
  };

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

  // Filtered drive files based on search
  const filteredDriveFiles = useMemo(() => {
    if (!driveSearchQuery.trim()) return driveFiles;
    const q = driveSearchQuery.toLowerCase();
    return driveFiles.filter(
      (f) =>
        f.fileName.toLowerCase().includes(q) ||
        f.label.toLowerCase().includes(q)
    );
  }, [driveFiles, driveSearchQuery]);

  // Search and load post for editing
  const handleSearchAndLoadPost = () => {
    const query = searchPostId.trim();
    if (!query) {
      toast.error("Please enter a Post ID or author name to search");
      return;
    }

    const matched = allPosts.find(
      (p) =>
        p.id.toLowerCase() === query.toLowerCase() ||
        p.id.toLowerCase().startsWith(query.toLowerCase()) ||
        p.authorName.toLowerCase().includes(query.toLowerCase()) ||
        p.authorEmail.toLowerCase().includes(query.toLowerCase())
    );

    if (!matched) {
      toast.error(`No post found matching "${query}"`);
      return;
    }

    loadPostForEditing(matched);
  };

  // Load post into editor
  const loadPostForEditing = (post: any) => {
    const isAuthor = post.authorEmail.toLowerCase() === userEmail.toLowerCase();
    const canManage =
      isAuthor ||
      projectDetail.permissions.canModerateTimeline ||
      projectDetail.permissions.canApproveBuiltInStages;

    if (!canManage) {
      toast.error("You can only edit posts that you authored.");
      return;
    }

    setLoadedPost(post);
    setPostBody(post.body || "");
    setPostKind(post.kind || "note");
    setPostImages(post.images || []);
    setComposerMode("write");
    toast.success(`Loaded post from ${post.authorName} (${formatDateTime(post.createdAt)})`);
  };

  // Reset editor to new post mode
  const handleResetToNew = () => {
    setLoadedPost(null);
    setSearchPostId("");
    setPostBody("");
    setPostKind("note");
    setPostImages([]);
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

  const formatFileSize = (bytes?: number) => {
    if (!bytes || bytes === 0) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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
    <div className="flex flex-col h-[780px] max-h-[85vh] rounded-3xl bg-white border border-slate-200/90 shadow-sm overflow-hidden">
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

        {/* Right Side Panel Toggle Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowRightPanel((prev) => !prev)}
          className={`h-8 text-xs font-semibold rounded-xl gap-1.5 transition-all ${
            showRightPanel
              ? "bg-indigo-50 border-indigo-200 text-indigo-700 shadow-xs"
              : "neumorph-btn text-slate-700"
          }`}
          title="Toggle right side panel"
        >
          {rightPanelTab === "drive" ? (
            <Folder className="h-3.5 w-3.5 text-emerald-600" />
          ) : (
            <History className="h-3.5 w-3.5 text-indigo-600" />
          )}
          <span>{showRightPanel ? "Hide Side Panel" : "Show Side Panel"}</span>
        </Button>
      </div>

      {/* ── Main 2-Column Split: Left Post Editor Studio + Right Dual-Mode Panel ── */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* ── Left Panel: Markdown Writer & Search-to-Update/Delete ── */}
        <div className="flex-1 min-w-0 flex flex-col h-full overflow-y-auto p-4 md:p-6 space-y-4">
          {/* Post Search & Load Toolbar for Quick Editing / Deletion */}
          <div className="neumorph-card p-3 rounded-2xl bg-white/80 border border-slate-200/80 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-2 flex-1">
              <div className="relative flex-1">
                <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  placeholder="Find post by ID, author name or email to load for edit / delete..."
                  value={searchPostId}
                  onChange={(e) => setSearchPostId(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearchAndLoadPost()}
                  className="pl-8 h-8 text-xs rounded-xl bg-slate-50/70 border-slate-200 font-mono"
                />
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={handleSearchAndLoadPost}
                className="h-8 text-xs font-semibold rounded-xl px-3 border-slate-200 hover:bg-slate-100 shrink-0"
              >
                Find & Load
              </Button>
            </div>

            {loadedPost && (
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleResetToNew}
                  className="h-8 text-xs font-semibold text-slate-600 hover:text-slate-900 border-slate-200 rounded-xl gap-1.5"
                >
                  <RotateCcw className="h-3.5 w-3.5 text-slate-500" />
                  Cancel Edit
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={handleDeleteLoadedPost}
                  disabled={isSubmitting}
                  className="h-8 text-xs font-semibold rounded-xl gap-1.5 shadow-xs"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete Post
                </Button>
              </div>
            )}
          </div>

          {/* Post Editor Card */}
          <div className="neumorph-card p-5 rounded-3xl bg-white border border-slate-200/90 flex flex-col space-y-4 shadow-sm flex-1 min-h-[480px]">
            {/* Header: Kind Selector & Markdown Tools */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Post Category:
                </span>
                <Select
                  value={postKind}
                  onValueChange={(val) => setPostKind(val as TimelinePostKind)}
                >
                  <SelectTrigger className="h-8 w-36 text-xs font-semibold rounded-xl border-slate-200 bg-slate-50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="note">Note / Update</SelectItem>
                    <SelectItem value="comment">Comment</SelectItem>
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
                    title="Quick Link Input"
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
                  Write Markdown
                </button>
                <button
                  type="button"
                  className={`px-3 py-1 rounded-lg font-bold transition-all ${
                    composerMode === "preview" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500"
                  }`}
                  onClick={() => setComposerMode("preview")}
                >
                  Live Preview
                </button>
              </div>
            </div>

            {/* Quick Image URL Inserter Bar */}
            {showImageInput && (
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex items-center gap-2 animate-in fade-in duration-200">
                <Input
                  placeholder="Paste direct image or Google Drive URL (https://...)"
                  value={imageUrlDraft}
                  onChange={(e) => setImageUrlDraft(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddImage()}
                  className="h-8 text-xs rounded-xl bg-white"
                />
                <Button
                  size="sm"
                  onClick={handleAddImage}
                  className="h-8 text-xs font-semibold rounded-xl bg-slate-900 text-white shrink-0"
                >
                  Attach Image
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowImageInput(false)}
                  className="h-8 w-8 p-0 text-slate-400 hover:text-slate-700"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}

            {/* Attached Image Chips */}
            {postImages.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {postImages.map((imgUrl, idx) => (
                  <div
                    key={idx}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-100 border border-slate-200 text-xs font-mono text-slate-700 max-w-xs truncate"
                  >
                    <ImageIcon className="h-3 w-3 text-slate-500 shrink-0" />
                    <span className="truncate">{imgUrl}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(idx)}
                      className="text-slate-400 hover:text-rose-600 transition-colors ml-1"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Editor Textarea / Preview Container */}
            <div className="flex-1 flex flex-col min-h-[260px]">
              {composerMode === "write" ? (
                <Textarea
                  ref={textareaRef}
                  placeholder={`Write your project updates, technical notes, questions, or markdown posts...\n\nTip: You can use the Google Drive Media panel on the right to take photos, upload media, or click "Insert" on any uploaded image to embed it directly here!`}
                  value={postBody}
                  onChange={(e) => setPostBody(e.target.value)}
                  className="flex-1 w-full p-4 rounded-2xl border-slate-200 bg-slate-50/50 focus:bg-white text-xs md:text-sm font-mono leading-relaxed resize-none shadow-inner transition-colors"
                />
              ) : (
                <div className="flex-1 w-full p-4 rounded-2xl border border-slate-200 bg-white overflow-y-auto min-h-[260px] shadow-inner">
                  {postBody.trim() ? (
                    <MarkdownPostRenderer
                      content={postBody}
                      className="text-xs md:text-sm"
                    />
                  ) : (
                    <div className="text-center py-12 text-slate-400 text-xs italic">
                      Nothing to preview yet. Switch back to "Write Markdown" to compose your post.
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer Status & Action Bar */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100 flex-wrap gap-2">
              <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
                <span>
                  Posts appear in the official <span className="font-semibold text-slate-600">Project Report</span> timeline & PDF export
                </span>
              </div>

              <div className="flex items-center gap-2">
                {loadedPost ? (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleResetToNew}
                      className="rounded-xl text-xs font-semibold h-9 px-3 border-slate-200"
                    >
                      Cancel
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

        {/* ── Right Panel: Toggle between History and Google Drive Media Gallery ── */}
        {showRightPanel && (
          <div className="w-full md:w-[400px] lg:w-[440px] shrink-0 border-l border-slate-200 bg-white flex flex-col h-full overflow-hidden animate-in slide-in-from-right-4 duration-300 z-10 shadow-lg">
            {/* Dual-Mode Top Navigation Header */}
            <div className="px-4 py-3 border-b border-slate-200 bg-slate-50/95 flex items-center justify-between shrink-0 gap-2">
              {/* Segmented Switcher */}
              <div className="inline-flex rounded-xl border border-slate-200 bg-slate-200/70 p-0.5 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setRightPanelTab("drive")}
                  className={`px-3 py-1 rounded-lg transition-all flex items-center gap-1.5 ${
                    rightPanelTab === "drive"
                      ? "bg-white text-emerald-800 shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Folder className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Google Drive</span>
                  {driveFiles.length > 0 && (
                    <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[9px] bg-emerald-100 text-emerald-800 font-mono">
                      {driveFiles.length}
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setRightPanelTab("history")}
                  className={`px-3 py-1 rounded-lg transition-all flex items-center gap-1.5 ${
                    rightPanelTab === "history"
                      ? "bg-white text-indigo-900 shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <History className="h-3.5 w-3.5 text-indigo-600" />
                  <span>History</span>
                  {historyPosts.length > 0 && (
                    <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[9px] bg-indigo-100 text-indigo-800 font-mono">
                      {historyPosts.length}
                    </span>
                  )}
                </button>
              </div>

              {/* Close / Collapse button */}
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-slate-400 hover:text-slate-700 rounded-lg"
                onClick={() => setShowRightPanel(false)}
                title="Hide side panel"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* ── TAB 1: GOOGLE DRIVE MEDIA GALLERY & TOOLS ── */}
            {rightPanelTab === "drive" && (
              <div className="flex-1 flex flex-col min-h-0 bg-slate-50/40">
                {/* Drive Folder Status Banner & Actions */}
                <div className="p-3.5 bg-white border-b border-slate-200/80 space-y-3 shrink-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <Folder className="h-4 w-4 text-emerald-600 shrink-0" />
                        <h5 className="text-xs font-bold text-slate-900 truncate">
                          projects/{projectDetail.name}
                        </h5>
                      </div>
                      <p className="text-[10px] text-slate-400 truncate mt-0.5">
                        {projectDetail.driveFolderUrl
                          ? "Dedicated shared folder on Google Drive"
                          : "Folder not yet initialized"}
                      </p>
                    </div>

                    {projectDetail.driveFolderUrl ? (
                      <a
                        href={projectDetail.driveFolderUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-xl shrink-0"
                      >
                        <span>Open Drive</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : (
                      <Button
                        size="sm"
                        onClick={handleCreateDriveFolder}
                        disabled={isCreatingDriveFolder}
                        className="h-7 text-[11px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl gap-1 shrink-0"
                      >
                        {isCreatingDriveFolder ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <FolderPlus className="h-3 w-3" />
                        )}
                        <span>Create Folder</span>
                      </Button>
                    )}
                  </div>

                  {/* Media Action Buttons Toolbar */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setMediaModalTab("camera");
                        setMediaModalOpen(true);
                      }}
                      className="h-8 text-xs font-bold rounded-xl border-slate-200 hover:border-emerald-400 hover:bg-emerald-50 text-slate-700 gap-1.5 shadow-2xs"
                    >
                      <Camera className="h-3.5 w-3.5 text-emerald-600" />
                      <span>Photo</span>
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setMediaModalTab("video");
                        setMediaModalOpen(true);
                      }}
                      className="h-8 text-xs font-bold rounded-xl border-slate-200 hover:border-rose-400 hover:bg-rose-50 text-slate-700 gap-1.5 shadow-2xs"
                    >
                      <Video className="h-3.5 w-3.5 text-rose-600" />
                      <span>Record</span>
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setMediaModalTab("upload");
                        setMediaModalOpen(true);
                      }}
                      className="h-8 text-xs font-bold rounded-xl border-slate-200 hover:border-indigo-400 hover:bg-indigo-50 text-slate-700 gap-1.5 shadow-2xs"
                    >
                      <Upload className="h-3.5 w-3.5 text-indigo-600" />
                      <span>Upload</span>
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setMediaModalTab("driveLink");
                        setMediaModalOpen(true);
                      }}
                      className="h-8 text-xs font-bold rounded-xl border-slate-200 hover:border-cyan-400 hover:bg-cyan-50 text-slate-700 gap-1.5 shadow-2xs"
                    >
                      <LinkIcon className="h-3.5 w-3.5 text-cyan-600" />
                      <span>Link</span>
                    </Button>
                  </div>

                  {/* Search / Filter Media + Refresh Bar */}
                  <div className="flex items-center gap-1.5">
                    <div className="relative flex-1">
                      <Search className="h-3 w-3 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                      <Input
                        placeholder="Search media by filename..."
                        value={driveSearchQuery}
                        onChange={(e) => setDriveSearchQuery(e.target.value)}
                        className="h-7 text-[11px] rounded-lg pl-7 bg-slate-50 border-slate-200"
                      />
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={fetchProjectDriveFiles}
                      disabled={isLoadingDriveFiles}
                      className="h-7 w-7 p-0 rounded-lg text-slate-500 hover:text-slate-800"
                      title="Refresh media files from Google Drive"
                    >
                      <RefreshCw className={`h-3.5 w-3.5 ${isLoadingDriveFiles ? "animate-spin text-emerald-600" : ""}`} />
                    </Button>
                  </div>
                </div>

                {/* Media Files List */}
                <div className="flex-1 overflow-y-auto p-3.5 space-y-3">
                  {/* Active Background Upload Task Cards */}
                  {activeUploads.map((task) => (
                    <div
                      key={task.id}
                      className={`p-3 rounded-2xl border transition-all space-y-2 shadow-xs animate-in slide-in-from-top-2 duration-200 ${
                        task.status === "uploading"
                          ? "bg-amber-50/80 border-amber-300 dark:bg-amber-950/40 dark:border-amber-800"
                          : task.status === "success"
                          ? "bg-emerald-50/80 border-emerald-300 dark:bg-emerald-950/40 dark:border-emerald-800"
                          : "bg-rose-50/80 border-rose-300 dark:bg-rose-950/40 dark:border-rose-800"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="relative h-14 w-16 rounded-xl overflow-hidden bg-slate-900/10 shrink-0 border border-slate-300/50">
                          <img
                            src={task.previewUrl}
                            alt={task.fileName}
                            className="w-full h-full object-cover"
                          />
                          {task.status === "uploading" && (
                            <div className="absolute inset-0 bg-slate-900/40 flex items-center justify-center">
                              <Loader2 className="h-4 w-4 text-white animate-spin" />
                            </div>
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1">
                            <h6 className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                              {task.fileName}
                            </h6>
                            {task.status === "uploading" && (
                              <Badge className="bg-amber-100 text-amber-800 border-amber-300 font-bold text-[9px] uppercase animate-pulse">
                                Uploading...
                              </Badge>
                            )}
                            {task.status === "success" && (
                              <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 font-bold text-[9px] uppercase flex items-center gap-1">
                                <Check className="h-2.5 w-2.5" /> Uploaded!
                              </Badge>
                            )}
                            {task.status === "error" && (
                              <Badge className="bg-rose-100 text-rose-800 border-rose-300 font-bold text-[9px] uppercase">
                                Failed
                              </Badge>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                            {task.status === "uploading"
                              ? `Uploading to Google Drive in background...`
                              : task.status === "success"
                              ? `Saved in projects/${projectDetail.name}`
                              : task.errorMessage || "Failed to upload"}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}

                  {isLoadingDriveFiles && driveFiles.length === 0 ? (
                    <div className="text-center py-12 space-y-2">
                      <Loader2 className="h-6 w-6 text-emerald-600 animate-spin mx-auto" />
                      <p className="text-xs text-slate-500 font-medium">
                        Loading media from Google Drive...
                      </p>
                    </div>
                  ) : filteredDriveFiles.length === 0 && activeUploads.length === 0 ? (
                    <div className="text-center py-10 px-4 space-y-3 neumorph-inset rounded-2xl bg-white p-6">
                      <div className="h-10 w-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                        <ImageIcon className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-700">
                          {driveSearchQuery ? "No matching media found" : "No media uploaded yet"}
                        </p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {driveSearchQuery
                            ? "Try searching with a different filename keyword."
                            : "Take a live camera photo or upload files above to store them in your project folder."}
                        </p>
                      </div>
                    </div>
                  ) : (
                    filteredDriveFiles.map((file) => {
                      const isVideo = isVideoMedia(file);
                      return (
                        <div
                          key={file.fileId}
                          className={`p-3 rounded-2xl bg-white border shadow-xs transition-all space-y-2.5 ${
                            isVideo ? "border-rose-200/80 hover:border-rose-400" : "border-slate-200/80 hover:border-emerald-300"
                          }`}
                        >
                          {/* Thumbnail & Info */}
                          <div className="flex items-start gap-2.5">
                            {/* Thumbnail with Quick Preview trigger */}
                            <div
                              onClick={() => {
                                if (isVideo) {
                                  setPreviewVideo({ url: file.viewUrl, title: file.fileName, fileId: file.fileId });
                                } else {
                                  setPreviewImage({ url: file.thumbnailUrl, title: file.fileName });
                                }
                              }}
                              className="relative h-16 w-20 rounded-xl overflow-hidden bg-slate-900 shrink-0 border border-slate-200/80 cursor-pointer group flex items-center justify-center"
                            >
                              {isVideo ? (
                                <div className="w-full h-full bg-gradient-to-br from-slate-900 via-rose-950 to-slate-900 flex flex-col items-center justify-center text-white relative">
                                  <Video className="h-5 w-5 text-rose-400 mb-0.5" />
                                  <span className="text-[8px] font-black uppercase text-rose-300 tracking-wider">VIDEO</span>
                                  <div className="absolute inset-0 bg-rose-600/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                                    <Play className="h-5 w-5 fill-white text-white" />
                                  </div>
                                </div>
                              ) : (
                                <>
                                  <img
                                    src={file.thumbnailUrl}
                                    alt={file.label}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                    onError={(e) => {
                                      (e.currentTarget as HTMLElement).style.display = "none";
                                    }}
                                  />
                                  <div className="absolute inset-0 bg-slate-900/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                                    <ZoomIn className="h-4 w-4" />
                                  </div>
                                </>
                              )}
                            </div>

                            {/* File Details */}
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <h6 className="text-xs font-bold text-slate-900 truncate" title={file.fileName}>
                                  {file.fileName}
                                </h6>
                                {isVideo && (
                                  <Badge className="bg-rose-100 text-rose-700 border-rose-200 text-[8px] font-bold px-1.5 py-0 uppercase shrink-0">
                                    Video
                                  </Badge>
                                )}
                              </div>
                              <p className="text-[10px] text-slate-400 mt-0.5 truncate">
                                {file.label !== file.fileName ? file.label : ""}
                              </p>
                              <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-400 font-mono">
                                <span>{formatDateOnly(file.dateCreated)}</span>
                                {file.sizeBytes && file.sizeBytes > 0 && (
                                  <>
                                    <span>•</span>
                                    <span>{formatFileSize(file.sizeBytes)}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Action Buttons: Copy Code & Insert in Post */}
                          <div className="flex items-center justify-between gap-1.5 pt-1 border-t border-slate-100">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleCopyMediaMarkdown(file)}
                              className="h-7 text-[11px] font-bold rounded-lg border-slate-200 hover:bg-slate-50 text-slate-700 gap-1 flex-1"
                              title="Copy embed code to clipboard"
                            >
                              {copiedFileId === file.fileId ? (
                                <>
                                  <Check className="h-3 w-3 text-emerald-600" />
                                  <span className="text-emerald-700">Copied!</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="h-3 w-3 text-slate-500" />
                                  <span>{isVideo ? "Copy Video" : "Copy Code"}</span>
                                </>
                              )}
                            </Button>

                            <Button
                              size="sm"
                              onClick={() => {
                                const snippet = getDriveMediaEmbedCode(file);
                                handleInsertMarkdownSnippet(snippet);
                                toast.success(isVideo ? `Embedded video "${file.fileName}" into post!` : `Embedded image "${file.fileName}" into post!`);
                              }}
                              className={`h-7 text-[11px] font-bold rounded-lg text-white gap-1 flex-1 cursor-pointer ${
                                isVideo ? "bg-rose-600 hover:bg-rose-700 shadow-xs shadow-rose-500/20" : "bg-emerald-600 hover:bg-emerald-700"
                              }`}
                              title={isVideo ? "Insert video iframe into post" : "Insert image into post"}
                            >
                              <Plus className="h-3 w-3" />
                              <span>{isVideo ? "Insert Video" : "Insert"}</span>
                            </Button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* ── TAB 2: CONTRIBUTIONS HISTORY ── */}
            {rightPanelTab === "history" && (
              <div className="flex-1 flex flex-col min-h-0 bg-slate-50/40">
                {/* Filter Sub-header */}
                <div className="px-4 py-2.5 bg-white border-b border-slate-200/80 flex items-center justify-between shrink-0">
                  <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                    Filter Posts:
                  </span>
                  <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-0.5 text-[10px]">
                    <button
                      type="button"
                      className={`px-2.5 py-0.5 rounded-md font-bold transition-all ${
                        historyFilter === "my" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500"
                      }`}
                      onClick={() => setHistoryFilter("my")}
                    >
                      Mine
                    </button>
                    <button
                      type="button"
                      className={`px-2.5 py-0.5 rounded-md font-bold transition-all ${
                        historyFilter === "all" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500"
                      }`}
                      onClick={() => setHistoryFilter("all")}
                    >
                      All Team
                    </button>
                  </div>
                </div>

                {/* History Posts List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
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
        )}
      </div>

      {/* Project Media & Live Camera Modal */}
      <ProjectMediaModal
        open={mediaModalOpen}
        onOpenChange={setMediaModalOpen}
        projectDetail={projectDetail}
        onStartUpload={handleStartUpload}
        onInsertMarkdown={handleInsertMarkdownSnippet}
        defaultTab={mediaModalTab}
      />

      {/* Quick Image Preview Dialog */}
      {previewImage && (
        <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
          <DialogContent className="max-w-2xl p-4 rounded-3xl">
            <DialogHeader>
              <DialogTitle className="text-sm font-bold text-slate-900 truncate">
                {previewImage.title}
              </DialogTitle>
            </DialogHeader>
            <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-slate-950 flex items-center justify-center">
              <img
                src={previewImage.url}
                alt={previewImage.title}
                className="w-full h-full object-contain"
              />
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Quick Video Player Preview Dialog */}
      {previewVideo && (
        <Dialog open={!!previewVideo} onOpenChange={(open) => !open && setPreviewVideo(null)}>
          <DialogContent className="max-w-2xl p-0 overflow-hidden rounded-3xl border-slate-800 bg-slate-950 text-white shadow-2xl">
            <DialogHeader className="p-4 border-b border-slate-800 flex flex-row items-center justify-between">
              <DialogTitle className="text-sm font-bold text-slate-200 truncate flex items-center gap-2">
                <Video className="h-4 w-4 text-rose-400" />
                <span>{previewVideo.title}</span>
              </DialogTitle>
              <a
                href={`https://drive.google.com/file/d/${previewVideo.fileId}/view`}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-slate-400 hover:text-white flex items-center gap-1 bg-slate-800 px-2.5 py-1 rounded-lg"
              >
                <span>Open in Drive</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            </DialogHeader>
            <div className="relative aspect-video w-full bg-black">
              <iframe
                src={`https://drive.google.com/file/d/${previewVideo.fileId}/preview`}
                className="w-full h-full border-0"
                allow="autoplay; fullscreen"
                allowFullScreen
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
