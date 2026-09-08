import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { marked } from "marked";
import DOMPurify from "dompurify";
import { SCRIPT_URL } from "@/config";
import ProjectMediaModal from "./projects/ProjectMediaModal";
import {
  insertMarkdownFormatting,
  buildDriveMarkdownVideo,
  getDriveMediaEmbedCode,
  isVideoMedia,
  type ProjectDriveMediaFile,
} from "./projects/projectShared";
import {
  ArrowLeft,
  Save,
  CheckCircle2,
  Loader2,
  Folder,
  FolderPlus,
  Camera,
  Upload,
  Link as LinkIcon,
  RefreshCw,
  Copy,
  Check,
  Search,
  ZoomIn,
  Plus,
  ExternalLink,
  Bold,
  Italic,
  Heading1,
  Heading2,
  Heading3,
  Code,
  List,
  CheckSquare,
  Quote,
  Table as TableIcon,
  Video,
  Play,
  FileText,
  File,
  Eye,
  PanelRightOpen,
  PanelRightClose,
  Columns,
  Maximize2,
  Download,
  Share2,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";

interface LearningReportStudioProps {
  user: {
    name?: string;
    email?: string;
    role?: string;
  } | null;
  onBack: () => void;
}

interface ActiveUploadTask {
  id: string;
  fileName: string;
  altText: string;
  previewUrl: string;
  status: "uploading" | "success" | "error";
  errorMessage?: string;
}

export default function LearningReportStudio({
  user,
  onBack,
}: LearningReportStudioProps) {
  const userEmail = user?.email || "";
  const userName = user?.name || userEmail.split("@")[0] || "Maker";

  // Convex Queries & Mutations
  const reportData = useQuery(api.learningPlans.getMyLearningReport, {
    userEmail,
  });
  const saveReportDraftMut = useMutation(api.learningPlans.saveLearningReportDraft);
  const setUserReportDriveFolderMut = useMutation(
    api.learningPlans.setUserReportDriveFolder
  );

  // Editor State
  const [reportTitle, setReportTitle] = useState(
    "My Learning Experiences & Projects Report"
  );
  const [markdownContent, setMarkdownContent] = useState("");
  const [viewMode, setViewMode] = useState<"split" | "write" | "preview">("split");
  const [showMediaPanel, setShowMediaPanel] = useState(true);

  // Autosave status state
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "unsaved">("saved");
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);
  const isInitialLoadDone = useRef(false);
  const autosaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Google Drive Media Studio State
  const [driveFolderId, setDriveFolderId] = useState("");
  const [driveFolderUrl, setDriveFolderUrl] = useState("");
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [driveFiles, setDriveFiles] = useState<ProjectDriveMediaFile[]>([]);
  const [isLoadingDriveFiles, setIsLoadingDriveFiles] = useState(false);
  const [driveSearchQuery, setDriveSearchQuery] = useState("");
  const [copiedFileId, setCopiedFileId] = useState<string | null>(null);
  const [previewMedia, setPreviewMedia] = useState<{ url: string; title: string } | null>(null);
  const [previewVideo, setPreviewVideo] = useState<{ url: string; title: string; fileId: string } | null>(null);
  const [deletingFileId, setDeletingFileId] = useState<string | null>(null);

  // Active Background Uploads
  const [activeUploads, setActiveUploads] = useState<ActiveUploadTask[]>([]);

  // Media Capture Modal
  const [mediaModalOpen, setMediaModalOpen] = useState(false);
  const [mediaModalTab, setMediaModalTab] = useState<"camera" | "upload" | "driveLink">("camera");

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 1. Initial State Population from Cloud Report Record
  useEffect(() => {
    if (reportData !== undefined && !isInitialLoadDone.current) {
      if (reportData) {
        setReportTitle(reportData.title || "My Learning Experiences & Projects Report");
        setMarkdownContent(
          reportData.content ||
            `# Learning Experience & Skill Mastery Report\n\n**Author:** ${userName}\n**Date:** ${new Date().toLocaleDateString()}\n\n## 1. Executive Summary\nDocument your key takeaways, engineering skills, and breakthroughs earned during your sessions.\n\n## 2. Hands-on Deliverables & Media\n*Use the Google Drive Media Studio on the right to snap photos or upload project documents and embed them here!*\n\n`
        );
        if (reportData.driveFolderId) setDriveFolderId(reportData.driveFolderId);
        if (reportData.driveFolderUrl) setDriveFolderUrl(reportData.driveFolderUrl);
        if (reportData.lastSavedAt) {
          setLastSavedTime(new Date(reportData.lastSavedAt).toLocaleTimeString());
        }
      } else {
        // Default Scaffolding for new report
        setMarkdownContent(
          `# Learning Experience & Skill Mastery Report\n\n**Author:** ${userName}\n**Date:** ${new Date().toLocaleDateString()}\n\n## 1. Executive Summary\nDocument your key takeaways, engineering skills, and breakthroughs earned during your workshops and sessions.\n\n## 2. Hands-on Deliverables & Media\n*Use the Google Drive Media Studio on the right to snap live photos or upload project documents and embed them here!*\n\n## 3. Challenges & Technical Solutions\nExplain problems encountered and how you solved them.\n`
        );
      }
      isInitialLoadDone.current = true;
    }
  }, [reportData, userName]);

  // 2. Debounced Cloud Autosave Trigger
  const triggerAutosave = useCallback(
    (titleToSave: string, contentToSave: string) => {
      if (!userEmail) return;
      setSaveStatus("saving");

      if (autosaveTimeoutRef.current) {
        clearTimeout(autosaveTimeoutRef.current);
      }

      autosaveTimeoutRef.current = setTimeout(async () => {
        try {
          const res = await saveReportDraftMut({
            userEmail,
            userName,
            title: titleToSave,
            content: contentToSave,
          });

          if (res?.success) {
            setSaveStatus("saved");
            setLastSavedTime(new Date().toLocaleTimeString());
            // Also cache in localStorage as secondary backup
            try {
              localStorage.setItem(
                `learning_report_draft_${userEmail}`,
                JSON.stringify({ title: titleToSave, content: contentToSave, time: Date.now() })
              );
            } catch (e) {}
          }
        } catch (err) {
          console.error("Autosave error:", err);
          setSaveStatus("unsaved");
        }
      }, 800);
    },
    [userEmail, userName, saveReportDraftMut]
  );

  // Content change handler
  const handleContentChange = (newContent: string) => {
    setMarkdownContent(newContent);
    triggerAutosave(reportTitle, newContent);
  };

  // Title change handler
  const handleTitleChange = (newTitle: string) => {
    setReportTitle(newTitle);
    triggerAutosave(newTitle, markdownContent);
  };

  // 3. Fetch User's Personal Drive Files
  const fetchUserDriveFiles = useCallback(async () => {
    if (!userName) return;
    setIsLoadingDriveFiles(true);
    try {
      const response = await fetch(SCRIPT_URL, {
        method: "POST",
        body: JSON.stringify({
          action: "getUserReportMediaFiles",
          userName,
          folderId: driveFolderId || "",
        }),
      });

      if (!response.ok) {
        throw new Error(`Google Server Error (${response.status})`);
      }

      const result = await response.json();
      if (result.success && Array.isArray(result.files)) {
        setDriveFiles(result.files);

        if (result.folderId && result.folderUrl && (!driveFolderId || !driveFolderUrl)) {
          setDriveFolderId(result.folderId);
          setDriveFolderUrl(result.folderUrl);
          setUserReportDriveFolderMut({
            userEmail,
            driveFolderId: result.folderId,
            driveFolderUrl: result.folderUrl,
          }).catch((e) => console.warn("Folder sync error:", e));
        }
      }
    } catch (err) {
      console.warn("Could not retrieve user report files:", err);
    } finally {
      setIsLoadingDriveFiles(false);
    }
  }, [userName, driveFolderId, driveFolderUrl, userEmail, setUserReportDriveFolderMut]);

  useEffect(() => {
    fetchUserDriveFiles();
  }, [fetchUserDriveFiles]);

  // 4. Create Personal Google Drive Folder
  const handleCreateFolder = async () => {
    setIsCreatingFolder(true);
    try {
      const response = await fetch(SCRIPT_URL, {
        method: "POST",
        body: JSON.stringify({
          action: "createUserReportFolder",
          userName,
          email: userEmail,
        }),
      });

      if (!response.ok) {
        throw new Error(`Google Server Error (${response.status})`);
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.message || "Failed to create personal report folder");
      }

      setDriveFolderId(result.folderId);
      setDriveFolderUrl(result.folderUrl);

      await setUserReportDriveFolderMut({
        userEmail,
        driveFolderId: result.folderId,
        driveFolderUrl: result.folderUrl,
      });

      toast.success(`Google Drive folder "learning_reports/${userName}" created and linked!`);
      fetchUserDriveFiles();
    } catch (err: any) {
      console.error("Create folder error:", err);
      toast.error(err.message || "Failed to initialize Google Drive folder");
    } finally {
      setIsCreatingFolder(false);
    }
  };

  // 5. Handle Background Media Upload
  const handleStartUpload = async ({
    base64Data,
    fileName,
    altText,
    mimeType = "image/png",
  }: {
    base64Data: string;
    fileName: string;
    altText: string;
    mimeType?: string;
  }) => {
    const uploadId = `upload_${Date.now()}`;
    const previewUrl = base64Data.startsWith("data:")
      ? base64Data
      : `data:${mimeType};base64,${base64Data}`;

    setShowMediaPanel(true);

    const newTask: ActiveUploadTask = {
      id: uploadId,
      fileName,
      altText,
      previewUrl,
      status: "uploading",
    };

    setActiveUploads((prev) => [newTask, ...prev]);

    try {
      const cleanBase64 = base64Data.includes(",")
        ? base64Data.split(",")[1]
        : base64Data;

      const response = await fetch(SCRIPT_URL, {
        method: "POST",
        body: JSON.stringify({
          action: "uploadUserReportMedia",
          userName,
          folderId: driveFolderId || "",
          fileName,
          fileTitle: fileName,
          mimeType,
          content: cleanBase64,
        }),
      });

      if (!response.ok) {
        throw new Error(`Google Server Error (${response.status})`);
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.message || "Failed to upload file to report folder");
      }

      const fileId = result.fileId;
      const finalFileName = result.fileName || fileName;
      const desc = altText.trim() || finalFileName.replace(/\.[^/.]+$/, "");
      const directLink =
        result.thumbnailUrl || `https://drive.google.com/thumbnail?id=${fileId}&sz=w800`;
      const viewUrl =
        result.viewUrl || `https://drive.google.com/file/d/${fileId}/view?usp=sharing`;
      const downloadUrl =
        result.downloadUrl || `https://drive.google.com/uc?export=download&id=${fileId}`;

      const isVideoFile = mimeType.startsWith("video/") || /\.(mp4|webm|mov|mkv)$/i.test(fileName);
      let snippet = result.markdownSnippet;
      if (!snippet) {
        if (isVideoFile) snippet = buildDriveMarkdownVideo(fileId);
        else if (mimeType.startsWith("image/")) snippet = `![${desc}](${directLink})`;
        else snippet = `[📄 ${desc}](${viewUrl})`;
      }

      const newDriveFile: ProjectDriveMediaFile = {
        fileId,
        fileName: finalFileName,
        label: desc,
        mimeType,
        thumbnailUrl: directLink,
        viewUrl,
        downloadUrl,
        dateCreated: new Date().toISOString(),
        markdownSnippet: snippet,
      };

      // Place at top of drive gallery
      setDriveFiles((prev) => [
        newDriveFile,
        ...prev.filter((f) => f.fileId !== fileId),
      ]);

      setActiveUploads((prev) =>
        prev.map((t) => (t.id === uploadId ? { ...t, status: "success" } : t))
      );

      toast.success(`File "${finalFileName}" uploaded to your personal Google Drive!`);

      setTimeout(() => {
        setActiveUploads((prev) => prev.filter((t) => t.id !== uploadId));
      }, 3500);

      fetchUserDriveFiles();
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

  // 6. Insert Markdown Snippet at cursor
  const handleInsertMarkdownSnippet = (snippet: string) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      const next = markdownContent ? `${markdownContent}\n\n${snippet}\n` : `${snippet}\n`;
      handleContentChange(next);
      return;
    }

    const start = textarea.selectionStart ?? markdownContent.length;
    const end = textarea.selectionEnd ?? markdownContent.length;
    const before = markdownContent.substring(0, start);
    const after = markdownContent.substring(end);

    const prefix = before.length > 0 && !before.endsWith("\n") ? "\n\n" : "";
    const suffix = after.length > 0 && !after.startsWith("\n") ? "\n\n" : "\n";
    const nextBody = `${before}${prefix}${snippet}${suffix}${after}`;

    handleContentChange(nextBody);
    setTimeout(() => {
      textarea.focus();
      const newCursor = start + prefix.length + snippet.length + suffix.length;
      textarea.setSelectionRange(newCursor, newCursor);
    }, 50);
  };

  const applyFormat = (before: string, after = "", defaultText = "text") => {
    const updated = insertMarkdownFormatting(textareaRef.current, before, after, defaultText);
    if (updated) handleContentChange(updated);
  };

  const handleCopyFileMarkdown = (file: ProjectDriveMediaFile) => {
    const isVideo = isVideoMedia(file) || file.mimeType?.startsWith("video/") || /\.(mp4|webm|mov|mkv)$/i.test(file.fileName);
    const snippet = isVideo ? buildDriveMarkdownVideo(file.fileId) : (file.markdownSnippet || getDriveMediaEmbedCode(file));
    navigator.clipboard.writeText(snippet);
    setCopiedFileId(file.fileId);
    toast.success(isVideo ? `Video embed code for "${file.label}" copied!` : `Markdown embed code for "${file.label}" copied!`);
    setTimeout(() => setCopiedFileId(null), 2000);
  };

  // Delete a media file from personal Google Drive
  const handleDeleteDriveFile = async (file: ProjectDriveMediaFile) => {
    if (!window.confirm(`Are you sure you want to delete "${file.fileName}" from your personal Google Drive? This will move the file to trash.`)) {
      return;
    }
    setDeletingFileId(file.fileId);
    try {
      const response = await fetch(SCRIPT_URL, {
        method: "POST",
        body: JSON.stringify({
          action: "deleteDriveFile",
          fileId: file.fileId,
        }),
      });
      const data = await response.json();
      if (data.success) {
        toast.success(`Deleted "${file.fileName}" from Google Drive.`);
        setDriveFiles((prev) => prev.filter((f) => f.fileId !== file.fileId));
      } else {
        toast.error(data.message || "Failed to delete file from Google Drive");
      }
    } catch (err: any) {
      console.error("Delete drive file error:", err);
      toast.error("Failed to delete file: " + (err.message || "Network error"));
    } finally {
      setDeletingFileId(null);
    }
  };

  // Render Sanitized HTML for Markdown Preview
  const renderedHtml = useMemo(() => {
    if (!markdownContent) return "";
    try {
      const parsed = marked.parse(markdownContent) as string;
      return DOMPurify.sanitize(parsed, {
        ADD_TAGS: ["img", "iframe", "video", "source", "table", "thead", "tbody", "tr", "th", "td"],
        ADD_ATTR: ["target", "rel", "referrerpolicy", "src", "alt", "title", "controls", "class", "style", "width", "height"],
      });
    } catch (e) {
      return markdownContent;
    }
  }, [markdownContent]);

  // Filtered Drive Files
  const filteredDriveFiles = useMemo(() => {
    if (!driveSearchQuery.trim()) return driveFiles;
    const q = driveSearchQuery.toLowerCase();
    return driveFiles.filter(
      (f) =>
        f.fileName.toLowerCase().includes(q) ||
        f.label.toLowerCase().includes(q)
    );
  }, [driveFiles, driveSearchQuery]);

  const formatFileSize = (bytes?: number) => {
    if (!bytes || bytes === 0) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Fake projectDetail adapter for ProjectMediaModal
  const userProjectDetailAdapter: any = {
    projectId: `user_${userEmail.replace(/[^a-zA-Z0-9]/g, "_")}`,
    name: userName,
    driveFolderId,
    driveFolderUrl,
  };

  return (
    <div className="flex flex-col h-[860px] max-h-[90vh] neumorph-card overflow-hidden bg-slate-50/50 rounded-3xl border border-slate-200/90 shadow-xl animate-in fade-in duration-300">
      {/* ── TOP HEADER & TOOLBAR ── */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200/90 bg-white/95 backdrop-blur shadow-xs shrink-0 z-10 gap-3">
        {/* Left: Back Navigation & Editable Document Title */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="h-8.5 px-2.5 rounded-xl font-bold text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-100 gap-1.5 shrink-0"
          >
            <ArrowLeft className="h-4 w-4 text-emerald-600" />
            <span className="hidden sm:inline">Back to Learning</span>
          </Button>

          <div className="h-5 w-px bg-slate-200 shrink-0 hidden sm:block" />

          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="h-7 w-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <FileText className="h-3.5 w-3.5" />
            </div>
            <Input
              value={reportTitle}
              onChange={(e) => handleTitleChange(e.target.value)}
              className="h-8 text-xs md:text-sm font-bold text-slate-900 border-transparent hover:border-slate-200 focus:border-emerald-500 bg-transparent rounded-lg px-2 max-w-md truncate"
              placeholder="Report Document Title..."
            />
          </div>
        </div>

        {/* Center: Cloud Autosave Status Indicator */}
        <div className="hidden lg:flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-100/80 border border-slate-200/70 text-[11px] font-semibold shrink-0">
          {saveStatus === "saving" ? (
            <>
              <Loader2 className="h-3 w-3 animate-spin text-amber-500" />
              <span className="text-amber-600 font-medium">Autosaving to cloud...</span>
            </>
          ) : saveStatus === "saved" ? (
            <>
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
              <span className="text-emerald-700">All changes saved</span>
              {lastSavedTime && (
                <span className="text-slate-400 font-mono text-[10px]">({lastSavedTime})</span>
              )}
            </>
          ) : (
            <>
              <Save className="h-3 w-3 text-slate-400" />
              <span className="text-slate-500">Unsaved changes</span>
            </>
          )}
        </div>

        {/* Right: View Mode & Media Sidebar Toggles */}
        <div className="flex items-center gap-2 shrink-0">
          {/* View Mode Segmented Control */}
          <div className="inline-flex rounded-xl border border-slate-200 bg-slate-100 p-0.5 text-xs font-bold">
            <button
              type="button"
              onClick={() => setViewMode("split")}
              className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 ${
                viewMode === "split" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-900"
              }`}
              title="Side-by-Side Live Preview"
            >
              <Columns className="h-3.5 w-3.5" />
              <span className="hidden md:inline">Split View</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("write")}
              className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 ${
                viewMode === "write" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-900"
              }`}
              title="Editor Only"
            >
              <FileText className="h-3.5 w-3.5" />
              <span className="hidden md:inline">Write</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("preview")}
              className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 ${
                viewMode === "preview" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-900"
              }`}
              title="Full Preview Only"
            >
              <Eye className="h-3.5 w-3.5" />
              <span className="hidden md:inline">Preview</span>
            </button>
          </div>

          {/* Toggle Media Sidebar */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowMediaPanel((prev) => !prev)}
            className={`h-8 text-xs font-bold rounded-xl gap-1.5 transition-all ${
              showMediaPanel
                ? "bg-emerald-50 border-emerald-200 text-emerald-700 shadow-xs"
                : "neumorph-btn text-slate-700"
            }`}
            title="Toggle Google Drive Media Panel"
          >
            <Folder className="h-3.5 w-3.5 text-emerald-600" />
            <span className="hidden sm:inline">{showMediaPanel ? "Hide Drive" : "Drive Media"}</span>
          </Button>
        </div>
      </div>

      {/* ── MAIN 2-COLUMN / 3-COLUMN SPLIT ── */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* ── LEFT & CENTER: MARKDOWN EDITOR + LIVE PREVIEW ── */}
        <div className="flex-1 min-w-0 flex flex-col h-full overflow-hidden bg-slate-50/30">
          {/* Formatting Toolbar */}
          <div className="px-4 py-2 bg-white border-b border-slate-200/80 flex items-center gap-0.5 overflow-x-auto shrink-0 shadow-2xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1.5 hidden sm:inline">
              Format:
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-slate-600 hover:text-slate-900 rounded-lg"
              title="Bold (**text**)"
              onClick={() => applyFormat("**", "**", "bold text")}
            >
              <Bold className="h-3.5 w-3.5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-slate-600 hover:text-slate-900 rounded-lg"
              title="Italic (*text*)"
              onClick={() => applyFormat("*", "*", "italic text")}
            >
              <Italic className="h-3.5 w-3.5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-slate-600 hover:text-slate-900 rounded-lg"
              title="Heading 1 (# Title)"
              onClick={() => applyFormat("# ", "", "Main Title")}
            >
              <Heading1 className="h-3.5 w-3.5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-slate-600 hover:text-slate-900 rounded-lg"
              title="Heading 2 (## Section)"
              onClick={() => applyFormat("## ", "", "Section Header")}
            >
              <Heading2 className="h-3.5 w-3.5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-slate-600 hover:text-slate-900 rounded-lg"
              title="Heading 3 (### Sub-section)"
              onClick={() => applyFormat("### ", "", "Sub-header")}
            >
              <Heading3 className="h-3.5 w-3.5" />
            </Button>

            <div className="h-4 w-px bg-slate-200 mx-1 shrink-0" />

            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-slate-600 hover:text-slate-900 rounded-lg"
              title="Code Block"
              onClick={() => applyFormat("```\n", "\n```", "// Code snippet here")}
            >
              <Code className="h-3.5 w-3.5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-slate-600 hover:text-slate-900 rounded-lg"
              title="Bullet List (- item)"
              onClick={() => applyFormat("- ", "", "List item")}
            >
              <List className="h-3.5 w-3.5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-slate-600 hover:text-slate-900 rounded-lg"
              title="Checklist (- [ ] task)"
              onClick={() => applyFormat("- [ ] ", "", "Deliverable complete")}
            >
              <CheckSquare className="h-3.5 w-3.5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-slate-600 hover:text-slate-900 rounded-lg"
              title="Blockquote (> quote)"
              onClick={() => applyFormat("> ", "", "Notable quote or insight")}
            >
              <Quote className="h-3.5 w-3.5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-slate-600 hover:text-slate-900 rounded-lg"
              title="Table"
              onClick={() =>
                handleInsertMarkdownSnippet(
                  "| Parameter | Value | Notes |\n| :--- | :--- | :--- |\n| Frequency | 13.56 MHz | RFID |\n| Voltage | 3.3V | ESP32 |"
                )
              }
            >
              <TableIcon className="h-3.5 w-3.5" />
            </Button>

            <div className="h-4 w-px bg-slate-200 mx-1 shrink-0" />

            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-[11px] font-bold text-slate-600 hover:text-slate-900 rounded-lg gap-1"
              title="Link ([text](url))"
              onClick={() => applyFormat("[", "](https://...)", "Resource Link")}
            >
              <LinkIcon className="h-3 w-3" />
              <span>Link</span>
            </Button>

            <div className="ml-auto flex items-center gap-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText(markdownContent);
                  toast.success("Full Markdown code copied to clipboard!");
                }}
                className="h-7 px-2.5 text-[10px] font-bold rounded-lg border-slate-200 text-slate-600 hover:bg-slate-50 gap-1"
              >
                <Copy className="h-3 w-3" />
                <span>Copy All</span>
              </Button>
            </div>
          </div>

          {/* Dual-Pane Editor + Live Preview Area */}
          <div className="flex-1 flex min-h-0 overflow-hidden">
            {/* Left Column: Markdown Textarea */}
            {(viewMode === "split" || viewMode === "write") && (
              <div
                className={`flex-1 flex flex-col h-full p-4 overflow-hidden ${
                  viewMode === "split" ? "border-r border-slate-200/80" : ""
                }`}
              >
                <div className="flex items-center justify-between pb-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider shrink-0">
                  <span>Markdown Editor</span>
                  <span className="font-mono text-[10px] font-normal text-slate-400">
                    {markdownContent.length} chars • {markdownContent.split(/\s+/).filter(Boolean).length} words
                  </span>
                </div>
                <Textarea
                  ref={textareaRef}
                  value={markdownContent}
                  onChange={(e) => handleContentChange(e.target.value)}
                  placeholder="Type your markdown report here... Use the right sidebar to take photos or upload project files!"
                  className="flex-1 w-full p-4 rounded-2xl border-slate-200 bg-white focus:bg-white text-xs md:text-sm font-mono leading-relaxed resize-none shadow-xs transition-colors"
                />
              </div>
            )}

            {/* Right Column: Live Rendered Markdown Preview */}
            {(viewMode === "split" || viewMode === "preview") && (
              <div className="flex-1 flex flex-col h-full p-4 overflow-hidden bg-white/70">
                <div className="flex items-center justify-between pb-2 text-[11px] font-bold text-emerald-800 uppercase tracking-wider shrink-0">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
                    <span>Live Document Preview</span>
                  </div>
                  <Badge variant="outline" className="text-[9px] text-emerald-700 bg-emerald-50 border-emerald-200">
                    Auto-compiled
                  </Badge>
                </div>
                <div className="flex-1 overflow-y-auto p-6 rounded-2xl border border-slate-200 bg-white shadow-xs">
                  <div
                    className="prose prose-sm max-w-none text-slate-800 leading-relaxed space-y-3 prose-headings:font-bold prose-headings:text-slate-900 prose-a:text-emerald-600 prose-img:rounded-2xl prose-img:border prose-img:border-slate-200 prose-img:shadow-sm prose-pre:bg-slate-900 prose-pre:text-slate-100 prose-pre:rounded-2xl"
                    dangerouslySetInnerHTML={{ __html: renderedHtml }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT PANEL: PERSONAL GOOGLE DRIVE MEDIA STUDIO ── */}
        {showMediaPanel && (
          <div className="w-full md:w-[380px] lg:w-[420px] shrink-0 border-l border-slate-200 bg-white flex flex-col h-full overflow-hidden animate-in slide-in-from-right-4 duration-300 z-10 shadow-lg">
            {/* Header & Status */}
            <div className="p-3.5 bg-slate-50/90 border-b border-slate-200 space-y-3 shrink-0">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <Folder className="h-4 w-4 text-emerald-600 shrink-0" />
                    <h5 className="text-xs font-bold text-slate-900 truncate">
                      learning_reports/{userName}
                    </h5>
                  </div>
                  <p className="text-[10px] text-slate-400 truncate mt-0.5">
                    {driveFolderUrl
                      ? "Personal Google Drive media & files folder"
                      : "Personal folder not yet created"}
                  </p>
                </div>

                {driveFolderUrl ? (
                  <a
                    href={driveFolderUrl}
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
                    onClick={handleCreateFolder}
                    disabled={isCreatingFolder}
                    className="h-7 text-[11px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl gap-1 shrink-0"
                  >
                    {isCreatingFolder ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <FolderPlus className="h-3 w-3" />
                    )}
                    <span>Create Folder</span>
                  </Button>
                )}
              </div>

              {/* Action Buttons Toolbar */}
              <div className="grid grid-cols-3 gap-1.5">
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
                  <span>Take Photo</span>
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
                  <span>Upload File</span>
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
                  <span>Embed Link</span>
                </Button>
              </div>

              {/* Search & Refresh Bar */}
              <div className="flex items-center gap-1.5">
                <div className="relative flex-1">
                  <Search className="h-3 w-3 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <Input
                    placeholder="Filter personal media & files..."
                    value={driveSearchQuery}
                    onChange={(e) => setDriveSearchQuery(e.target.value)}
                    className="h-7 text-[11px] rounded-lg pl-7 bg-white border-slate-200"
                  />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchUserDriveFiles}
                  disabled={isLoadingDriveFiles}
                  className="h-7 w-7 p-0 rounded-lg text-slate-500 hover:text-slate-800"
                  title="Refresh Drive files"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${isLoadingDriveFiles ? "animate-spin text-emerald-600" : ""}`} />
                </Button>
              </div>
            </div>

            {/* Media & Files List */}
            <div className="flex-1 overflow-y-auto p-3.5 space-y-3 bg-slate-50/40">
              {/* Active Upload Tasks */}
              {activeUploads.map((task) => (
                <div
                  key={task.id}
                  className={`p-3 rounded-2xl border transition-all space-y-2 shadow-xs animate-in slide-in-from-top-2 duration-200 ${
                    task.status === "uploading"
                      ? "bg-amber-50/80 border-amber-300"
                      : task.status === "success"
                      ? "bg-emerald-50/80 border-emerald-300"
                      : "bg-rose-50/80 border-rose-300"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className="relative h-12 w-14 rounded-xl overflow-hidden bg-slate-900/10 shrink-0 border border-slate-300/50">
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
                        <h6 className="text-xs font-bold text-slate-900 truncate">
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
                      </div>
                      <p className="text-[10px] text-slate-500 truncate mt-0.5">
                        {task.status === "uploading"
                          ? `Uploading to Google Drive in background...`
                          : task.status === "success"
                          ? `Saved in learning_reports/${userName}`
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
                    Loading media from personal Google Drive...
                  </p>
                </div>
              ) : filteredDriveFiles.length === 0 && activeUploads.length === 0 ? (
                <div className="text-center py-10 px-4 space-y-3 neumorph-inset rounded-2xl bg-white p-6">
                  <div className="h-10 w-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                    <Folder className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-700">
                      {driveSearchQuery ? "No matching files found" : "No personal media uploaded yet"}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {driveSearchQuery
                        ? "Try searching with a different filename keyword."
                        : "Take live photos or upload deliverables to store them in your personal Google Drive folder."}
                    </p>
                  </div>
                </div>
              ) : (
                filteredDriveFiles.map((file) => {
                  const isImage =
                    file.mimeType?.startsWith("image/") ||
                    /\.(png|jpg|jpeg|webp|gif|svg)$/i.test(file.fileName);
                  const isVideo =
                    isVideoMedia(file) ||
                    file.mimeType?.startsWith("video/") ||
                    /\.(mp4|webm|mov|mkv)$/i.test(file.fileName);
                  const isPdf =
                    file.mimeType?.includes("pdf") || /\.(pdf)$/i.test(file.fileName);

                  return (
                    <div
                      key={file.fileId}
                      className={`p-3 rounded-2xl bg-white border shadow-xs transition-all space-y-2.5 ${
                        isVideo ? "border-rose-200/80 hover:border-rose-400" : "border-slate-200/80 hover:border-emerald-300"
                      }`}
                    >
                      {/* Thumbnail / Icon & File Details */}
                      <div className="flex items-start gap-2.5">
                        <div
                          onClick={() => {
                            if (isVideo) {
                              setPreviewVideo({ url: file.viewUrl, title: file.fileName, fileId: file.fileId });
                            } else if (isImage) {
                              setPreviewMedia({ url: file.thumbnailUrl, title: file.fileName });
                            } else {
                              window.open(file.viewUrl, "_blank", "noopener,noreferrer");
                            }
                          }}
                          className="relative h-14 w-16 rounded-xl overflow-hidden bg-slate-900 shrink-0 border border-slate-200/80 cursor-pointer group flex items-center justify-center"
                        >
                          {isImage ? (
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
                                <ZoomIn className="h-3.5 w-3.5" />
                              </div>
                            </>
                          ) : isVideo ? (
                            <div className="w-full h-full bg-gradient-to-br from-slate-900 via-rose-950 to-slate-900 flex flex-col items-center justify-center text-white relative">
                              <Video className="h-4 w-4 text-rose-400 mb-0.5" />
                              <span className="text-[7px] font-black uppercase text-rose-300 tracking-wider">VIDEO</span>
                              <div className="absolute inset-0 bg-rose-600/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                                <Play className="h-4 w-4 fill-white text-white" />
                              </div>
                            </div>
                          ) : isPdf ? (
                            <div className="h-full w-full bg-rose-50 text-rose-600 flex items-center justify-center font-bold text-[10px]">
                              PDF
                            </div>
                          ) : (
                            <div className="h-full w-full bg-slate-100 text-slate-600 flex items-center justify-center">
                              <File className="h-5 w-5" />
                            </div>
                          )}
                        </div>

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
                            <span>{new Date(file.dateCreated).toLocaleDateString()}</span>
                            {file.sizeBytes && file.sizeBytes > 0 && (
                              <>
                                <span>•</span>
                                <span>{formatFileSize(file.sizeBytes)}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons: Copy Code, Insert in Report, and Delete */}
                      <div className="flex items-center gap-1.5 pt-1 border-t border-slate-100">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleCopyFileMarkdown(file)}
                          className="h-7 text-[11px] font-bold rounded-lg border-slate-200 hover:bg-slate-50 text-slate-700 gap-1 flex-1"
                          title="Copy Markdown embed snippet to clipboard"
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
                            const snippet = isVideo ? buildDriveMarkdownVideo(file.fileId) : file.markdownSnippet || getDriveMediaEmbedCode(file);
                            handleInsertMarkdownSnippet(snippet);
                            toast.success(isVideo ? `Embedded video "${file.fileName}" into report!` : `Embedded "${file.fileName}" into report!`);
                          }}
                          className={`h-7 text-[11px] font-bold rounded-lg text-white gap-1 flex-1 shadow-2xs cursor-pointer ${
                            isVideo ? "bg-rose-600 hover:bg-rose-700 shadow-rose-500/20" : "bg-slate-900 hover:bg-slate-800"
                          }`}
                          title={isVideo ? "Insert video iframe into report" : "Insert embed snippet directly into markdown report"}
                        >
                          <Plus className="h-3 w-3" />
                          <span>{isVideo ? "Insert Video" : "Insert"}</span>
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeleteDriveFile(file)}
                          disabled={deletingFileId === file.fileId}
                          className="h-7 w-7 p-0 shrink-0 text-rose-500 hover:text-rose-700 hover:bg-rose-50 border-rose-200 rounded-lg cursor-pointer"
                          title="Delete file from Google Drive"
                        >
                          {deletingFileId === file.fileId ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      {/* Media Capture & Upload Modal */}
      <ProjectMediaModal
        open={mediaModalOpen}
        onOpenChange={setMediaModalOpen}
        projectDetail={userProjectDetailAdapter}
        onStartUpload={handleStartUpload}
        onInsertMarkdown={handleInsertMarkdownSnippet}
        defaultTab={mediaModalTab}
      />

      {/* Quick Image Preview Lightbox */}
      {previewMedia && (
        <Dialog open={!!previewMedia} onOpenChange={() => setPreviewMedia(null)}>
          <DialogContent className="max-w-2xl p-4 rounded-3xl">
            <DialogHeader>
              <DialogTitle className="text-sm font-bold text-slate-900 truncate">
                {previewMedia.title}
              </DialogTitle>
            </DialogHeader>
            <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-slate-950 flex items-center justify-center">
              <img
                src={previewMedia.url}
                alt={previewMedia.title}
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
