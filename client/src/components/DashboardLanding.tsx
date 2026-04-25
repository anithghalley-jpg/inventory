import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { getOptimizedImageUrl } from "@/lib/utils";
import {
  Activity,
  ArrowUpRight,
  BellRing,
  CheckCircle2,
  Link2,
  Megaphone,
  Pin,
  PlayCircle,
  UserPlus,
  XCircle,
} from "lucide-react";

type DashboardAudience = "user" | "team";

interface DashboardUpdate {
  entryId: string;
  title: string;
  body: string;
  kind: "announcement" | "update";
  audience: "all" | "user" | "team";
  images?: string[];
  videos?: string[];
  links?: { label: string; url: string }[];
  targetUserEmail?: string;
  relatedRequestId?: string;
  reminderDetails?: {
    itemId: string;
    itemName: string;
    itemImageUrl: string;
    quantity: number;
    issuedAt: string;
    issuedBy: string;
    userEmail: string;
    userName: string;
  };
  pinned: boolean;
  published: boolean;
  createdAt: number;
  updatedAt: number;
}

interface MachineSnapshot {
  machineId: string;
  name: string;
  status: string;
  currentUser?: string;
  currentTurnName?: string;
  lastUsed?: string;
}

interface DashboardStat {
  label: string;
  value: string | number;
  hint: string;
}

interface DashboardLandingProps {
  audience: DashboardAudience;
  userName?: string;
  title: string;
  description: string;
  stats: DashboardStat[];
  updates?: DashboardUpdate[];
  machines?: MachineSnapshot[];
  pendingApprovals?: {
    email: string;
    name: string;
    createdDate?: string;
  }[];
  onApprovePendingUser?: (email: string) => Promise<void>;
  onRejectPendingUser?: (email: string) => Promise<void>;
}

function formatRelativeTime(timestamp: number) {
  if (!timestamp) return "Just now";

  const diff = Date.now() - timestamp;
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diff < hour) return `${Math.max(1, Math.floor(diff / minute))} min ago`;
  if (diff < day) return `${Math.floor(diff / hour)} hr ago`;
  return `${Math.floor(diff / day)} day ago`;
}

function getAudienceLabel(audience: DashboardUpdate["audience"]) {
  if (audience === "all") return "All dashboards";
  if (audience === "team") return "Team";
  return "Users";
}

function normalizeVideoUrl(url: string) {
  const trimmed = url.trim();
  const youtubeWatch = trimmed.match(/[?&]v=([^&]+)/);
  const youtubeShort = trimmed.match(/youtu\.be\/([^?&]+)/);
  const youtubeEmbed = trimmed.match(/youtube\.com\/embed\/([^?&]+)/);
  const driveFile = trimmed.match(/drive\.google\.com\/file\/d\/([^/]+)/);

  if (youtubeEmbed?.[1]) return `https://www.youtube.com/embed/${youtubeEmbed[1]}`;
  if (youtubeWatch?.[1]) return `https://www.youtube.com/embed/${youtubeWatch[1]}`;
  if (youtubeShort?.[1]) return `https://www.youtube.com/embed/${youtubeShort[1]}`;
  if (driveFile?.[1]) return `https://drive.google.com/file/d/${driveFile[1]}/preview`;

  return trimmed;
}

function normalizeImageUrl(url: string) {
  const trimmed = url.trim();
  const driveView = trimmed.match(/^https:\/\/drive\.google\.com\/uc\?export=view&id=(.+)$/);
  const driveFile = trimmed.match(/drive\.google\.com\/file\/d\/([^/]+)/);

  if (driveView?.[1]) return `https://lh3.googleusercontent.com/d/${driveView[1]}=w1200`;
  if (driveFile?.[1]) return `https://lh3.googleusercontent.com/d/${driveFile[1]}=w1200`;

  return getOptimizedImageUrl(trimmed);
}

