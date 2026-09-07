import React, { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { SCRIPT_URL } from "@/config";
import { extractDriveFileId, buildDriveMarkdownImage, ProjectDetailRecord } from "./projectShared";
import {
  Camera,
  Upload,
  Link as LinkIcon,
  RefreshCw,
  Check,
  Copy,
  ExternalLink,
  Sparkles,
  Folder,
  Loader2,
  Image as ImageIcon,
  HelpCircle,
  Video,
} from "lucide-react";

interface ProjectMediaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectDetail: ProjectDetailRecord;
  onStartUpload: (payload: {
    base64Data: string;
    fileName: string;
    altText: string;
    mimeType?: string;
  }) => void;
  onInsertMarkdown?: (markdown: string) => void;
  defaultTab?: "camera" | "upload" | "driveLink";
}

export default function ProjectMediaModal({
  open,
  onOpenChange,
  projectDetail,
  onStartUpload,
  onInsertMarkdown,
  defaultTab = "camera",
}: ProjectMediaModalProps) {
  const [activeTab, setActiveTab] = useState<"camera" | "upload" | "driveLink">(defaultTab);

  // Synchronize default tab on open
  useEffect(() => {
    if (open) {
      setActiveTab(defaultTab);
    }
  }, [open, defaultTab]);

  // Common metadata
  const [imageFileName, setImageFileName] = useState("");
  const [altText, setAltText] = useState("");

  // ── 1. Camera Capture State ──
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // ── 2. Local File Upload State ──
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // ── 3. Drive Link Converter State ──
  const [rawDriveUrl, setRawDriveUrl] = useState("");
  const [copiedSnippet, setCopiedSnippet] = useState(false);

  // Stop camera helper
  const stopCameraStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  // Start camera helper
  const startCamera = async (mode: "environment" | "user" = facingMode) => {
    stopCameraStream();
    setIsCameraActive(true);
    setCapturedImage(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: mode, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch((err) => console.warn("Video play error:", err));
      }
    } catch (err) {
      console.error("Camera access error:", err);
      toast.error("Camera access was denied or not available on this device.");
      setIsCameraActive(false);
    }
  };

  // Switch facing mode
  const toggleFacingMode = () => {
    const nextMode = facingMode === "environment" ? "user" : "environment";
    setFacingMode(nextMode);
    if (isCameraActive) {
      startCamera(nextMode);
    }
  };

  // Capture snapshot from canvas
  const handleCapturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/png", 0.95);
    setCapturedImage(dataUrl);
    stopCameraStream();
    if (!imageFileName) {
      const autoName = `${projectDetail.name.toLowerCase().replace(/[^a-z0-9]+/g, "_")}_snapshot_${Date.now().toString().slice(-4)}`;
      setImageFileName(autoName);
      if (!altText) setAltText(autoName.replace(/_/g, " "));
    }
    toast.success("Snapshot captured! Enter file name and submit.");
  };

  // Retake photo
  const handleRetakePhoto = () => {
    setCapturedImage(null);
    startCamera(facingMode);
  };

  // File selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    const baseName = file.name.replace(/\.[^/.]+$/, "");
    if (!imageFileName) {
      setImageFileName(baseName);
    }
    if (!altText) {
      setAltText(baseName.replace(/[_-]+/g, " "));
    }

    // Generate local preview
    const reader = new FileReader();
    reader.onload = () => {
      setFilePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Clean up camera on modal close or unmount
  useEffect(() => {
    if (!open) {
      stopCameraStream();
      setCapturedImage(null);
      setSelectedFile(null);
      setFilePreview(null);
      setImageFileName("");
      setAltText("");
      setRawDriveUrl("");
    } else if (activeTab === "camera" && !capturedImage) {
      startCamera();
    }
    return () => {
      stopCameraStream();
    };
  }, [open, activeTab]);

  // Submit image for background upload to Google Drive and close modal immediately
  const handleTriggerUpload = (base64Data: string, originalName?: string) => {
    const targetFileName =
      imageFileName.trim() ||
      originalName ||
      `${projectDetail.name.replace(/\s+/g, "_")}_${Date.now()}.png`;

    const desc = altText.trim() || targetFileName.replace(/\.[^/.]+$/, "");

    onStartUpload({
      base64Data,
      fileName: targetFileName,
      altText: desc,
      mimeType: "image/png",
    });

    onOpenChange(false);
  };

  // Computed File ID for link converter
  const extractedFileId = extractDriveFileId(rawDriveUrl);
  const driveMarkdownSnippet = extractedFileId
    ? buildDriveMarkdownImage(extractedFileId, altText.trim() || "Image Description")
    : "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl w-full p-0 overflow-hidden rounded-3xl border-slate-200 dark:border-slate-800 shadow-2xl">
        <DialogHeader className="p-4 sm:p-5 pb-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="h-9 w-9 rounded-2xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 flex items-center justify-center shadow-sm shrink-0">
                <Camera className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 truncate flex items-center gap-2">
                  Project Media & Photo Studio
                </DialogTitle>
                <p className="text-[11px] text-slate-500 truncate flex items-center gap-1.5 mt-0.5">
                  <Folder className="h-3 w-3 text-emerald-600 shrink-0" />
                  Target: <span className="font-semibold text-slate-700 dark:text-slate-300">projects/{projectDetail.name}</span>
                </p>
              </div>
            </div>

            {projectDetail.driveFolderUrl && (
              <a
                href={projectDetail.driveFolderUrl}
                target="_blank"
                rel="noreferrer"
                className="text-[11px] font-bold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 inline-flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 px-2.5 py-1 rounded-xl shrink-0"
              >
                <span>Drive Folder</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
        </DialogHeader>

        {/* Hidden capture canvas */}
        <canvas ref={canvasRef} className="hidden" />

        <div className="p-4 sm:p-5 space-y-4">
          <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as any)} className="w-full">
            <TabsList className="grid grid-cols-3 h-10 rounded-2xl bg-slate-100 dark:bg-slate-800 p-1 mb-4">
              <TabsTrigger
                value="camera"
                className="text-xs font-bold rounded-xl data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-xs flex items-center gap-1.5"
              >
                <Camera className="h-3.5 w-3.5" />
                <span>Take Photo</span>
              </TabsTrigger>
              <TabsTrigger
                value="upload"
                className="text-xs font-bold rounded-xl data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-xs flex items-center gap-1.5"
              >
                <Upload className="h-3.5 w-3.5" />
                <span>Upload File</span>
              </TabsTrigger>
              <TabsTrigger
                value="driveLink"
                className="text-xs font-bold rounded-xl data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-xs flex items-center gap-1.5"
              >
                <LinkIcon className="h-3.5 w-3.5" />
                <span>Drive Link</span>
              </TabsTrigger>
            </TabsList>

            {/* ── TAB 1: CAMERA CAPTURE ── */}
            <TabsContent value="camera" className="space-y-4 mt-0 focus-visible:outline-none">
              <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 flex items-center justify-center shadow-inner">
                {capturedImage ? (
                  <div className="relative w-full h-full">
                    <img src={capturedImage} alt="Captured Snapshot" className="w-full h-full object-contain" />
                    <div className="absolute top-3 left-3">
                      <Badge className="bg-emerald-600 text-white font-bold text-[10px] uppercase shadow-md">
                        Snapshot Ready
                      </Badge>
                    </div>
                  </div>
                ) : isCameraActive ? (
                  <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                ) : (
                  <div className="text-center p-6 space-y-3">
                    <Camera className="h-10 w-10 text-slate-600 mx-auto" />
                    <p className="text-xs text-slate-400">Camera preview is paused.</p>
                    <Button
                      size="sm"
                      onClick={() => startCamera()}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold"
                    >
                      Start Camera
                    </Button>
                  </div>
                )}

                {/* Floating camera flip button */}
                {isCameraActive && !capturedImage && (
                  <button
                    type="button"
                    onClick={toggleFacingMode}
                    className="absolute top-3 right-3 h-8 w-8 rounded-full bg-slate-900/80 text-white flex items-center justify-center hover:bg-slate-900 transition-transform active:scale-95 shadow-md border border-white/20"
                    title="Flip camera (front / rear)"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {/* Camera Action Buttons */}
              <div className="flex items-center justify-between gap-2">
                {capturedImage ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRetakePhoto}
                    className="rounded-xl text-xs font-bold h-9 gap-1.5"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Retake Photo
                  </Button>
                ) : isCameraActive ? (
                  <Button
                    size="sm"
                    onClick={handleCapturePhoto}
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 rounded-xl text-xs font-bold h-10 shadow-md gap-2"
                  >
                    <Camera className="h-4 w-4" />
                    Capture Snapshot
                  </Button>
                ) : null}
              </div>

              {/* Image Details & Upload Button */}
              {capturedImage && (
                <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div className="space-y-1">
                      <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        Image File Name (on Google Drive)
                      </Label>
                      <Input
                        placeholder="e.g. chassis_test_01"
                        value={imageFileName}
                        onChange={(e) => setImageFileName(e.target.value)}
                        className="h-9 text-xs rounded-xl font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        Caption / Alt Text (in Markdown)
                      </Label>
                      <Input
                        placeholder="e.g. Chassis structural stress test"
                        value={altText}
                        onChange={(e) => setAltText(e.target.value)}
                        className="h-9 text-xs rounded-xl"
                      />
                    </div>
                  </div>

                  <Button
                    onClick={() => handleTriggerUpload(capturedImage)}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold h-10 shadow-md shadow-emerald-500/20 gap-2 cursor-pointer"
                  >
                    <Upload className="h-4 w-4" />
                    Save & Upload to Project Google Drive
                  </Button>
                </div>
              )}
            </TabsContent>

            {/* ── TAB 2: LOCAL FILE UPLOADER ── */}
            <TabsContent value="upload" className="space-y-4 mt-0 focus-visible:outline-none">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />

              {filePreview ? (
                <div className="space-y-3">
                  <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center">
                    <img src={filePreview} alt="Local Preview" className="w-full h-full object-contain" />
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedFile(null);
                        setFilePreview(null);
                      }}
                      className="absolute top-3 right-3 h-7 px-2.5 rounded-lg bg-slate-900/80 text-white text-[11px] font-bold hover:bg-rose-600 transition-colors"
                    >
                      Change File
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div className="space-y-1">
                      <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        Image File Name (on Google Drive)
                      </Label>
                      <Input
                        placeholder="e.g. schematic_v1"
                        value={imageFileName}
                        onChange={(e) => setImageFileName(e.target.value)}
                        className="h-9 text-xs rounded-xl font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        Caption / Alt Text (in Markdown)
                      </Label>
                      <Input
                        placeholder="e.g. Power circuit schematic"
                        value={altText}
                        onChange={(e) => setAltText(e.target.value)}
                        className="h-9 text-xs rounded-xl"
                      />
                    </div>
                  </div>

                  <Button
                    onClick={() => {
                      if (filePreview && selectedFile) {
                        handleTriggerUpload(filePreview, selectedFile.name);
                      }
                    }}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold h-10 shadow-md shadow-emerald-500/20 gap-2 cursor-pointer"
                  >
                    <Upload className="h-4 w-4" />
                    Save & Upload to Project Google Drive
                  </Button>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-emerald-500/80 dark:hover:border-emerald-500 rounded-3xl p-8 text-center cursor-pointer transition-all hover:bg-emerald-50/20 dark:hover:bg-emerald-950/10 space-y-3"
                >
                  <div className="h-12 w-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-inner">
                    <Upload className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Click to choose an image file from your device
                    </p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      PNG, JPG, JPEG, WebP, GIF supported (Auto-uploaded to Google Drive)
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-xl text-xs font-bold pointer-events-none"
                  >
                    Browse Files
                  </Button>
                </div>
              )}
            </TabsContent>

            {/* ── TAB 3: GOOGLE DRIVE LINK CONVERTER ── */}
            <TabsContent value="driveLink" className="space-y-4 mt-0 focus-visible:outline-none">
              {/* Step-by-Step Instruction Guide Box */}
              <div className="p-3.5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/80 text-xs space-y-2 text-indigo-950 dark:text-indigo-200">
                <div className="flex items-center gap-1.5 font-bold text-indigo-900 dark:text-indigo-100">
                  <Sparkles className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                  <span>How to Embed Any Google Drive Image:</span>
                </div>
                <ol className="list-decimal list-inside space-y-1 text-[11px] text-indigo-900/90 dark:text-indigo-300 leading-relaxed font-medium">
                  <li>Upload your image or video thumbnail to Google Drive</li>
                  <li>
                    Copy the shareable link:{" "}
                    <code className="bg-white/80 dark:bg-slate-900 px-1 py-0.5 rounded font-mono text-[10px]">
                      https://drive.google.com/file/d/YOUR_FILE_ID/view?usp=sharing
                    </code>
                  </li>
                  <li>Paste the link below to auto-extract the <span className="font-bold">FILE_ID</span></li>
                </ol>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Paste Google Drive Link or File ID
                </Label>
                <div className="relative">
                  <Input
                    placeholder="https://drive.google.com/file/d/1AbC2dE3fG.../view?usp=sharing"
                    value={rawDriveUrl}
                    onChange={(e) => setRawDriveUrl(e.target.value)}
                    className="h-10 text-xs rounded-xl font-mono pr-24"
                  />
                  {extractedFileId && (
                    <div className="absolute right-2 top-2">
                      <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 font-mono text-[9px]">
                        ID: {extractedFileId.substring(0, 8)}...
                      </Badge>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Image Description / Caption
                </Label>
                <Input
                  placeholder="e.g. 3D Model Render or Circuit Diagram"
                  value={altText}
                  onChange={(e) => setAltText(e.target.value)}
                  className="h-9 text-xs rounded-xl"
                />
              </div>

              {/* Generated Markdown Preview Box */}
              {extractedFileId && (
                <div className="p-3 bg-slate-50 dark:bg-slate-900/80 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-600 dark:text-slate-400">
                    <span>Generated Markdown Code:</span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(driveMarkdownSnippet);
                        setCopiedSnippet(true);
                        toast.success("Markdown snippet copied!");
                        setTimeout(() => setCopiedSnippet(false), 2000);
                      }}
                      className="text-indigo-600 hover:text-indigo-700 font-bold flex items-center gap-1"
                    >
                      {copiedSnippet ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                      {copiedSnippet ? "Copied" : "Copy Code"}
                    </button>
                  </div>
                  <pre className="p-2.5 bg-white dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 text-[11px] font-mono overflow-x-auto text-slate-800 dark:text-slate-200 select-all">
                    {driveMarkdownSnippet}
                  </pre>
                </div>
              )}

              <Button
                onClick={() => {
                  if (!extractedFileId) {
                    toast.error("Please paste a valid Google Drive link or File ID.");
                    return;
                  }
                  if (onInsertMarkdown) {
                    onInsertMarkdown(driveMarkdownSnippet);
                    toast.success("Markdown image snippet embedded in post!");
                  }
                  onOpenChange(false);
                }}
                disabled={!extractedFileId}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 rounded-xl text-xs font-bold h-10 shadow-md gap-2"
              >
                <Check className="h-4 w-4" />
                Embed Markdown Snippet into Post
              </Button>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
