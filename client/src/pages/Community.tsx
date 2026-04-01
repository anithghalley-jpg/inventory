import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Link } from "wouter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowUpRight, ChevronDown, ChevronUp, Menu, PlayCircle, Users, X } from "lucide-react";
import { SCRIPT_URL } from "@/config";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";

interface HomeContent {
  id: string;
  type: string;
  heading: string;
  description: string;
  contentUrl: string;
  lastUpdated?: string;
}

interface FabAcademyContent {
  id: string;
  studentName: string;
  imageUrl: string;
  fabYear: string;
  videoUrl: string;
  documentationUrl: string;
  remarks: string;
}

interface FabInternsContent {
  id: string;
  studentName: string;
  imageUrl: string;
  internshipYear: string;
  videoUrl: string;
  documentationUrl: string;
  remarks: string;
}

type CommunityTab = "fab-academy" | "tra-students" | "fab-interns";
type PlateDepth = "background" | "midground" | "foreground";

type HeroPlate = {
  id: string;
  tab: CommunityTab;
  title: string;
  subtitle: string;
  imageUrl: string;
  kind: "image" | "video";
  depth: PlateDepth;
  placement: string;
  width: number;
  height: number;
  rotate: number;
  tilt: number;
  driftX: number;
  driftY: number;
  duration: number;
  parallax: number;
  front: boolean;
};

const DIAMOND_CLIP = "polygon(8% 0, 92% 0, 100% 11%, 100% 89%, 92% 100%, 8% 100%, 0 89%, 0 11%)";
const INNER_DIAMOND_CLIP = "polygon(9% 0, 91% 0, 100% 12%, 100% 88%, 91% 100%, 9% 100%, 0 88%, 0 12%)";

const HERO_PLATE_LAYOUTS: Omit<HeroPlate, "id" | "tab" | "title" | "subtitle" | "imageUrl" | "kind">[] = [
  {
    depth: "background",
    placement: "hidden xl:block left-[4%] top-[11%]",
    width: 220,
    height: 160,
    rotate: -10,
    tilt: -8,
    driftX: 22,
    driftY: 16,
    duration: 31,
    parallax: 18,
    front: false,
  },
  {
    depth: "midground",
    placement: "left-[7%] top-[40%]",
    width: 196,
    height: 196,
    rotate: -7,
    tilt: -4,
    driftX: 18,
    driftY: 15,
    duration: 22,
    parallax: 26,
    front: false,
  },
  {
    depth: "foreground",
    placement: "hidden md:block left-[14%] top-[24%]",
    width: 138,
    height: 112,
    rotate: -6,
    tilt: 6,
    driftX: 14,
    driftY: 12,
    duration: 16,
    parallax: 34,
    front: true,
  },
  {
    depth: "midground",
    placement: "right-[9%] top-[14%]",
    width: 224,
    height: 168,
    rotate: 8,
    tilt: 4,
    driftX: 20,
    driftY: 14,
    duration: 24,
    parallax: 24,
    front: false,
  },
  {
    depth: "foreground",
    placement: "hidden lg:block right-[11%] top-[31%]",
    width: 128,
    height: 128,
    rotate: 6,
    tilt: -5,
    driftX: 12,
    driftY: 10,
    duration: 15,
    parallax: 32,
    front: true,
  },
  {
    depth: "background",
    placement: "hidden md:block right-[6%] bottom-[13%]",
    width: 240,
    height: 180,
    rotate: 10,
    tilt: 7,
    driftX: 24,
    driftY: 17,
    duration: 28,
    parallax: 18,
    front: false,
  },
  {
    depth: "midground",
    placement: "left-[18%] bottom-[8%]",
    width: 186,
    height: 140,
    rotate: -4,
    tilt: 5,
    driftX: 16,
    driftY: 12,
    duration: 20,
    parallax: 24,
    front: false,
  },
];

function getDriveFileId(url: string) {
  const fileMatch = url.match(/\/d\/([^/]+)/);
  if (fileMatch?.[1]) return fileMatch[1];
  const idMatch = url.match(/[?&]id=([^&]+)/);
  if (idMatch?.[1]) return idMatch[1];
  return "";
}

function buildDriveImageCandidates(url: string) {
  if (!url) return [];
  const fileId = getDriveFileId(url);
  const candidates = [
    fileId ? `https://lh3.googleusercontent.com/d/${fileId}=w1200` : "",
    fileId ? `https://drive.google.com/thumbnail?id=${fileId}&sz=w1200` : "",
    fileId ? `https://drive.google.com/uc?export=view&id=${fileId}` : "",
    url,
  ].filter(Boolean);
  return Array.from(new Set(candidates));
}

function buildMediaCoverCandidates(url: string) {
  if (!url) return [];
  const fileId = getDriveFileId(url);
  const candidates = [
    fileId ? `https://drive.google.com/thumbnail?id=${fileId}&sz=w1200` : "",
    fileId ? `https://drive.google.com/thumbnail?id=${fileId}&sz=w1000` : "",
    ...buildDriveImageCandidates(url),
  ].filter(Boolean);
  return Array.from(new Set(candidates));
}

function MediaImage({
  imageUrl,
  alt,
  className,
}: {
  imageUrl: string;
  alt: string;
  className: string;
}) {
  const candidates = buildDriveImageCandidates(imageUrl);
  const [candidateIndex, setCandidateIndex] = useState(0);

  useEffect(() => {
    setCandidateIndex(0);
  }, [imageUrl]);

  if (candidates.length === 0 || candidateIndex >= candidates.length) {
    return (
      <div className="absolute inset-0 flex items-center justify-center text-slate-400">
        <Users className="w-12 h-12" />
      </div>
    );
  }

  return (
    <img
      src={candidates[candidateIndex]}
      alt={alt}
      className={className}
      referrerPolicy="no-referrer"
      onError={() => setCandidateIndex((current) => current + 1)}
    />
  );
}

function HeroPlateMedia({
  imageUrl,
  alt,
  className,
}: {
  imageUrl: string;
  alt: string;
  className: string;
}) {
  const candidates = buildMediaCoverCandidates(imageUrl);
  const [candidateIndex, setCandidateIndex] = useState(0);

  useEffect(() => {
    setCandidateIndex(0);
  }, [imageUrl]);

  if (candidates.length === 0 || candidateIndex >= candidates.length) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.24),_rgba(148,163,184,0.06))] text-slate-300">
        <Users className="w-9 h-9" />
      </div>
    );
  }

  return (
    <img
      src={candidates[candidateIndex]}
      alt={alt}
      className={className}
      onError={() => setCandidateIndex((current) => current + 1)}
    />
  );
}