export default function DashboardLanding({
  audience,
  updates = [],
  machines = [],
  pendingApprovals = [],
  onApprovePendingUser,
  onRejectPendingUser,
}: DashboardLandingProps) {
  const [hiddenImages, setHiddenImages] = useState<Record<string, boolean>>({});
  const featuredUpdates = useMemo(
    () => updates.filter((update) => update.published).slice(0, 8),
    [updates],
  );
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(
    featuredUpdates[0]?.entryId ?? null,
  );

  useEffect(() => {
    if (!featuredUpdates.length) {
      setSelectedEntryId(null);
      return;
    }

    if (!selectedEntryId || !featuredUpdates.some((item) => item.entryId === selectedEntryId)) {
      setSelectedEntryId(featuredUpdates[0].entryId);
    }
  }, [featuredUpdates, selectedEntryId]);

  const spotlight =
    featuredUpdates.find((item) => item.entryId === selectedEntryId) ?? featuredUpdates[0];

  const liveMachines = machines.filter(
    (machine) => machine.status === "ENGAGED" || machine.status === "RESERVED",
  );
  const spotlightImages = (spotlight?.images ?? []).filter((image) => image.trim().length > 0);
  const spotlightVideos = (spotlight?.videos ?? []).filter((video) => video.trim().length > 0);
  const spotlightLinks = (spotlight?.links ?? []).filter(
    (link) => link.label.trim().length > 0 && link.url.trim().length > 0,
  );
  const visibleSpotlightImages = spotlightImages.filter(
    (_, index) => !hiddenImages[`${spotlight?.entryId}-image-${index}`],
  );

  return (
    <section className="space-y-6">
      {pendingApprovals.length > 0 && (
        <Card className="overflow-hidden rounded-[2rem] border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200/70 px-6 py-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
                  Approval Queue
                </p>
                <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-900">
                  Pending Applications
                </h2>
                <p className="mt-2 text-sm text-slate-500">
                  Review new user applications directly from the landing panel.
                </p>
              </div>
              <div className="rounded-full border border-slate-200 bg-slate-50 p-3 text-slate-600">
                <UserPlus className="h-5 w-5" />
              </div>
            </div>
          </div>

          <div className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-3">
            {pendingApprovals.map((entry) => (
              <div
                key={entry.email}
                className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full border border-slate-200 bg-white font-black text-slate-600">
                    {entry.name.charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-slate-900">{entry.name}</p>
                    <p className="truncate text-xs text-slate-500">{entry.email}</p>
                  </div>
                </div>
                <p className="mt-3 text-xs uppercase tracking-[0.2em] text-slate-400">
                  Applied {formatRelativeTime(entry.createdDate ? new Date(entry.createdDate).getTime() : Date.now())}
                </p>
                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    className="inline-flex flex-1 items-center justify-center rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
                    onClick={() => onApprovePendingUser?.(entry.email)}
                  >
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Approve
                  </button>
                  <button
                    type="button"
                    className="inline-flex flex-1 items-center justify-center rounded-full border border-rose-200 bg-white px-4 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-50"
                    onClick={() => onRejectPendingUser?.(entry.email)}
                  >
                    <XCircle className="mr-2 h-4 w-4" />
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        <Card className="overflow-hidden rounded-[2rem] border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200/70 px-6 py-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
                  Featured Feed
                </p>
                <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-900">
                  Notifications
                </h2>
                <p className="mt-2 text-sm text-slate-500">
                  All shared notices for the {audience === "team" ? "team" : "user"} dashboard.
                </p>
              </div>
              <div className="rounded-full border border-slate-200 bg-slate-50 p-3 text-slate-600">
                <BellRing className="h-5 w-5" />
              </div>
            </div>
          </div>

          <div className="space-y-3 p-4 sm:p-5">
            {featuredUpdates.length === 0 ? (
              <div className="rounded-[1.5rem] border border-dashed border-slate-200 bg-white px-4 py-10 text-sm text-slate-500">
                No notifications have been published yet.
              </div>
            ) : (
              featuredUpdates.map((update) => {
                const isActive = update.entryId === spotlight?.entryId;
                return (
                  <button
                    key={update.entryId}
                    type="button"
                    onClick={() => setSelectedEntryId(update.entryId)}
                  className={`w-full rounded-[1.5rem] border p-4 text-left transition-all ${
                    isActive
                        ? "border-slate-300 bg-slate-50 shadow-sm"
                        : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge
                        className={
                          update.kind === "announcement"
                            ? "bg-amber-100 text-amber-800 hover:bg-amber-100"
                            : "bg-sky-100 text-sky-800 hover:bg-sky-100"
                        }
                      >
                        {update.kind === "announcement" ? (
                          <Megaphone className="mr-1 h-3 w-3" />
                        ) : (
                          <Activity className="mr-1 h-3 w-3" />
                        )}
                        {update.kind === "announcement" ? "Announcement" : "Update"}
                      </Badge>
                      <Badge variant="outline" className="border-slate-200 text-slate-600">
                        {getAudienceLabel(update.audience)}
                      </Badge>
                      {update.pinned && (
                        <Badge className="bg-slate-900 text-white hover:bg-slate-900">
                          <Pin className="mr-1 h-3 w-3" />
                          Pinned
                        </Badge>
                      )}
                    </div>

                    <h3 className="mt-3 text-lg font-bold tracking-tight text-slate-900">
                      {update.title}
                    </h3>
                    <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-600">
                      {update.body}
                    </p>

                    <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                      <span>{formatRelativeTime(update.updatedAt)}</span>
                      {(update.images?.length || 0) > 0 && <span>{update.images?.length} image</span>}
                      {(update.videos?.length || 0) > 0 && <span>{update.videos?.length} video</span>}
                      {(update.links?.length || 0) > 0 && <span>{update.links?.length} link</span>}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </Card>

        <Card className="overflow-hidden rounded-[2rem] border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200/70 px-6 py-6">
            <p className="text-xs uppercase tracking-[0.32em] text-slate-400">Spotlight</p>
            <h2 className="mt-2 text-3xl font-black tracking-tight">
              {spotlight ? spotlight.title : "Select a notification"}
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              Expanded announcement details with available images, links, and videos.
            </p>
          </div>

          <div className="space-y-5 p-6 sm:p-7">
            {!spotlight ? (
              <div className="rounded-[1.5rem] border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-sm text-slate-500">
                Choose a notification from the Featured Feed to view its full details.
              </div>
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    className={
                      spotlight.kind === "announcement"
                        ? "bg-amber-100 text-amber-800 hover:bg-amber-100"
                        : "bg-sky-100 text-sky-800 hover:bg-sky-100"
                    }
                  >
                    {spotlight.kind === "announcement" ? (
                      <Megaphone className="mr-1 h-3 w-3" />
                    ) : (
                      <Activity className="mr-1 h-3 w-3" />
                    )}
                    {spotlight.kind === "announcement" ? "Announcement" : "Update"}
                  </Badge>
                  <Badge variant="outline" className="border-slate-200 text-slate-600">
                    {getAudienceLabel(spotlight.audience)}
                  </Badge>
                  {spotlight.pinned && (
                    <Badge className="bg-slate-900 text-white hover:bg-slate-900">
                      <Pin className="mr-1 h-3 w-3" />
                      Pinned
                    </Badge>
                  )}
                </div>

                <div className="rounded-[1.5rem] bg-slate-50 p-5">
                  <p className="whitespace-pre-line text-sm leading-7 text-slate-700">
                    {spotlight.body}
                  </p>
                  <p className="mt-4 text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                    {formatRelativeTime(spotlight.updatedAt)}
                  </p>
                </div>

                {spotlight.reminderDetails && (
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-[1.25rem] border border-slate-200 bg-slate-50 p-4">
                      <p className="text-xs uppercase tracking-[0.22em] text-slate-400">
                        Number of items
                      </p>
                      <p className="mt-2 text-3xl font-black text-slate-900">
                        {spotlight.reminderDetails.quantity}
                      </p>
                    </div>
                    <div className="rounded-[1.25rem] border border-slate-200 bg-slate-50 p-4">
                      <p className="text-xs uppercase tracking-[0.22em] text-slate-400">
                        Date issued
                      </p>
                      <p className="mt-2 text-sm font-semibold text-slate-900">
                        {new Date(spotlight.reminderDetails.issuedAt).toLocaleString()}
                      </p>
                    </div>
                    <div className="rounded-[1.25rem] border border-slate-200 bg-slate-50 p-4">
                      <p className="text-xs uppercase tracking-[0.22em] text-slate-400">
                        Issued by
                      </p>
                      <p className="mt-2 text-sm font-semibold text-slate-900">
                        {spotlight.reminderDetails.issuedBy}
                      </p>
                    </div>
                  </div>
                )}

                {visibleSpotlightImages.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                      <BellRing className="h-4 w-4 text-slate-500" />
                      Images
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {spotlightImages.map((image, index) => {
                        const imageKey = `${spotlight.entryId}-image-${index}`;
                        if (hiddenImages[imageKey]) return null;
                        return (
                          <div
                            key={imageKey}
                            className="overflow-hidden rounded-[1.25rem] border border-slate-200 bg-slate-100"
                          >
                            <img
                              src={normalizeImageUrl(image)}
                              alt={spotlight.title}
                              className="h-52 w-full object-cover"
                              referrerPolicy="no-referrer"
                              onError={() =>
                                setHiddenImages((prev) => ({ ...prev, [imageKey]: true }))
                              }
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {spotlightVideos.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                      <PlayCircle className="h-4 w-4 text-slate-500" />
                      Videos
                    </div>
                    <div className="grid gap-3">
                      {spotlightVideos.map((video, index) => (
                        <div
                          key={`${spotlight.entryId}-video-${index}`}
                          className="overflow-hidden rounded-[1.25rem] border border-slate-200 bg-slate-950"
                        >
                          <iframe
                            src={normalizeVideoUrl(video)}
                            title={`${spotlight.title} video ${index + 1}`}
                            className="aspect-video w-full"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {spotlightLinks.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                      <Link2 className="h-4 w-4 text-slate-500" />
                      Related links
                    </div>
                    <div className="flex flex-wrap gap-3">
                      {spotlightLinks.map((link, index) => (
                        <a
                          key={`${spotlight.entryId}-link-${index}`}
                          href={link.url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:border-slate-300 hover:text-slate-900"
                        >
                          {link.label}
                          <ArrowUpRight className="h-4 w-4" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </Card>
      </div>

      <Card className="rounded-[2rem] border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200/70 px-6 py-5">
          <h3 className="text-xl font-black tracking-tight text-slate-900">
            Live Machine Activity
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Current engaged or reserved machines.
          </p>
        </div>

        <div className="grid gap-4 p-6 md:grid-cols-2 xl:grid-cols-4">
          {liveMachines.length === 0 ? (
            <div className="md:col-span-2 xl:col-span-4 rounded-[1.5rem] border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-sm text-slate-500">
              No machines are engaged or reserved right now.
            </div>
          ) : (
            liveMachines.map((machine) => (
              <div
                key={machine.machineId}
                className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold text-slate-900">{machine.name}</p>
                  <Badge
                    className={
                      machine.status === "ENGAGED"
                        ? "bg-rose-100 text-rose-700 hover:bg-rose-100"
                        : "bg-amber-100 text-amber-700 hover:bg-amber-100"
                    }
                  >
                    {machine.status === "ENGAGED" ? "Engaged" : "Reserved"}
                  </Badge>
                </div>
                <p className="mt-2 text-sm text-slate-600">
                  {machine.status === "ENGAGED"
                    ? `In use by ${machine.currentUser || "a lab member"}`
                    : `Reserved for ${machine.currentTurnName || "the next member"}`}
                </p>
              </div>
            ))
          )}
        </div>
      </Card>
    </section>
  );
}
