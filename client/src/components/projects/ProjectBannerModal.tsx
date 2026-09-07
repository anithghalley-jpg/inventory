import React, { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { SCRIPT_URL } from "@/config";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import {
  normalizeImageUrl,
  extractBannerOverlayOpacity,
  buildBannerUrlWithOpacity,
} from "./projectShared";
import {
  Image as ImageIcon,
  Folder,
  Check,
  RefreshCw,
  Loader2,
  Trash2,
  ExternalLink,
  SlidersHorizontal,
} from "lucide-react";

interface DriveMediaFile {
  id: string;
  name: string;
  url: string;
  directLink: string;
  viewUrl: string;
  downloadUrl?: string;
  dateCreated?: string;
  isVideo?: boolean;
}

interface ProjectBannerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  userEmail: string;
  projectName: string;
  currentBannerUrl?: string;
  driveFolderId?: string;
  driveFolderUrl?: string;
}

export default function ProjectBannerModal({
  open,
  onOpenChange,
  projectId,
  userEmail,
  projectName,
  currentBannerUrl = "",
  driveFolderId = "",
  driveFolderUrl = "",
}: ProjectBannerModalProps) {
  const [selectedUrl, setSelectedUrl] = useState<string>(currentBannerUrl || "");
  const [overlayOpacity, setOverlayOpacity] = useState<number>(() =>
    extractBannerOverlayOpacity(currentBannerUrl),
  );
  const [driveFiles, setDriveFiles] = useState<DriveMediaFile[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const updateProjectIdentityMut = useMutation(api.projects.updateProjectIdentity);

  // Reset selected URL and overlay opacity when modal opens
  useEffect(() => {
    if (open) {
      setSelectedUrl(currentBannerUrl || "");
      setOverlayOpacity(extractBannerOverlayOpacity(currentBannerUrl));
    }
  }, [open, currentBannerUrl]);

  // Fetch drive files when opened
  const fetchDriveFiles = useCallback(async () => {
    if (!projectName) return;
    setIsLoadingFiles(true);
    try {
      const response = await fetch(SCRIPT_URL, {
        method: "POST",
        body: JSON.stringify({
          action: "getProjectMediaFiles",
          projectName,
          projectId,
          folderId: driveFolderId || "",
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to load Drive media (${response.status})`);
      }

      const result = await response.json();
      if (result.success && Array.isArray(result.files)) {
        // Filter out videos; banners should be images
        const imageFiles = result.files.filter(
          (f: any) => !f.isVideo && !/\.(mp4|webm|mov|m4v|avi|mkv)$/i.test(f.name || ""),
        );
        setDriveFiles(imageFiles);
      }
    } catch (err: any) {
      console.warn("Could not fetch project drive media files:", err);
    } finally {
      setIsLoadingFiles(false);
    }
  }, [projectName, projectId, driveFolderId]);

  useEffect(() => {
    if (open) {
      fetchDriveFiles();
    }
  }, [open, fetchDriveFiles]);

  // Save selected existing banner with transparency setting
  const handleSaveBanner = async () => {
    if (!selectedUrl) {
      toast.error("Please select an uploaded image first.");
      return;
    }

    setIsSaving(true);
    try {
      const finalUrl = buildBannerUrlWithOpacity(selectedUrl, overlayOpacity);
      await updateProjectIdentityMut({
        projectId,
        userEmail,
        name: projectName,
        teamImageUrl: finalUrl,
      });

      toast.success("Project banner background updated!");
      onOpenChange(false);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to update project banner");
    } finally {
      setIsSaving(false);
    }
  };

  // Remove banner (restore clean dark gradient)
  const handleRemoveBanner = async () => {
    setIsSaving(true);
    try {
      await updateProjectIdentityMut({
        projectId,
        userEmail,
        name: projectName,
        teamImageUrl: "",
      });

      setSelectedUrl("");
      toast.success("Banner background removed");
      onOpenChange(false);
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to reset banner");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-white p-6 rounded-3xl border border-slate-200 shadow-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-3 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-black text-slate-900 flex items-center gap-2">
              <ImageIcon className="h-5 w-5 text-indigo-600" />
              Select Banner Background
            </DialogTitle>
          </div>
          <p className="text-xs text-slate-500">
            Choose an uploaded photo from your Google Drive project folder and adjust the front color transparency for <span className="font-semibold text-slate-700">{projectName}</span>.
          </p>
        </DialogHeader>

        {/* Live Preview Box with Dynamic Overlay Opacity */}
        <div className="my-3 space-y-2">
          <Label className="text-xs font-bold text-slate-700 block">Banner Preview</Label>
          <div className="relative h-40 rounded-2xl overflow-hidden border border-slate-200 shadow-inner flex items-center justify-center bg-slate-900">
            {selectedUrl ? (
              <>
                <img
                  src={normalizeImageUrl(selectedUrl)}
                  alt="Banner preview"
                  referrerPolicy="no-referrer"
                  className="absolute inset-0 w-full h-full object-cover"
                />
                <div
                  className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/80 to-slate-950/60 transition-opacity duration-150"
                  style={{ opacity: overlayOpacity / 100 }}
                />
                <div className="relative z-10 p-4 text-center">
                  <Badge className="bg-emerald-500 text-white font-bold text-[10px] uppercase mb-1 shadow-sm">
                    Live Preview
                  </Badge>
                  <h3 className="text-lg font-black text-white drop-shadow-md">{projectName}</h3>
                  <p className="text-[11px] text-slate-200 font-medium drop-shadow-md mt-0.5">
                    Front Color Overlay: {overlayOpacity}% ({overlayOpacity === 0 ? "100% Clear (No Front Tint)" : overlayOpacity <= 30 ? "Light Tint" : overlayOpacity <= 60 ? "Balanced Tint" : "Deep Dark"})
                  </p>
                </div>
              </>
            ) : (
              <div className="text-center p-4">
                <div className="inline-flex p-2.5 rounded-full bg-white/10 text-slate-400 mb-2">
                  <ImageIcon className="h-5 w-5" />
                </div>
                <p className="text-xs font-semibold text-slate-300">Default Dark Gradient Banner</p>
                <p className="text-[11px] text-slate-500">Select an uploaded image below to set as custom banner.</p>
              </div>
            )}
          </div>
        </div>

        {/* Front Color Transparency / Opacity Slider Control */}
        {selectedUrl && (
          <div className="space-y-2 bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80">
            <div className="flex items-center justify-between text-xs">
              <Label className="font-bold text-slate-800 flex items-center gap-1.5">
                <SlidersHorizontal className="h-3.5 w-3.5 text-indigo-600" />
                <span>Front Color Transparency / Dark Overlay</span>
              </Label>
              <span className="font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
                {overlayOpacity}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={overlayOpacity}
              onChange={(e) => setOverlayOpacity(parseInt(e.target.value, 10))}
              className="w-full accent-indigo-600 cursor-pointer h-2 bg-slate-200 rounded-lg"
            />
            <div className="flex items-center justify-between text-[11px] text-slate-500 gap-1.5 flex-wrap pt-0.5">
              <button
                type="button"
                onClick={() => setOverlayOpacity(0)}
                className={`px-2 py-1 rounded-lg font-semibold border transition-all cursor-pointer ${
                  overlayOpacity === 0
                    ? "bg-indigo-600 text-white border-indigo-600 shadow-2xs"
                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
                }`}
              >
                0% (Clear / No Tint)
              </button>
              <button
                type="button"
                onClick={() => setOverlayOpacity(25)}
                className={`px-2 py-1 rounded-lg font-semibold border transition-all cursor-pointer ${
                  overlayOpacity === 25
                    ? "bg-indigo-600 text-white border-indigo-600 shadow-2xs"
                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
                }`}
              >
                25% (Light)
              </button>
              <button
                type="button"
                onClick={() => setOverlayOpacity(45)}
                className={`px-2 py-1 rounded-lg font-semibold border transition-all cursor-pointer ${
                  overlayOpacity === 45
                    ? "bg-indigo-600 text-white border-indigo-600 shadow-2xs"
                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
                }`}
              >
                45% (Balanced)
              </button>
              <button
                type="button"
                onClick={() => setOverlayOpacity(75)}
                className={`px-2 py-1 rounded-lg font-semibold border transition-all cursor-pointer ${
                  overlayOpacity === 75
                    ? "bg-indigo-600 text-white border-indigo-600 shadow-2xs"
                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
                }`}
              >
                75% (Deep Dark)
              </button>
            </div>
          </div>
        )}

        {/* Uploaded Images Grid */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-800">
              Uploaded Images in Google Drive ({driveFiles.length})
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchDriveFiles}
              disabled={isLoadingFiles}
              className="h-7 text-xs text-slate-600 hover:text-slate-900"
            >
              <RefreshCw className={`h-3 w-3 mr-1 ${isLoadingFiles ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>

          {isLoadingFiles ? (
            <div className="py-12 text-center text-slate-500 space-y-2 bg-slate-50 rounded-2xl border border-slate-100">
              <Loader2 className="h-6 w-6 animate-spin mx-auto text-indigo-600" />
              <p className="text-xs font-medium">Scanning project Google Drive folder...</p>
            </div>
          ) : driveFiles.length === 0 ? (
            <div className="py-10 text-center rounded-2xl bg-slate-50 border border-dashed border-slate-200 p-6 space-y-2">
              <Folder className="h-8 w-8 mx-auto text-slate-300" />
              <p className="text-xs font-semibold text-slate-700">No images found in your Google Drive folder.</p>
              <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                Photos uploaded to your project posts will automatically appear here to pick as your banner.
              </p>
              {driveFolderUrl && (
                <a
                  href={driveFolderUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:underline font-bold mt-2"
                >
                  <span>Open Drive Folder</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-56 overflow-y-auto p-1">
              {driveFiles.map((file) => {
                const fileUrl = file.directLink || file.url || file.viewUrl || "";
                const normalized = normalizeImageUrl(fileUrl);
                const isSelected =
                  normalizeImageUrl(selectedUrl) === normalized ||
                  (file.directLink && selectedUrl.includes(file.directLink));

                return (
                  <button
                    key={file.id}
                    type="button"
                    onClick={() => setSelectedUrl(file.directLink || fileUrl)}
                    className={`group relative aspect-video rounded-xl overflow-hidden border-2 transition-all cursor-pointer text-left bg-slate-900 ${
                      isSelected
                        ? "border-indigo-600 ring-2 ring-indigo-600/30 scale-[1.02]"
                        : "border-slate-200 hover:border-slate-400"
                    }`}
                  >
                    <img
                      src={normalized}
                      alt={file.name}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover transition-transform group-hover:scale-105"
                    />
                    {isSelected && (
                      <div className="absolute top-1.5 right-1.5 p-1 rounded-full bg-indigo-600 text-white shadow-md">
                        <Check className="h-3 w-3" />
                      </div>
                    )}
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-1.5">
                      <p className="text-[10px] text-white font-medium truncate">{file.name}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <DialogFooter className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-2">
          {currentBannerUrl ? (
            <Button
              variant="outline"
              size="sm"
              onClick={handleRemoveBanner}
              disabled={isSaving}
              className="text-rose-600 border-rose-200 hover:bg-rose-50 text-xs font-semibold w-full sm:w-auto"
            >
              <Trash2 className="h-3.5 w-3.5 mr-1" />
              Remove Banner
            </Button>
          ) : <div />}

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-xs font-semibold"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSaveBanner}
              disabled={isSaving || !selectedUrl}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="h-3 w-3 mr-1" />
                  Apply Banner Background
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