/** Fullscreen media lightbox triggered when a plate is clicked. */
function PlateMediaModal({
  plate,
  onClose,
}: {
  plate: HeroPlate;
  onClose: () => void;
}) {
  const embedUrl = plate.kind === "video" ? plate.imageUrl : null; // TRA plates store the video URL in imageUrl
  const candidates = buildDriveImageCandidates(plate.imageUrl);

  // Close on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <motion.div
      key="plate-modal"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.22 }}
      className="fixed inset-0 z-[999] flex items-center justify-center p-4 md:p-10"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-950/72 backdrop-blur-xl" />

      {/* Card */}
      <motion.div
        initial={{ scale: 0.88, y: 20, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.88, y: 20, opacity: 0 }}
        transition={{ duration: 0.28, ease: [0.34, 1.56, 0.64, 1] }}
        onClick={(e) => e.stopPropagation()}
        className="relative z-10 w-full max-w-2xl overflow-hidden rounded-[28px] border border-white/15 bg-slate-900 shadow-[0_40px_100px_rgba(0,0,0,0.6)]"
      >
        {/* Media */}
        {plate.kind === "video" && embedUrl ? (
          <div className="relative aspect-video w-full">
            <iframe
              src={embedUrl}
              allow="autoplay; encrypted-media"
              allowFullScreen
              className="absolute inset-0 h-full w-full border-0"
            />
          </div>
        ) : (
          <div className="relative w-full" style={{ aspectRatio: "4/3" }}>
            <HeroPlateMedia
              imageUrl={candidates[0] ?? plate.imageUrl}
              alt={plate.title}
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_55%,rgba(8,15,31,0.82))]" />
          </div>
        )}

        {/* Footer */}
        <div className="flex items-start justify-between gap-4 px-6 py-5">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-400">
              {plate.subtitle}
            </p>
            <p className="mt-1 text-xl font-bold text-white">{plate.title}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-full border border-white/20 bg-white/10 p-2 text-white/70 transition-colors hover:bg-white/18 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function FloatingHeroPlate({
  plate,
  reducedMotion,
  dragOffset,
  onDragEnd,
  onPlateClick,
}: {
  plate: HeroPlate;
  reducedMotion: boolean;
  dragOffset: { x: number; y: number };
  onDragEnd: (id: string, x: number, y: number) => void;
  onPlateClick: (plate: HeroPlate) => void;
}) {
  const blurClass =
    plate.depth === "background"
      ? "blur-[1.2px] opacity-55"
      : plate.depth === "midground"
        ? "opacity-90"
        : "opacity-100";

  // Track whether a drag gesture happened so we can distinguish from a plain click
  const isDragging = useRef(false);
  const isDraggable = plate.front; // only foreground plates are draggable

  const handlePointerDown = () => { isDragging.current = false; };
  const handleDragStart = () => { isDragging.current = true; };
  const handleDragEnd = (_: unknown, info: { offset: { x: number; y: number } }) => {
    onDragEnd(plate.id, dragOffset.x + info.offset.x, dragOffset.y + info.offset.y);
  };
  const handleClick = () => {
    if (!isDragging.current) onPlateClick(plate);
    isDragging.current = false;
  };

  const FloatInner = (
    <motion.div
      aria-label={`View ${plate.title}`}
      style={{ width: plate.width, height: plate.height }}
      className="cursor-pointer text-left"
      animate={
        reducedMotion
          ? undefined
          : {
            x: [0, plate.driftX * 0.5, -plate.driftX * 0.18, 0],
            y: [0, -plate.driftY * 0.45, plate.driftY * 0.2, 0],
            rotateZ: [plate.rotate, plate.rotate + 0.65, plate.rotate - 0.45, plate.rotate],
            scale: [1, plate.depth === "foreground" ? 1.012 : 1.006, 1],
          }
      }
      transition={
        reducedMotion
          ? undefined
          : {
            duration: plate.duration + 8,
            repeat: Infinity,
            ease: "easeInOut",
            delay: plate.duration * 0.04,
          }
      }
      whileHover={{ scale: isDraggable ? 1.04 : 1.02, y: -4, rotateZ: plate.rotate + 0.4 }}
    >
      <div className="h-full w-full origin-center scale-[0.62] sm:scale-[0.80] lg:scale-100">
        <div
          className={`community-plate-shell ${blurClass}`}
          style={{
            clipPath: DIAMOND_CLIP,
            transform: `perspective(1000px) rotateY(${plate.tilt}deg) rotateX(${plate.depth === "background" ? "2deg" : "4deg"})`,
          }}
        >
          <div className="community-plate-shadow" />
          <div className="community-plate-frame" style={{ clipPath: DIAMOND_CLIP }}>
            <div className="community-plate-inner" style={{ clipPath: INNER_DIAMOND_CLIP }}>
              <HeroPlateMedia
                imageUrl={plate.imageUrl}
                alt={plate.title}
                className="absolute inset-0 h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(8,15,31,0.02),rgba(8,15,31,0.42))]" />
              <div className="community-plate-gloss" />
              {/* Drag hint badge — only on draggable foreground plates */}
              {isDraggable && (
                <div className="absolute left-3 top-3 flex items-center gap-1 rounded-full border border-white/20 bg-black/30 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-white/70 backdrop-blur">
                  <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 10 10" stroke="currentColor" strokeWidth={1.5}>
                    <path d="M5 1v8M1 5h8" />
                  </svg>
                  Drag
                </div>
              )}
              <div className="absolute inset-x-4 bottom-4 flex items-end justify-between gap-3 text-white">
                <div className="min-w-0">
                  <p className="truncate text-[10px] font-semibold uppercase tracking-[0.26em] text-emerald-200/85">
                    {plate.subtitle}
                  </p>
                  <p className="truncate pt-1 text-sm font-semibold">{plate.title}</p>
                </div>
                {plate.kind === "video" && (
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/25 bg-white/14 backdrop-blur">
                    <PlayCircle className="h-4 w-4" />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );

  if (isDraggable) {
    return (
      <motion.div
        className={`absolute ${plate.placement} ${plate.front ? "z-10 md:z-30" : plate.depth === "background" ? "z-10" : "z-10 md:z-20"}`}
        style={{ x: dragOffset.x, y: dragOffset.y }}
        drag
        dragMomentum={false}
        dragElastic={0.08}
        onPointerDown={handlePointerDown}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onClick={handleClick}
        whileDrag={{ scale: 1.08, zIndex: 50, cursor: "grabbing", filter: "drop-shadow(0 16px 32px rgba(0,0,0,0.28))" }}
      >
        {FloatInner}
      </motion.div>
    );
  }

  // Non-draggable plates: simple click-to-open-modal wrapper
  return (
    <motion.button
      type="button"
      className={`absolute ${plate.placement} ${plate.front ? "z-10 md:z-30" : plate.depth === "background" ? "z-10" : "z-10 md:z-20"} cursor-pointer`}
      onClick={() => onPlateClick(plate)}
    >
      {FloatInner}
    </motion.button>
  );
}

/**
 * Mobile flip-card back-face media. Detects each image's natural aspect ratio
 * so the preview height adapts to the actual content dimensions.
 */
function MobileFabCardMedia({
  student,
  embedUrl,
}: {
  student: FabAcademyContent;
  embedUrl: string;
}) {
  const [aspectRatio, setAspectRatio] = useState(16 / 9);

  useEffect(() => {
    // Videos always embed at 16:9
    if (student.videoUrl) {
      setAspectRatio(16 / 9);
      return;
    }

    const candidates = buildDriveImageCandidates(student.imageUrl);
    if (candidates.length === 0) return;

    let cancelled = false;
    let i = 0;

    const tryNext = () => {
      if (cancelled || i >= candidates.length) return;
      const img = new Image();
      img.onload = () => {
        if (cancelled) return;
        if (img.naturalWidth > 0 && img.naturalHeight > 0) {
          // Clamp to reasonable range: portrait 0.5 to wide 1.8
          setAspectRatio(Math.min(1.8, Math.max(0.5, img.naturalWidth / img.naturalHeight)));
        }
      };
      img.onerror = () => {
        i += 1;
        tryNext();
      };
      img.src = candidates[i];
    };

    tryNext();
    return () => {
      cancelled = true;
    };
  }, [student.imageUrl, student.videoUrl]);

  return (
    <div className="relative w-full" style={{ aspectRatio }}>
      {student.videoUrl && embedUrl ? (
        <iframe
          src={embedUrl}
          allow="autoplay; encrypted-media"
          allowFullScreen
          className="absolute inset-0 h-full w-full border-0"
        />
      ) : (
        <MediaImage
          imageUrl={student.imageUrl}
          alt={student.studentName}
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}
    </div>
  );
}

export default function Community() {
  const [homeData, setHomeData] = useState<HomeContent[]>([]);
  const [fabAcademyData, setFabAcademyData] = useState<FabAcademyContent[]>([]);
  const [fabInternData, setFabInternData] = useState<FabInternsContent[]>([]);
  const [selectedFabCardId, setSelectedFabCardId] = useState<string | null>(null);
  const [selectedInternCardId, setSelectedInternCardId] = useState<string | null>(null);
  const [fabPreviewMode, setFabPreviewMode] = useState<"image" | "video">("image");
  const [internPreviewMode, setInternPreviewMode] = useState<"image" | "video">("image");
  const [fabPreviewAspectRatio, setFabPreviewAspectRatio] = useState(16 / 9);
  const [internPreviewAspectRatio, setInternPreviewAspectRatio] = useState(16 / 9);
  const [fabGraduateScrollHeight, setFabGraduateScrollHeight] = useState<number | null>(null);
  const [internGraduateScrollHeight, setInternGraduateScrollHeight] = useState<number | null>(null);
  const [mobileFabFlippedId, setMobileFabFlippedId] = useState<string | null>(null);
  const [mobileInternFlippedId, setMobileInternFlippedId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [dataSource, setDataSource] = useState<"convex" | "sheets" | "loading">("loading");
  const [activeTab, setActiveTab] = useState<CommunityTab>("fab-academy");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activePlate, setActivePlate] = useState<HeroPlate | null>(null);
  const [plateDragOffsets, setPlateDragOffsets] = useState<Record<string, { x: number; y: number }>>({});
  const reducedMotion = useReducedMotion();
  const contentRef = useRef<HTMLDivElement>(null);
  const fabGraduateListRef = useRef<HTMLDivElement>(null);
  const fabPreviewSectionRef = useRef<HTMLDivElement>(null);
  const fabSelectedDetailsRef = useRef<HTMLDivElement>(null);
  const fabGraduateHeaderRef = useRef<HTMLDivElement>(null);
  const internPreviewSectionRef = useRef<HTMLDivElement>(null);
  const internSelectedDetailsRef = useRef<HTMLDivElement>(null);
  const internGraduateHeaderRef = useRef<HTMLDivElement>(null);

  const convexHomeData = useQuery(api.home.getAll);
  const convexFabAcademyData = useQuery(api.fabAcademy.getAll);
  const convexFabInternsData = useQuery(api.fabInterns.getAll);

  const fetchFromSheets = useCallback(async () => {
    try {
      const [homeRes, fabRes] = await Promise.all([
        fetch(SCRIPT_URL, {
          method: "POST",
          body: JSON.stringify({ action: "getHomeContent" }),
        }),
        fetch(SCRIPT_URL, {
          method: "POST",
          body: JSON.stringify({ action: "getFabAcademyContent" }),
        }),
      ]);

      const [homeResult, fabResult] = await Promise.all([homeRes.json(), fabRes.json()]);

      if (homeResult.success && homeResult.items) {
        setHomeData(homeResult.items);
      }

      if (fabResult.success && fabResult.items) {
        setFabAcademyData(
          fabResult.items.map((item: any) => ({
            id: item.entryId,
            studentName: item.studentName,
            imageUrl: item.imageUrl,
            fabYear: item.fabYear,
            videoUrl: item.videoUrl,
            documentationUrl: item.documentationUrl,
            remarks: item.remarks,
          })),
        );
      }

      if ((homeResult.success && homeResult.items) || (fabResult.success && fabResult.items)) {
        setDataSource("sheets");
      }
    } catch (err) {
      console.error("Sheets community content fetch failed:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (convexHomeData !== undefined) {
      const data: HomeContent[] = convexHomeData.map((doc) => ({
        ...doc,
        id: doc.docId || doc._id,
        contentUrl: doc.content || "",
        heading: doc.title || "",
      })) as unknown as HomeContent[];
      setHomeData(data);
      setDataSource("convex");
      setIsLoading(false);
    }
  }, [convexHomeData]);

  useEffect(() => {
    if (convexFabAcademyData !== undefined) {
      const data: FabAcademyContent[] = convexFabAcademyData
        .map((doc) => ({
          id: doc.entryId || doc._id,
          studentName: doc.studentName || "",
          imageUrl: doc.imageUrl || "",
          fabYear: doc.fabYear || "",
          videoUrl: doc.videoUrl || "",
          documentationUrl: doc.documentationUrl || "",
          remarks: doc.remarks || "",
        }))
        .sort(
          (a, b) =>
            String(b.fabYear).localeCompare(String(a.fabYear)) || a.studentName.localeCompare(b.studentName),
        );
      setFabAcademyData(data);
      setDataSource("convex");
      setIsLoading(false);
    }
  }, [convexFabAcademyData]);

  useEffect(() => {
    if (convexFabInternsData !== undefined) {
      const data: FabInternsContent[] = convexFabInternsData
        .map((doc) => ({
          id: doc.entryId || doc._id,
          studentName: doc.studentName || "",
          imageUrl: doc.imageUrl || "",
          internshipYear: doc.internshipYear || "",
          videoUrl: doc.videoUrl || "",
          documentationUrl: doc.documentationUrl || "",
          remarks: doc.remarks || "",
        }))
        .sort(
          (a, b) =>
            String(b.internshipYear).localeCompare(String(a.internshipYear)) || a.studentName.localeCompare(b.studentName),
        );
      setFabInternData(data);
      setDataSource("convex");
      setIsLoading(false);
    }
  }, [convexFabInternsData]);

  useEffect(() => {
    if (convexHomeData === null || convexFabAcademyData === null) {
      fetchFromSheets();
    }
  }, [convexFabAcademyData, convexHomeData, fetchFromSheets]);

  useEffect(() => {
    if (fabAcademyData.length === 0) {
      setSelectedFabCardId(null);
      setFabPreviewMode("image");
      return;
    }

    setSelectedFabCardId((current) =>
      current && fabAcademyData.some((student) => student.id === current) ? current : fabAcademyData[0].id,
    );
  }, [fabAcademyData]);

  useEffect(() => {
    if (fabInternData.length === 0) {
      setSelectedInternCardId(null);
      setInternPreviewMode("image");
      return;
    }

    setSelectedInternCardId((current) =>
      current && fabInternData.some((intern) => intern.id === current) ? current : fabInternData[0].id,
    );
  }, [fabInternData]);

  const getEmbedUrl = (url: string) => {
    if (!url) return "";
    if (url.includes("/preview")) return url;
    const fileId = getDriveFileId(url);
    if (fileId) return `https://drive.google.com/file/d/${fileId}/preview`;
    return url.replace(/\/view(\?.*)?$/, "/preview");
  };

  const traVideos = useMemo(
    () => homeData.filter((item) => item.type && item.type.toLowerCase() === "video"),
    [homeData],
  );

  const heroPlates = useMemo(() => {
    const fabMedia = fabAcademyData.slice(0, 4).map((entry) => ({
      tab: "fab-academy" as const,
      title: entry.studentName,
      subtitle: entry.fabYear ? `Fab Academy ${entry.fabYear}` : "Fab Academy",
      imageUrl: entry.imageUrl,
      kind: "image" as const,
    }));
    const internMedia = fabInternData.slice(0, 4).map((entry) => ({
      tab: "fab-interns" as const,
      title: entry.studentName,
      subtitle: entry.internshipYear ? `Intern ${entry.internshipYear}` : "Fab Intern",
      imageUrl: entry.imageUrl,
      kind: "image" as const,
    }));
    const traMedia = traVideos.slice(0, 3).map((item) => ({
      tab: "tra-students" as const,
      title: item.heading,
      subtitle: "TRA Students",
      imageUrl: item.contentUrl,
      kind: "video" as const,
    }));

    const mediaPool = [...fabMedia, ...internMedia, ...traMedia];
    return HERO_PLATE_LAYOUTS.slice(0, mediaPool.length).map((layout, index) => ({
      ...layout,
      ...mediaPool[index],
      id: `${mediaPool[index].tab}-${index}`,
    }));
  }, [fabAcademyData, fabInternData, traVideos]);

  const selectedFabStudent = useMemo(() => {
    if (fabAcademyData.length === 0) return null;
    return fabAcademyData.find((student) => student.id === selectedFabCardId) ?? fabAcademyData[0];
  }, [fabAcademyData, selectedFabCardId]);

  const selectedFabIndex = useMemo(() => {
    if (!selectedFabStudent) return -1;
    return fabAcademyData.findIndex((student) => student.id === selectedFabStudent.id);
  }, [fabAcademyData, selectedFabStudent]);

  const selectedFabEmbedUrl = selectedFabStudent ? getEmbedUrl(selectedFabStudent.videoUrl) : "";
  const isFabVideoVisible = fabPreviewMode === "video" && !!selectedFabStudent?.videoUrl;

  const selectedInternStudent = useMemo(() => {
    if (fabInternData.length === 0) return null;
    return fabInternData.find((intern) => intern.id === selectedInternCardId) ?? fabInternData[0];
  }, [fabInternData, selectedInternCardId]);

  const selectedInternIndex = useMemo(() => {
    if (!selectedInternStudent) return -1;
    return fabInternData.findIndex((intern) => intern.id === selectedInternStudent.id);
  }, [fabInternData, selectedInternStudent]);

  const selectedInternEmbedUrl = selectedInternStudent ? getEmbedUrl(selectedInternStudent.videoUrl) : "";
  const isInternVideoVisible = internPreviewMode === "video" && !!selectedInternStudent?.videoUrl;

  useEffect(() => {
    if (!selectedFabStudent || isFabVideoVisible) {
      setFabPreviewAspectRatio(16 / 9);
      return;
    }

    const candidates = buildDriveImageCandidates(selectedFabStudent.imageUrl);
    if (candidates.length === 0) {
      setFabPreviewAspectRatio(16 / 9);
      return;
    }

    let cancelled = false;
    let candidateIndex = 0;

    const loadNextCandidate = () => {
      if (cancelled || candidateIndex >= candidates.length) {
        if (!cancelled) {
          setFabPreviewAspectRatio(16 / 9);
        }
        return;
      }

      const image = new Image();
      image.onload = () => {
        if (cancelled) return;
        const naturalRatio = image.naturalWidth > 0 && image.naturalHeight > 0
          ? image.naturalWidth / image.naturalHeight
          : 16 / 9;
        setFabPreviewAspectRatio(Math.min(1.8, Math.max(1, naturalRatio)));
      };
      image.onerror = () => {
        candidateIndex += 1;
        loadNextCandidate();
      };
      image.src = candidates[candidateIndex];
    };

    loadNextCandidate();

    return () => {
      cancelled = true;
    };
  }, [isFabVideoVisible, selectedFabStudent]);

  useEffect(() => {
    if (!selectedInternStudent || isInternVideoVisible) {
      setInternPreviewAspectRatio(16 / 9);
      return;
    }

    const candidates = buildDriveImageCandidates(selectedInternStudent.imageUrl);
    if (candidates.length === 0) {
      setInternPreviewAspectRatio(16 / 9);
      return;
    }

    let cancelled = false;
    let candidateIndex = 0;

    const loadNextCandidate = () => {
      if (cancelled || candidateIndex >= candidates.length) {
        if (!cancelled) setInternPreviewAspectRatio(16 / 9);
        return;
      }

      const image = new Image();
      image.onload = () => {
        if (cancelled) return;
        const naturalRatio = image.naturalWidth > 0 && image.naturalHeight > 0
          ? image.naturalWidth / image.naturalHeight
          : 16 / 9;
        setInternPreviewAspectRatio(Math.min(1.8, Math.max(1, naturalRatio)));
      };
      image.onerror = () => {
        candidateIndex += 1;
        loadNextCandidate();
      };
      image.src = candidates[candidateIndex];
    };

    loadNextCandidate();
    return () => { cancelled = true; };
  }, [isInternVideoVisible, selectedInternStudent]);

  useEffect(() => {
    if (activeTab !== "fab-academy") {
      setFabGraduateScrollHeight(null);
      return;
    }

    if (typeof window === "undefined") {
      return;
    }

    let frameId = 0;

    const measureGraduateScroll = () => {
      cancelAnimationFrame(frameId);
      frameId = window.requestAnimationFrame(() => {
        if (window.innerWidth < 1280) {
          setFabGraduateScrollHeight(null);
          return;
        }

        const previewEl = fabPreviewSectionRef.current;
        const detailEl = fabSelectedDetailsRef.current;
        const headerEl = fabGraduateHeaderRef.current;
        if (!previewEl || !detailEl || !headerEl) {
          setFabGraduateScrollHeight(null);
          return;
        }

        const previewHeight = previewEl.getBoundingClientRect().height;
        const detailHeight = detailEl.getBoundingClientRect().height;
        const headerHeight = headerEl.getBoundingClientRect().height;
        // 32px accounts for the grid row gap between row-1 and row-2
        const desktopGap = 32;
        const nextHeight = Math.max(220, Math.floor(previewHeight + detailHeight + desktopGap - headerHeight));

        setFabGraduateScrollHeight((current) => (current === nextHeight ? current : nextHeight));
      });
    };

    measureGraduateScroll();

    const observer = new ResizeObserver(() => {
      measureGraduateScroll();
    });

    if (contentRef.current) observer.observe(contentRef.current);
    if (fabPreviewSectionRef.current) observer.observe(fabPreviewSectionRef.current);
    if (fabSelectedDetailsRef.current) observer.observe(fabSelectedDetailsRef.current);
    if (fabGraduateHeaderRef.current) observer.observe(fabGraduateHeaderRef.current);

    window.addEventListener("resize", measureGraduateScroll);

    return () => {
      cancelAnimationFrame(frameId);
      observer.disconnect();
      window.removeEventListener("resize", measureGraduateScroll);
    };
  }, [activeTab, fabAcademyData.length, selectedFabCardId, fabPreviewMode, fabPreviewAspectRatio]);

  useEffect(() => {
    if (activeTab !== "fab-interns") {
      setInternGraduateScrollHeight(null);
      return;
    }

    if (typeof window === "undefined") return;

    let frameId = 0;
    const measureInternScroll = () => {
      cancelAnimationFrame(frameId);
      frameId = window.requestAnimationFrame(() => {
        if (window.innerWidth < 1280) {
          setInternGraduateScrollHeight(null);
          return;
        }

        const previewEl = internPreviewSectionRef.current;
        const detailEl = internSelectedDetailsRef.current;
        const headerEl = internGraduateHeaderRef.current;
        if (!previewEl || !detailEl || !headerEl) {
          setInternGraduateScrollHeight(null);
          return;
        }

        const previewHeight = previewEl.getBoundingClientRect().height;
        const detailHeight = detailEl.getBoundingClientRect().height;
        const headerHeight = headerEl.getBoundingClientRect().height;
        const desktopGap = 32;
        const nextHeight = Math.max(220, Math.floor(previewHeight + detailHeight + desktopGap - headerHeight));

        setInternGraduateScrollHeight((current) => (current === nextHeight ? current : nextHeight));
      });
    };

    measureInternScroll();
    const observer = new ResizeObserver(() => measureInternScroll());

    if (contentRef.current) observer.observe(contentRef.current);
    if (internPreviewSectionRef.current) observer.observe(internPreviewSectionRef.current);
    if (internSelectedDetailsRef.current) observer.observe(internSelectedDetailsRef.current);
    if (internGraduateHeaderRef.current) observer.observe(internGraduateHeaderRef.current);

    window.addEventListener("resize", measureInternScroll);

    return () => {
      cancelAnimationFrame(frameId);
      observer.disconnect();
      window.removeEventListener("resize", measureInternScroll);
    };
  }, [activeTab, fabInternData.length, selectedInternCardId, internPreviewMode, internPreviewAspectRatio]);

  const selectFabStudent = (studentId: string, mode: "image" | "video" = "image") => {
    setSelectedFabCardId(studentId);
    setFabPreviewMode(mode);
  };

  const cycleFabStudent = (direction: 1 | -1) => {
    if (fabAcademyData.length === 0 || selectedFabIndex === -1) return;
    const nextIndex = (selectedFabIndex + direction + fabAcademyData.length) % fabAcademyData.length;
    setSelectedFabCardId(fabAcademyData[nextIndex].id);
    setFabPreviewMode("image");
  };

  const handleMobileCardTap = (studentId: string) => {
    // Flip the tapped card; unflip if already flipped
    setMobileFabFlippedId((current) => (current === studentId ? null : studentId));
    setSelectedFabCardId(studentId);
    setFabPreviewMode("image");
  };

  const selectIntern = (internId: string, mode: "image" | "video" = "image") => {
    setSelectedInternCardId(internId);
    setInternPreviewMode(mode);
  };

  const cycleIntern = (direction: 1 | -1) => {
    if (fabInternData.length === 0) return;
    const currentIndex = fabInternData.findIndex(i => i.id === selectedInternCardId);
    const nextIndex = (currentIndex + direction + fabInternData.length) % fabInternData.length;
    setSelectedInternCardId(fabInternData[nextIndex].id);
    setInternPreviewMode("image");
  };

  const handleMobileInternCardTap = (internId: string) => {
    setMobileInternFlippedId((current) => (current === internId ? null : internId));
    setSelectedInternCardId(internId);
    setInternPreviewMode("image");
  };

  const handleSelectTab = (tab: CommunityTab) => {
    setActiveTab(tab);
    contentRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="min-h-screen bg-[#f6f5f1] font-sans text-slate-900">
      <header className="sticky top-0 z-50 border-b border-white/65 bg-white/78 shadow-[0_8px_32px_rgba(15,23,42,0.05)] backdrop-blur-xl">
        {/* ── Top bar ───────────────────────────────────────────────────── */}
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 md:px-8">
          {/* Logo */}
          <Link href="/">
            <div className="flex cursor-pointer flex-col group">
              <span className="font-display text-xl font-black leading-none tracking-tight transition-colors group-hover:text-emerald-500">
                AESTHETIC
              </span>
              <span className="mt-0.5 font-sans text-[0.65rem] font-medium uppercase leading-none tracking-[0.3em] text-emerald-600 transition-colors group-hover:text-emerald-400">
                Centre
              </span>
            </div>
          </Link>

          {/* Desktop centre nav */}
          <div className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-12 md:flex">
            <Link href="/community">
              <button className="text-sm font-semibold tracking-wide text-slate-900">Community</button>
            </Link>
            <Link href="/">
              <button className="text-sm font-medium tracking-wide text-slate-500 transition-colors hover:text-slate-900">
                Aesthetic Centre
              </button>
            </Link>
            <Link href="/learning">
              <button className="text-sm font-medium tracking-wide text-slate-500 transition-colors hover:text-slate-900">
                Learning
              </button>
            </Link>
          </div>

          {/* Right side: Sign In (desktop) + hamburger (mobile) */}
          <div className="flex items-center gap-3">
            <Link href="/login">
              <button className="hidden rounded-full bg-slate-900 px-6 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:scale-105 hover:bg-slate-800 active:scale-95 md:inline-flex">
                Sign In
              </button>
            </Link>
            {/* Hamburger — mobile only */}
            <button
              type="button"
              aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
              onClick={() => setMobileMenuOpen((o) => !o)}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white/80 text-slate-700 shadow-sm transition-colors active:bg-slate-100 md:hidden"
            >
              {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* ── Mobile drawer ─────────────────────────────────────────────── */}
        <motion.div
          initial={false}
          animate={mobileMenuOpen ? { height: "auto", opacity: 1 } : { height: 0, opacity: 0 }}
          transition={{ duration: 0.28, ease: "easeInOut" }}
          className="overflow-hidden border-t border-white/60 bg-white/90 backdrop-blur-xl md:hidden"
        >
          <nav className="flex flex-col gap-1 px-4 py-4">
            <Link href="/community">
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="w-full rounded-2xl px-4 py-3 text-left text-sm font-semibold tracking-wide text-slate-900 transition-colors hover:bg-emerald-50 hover:text-emerald-700"
              >
                Community
              </button>
            </Link>
            <Link href="/">
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="w-full rounded-2xl px-4 py-3 text-left text-sm font-medium tracking-wide text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
              >
                Aesthetic Centre
              </button>
            </Link>
            <Link href="/learning">
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="w-full rounded-2xl px-4 py-3 text-left text-sm font-medium tracking-wide text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
              >
                Learning
              </button>
            </Link>
            <div className="mt-2 border-t border-slate-100 pt-3">
              <Link href="/login">
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full rounded-full bg-slate-900 py-3 text-sm font-semibold text-white shadow-sm transition-colors active:bg-slate-800"
                >
                  Sign In
                </button>
              </Link>
            </div>
          </nav>
        </motion.div>
      </header>

      <main className="mx-auto flex w-full max-w-7xl flex-col px-4 pb-24 pt-6 sm:px-6 lg:px-8">
        <section className="sticky top-20 z-10 relative overflow-hidden rounded-[34px] border border-white/80 bg-[linear-gradient(180deg,#f8f7f2_0%,#eef6ef_42%,#f5f3ee_100%)] shadow-[0_20px_80px_rgba(15,23,42,0.08)]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.88),_transparent_42%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_22%,_rgba(16,185,129,0.14),_transparent_34%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_68%,_rgba(148,163,184,0.11),_transparent_28%)]" />
          <div className="absolute left-1/2 top-[18%] h-56 w-[72%] -translate-x-1/2 rounded-full bg-white/68 blur-[90px]" />
          <div className="absolute inset-y-0 left-1/2 w-[46%] -translate-x-1/2 bg-[linear-gradient(180deg,rgba(255,255,255,0.82),rgba(255,255,255,0.52),rgba(255,255,255,0.78))] blur-[72px]" />

          {heroPlates.map((plate) => (
            <FloatingHeroPlate
              key={plate.id}
              plate={plate}
              reducedMotion={!!reducedMotion}
              dragOffset={plateDragOffsets[plate.id] ?? { x: 0, y: 0 }}
              onDragEnd={(id, x, y) =>
                setPlateDragOffsets((prev) => ({ ...prev, [id]: { x, y } }))
              }
              onPlateClick={setActivePlate}
            />
          ))}

          {/* Media lightbox */}
          {activePlate && (
            <PlateMediaModal
              plate={activePlate}
              onClose={() => setActivePlate(null)}
            />
          )}

          <div className="relative z-20 flex min-h-[500px] flex-col items-center justify-center px-6 py-20 text-center md:min-h-[620px] md:px-10">
            <motion.div
              initial={reducedMotion ? undefined : { opacity: 0, y: 18 }}
              animate={reducedMotion ? undefined : { opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="relative mx-auto max-w-3xl"
            >
              <div className="absolute inset-x-10 -inset-y-8 rounded-full bg-white/72 blur-[72px]" />
              <div className="relative">
                <p className="mb-5 inline-flex rounded-full border border-white/75 bg-white/72 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.3em] text-emerald-700 shadow-[0_10px_30px_rgba(255,255,255,0.4)] backdrop-blur">
                  Living Archive
                </p>
                <h1 className="text-balance text-5xl font-bold tracking-tight text-slate-900 md:text-7xl">
                  Our Community
                </h1>
                <p className="mx-auto mt-5 max-w-2xl text-pretty text-base leading-7 text-slate-600 md:text-xl md:leading-8">
                  Connect, Learn, Grow and Share
                </p>
              </div>
            </motion.div>
          </div>
        </section>

        <div ref={contentRef} className="relative z-40 mt-6 px-1 md:mt-8 md:px-4">
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as CommunityTab)} className="w-full">
            <section className="rounded-[30px] border border-white/70 bg-white/56 p-5 shadow-[0_20px_70px_rgba(15,23,42,0.07)] backdrop-blur-2xl md:p-8">
              <div className="flex justify-center">
                <TabsList className="grid w-full grid-cols-3 rounded-full bg-white/72 p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] md:w-[480px]">
                  <TabsTrigger value="fab-academy" className="rounded-full font-medium">
                    Fab Academy
                  </TabsTrigger>
                  <TabsTrigger value="tra-students" className="rounded-full font-medium text-xs sm:text-sm">
                    TRA Students
                  </TabsTrigger>
                  <TabsTrigger value="fab-interns" className="rounded-full font-medium">
                    Fab Interns
                  </TabsTrigger>
                </TabsList>
              </div>

              <div className="mt-6">
                {dataSource === "sheets" && (homeData.length > 0 || fabAcademyData.length > 0) && (
                  <div className="mb-5 flex items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                    <span className="text-base">📋</span>
                    <span>
                      <strong>Showing data from Google Sheets</strong> while Convex is unavailable.
                    </span>
                  </div>
                )}

                <TabsContent value="fab-academy" className="m-0 outline-none focus:ring-0">
                  {isLoading ? (
                    <div className="flex flex-col items-center py-20">
                      <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-emerald-500/20 border-t-emerald-500" />
                      <p className="animate-pulse text-muted-foreground">Loading content...</p>
                    </div>
                  ) : fabAcademyData.length === 0 || !selectedFabStudent ? (
                    <div className="flex min-h-[360px] flex-col items-center justify-center rounded-[26px] border border-dashed border-slate-200 bg-slate-50 text-center">
                      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-sm">
                        <Users className="h-8 w-8 text-slate-400" />
                      </div>
                      <h3 className="text-2xl font-bold text-slate-900">No Fab Academy Entries Yet</h3>
                      <p className="mt-2 max-w-md text-slate-500">
                        Student showcases will appear here once added by the admin.
                      </p>
                    </div>
                  ) : (
                    <>
                      {/* ── MOBILE LAYOUT (hidden on xl+) ─────────────────────────────── */}
                      <div className="xl:hidden">
                        <p className="mb-4 text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
                          Fab Academy Graduates
                        </p>
                        <div className="space-y-4">
                          {fabAcademyData.map((student, idx) => {
                            const isFlipped = mobileFabFlippedId === student.id;
                            const embedUrl = getEmbedUrl(student.videoUrl);

                            return (
                              <motion.div
                                key={student.id}
                                initial={reducedMotion ? undefined : { opacity: 0, y: 16 }}
                                animate={reducedMotion ? undefined : { opacity: 1, y: 0 }}
                                transition={{ duration: 0.35, ease: "easeOut", delay: idx * 0.04 }}
                                style={{ perspective: "1000px" }}
                              >
                                {/* Card wrapper — 3-D flip container.
                                     Height is driven by whichever face is
                                     position:relative at any given moment.
                                     When NOT flipped: front is relative → sets height.
                                     When flipped:     back  is relative → sets height. */}
                                <div
                                  style={{
                                    transformStyle: "preserve-3d",
                                    transition: "transform 0.55s cubic-bezier(0.4,0,0.2,1)",
                                    transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
                                    position: "relative",
                                  }}
                                >
                                  {/* FRONT — graduate detail card */}
                                  <div
                                    onClick={() => handleMobileCardTap(student.id)}
                                    style={{
                                      backfaceVisibility: "hidden",
                                      WebkitBackfaceVisibility: "hidden",
                                      // When flipped: remove from flow so back face can drive height
                                      position: isFlipped ? "absolute" : "relative",
                                      top: 0,
                                      left: 0,
                                      right: 0,
                                    }}
                                    className="rounded-[22px] border border-white/60 bg-white/52 p-4 backdrop-blur cursor-pointer hover:bg-white/60 transition-colors"
                                  >
                                    <div className="flex items-start gap-4">
                                      <div className="relative h-[88px] w-[88px] shrink-0 overflow-hidden rounded-[16px] border border-white/55 bg-[linear-gradient(180deg,#f1efe6,#e9efe9)]">
                                        <MediaImage
                                          imageUrl={student.imageUrl}
                                          alt={student.studentName}
                                          className="absolute inset-0 h-full w-full object-contain p-1"
                                        />
                                      </div>
                                      <div className="min-w-0 flex-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                          <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.2em] text-amber-700">
                                            {student.fabYear || "Fab"}
                                          </span>
                                        </div>
                                        <h3 className="mt-2 text-base font-bold leading-tight text-slate-900">
                                          {student.studentName}
                                        </h3>
                                        <p className="mt-1 line-clamp-2 text-sm leading-5 text-slate-500">
                                          {student.remarks || "Project details coming soon."}
                                        </p>
                                        <div className="mt-3 flex flex-wrap items-center gap-2">
                                          {student.documentationUrl && (
                                            <a
                                              href={student.documentationUrl}
                                              target="_blank"
                                              rel="noreferrer"
                                              onClick={(e) => e.stopPropagation()}
                                              className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:border-emerald-300 hover:text-emerald-700"
                                            >
                                              Docs
                                              <ArrowUpRight className="h-3 w-3" />
                                            </a>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </div>

                                  {/* BACK — preview screen.
                                       Pre-rotated 180° so it faces forward when the
                                       container is flipped. When not flipped it is
                                       absolute (zero flow height). When flipped it is
                                       relative so its content drives the container height. */}
                                  <div
                                    style={{
                                      backfaceVisibility: "hidden",
                                      WebkitBackfaceVisibility: "hidden",
                                      transform: "rotateY(180deg)",
                                      // When not flipped: absolute (no flow) → front drives height
                                      // When flipped:     relative           → back drives height
                                      position: isFlipped ? "relative" : "absolute",
                                      top: 0,
                                      left: 0,
                                      right: 0,
                                    }}
                                    className="rounded-[22px] border border-emerald-300 bg-[#09131a] shadow-[0_18px_40px_rgba(16,185,129,0.15)] overflow-hidden"
                                  >
                                    {/* Media — height adapts to real image/video ratio */}
                                    <MobileFabCardMedia student={student} embedUrl={embedUrl} />
                                    {/* Footer on back */}
                                    <div className="flex items-center justify-between px-4 py-3">
                                      <div className="min-w-0">
                                        <p className="truncate text-sm font-bold text-white">{student.studentName}</p>
                                        <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-400">
                                          Fab Academy {student.fabYear}
                                        </p>
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => handleMobileCardTap(student.id)}
                                        className="ml-4 shrink-0 rounded-full border border-white/25 bg-white/12 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur transition-colors active:bg-white/20"
                                      >
                                        Back
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              </motion.div>
                            );
                          })}
                        </div>
                      </div>

                      {/* ── DESKTOP LAYOUT (hidden below xl) ─────────────────────────── */}
                      <div className="hidden xl:grid gap-8 xl:grid-cols-[minmax(0,0.82fr),1px,minmax(320px,0.84fr)] xl:grid-rows-[auto_auto_auto] xl:items-start xl:overflow-hidden">
                        <div ref={fabPreviewSectionRef} className="relative z-20 space-y-6 xl:col-start-1 xl:row-start-1 xl:pr-3">
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
                              Selected Graduate
                            </p>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => cycleFabStudent(-1)}
                                className="rounded-full border border-slate-200 bg-white/85 px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:border-emerald-300 hover:text-emerald-700"
                              >
                                Previous
                              </button>
                              <button
                                type="button"
                                onClick={() => cycleFabStudent(1)}
                                className="rounded-full border border-slate-200 bg-white/85 px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:border-emerald-300 hover:text-emerald-700"
                              >
                                Next
                              </button>
                            </div>
                          </div>

                          <motion.div
                            key={`${selectedFabStudent.id}-${fabPreviewMode}`}
                            initial={reducedMotion ? undefined : { opacity: 0, y: 12 }}
                            animate={reducedMotion ? undefined : { opacity: 1, y: 0 }}
                            transition={{ duration: 0.35, ease: "easeOut" }}
                            className="space-y-4"
                          >
                            <div className="max-w-[560px]">
                              <div
                                className="relative overflow-hidden rounded-[28px] border border-white/60 bg-[#09131a] shadow-[0_26px_60px_rgba(15,23,42,0.16)]"
                                style={{ aspectRatio: fabPreviewAspectRatio }}
                              >
                                {isFabVideoVisible && selectedFabEmbedUrl ? (
                                  <iframe
                                    src={selectedFabEmbedUrl}
                                    allow="autoplay; encrypted-media"
                                    allowFullScreen
                                    className="absolute inset-0 h-full w-full border-0"
                                  />
                                ) : (
                                  <MediaImage
                                    imageUrl={selectedFabStudent.imageUrl}
                                    alt={selectedFabStudent.studentName}
                                    className="absolute inset-0 h-full w-full object-cover"
                                  />
                                )}
                              </div>
                              <div className="community-screen-shadow mt-2 h-6 w-[58%]" />
                            </div>
                          </motion.div>
                        </div>

                        <div className="relative z-10 hidden xl:row-span-2 xl:block bg-[linear-gradient(180deg,transparent,rgba(203,213,225,0.95),transparent)]" />

                        <div className="relative z-10 xl:col-start-3 xl:row-span-2 xl:row-start-1">
                          <div ref={fabGraduateHeaderRef} className="mb-2 xl:pl-4">
                            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
                              Fab Academy Graduates
                            </p>
                          </div>

                          <div
                            ref={fabGraduateListRef}
                            className="space-y-4 xl:overflow-y-auto xl:overflow-x-hidden xl:overscroll-contain xl:pl-4 xl:pr-2"
                            style={fabGraduateScrollHeight ? { height: `${fabGraduateScrollHeight}px` } : undefined}
                          >
                            {fabAcademyData.map((student, idx) => {
                              const isSelected = student.id === selectedFabStudent.id;
                              const isShowingVideo = isFabVideoVisible && isSelected;

                              return (
                                <motion.article
                                  key={student.id}
                                  layout
                                  initial={reducedMotion ? undefined : { opacity: 0, y: 14 }}
                                  whileInView={reducedMotion ? undefined : { opacity: 1, y: 0 }}
                                  viewport={{ once: true, margin: "-80px" }}
                                  transition={{ duration: 0.35, ease: "easeOut", delay: idx * 0.03 }}
                                  onClick={() => selectFabStudent(student.id)}
                                  className={`group w-full max-w-[360px] shrink-0 rounded-[24px] border p-3 backdrop-blur md:p-4 cursor-pointer transition-all active:scale-[0.98] ${isSelected ? "border-emerald-300 bg-white/68 shadow-[0_18px_36px_rgba(16,185,129,0.12)]" : "border-white/60 bg-white/34 hover:border-emerald-200 hover:bg-white/48"}`}
                                >
                                  <div className="grid grid-cols-[108px,minmax(0,1fr)] gap-4">
                                    <div className="relative h-[120px] overflow-hidden rounded-[18px] border border-white/55 bg-[linear-gradient(180deg,#f1efe6,#e9efe9)]">
                                      <MediaImage
                                        imageUrl={student.imageUrl}
                                        alt={student.studentName}
                                        className="absolute inset-0 h-full w-full object-contain p-1 transition-transform duration-500 group-hover:scale-[1.02]"
                                      />
                                    </div>

                                    <div className="min-w-0">
                                      <div className="flex flex-wrap items-center gap-2">
                                        <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.22em] text-amber-700">
                                          {student.fabYear || "Fab"}
                                        </span>
                                        {isSelected && (
                                          <span className="text-[10px] font-semibold uppercase tracking-[0.24em] text-emerald-700">
                                            Selected
                                          </span>
                                        )}
                                      </div>

                                      <h3 className="mt-3 text-base font-bold leading-tight text-slate-900 md:text-lg">
                                        {student.studentName}
                                      </h3>
                                      <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-600">
                                        {student.remarks || "Project details will appear here soon."}
                                      </p>

                                      <div className="mt-4 flex flex-wrap gap-2">
                                        {student.videoUrl && (
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              selectFabStudent(student.id, isShowingVideo ? "image" : "video");
                                            }}
                                            className="rounded-full bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-emerald-700"
                                          >
                                            {isShowingVideo ? "See less" : "Show more"}
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </motion.article>
                              );
                            })}
                          </div>
                        </div>

                        <div ref={fabSelectedDetailsRef} className="space-y-3 xl:col-start-1 xl:row-start-2 xl:pr-3">
                          <div className="relative max-w-[680px] rounded-[26px] border border-white/50 bg-white/38 px-4 pb-5 pt-6 shadow-[0_12px_24px_rgba(15,23,42,0.03)] backdrop-blur md:px-5">
                            <div className="absolute -top-8 left-4 h-16 w-16 overflow-hidden rounded-full border-4 border-white bg-slate-200 shadow-[0_10px_24px_rgba(15,23,42,0.16)] md:left-5 md:h-20 md:w-20">
                              <MediaImage
                                imageUrl={selectedFabStudent.imageUrl}
                                alt={selectedFabStudent.studentName}
                                className="absolute inset-0 h-full w-full object-cover"
                              />
                            </div>

                            <div className="pl-20 md:pl-24">
                              <div className="flex flex-wrap items-center gap-3">
                                <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.26em] text-amber-700">
                                  Fab Academy {selectedFabStudent.fabYear || "Scholar"}
                                </span>
                                {isFabVideoVisible ? (
                                  <button
                                    type="button"
                                    onClick={() => setFabPreviewMode("image")}
                                    className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition-colors hover:text-emerald-700"
                                  >
                                    See image preview
                                    <ChevronUp className="h-4 w-4" />
                                  </button>
                                ) : (
                                  selectedFabStudent.videoUrl && (
                                    <button
                                      type="button"
                                      onClick={() => setFabPreviewMode("video")}
                                      className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition-colors hover:text-emerald-700"
                                    >
                                      Show video
                                      <ChevronDown className="h-4 w-4" />
                                    </button>
                                  )
                                )}
                              </div>

                              <h3 className="mt-3 text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
                                {selectedFabStudent.studentName}
                              </h3>
                              <p className="mt-3 text-sm leading-7 text-slate-600 md:text-base">
                                {selectedFabStudent.remarks || "Project details will appear here soon."}
                              </p>

                              <div className="mt-4 flex flex-wrap gap-3">
                                {selectedFabStudent.documentationUrl && (
                                  <a
                                    href={selectedFabStudent.documentationUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
                                  >
                                    Open Documentation
                                    <ArrowUpRight className="h-4 w-4" />
                                  </a>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="w-full space-y-3 xl:col-span-3 xl:row-start-3">
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
                              Graduate Carousel
                            </p>
                            <p className="text-xs text-slate-500">
                              {selectedFabIndex + 1} / {fabAcademyData.length}
                            </p>
                          </div>
                          <div className="flex gap-3 overflow-x-auto pb-2 xl:pr-2">
                            {fabAcademyData.map((student) => {
                              const isSelected = student.id === selectedFabStudent.id;

                              return (
                                <button
                                  key={student.id}
                                  type="button"
                                  onClick={() => selectFabStudent(student.id)}
                                  className={`relative h-24 min-w-[110px] overflow-hidden rounded-[20px] border transition-colors ${isSelected ? "border-emerald-400 shadow-[0_16px_34px_rgba(16,185,129,0.18)]" : "border-white/70 bg-white/80 hover:border-emerald-200"}`}
                                >
                                  <MediaImage
                                    imageUrl={student.imageUrl}
                                    alt={student.studentName}
                                    className="absolute inset-0 h-full w-full object-cover"
                                  />
                                  <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent,rgba(15,23,42,0.66))]" />
                                  <div className="absolute inset-x-3 bottom-2 text-left text-white">
                                    <p className="truncate text-xs font-semibold">{student.studentName}</p>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </TabsContent>

                <TabsContent value="fab-interns" className="m-0 outline-none focus:ring-0">
                  {isLoading ? (
                    <div className="flex flex-col items-center py-20">
                      <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-indigo-500/20 border-t-indigo-500" />
                      <p className="animate-pulse text-muted-foreground">Loading interns...</p>
                    </div>
                  ) : fabInternData.length === 0 || !selectedInternStudent ? (
                    <div className="flex min-h-[360px] flex-col items-center justify-center rounded-[26px] border border-dashed border-slate-200 bg-slate-50 text-center">
                      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-sm">
                        <Users className="h-8 w-8 text-indigo-400" />
                      </div>
                      <h3 className="text-2xl font-bold text-slate-900">No Internship Entries Yet</h3>
                      <p className="mt-2 max-w-md text-slate-500">
                        Intern showcases will appear here once added by the admin.
                      </p>
                    </div>
                  ) : (
                    <>
                      {/* ── MOBILE LAYOUT (hidden on xl+) ─────────────────────────────── */}
                      <div className="xl:hidden">
                        <p className="mb-4 text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
                          Fab Interns
                        </p>
                        <div className="space-y-4">
                          {fabInternData.map((intern, idx) => {
                            const isFlipped = mobileInternFlippedId === intern.id;
                            const embedUrl = getEmbedUrl(intern.videoUrl);

                            return (
                              <motion.div
                                key={intern.id}
                                initial={reducedMotion ? undefined : { opacity: 0, y: 16 }}
                                animate={reducedMotion ? undefined : { opacity: 1, y: 0 }}
                                transition={{ duration: 0.35, ease: "easeOut", delay: idx * 0.04 }}
                                style={{ perspective: "1000px" }}
                              >
                                <div
                                  style={{
                                    transformStyle: "preserve-3d",
                                    transition: "transform 0.55s cubic-bezier(0.4,0,0.2,1)",
                                    transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
                                    position: "relative",
                                  }}
                                >
                                  {/* FRONT */}
                                  <div
                                    onClick={() => handleMobileInternCardTap(intern.id)}
                                    style={{
                                      backfaceVisibility: "hidden",
                                      WebkitBackfaceVisibility: "hidden",
                                      position: isFlipped ? "absolute" : "relative",
                                      top: 0,
                                      left: 0,
                                      right: 0,
                                    }}
                                    className="rounded-[22px] border border-white/60 bg-white/52 p-4 backdrop-blur cursor-pointer hover:bg-white/60 transition-colors shadow-[0_8px_16px_rgba(0,0,0,0.05)]"
                                  >
                                    <div className="flex items-start gap-4">
                                      <div 
                                        className="relative h-[88px] w-[88px] shrink-0 overflow-hidden rounded-[16px] border border-white/55 bg-[linear-gradient(180deg,#f1efe6,#e9efe9)]"
                                      >
                                        <MediaImage
                                          imageUrl={intern.imageUrl}
                                          alt={intern.studentName}
                                          className="absolute inset-0 h-full w-full object-contain p-1"
                                        />
                                      </div>
                                      <div className="min-w-0 flex-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                          <span className="inline-flex rounded-full border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-700">
                                            {intern.internshipYear || "Intern"}
                                          </span>
                                        </div>
                                        <h3 className="mt-2 text-base font-bold leading-tight text-slate-900">
                                          {intern.studentName}
                                        </h3>
                                        <p className="mt-1 line-clamp-2 text-sm leading-5 text-slate-500">
                                          {intern.remarks || "Internship details coming soon."}
                                        </p>
                                      </div>
                                    </div>
                                  </div>

                                  <div
                                    style={{
                                      backfaceVisibility: "hidden",
                                      WebkitBackfaceVisibility: "hidden",
                                      transform: "rotateY(180deg)",
                                      position: isFlipped ? "relative" : "absolute",
                                      top: 0,
                                      left: 0,
                                      right: 0,
                                    }}
                                    className="rounded-[22px] border border-indigo-300 bg-[#0c0c1e] shadow-[0_18px_40px_rgba(79,70,229,0.15)] overflow-hidden"
                                  >
                                    <div className="relative w-full aspect-video">
                                        {intern.videoUrl && embedUrl ? (
                                          <iframe src={embedUrl} allow="autoplay; encrypted-media" allowFullScreen className="absolute inset-0 h-full w-full border-0" />
                                        ) : (
                                          <MediaImage imageUrl={intern.imageUrl} alt={intern.studentName} className="absolute inset-0 h-full w-full object-cover" />
                                        )}
                                    </div>
                                    <div className="flex items-center justify-between px-4 py-3">
                                      <div className="min-w-0">
                                        <p className="truncate text-sm font-bold text-white">{intern.studentName}</p>
                                        <p className="text-[10px] font-semibold uppercase tracking-wider text-indigo-400">
                                          Intern {intern.internshipYear}
                                        </p>
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => handleMobileInternCardTap(intern.id)}
                                        className="ml-4 shrink-0 rounded-full border border-white/25 bg-white/12 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur transition-colors active:bg-white/20"
                                      >
                                        Back
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              </motion.div>
                            );
                          })}
                        </div>
                      </div>

                      {/* ── DESKTOP LAYOUT ─────────────────────────── */}
                      <div className="hidden xl:grid gap-8 xl:grid-cols-[minmax(0,0.82fr),1px,minmax(320px,0.84fr)] xl:grid-rows-[auto_auto_auto] xl:items-start xl:overflow-hidden">
                        <div ref={internPreviewSectionRef} className="relative z-20 space-y-6 xl:col-start-1 xl:row-start-1 xl:pr-3">
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
                              Selected Intern
                            </p>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => cycleIntern(-1)}
                                className="rounded-full border border-slate-200 bg-white/85 px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:border-indigo-300 hover:text-indigo-700"
                              >
                                Previous
                              </button>
                              <button
                                type="button"
                                onClick={() => cycleIntern(1)}
                                className="rounded-full border border-slate-200 bg-white/85 px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:border-indigo-300 hover:text-indigo-700"
                              >
                                Next
                              </button>
                            </div>
                          </div>

                          <motion.div
                            key={`${selectedInternStudent?.id}-${internPreviewMode}`}
                            initial={reducedMotion ? undefined : { opacity: 0, y: 12 }}
                            animate={reducedMotion ? undefined : { opacity: 1, y: 0 }}
                            transition={{ duration: 0.35, ease: "easeOut" }}
                            className="space-y-4"
                          >
                            <div className="max-w-[560px]">
                              <div
                                className="relative overflow-hidden rounded-[28px] border border-white/60 bg-[#0c0c1e] shadow-[0_26px_60px_rgba(49,46,129,0.16)]"
                                style={{ aspectRatio: internPreviewAspectRatio }}
                              >
                                {isInternVideoVisible && selectedInternEmbedUrl ? (
                                  <iframe
                                    src={selectedInternEmbedUrl}
                                    allow="autoplay; encrypted-media"
                                    allowFullScreen
                                    className="absolute inset-0 h-full w-full border-0"
                                  />
                                ) : (
                                  <MediaImage
                                    imageUrl={selectedInternStudent.imageUrl}
                                    alt={selectedInternStudent.studentName}
                                    className="absolute inset-0 h-full w-full object-cover"
                                  />
                                )}
                              </div>
                              <div className="community-screen-shadow mt-4 h-6 w-[58%] mx-auto opacity-30" />
                            </div>
                          </motion.div>
                        </div>

                        <div className="relative z-10 hidden xl:row-span-2 xl:block bg-[linear-gradient(180deg,transparent,rgba(99,102,241,0.95),transparent)]" />

                        <div className="relative z-10 xl:col-start-3 xl:row-span-2 xl:row-start-1">
                          <div ref={internGraduateHeaderRef} className="mb-2 xl:pl-4">
                            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
                              Creative Interns
                            </p>
                          </div>

                          <div
                            className="space-y-4 xl:overflow-y-auto xl:overflow-x-hidden xl:overscroll-contain xl:pl-4 xl:pr-2"
                            style={internGraduateScrollHeight ? { height: `${internGraduateScrollHeight}px` } : undefined}
                          >
                            {fabInternData.map((intern, idx) => {
                              const isSelected = intern.id === selectedInternStudent?.id;
                              const isShowingVideo = isInternVideoVisible && isSelected;

                              return (
                                <motion.article
                                  key={intern.id}
                                  layout
                                  initial={reducedMotion ? undefined : { opacity: 0, y: 14 }}
                                  whileInView={reducedMotion ? undefined : { opacity: 1, y: 0 }}
                                  viewport={{ once: true, margin: "-80px" }}
                                  transition={{ duration: 0.35, ease: "easeOut", delay: idx * 0.03 }}
                                  onClick={() => selectIntern(intern.id)}
                                  className={`group w-full max-w-[360px] shrink-0 rounded-[24px] border p-3 backdrop-blur md:p-4 cursor-pointer transition-all active:scale-[0.98] ${isSelected ? "border-indigo-300 bg-white/68 shadow-[0_18px_36px_rgba(79,70,229,0.12)]" : "border-white/60 bg-white/34 hover:border-indigo-200 hover:bg-white/48"}`}
                                >
                                  <div className="grid grid-cols-[108px,minmax(0,1fr)] gap-4">
                                    <div 
                                      className="relative h-[120px] overflow-hidden rounded-[18px] border border-white/55 bg-[linear-gradient(180deg,#f1efe6,#e9efe9)]"
                                    >
                                      <MediaImage
                                        imageUrl={intern.imageUrl}
                                        alt={intern.studentName}
                                        className="absolute inset-0 h-full w-full object-contain p-1 transition-transform duration-500 group-hover:scale-[1.02]"
                                      />
                                    </div>

                                    <div className="min-w-0">
                                      <div className="flex flex-wrap items-center gap-2">
                                        <span className="inline-flex rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.22em] text-indigo-700">
                                          {intern.internshipYear || "Intern"}
                                        </span>
                                      </div>

                                      <h3 className="mt-3 text-base font-bold leading-tight text-slate-900 md:text-lg">
                                        {intern.studentName}
                                      </h3>
                                      <p className="mt-2 line-clamp-3 text-xs leading-5 text-slate-600">
                                        {intern.remarks || "Internship summary coming soon."}
                                      </p>

                                      <div className="mt-4 flex flex-wrap gap-2">
                                        {intern.videoUrl && (
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              selectIntern(intern.id, isShowingVideo ? "image" : "video");
                                            }}
                                            className="rounded-full bg-indigo-700 px-3 py-1.5 text-[10px] font-bold uppercase text-white transition-colors hover:bg-indigo-800"
                                          >
                                            {isShowingVideo ? "Close" : "Watch"}
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </motion.article>
                              );
                            })}
                          </div>
                        </div>

                        <div className="space-y-3 xl:col-start-1 xl:row-start-2 xl:pr-3">
                          <div ref={internSelectedDetailsRef} className="relative max-w-[680px] rounded-[26px] border border-white/50 bg-white/38 px-4 pb-5 pt-6 shadow-[0_12px_24px_rgba(15,23,42,0.03)] backdrop-blur md:px-5">
                            <div 
                              className="absolute -top-8 left-4 h-16 w-16 overflow-hidden rounded-full border-4 border-white bg-slate-200 shadow-[0_10px_24px_rgba(79,70,229,0.16)] md:left-5 md:h-20 md:w-20"
                            >
                              <MediaImage
                                imageUrl={selectedInternStudent.imageUrl}
                                alt={selectedInternStudent.studentName}
                                className="absolute inset-0 h-full w-full object-cover"
                              />
                            </div>

                            <div className="pl-20 md:pl-24">
                              <div className="flex flex-wrap items-center gap-3">
                                <span className="inline-flex rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.26em] text-indigo-700">
                                  Intern {selectedInternStudent?.internshipYear || "Scholar"}
                                </span>
                                {isInternVideoVisible ? (
                                  <button
                                    type="button"
                                    onClick={() => setInternPreviewMode("image")}
                                    className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition-colors hover:text-indigo-700"
                                  >
                                    Photo preview
                                    <ChevronUp className="h-4 w-4" />
                                  </button>
                                ) : (
                                  selectedInternStudent?.videoUrl && (
                                    <button
                                      type="button"
                                      onClick={() => setInternPreviewMode("video")}
                                      className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition-colors hover:text-indigo-700"
                                    >
                                      Show video
                                      <ChevronDown className="h-4 w-4" />
                                    </button>
                                  )
                                )}
                              </div>

                              <h3 className="mt-3 text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
                                {selectedInternStudent?.studentName}
                              </h3>
                              <p className="mt-3 text-sm leading-7 text-slate-600 md:text-base">
                                {selectedInternStudent?.remarks || "Internship story and achievements will appear here soon."}
                              </p>

                              <div className="mt-4 flex flex-wrap gap-3">
                                {selectedInternStudent?.documentationUrl && (
                                  <a
                                    href={selectedInternStudent.documentationUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-2 rounded-full bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 shadow-lg shadow-indigo-200"
                                  >
                                    View Achievements
                                    <ArrowUpRight className="h-4 w-4" />
                                  </a>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="w-full space-y-3 xl:col-span-3 xl:row-start-3">
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
                              Intern Carousel
                            </p>
                            <p className="text-xs text-slate-500">
                              {selectedInternIndex + 1} / {fabInternData.length}
                            </p>
                          </div>
                          <div className="flex gap-4 overflow-x-auto pb-4 xl:pr-2">
                            {fabInternData.map((intern) => {
                              const isSelected = intern.id === selectedInternStudent?.id;

                              return (
                                <button
                                  key={intern.id}
                                  type="button"
                                  onClick={() => selectIntern(intern.id)}
                                  className={`relative h-28 min-w-[124px] overflow-hidden rounded-[20px] border transition-all ${isSelected ? "border-2 border-indigo-400 shadow-[0_16px_34px_rgba(79,70,229,0.2)] scale-105" : "border border-white/70 bg-white/80 hover:border-indigo-200"}`}
                                >
                                  <MediaImage
                                    imageUrl={intern.imageUrl}
                                    alt={intern.studentName}
                                    className="absolute inset-0 h-full w-full object-cover"
                                  />
                                  <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent,rgba(15,23,42,0.66))]" />
                                  <div className="absolute inset-x-3 bottom-2 text-center text-white">
                                    <p className="truncate text-[10px] font-bold uppercase tracking-tight">{intern.studentName}</p>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </TabsContent>

                <TabsContent value="tra-students" className="m-0 outline-none focus:ring-0">
                  {isLoading ? (
                    <div className="flex flex-col items-center py-20">
                      <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-emerald-500/20 border-t-emerald-500" />
                      <p className="animate-pulse text-muted-foreground">Loading content...</p>
                    </div>
                  ) : traVideos.length === 0 ? (
                    <div className="flex min-h-[360px] flex-col items-center justify-center rounded-[26px] border border-dashed border-slate-200 bg-slate-50 text-center">
                      <PlayCircle className="mb-4 h-12 w-12 text-slate-300" />
                      <h3 className="text-xl font-bold text-slate-900">No Videos Available</h3>
                      <p className="mt-2 text-slate-500">Video features will appear here once added by the admin.</p>
                    </div>
                  ) : (
                    <div className="mt-4 space-y-12 md:space-y-24">
                      {traVideos.map((video, idx) => {
                        const isEven = idx % 2 === 0;
                        const embedLink = getEmbedUrl(video.contentUrl);

                        return (
                          <motion.article
                            key={video.id}
                            initial={reducedMotion ? undefined : { opacity: 0, y: 24 }}
                            whileInView={reducedMotion ? undefined : { opacity: 1, y: 0 }}
                            viewport={{ once: true, margin: "-80px" }}
                            transition={{ duration: 0.55, ease: "easeOut" }}
                            className={`flex flex-col gap-6 md:items-center md:gap-16 ${isEven ? "md:flex-row" : "md:flex-row-reverse"}`}
                          >
                            {/* Video — always full-width on mobile, half on desktop */}
                            <div className="w-full md:w-1/2">
                              <div className="relative aspect-video overflow-hidden rounded-[24px] bg-black shadow-[0_24px_56px_rgba(15,23,42,0.14)]">
                                {embedLink ? (
                                  <iframe
                                    src={embedLink}
                                    allow="autoplay; encrypted-media"
                                    allowFullScreen
                                    className="absolute inset-0 h-full w-full border-0"
                                  />
                                ) : (
                                  <div className="absolute inset-0 flex items-center justify-center bg-slate-900 text-white/50">
                                    <p>Invalid URL</p>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Text — stacks below video on mobile */}
                            <div className={`w-full md:w-1/2 ${isEven ? "md:pr-8" : "md:pl-8"}`}>
                              <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.26em] text-emerald-700">
                                {video.type || "TRA Students"}
                              </span>
                              <h3 className="mt-4 text-2xl font-bold leading-tight text-slate-900 md:mt-5 md:text-4xl">
                                {video.heading}
                              </h3>
                              <div className="mt-3 h-1 w-12 rounded-full bg-emerald-500 md:mt-4 md:w-14" />
                              <p className="mt-4 text-sm leading-7 text-slate-600 md:mt-5 md:text-lg md:leading-8">
                                {video.description}
                              </p>
                            </div>
                          </motion.article>
                        );
                      })}
                    </div>
                  )}
                </TabsContent>
              </div>
            </section>
          </Tabs>
        </div>
      </main>
    </div>
  );
}
