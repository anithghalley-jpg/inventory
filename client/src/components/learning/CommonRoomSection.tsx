import React, { useState, useEffect } from "react";
import {
  Video,
  Mic,
  Radio,
  RotateCcw,
} from "lucide-react";
import {
  getGoogleDriveEmbedUrl,
  extractDriveId,
} from "@/lib/driveUtils";

interface Guest {
  name: string;
  email: string;
}

export interface CommonRoomPodcast {
  _id: string;
  podcastId: string;
  podcastNumber: number;
  title: string;
  videoUrl: string;
  tags: string[];
  description: string;
  guests: Guest[];
  coverImageUrl?: string;
  published?: boolean;
  createdAt: number;
  updatedAt: number;
}

interface CommonRoomSectionProps {
  podcasts: CommonRoomPodcast[];
  viewMode: "alternating" | "grid";
}

// Top-level stable component with sequenced loading:
// 1. Thumbnail loads first with priority and smooth fade-in
// 2. Video preloads in the background once thumbnail is stable
// 3. User click reveals and plays the video immediately
function VideoThumbnailPlayer({
  podcast,
  isGrid = false,
  isPlaying,
  onTogglePlay,
}: {
  podcast: CommonRoomPodcast;
  isGrid?: boolean;
  isPlaying: boolean;
  onTogglePlay: (play: boolean) => void;
}) {
  const videoEmbedUrl = getGoogleDriveEmbedUrl(podcast.videoUrl);
  const roundedClass = isGrid ? "rounded-2xl" : "rounded-[2rem]";

  const coverDriveId = extractDriveId(podcast.coverImageUrl || "");
  const videoDriveId = extractDriveId(podcast.videoUrl || "");
  const isDriveCover = Boolean(coverDriveId);
  const drivePreviewUrl = coverDriveId
    ? `https://drive.google.com/file/d/${coverDriveId}/preview`
    : "";

  // Sequenced lifecycle state
  const [thumbnailLoaded, setThumbnailLoaded] = useState(false);
  const [videoPreloaded, setVideoPreloaded] = useState(false);

  // Safety timer: mark thumbnail loaded within 1.2s if iframe onLoad is silent
  useEffect(() => {
    const timer = setTimeout(() => {
      setThumbnailLoaded(true);
    }, 1200);
    return () => clearTimeout(timer);
  }, []);

  // Once thumbnail is loaded and stable, initiate background video preloading
  useEffect(() => {
    if (thumbnailLoaded && !videoPreloaded) {
      const preloadTimer = setTimeout(() => {
        setVideoPreloaded(true);
      }, 350);
      return () => clearTimeout(preloadTimer);
    }
  }, [thumbnailLoaded, videoPreloaded]);

  const handleStartPlay = () => {
    if (!videoPreloaded) {
      setVideoPreloaded(true);
    }
    onTogglePlay(true);
  };

  return (
    <div
      className={`relative w-full aspect-video ${roundedClass} bg-slate-950 overflow-hidden shadow-xl border border-slate-200 group select-none`}
    >
      {/* ── Background Video Player (Preloaded in DOM after thumbnail is stable) ── */}
      {(videoPreloaded || isPlaying) && videoEmbedUrl && (
        <iframe
          src={
            isPlaying
              ? `${videoEmbedUrl}${videoEmbedUrl.includes("?") ? "&" : "?"}autoplay=1`
              : videoEmbedUrl
          }
          className="absolute inset-0 w-full h-full border-0 z-0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          title={podcast.title}
          loading="eager"
        />
      )}

      {/* ── Foreground Thumbnail Layer (Stable, covers video until user clicks to play) ── */}
      <div
        className={`absolute inset-0 w-full h-full z-10 bg-slate-950 transition-opacity duration-300 ${
          isPlaying ? "opacity-0 pointer-events-none" : "opacity-100 pointer-events-auto"
        }`}
      >
        {/* Loading skeleton / placeholder while thumbnail is preparing */}
        <div
          className={`absolute inset-0 bg-gradient-to-br from-slate-900 via-indigo-950/70 to-slate-900 flex flex-col items-center justify-center p-6 text-center transition-opacity duration-300 z-10 pointer-events-none ${
            thumbnailLoaded ? "opacity-0" : "opacity-100"
          }`}
        >
          <div className="w-8 h-8 rounded-full border-2 border-indigo-400/40 border-t-indigo-400 animate-spin mb-3" />
          <span className="text-white/80 font-medium text-xs">Loading episode #{podcast.podcastNumber}...</span>
        </div>

        {/* Thumbnail artwork: smoothly fades in once loaded to eliminate flicker */}
        <div
          className={`w-full h-full transition-opacity duration-500 ${
            thumbnailLoaded ? "opacity-100" : "opacity-0"
          }`}
        >
          {isDriveCover ? (
            <iframe
              src={drivePreviewUrl}
              title={podcast.title}
              className="w-full h-full border-0 pointer-events-none select-none"
              loading="eager"
              onLoad={() => setThumbnailLoaded(true)}
            />
          ) : podcast.coverImageUrl ? (
            <img
              src={podcast.coverImageUrl}
              alt={podcast.title}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover pointer-events-none select-none"
              loading="eager"
              onLoad={() => setThumbnailLoaded(true)}
            />
          ) : videoDriveId ? (
            <iframe
              src={`https://drive.google.com/file/d/${videoDriveId}/preview`}
              title={podcast.title}
              className="w-full h-full border-0 pointer-events-none select-none"
              loading="eager"
              onLoad={() => setThumbnailLoaded(true)}
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex flex-col items-center justify-center p-6 text-center">
              <Radio className="w-12 h-12 text-indigo-400/50 mb-2" />
              <span className="text-white/90 font-bold text-sm line-clamp-1">{podcast.title}</span>
              <span className="text-indigo-300/70 text-xs mt-0.5">Podcast #{podcast.podcastNumber}</span>
            </div>
          )}
        </div>

        {/* Click capture overlay across the entire thumbnail (NO play button overlay) */}
        <div
          onClick={handleStartPlay}
          className="absolute inset-0 cursor-pointer z-20"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              handleStartPlay();
            }
          }}
          title="Click to play video"
        />
      </div>

      {/* Top Status Badge */}
      <div className="absolute top-3 right-3 z-30 flex items-center gap-2 pointer-events-none">
        <div className="bg-black/60 text-white font-medium text-xs px-3 py-1 rounded-full shadow-md flex items-center gap-1.5 backdrop-blur-md border border-white/20">
          <Video className="w-3.5 h-3.5 text-indigo-300" />
          <span>{isPlaying ? "Playing" : "Video"}</span>
        </div>
      </div>

      {/* Top Left Reset to Thumbnail Button (visible when playing) */}
      {isPlaying && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onTogglePlay(false);
          }}
          className="absolute top-3 left-3 z-30 bg-black/70 hover:bg-black/90 text-white text-xs font-semibold px-3 py-1 rounded-full shadow-lg flex items-center gap-1.5 backdrop-blur-md transition-colors cursor-pointer"
          title="Return to thumbnail"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Thumbnail</span>
        </button>
      )}
    </div>
  );
}

export default function CommonRoomSection({
  podcasts,
  viewMode,
}: CommonRoomSectionProps) {
  const [playingPodcastIds, setPlayingPodcastIds] = useState<Record<string, boolean>>({});

  const handleTogglePlay = (id: string, play: boolean) => {
    setPlayingPodcastIds((prev) => ({
      ...prev,
      [id]: play,
    }));
  };

  if (podcasts.length === 0) {
    return (
      <div className="text-center py-24 bg-white rounded-3xl border border-slate-200 shadow-sm space-y-3">
        <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-2">
          <Radio className="w-8 h-8" />
        </div>
        <h3 className="text-2xl font-bold text-slate-800">Check back soon!</h3>
        <p className="text-slate-500 max-w-md mx-auto text-sm">
          No Common Room podcasts or video sessions have been published yet.
        </p>
      </div>
    );
  }

  // Alternating View (matching session cards layout)
  if (viewMode === "alternating") {
    return (
      <div className="space-y-24">
        {podcasts.map((podcast, index) => {
          const isEven = index % 2 === 0;
          const id = podcast._id || podcast.podcastId;
          const isPlaying = Boolean(playingPodcastIds[id]);

          return (
            <div key={id} className="flex flex-col">
              <div
                className={`flex flex-col ${
                  isEven ? "md:flex-row" : "md:flex-row-reverse"
                } gap-12 items-center`}
              >
                {/* Media Element side (1/2 width) with Stable Thumbnail & Background Video */}
                <div className="w-full md:w-1/2">
                  <VideoThumbnailPlayer
                    podcast={podcast}
                    isGrid={false}
                    isPlaying={isPlaying}
                    onTogglePlay={(play) => handleTogglePlay(id, play)}
                  />
                </div>

                {/* Content Side (1/2 width) */}
                <div className="w-full md:w-1/2 space-y-5">
                  {/* Podcast # Badge */}
                  <div>
                    <span className="px-3.5 py-1 bg-purple-100 text-purple-900 border border-purple-200 text-xs font-black uppercase tracking-wider rounded-full shadow-xs inline-flex items-center gap-1.5">
                      <Mic className="w-3.5 h-3.5 text-purple-700" />
                      Podcast #{podcast.podcastNumber}
                    </span>
                  </div>

                  {/* Title (ABOVE tags) */}
                  <h2 className="text-3xl md:text-4xl font-display font-bold text-slate-900 leading-tight">
                    {podcast.title}
                  </h2>

                  {/* Tags (BELOW title) */}
                  {podcast.tags && podcast.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 items-center">
                      {podcast.tags.map((tag: string) => (
                        <span
                          key={tag}
                          className="px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold uppercase tracking-wider rounded-full border border-emerald-200/60"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Short Description */}
                  <p className="text-lg text-slate-600 leading-relaxed whitespace-pre-wrap">
                    {podcast.description}
                  </p>

                  {/* Guests: Names only, adjacent to each other, simple and clean */}
                  {podcast.guests && podcast.guests.length > 0 && (
                    <div className="pt-1 flex flex-wrap items-baseline gap-x-2 text-base text-slate-600">
                      <span className="font-semibold text-slate-900">Guests:</span>
                      <span className="text-slate-800 font-medium">
                        {podcast.guests
                          .map((g) => g.name?.trim())
                          .filter(Boolean)
                          .join(", ")}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // Grid View (YouTube-style arrangement: larger preview, no enclosing card)
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 lg:gap-x-10 gap-y-12">
      {podcasts.map((podcast) => {
        const id = podcast._id || podcast.podcastId;
        const isPlaying = Boolean(playingPodcastIds[id]);

        return (
          <div key={id} className="flex flex-col group">
            {/* Preview with thumbnail (larger size, clear view) */}
            <div className="w-full">
              <VideoThumbnailPlayer
                podcast={podcast}
                isGrid={true}
                isPlaying={isPlaying}
                onTogglePlay={(play) => handleTogglePlay(id, play)}
              />
            </div>

            {/* YouTube-style details row below preview */}
            <div className="pt-3.5 flex items-start gap-3.5">
              {/* Channel / Podcast Avatar */}
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-purple-600 via-indigo-600 to-indigo-700 text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                <Mic className="w-5 h-5 text-white/95" />
              </div>

              {/* Title & Guest Name */}
              <div className="flex-1 min-w-0">
                <h3 className="text-base md:text-lg font-display font-bold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-2 leading-snug">
                  {podcast.title}
                </h3>

                {podcast.guests && podcast.guests.length > 0 && (
                  <div className="mt-1 flex flex-wrap items-baseline gap-x-1.5 text-xs md:text-sm text-slate-600">
                    <span className="font-semibold text-slate-800">Guests:</span>
                    <span className="text-slate-700 font-medium">
                      {podcast.guests
                        .map((g) => g.name?.trim())
                        .filter(Boolean)
                        .join(", ")}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
