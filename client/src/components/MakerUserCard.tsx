import React, { useMemo, useRef } from 'react';
import { Users as UsersIcon, Award, Sparkles, Lightbulb, Star, RotateCw, Link as LinkIcon } from 'lucide-react';
import MakerStripesRack, { MakerStripe, getStripeStyle } from './MakerStripesRack';
import { resolveThemeColor } from './ThemeColorPicker';
import { getTagStyle } from '@/lib/tagUtils';
import { getOptimizedImageUrl } from '@/lib/utils';
import { sortMakerTags, getMakerMilestoneTier } from '@/hooks/useCommunityMakers';

export interface MakerUserCardProps {
  user: {
    _id?: string;
    id?: string;
    name: string;
    email: string;
    role?: string;
    tags?: string[];
    myPageLink?: string;
    profileImageUrl?: string;
    imageUrl?: string;
    avatar?: string;
    photoUrl?: string;
    website?: string;
    portfolioUrl?: string;
    laptopStatus?: string;
    status?: string;
    customTheme?: any;
    cardSkin?: string;
    cardCoverUrl?: string;
    cardBgOpacity?: number;
    cardTagPositions?: string;
    cardBadgeAlignment?: string;
    customTagline?: string;
    featuredBadge?: string;
    cardLayoutSize?: string;
    [key: string]: any;
  };
  accessTags?: string[];
  stripes?: MakerStripe[];
  isFab?: boolean;
  activeLoans?: Array<{ itemName: string; quantity: number }>;
  onClick?: () => void;
  onEdit?: (user: any) => void;
  className?: string;
  interactiveDrag?: boolean;
  onTagPositionChange?: (tag: string, x: number, y: number, rot?: number) => void;
  selectedTag?: string | null;
  onSelectTag?: (tag: string | null) => void;
}

// Helper: Identify FAB Users (4+ tags or FA certification)
export const isUserFab = (u: any, sessionStripesCount: number = 0): boolean => {
  if (!u) return false;
  const directTags = Array.isArray(u.tags) ? u.tags : [];
  const hasFatag = directTags.some((t: string) => t.toLowerCase().startsWith("fa 20") || t.toLowerCase().includes("fab academy"));
  const totalCount = directTags.length + sessionStripesCount;
  return Boolean(hasFatag || totalCount >= 4);
};

// Helper: Sort tags with FA 20XX first
export const sortUserBadges = sortMakerTags;

/* =========================================================================
   TACTILE SKEUOMORPHIC MATERIAL BADGE RENDERERS (MEMOIZED)
   ========================================================================= */

const Badge3D = React.memo(({ tag }: { tag: string }) => (
  <div
    title={tag}
    className="inline-flex items-center justify-center px-2.5 py-1 rounded-lg select-none relative overflow-hidden transition-all duration-200 hover:scale-105 hover:z-20 cursor-default shadow-[0_3px_6px_rgba(0,0,0,0.25),inset_0_1px_1px_rgba(255,255,255,0.4)]"
    style={{
      background: 'linear-gradient(145deg, #e3b337 0%, #ba8a1c 50%, #8c6407 100%)',
      border: '1.5px solid #f6cf65',
    }}
  >
    <div
      className="absolute inset-0 opacity-15 pointer-events-none"
      style={{
        backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 1.5px, #000 1.5px, #000 2.5px)',
      }}
    />
    <span className="font-black text-[10px] text-amber-950 uppercase tracking-widest relative z-10 [text-shadow:_0_1px_0_rgba(255,255,255,0.4)]">
      {tag.length > 8 ? '3D PRINT' : tag}
    </span>
  </div>
));
Badge3D.displayName = 'Badge3D';

const BadgeCNC = React.memo(({ tag }: { tag: string }) => (
  <div
    title={tag}
    className="inline-flex items-center justify-center px-2.5 py-1 rounded-md select-none relative overflow-hidden transition-all duration-200 hover:scale-105 hover:z-20 cursor-default shadow-[0_3px_8px_rgba(0,0,0,0.3),inset_0_1px_1px_rgba(255,255,255,0.25)]"
    style={{
      background: 'linear-gradient(135deg, #475569 0%, #334155 100%)',
      border: '1.5px solid #94a3b8',
    }}
  >
    <span className="absolute top-1 left-1 w-1 h-1 rounded-full bg-slate-300 border border-slate-500 shadow-inner" />
    <span className="absolute top-1 right-1 w-1 h-1 rounded-full bg-slate-300 border border-slate-500 shadow-inner" />
    <span className="absolute bottom-1 left-1 w-1 h-1 rounded-full bg-slate-300 border border-slate-500 shadow-inner" />
    <span className="absolute bottom-1 right-1 w-1 h-1 rounded-full bg-slate-300 border border-slate-500 shadow-inner" />

    <span className="font-black text-[10px] text-slate-100 uppercase tracking-wider relative z-10 px-1 [text-shadow:_0_1px_2px_rgba(0,0,0,0.8)]">
      {tag.length > 8 ? 'CNC MILL' : tag}
    </span>
  </div>
));
BadgeCNC.displayName = 'BadgeCNC';

const BadgeLaser = React.memo(({ tag }: { tag: string }) => (
  <div
    title={tag}
    className="inline-flex items-center justify-center px-3 py-1 rounded-lg select-none relative overflow-visible transition-all duration-200 hover:scale-105 hover:z-20 cursor-default shadow-[0_0_12px_rgba(239,68,68,0.45),0_3px_8px_rgba(0,0,0,0.2),inset_0_1px_2px_rgba(255,255,255,0.5)]"
    style={{
      background: 'linear-gradient(135deg, rgba(239,68,68,0.88) 0%, rgba(185,28,28,0.95) 100%)',
      border: '1.5px solid rgba(254,202,202,0.9)',
    }}
  >
    <div
      className="absolute inset-0 opacity-20 pointer-events-none"
      style={{
        backgroundImage: 'linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)',
        backgroundSize: '4px 4px',
      }}
    />
    <span className="font-black text-[10px] text-white uppercase tracking-widest relative z-10 [text-shadow:_0_0_4px_rgba(255,255,255,0.8),_0_1px_2px_rgba(0,0,0,0.9)]">
      {tag.length > 8 ? 'LASER' : tag}
    </span>
  </div>
));
BadgeLaser.displayName = 'BadgeLaser';

const BadgePCB = React.memo(({ tag }: { tag: string }) => (
  <div
    title={tag}
    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg select-none relative overflow-hidden transition-all duration-200 hover:scale-105 hover:z-20 cursor-default shadow-[0_3px_8px_rgba(0,0,0,0.3),inset_0_1px_1px_rgba(255,255,255,0.2)]"
    style={{
      background: 'linear-gradient(145deg, #0b4526 0%, #062b17 100%)',
      border: '1.5px solid #1e7e48',
    }}
  >
    <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-45" viewBox="0 0 100 30" preserveAspectRatio="none">
      <path d="M0,8 L25,8 L35,22 L100,22" stroke="#eab308" strokeWidth="1.2" fill="none" />
      <path d="M0,20 L15,20 L22,12 L50,12" stroke="#eab308" strokeWidth="1" fill="none" />
      <circle cx="25" cy="8" r="2" fill="#ca8a04" stroke="#fef08a" strokeWidth="0.5" />
      <circle cx="35" cy="22" r="2" fill="#ca8a04" stroke="#fef08a" strokeWidth="0.5" />
      <circle cx="85" cy="10" r="1.8" fill="#ca8a04" stroke="#fef08a" strokeWidth="0.5" />
    </svg>

    <div className="relative shrink-0 w-3 h-3.5 bg-slate-800 rounded-[2px] border border-slate-600 shadow-xs flex items-center justify-center">
      <div className="w-1 h-1 rounded-full bg-slate-400 absolute top-0.5 left-0.5" />
      <span className="text-[5px] text-slate-300 font-mono scale-75">IC</span>
    </div>

    <span className="font-mono font-black text-[10px] text-amber-300 uppercase tracking-wider relative z-10 [text-shadow:_0_1px_2px_rgba(0,0,0,0.9)]">
      {tag.length > 10 ? 'PCB / CIRC' : tag}
    </span>
  </div>
));
BadgePCB.displayName = 'BadgePCB';

const BadgeVinyl = React.memo(({ tag }: { tag: string }) => (
  <div
    title={tag}
    className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-md select-none relative transition-all duration-200 hover:scale-105 hover:z-20 cursor-default shadow-[0_2px_5px_rgba(0,0,0,0.18)]"
    style={{
      background: '#caa579',
      border: '2px solid #5c442d',
    }}
  >
    <div className="border border-[#5c442d]/40 rounded-[2px] px-1.5 py-0.5 bg-[#caa579]">
      <span className="font-black text-[10px] text-[#3d2c1d] uppercase tracking-wider">
        {tag}
      </span>
    </div>
  </div>
));
BadgeVinyl.displayName = 'BadgeVinyl';

const BadgeWood = React.memo(({ tag }: { tag: string }) => (
  <div
    title={tag}
    className="inline-flex items-center justify-center px-2.5 py-1 rounded-md select-none relative transition-all duration-200 hover:scale-105 hover:z-20 cursor-default shadow-[0_2px_6px_rgba(0,0,0,0.22)]"
    style={{
      background: 'linear-gradient(135deg, #7c4a21 0%, #543114 100%)',
      border: '1.5px solid #9c6332',
    }}
  >
    <span className="font-black text-[10px] text-[#ffddb0] uppercase tracking-widest [text-shadow:_0_1px_1px_rgba(0,0,0,0.9)]">
      {tag}
    </span>
  </div>
));
BadgeWood.displayName = 'BadgeWood';

const BadgeFabAcademy = React.memo(({ tag }: { tag: string }) => (
  <div
    title={tag}
    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg select-none relative overflow-hidden transition-all duration-200 hover:scale-105 hover:z-20 cursor-default shadow-[0_3px_8px_rgba(217,119,6,0.3),inset_0_1px_1px_rgba(255,255,255,0.6)]"
    style={{
      background: 'linear-gradient(135deg, #fcd34d 0%, #f59e0b 50%, #b45309 100%)',
      border: '1.5px solid #fef08a',
    }}
  >
    <Award className="w-3 h-3 text-amber-950 shrink-0" />
    <span className="font-black text-[10px] text-amber-950 uppercase tracking-widest [text-shadow:_0_1px_0_rgba(255,255,255,0.5)]">
      {tag}
    </span>
  </div>
));
BadgeFabAcademy.displayName = 'BadgeFabAcademy';

const BadgeSafety = React.memo(({ tag }: { tag: string }) => (
  <div
    title={tag}
    className="inline-flex items-center justify-center px-2 py-0.5 rounded-sm select-none relative transition-all duration-200 hover:scale-105 hover:z-20 cursor-default shadow-xs"
    style={{
      background: '#3f4f34',
      border: '1.5px solid #232f1d',
    }}
  >
    <span className="font-black text-[9px] text-emerald-100 uppercase tracking-wider">
      {tag}
    </span>
  </div>
));
BadgeSafety.displayName = 'BadgeSafety';

// Session Stripe Chain Joint Node (Vertical Chiclet Button with chain connectors)
export const SessionStripeJoint = React.memo(({
  stripe,
  index,
  totalStripes,
  customRot,
}: {
  stripe: MakerStripe;
  index: number;
  totalStripes: number;
  customRot?: number;
}) => {
  const style = getStripeStyle(stripe, index);
  const displayChar = stripe.char || stripe.title?.charAt(0)?.toUpperCase() || '★';

  return (
    <div
      title={`Approved Session: ${stripe.title}`}
      style={{ transform: `rotate(${customRot ?? 0}deg)` }}
      className={`
        relative inline-flex flex-col items-center justify-center select-none
        w-6 sm:w-6.5 h-8 sm:h-8.5 rounded-[4px] border ${style.border} ${style.gradient} ${style.text}
        shadow-[0_4px_10px_rgba(0,0,0,0.3),inset_0_1px_1px_rgba(255,255,255,0.45)]
        transition-transform duration-200 hover:scale-110 hover:z-30 cursor-default
      `}
    >
      {/* Top Bevel */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-white/40 pointer-events-none rounded-t-[2px]" />

      {/* Top Pivot Grommet for Elastic Chain */}
      <span className="absolute -top-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-slate-200 border border-slate-700 shadow-inner flex items-center justify-center shrink-0">
        <span className="w-0.5 h-0.5 rounded-full bg-slate-800" />
      </span>

      {/* Centered Sharp Character */}
      <span className="relative z-10 font-sans font-black text-xs leading-none tracking-normal antialiased">
        {displayChar}
      </span>

      {/* Bottom Pivot Grommet if has next link */}
      {index < totalStripes - 1 && (
        <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-slate-200 border border-slate-700 shadow-inner flex items-center justify-center shrink-0">
          <span className="w-0.5 h-0.5 rounded-full bg-slate-800" />
        </span>
      )}
    </div>
  );
});
SessionStripeJoint.displayName = 'SessionStripeJoint';

// Dispatcher for Material Badges
const MaterialTagBadge = React.memo(({ 
  tag, 
  index, 
  seedString,
  isFeatured = false,
  customRot,
}: { 
  tag: string; 
  index: number; 
  seedString: string;
  isFeatured?: boolean;
  customRot?: number;
}) => {
  const t = tag.toLowerCase().trim();
  const rotations = [-3, 2.5, -2, 3, -1.5, 3.5, -2.5, 2, -3.5, 1.5];
  const naturalRot = rotations[(index + (seedString?.length || 0)) % rotations.length];
  const rot = customRot !== undefined ? customRot : naturalRot;

  let badgeElement: React.ReactNode;

  if (t.includes('3d')) {
    badgeElement = <Badge3D tag={tag} />;
  } else if (t.includes('cnc') || t.includes('milling') || t.includes('mill')) {
    badgeElement = <BadgeCNC tag={tag} />;
  } else if (t.includes('laser')) {
    badgeElement = <BadgeLaser tag={tag} />;
  } else if (t.includes('pcb') || t.includes('electronic') || t.includes('circuit') || t.includes('solder')) {
    badgeElement = <BadgePCB tag={tag} />;
  } else if (t.includes('vinyl') || t.includes('sticker') || t.includes('cutting')) {
    badgeElement = <BadgeVinyl tag={tag} />;
  } else if (t.includes('wood') || t.includes('carpentry')) {
    badgeElement = <BadgeWood tag={tag} />;
  } else if (t.startsWith('fa 20') || t.includes('fab academy')) {
    badgeElement = <BadgeFabAcademy tag={tag} />;
  } else if (t.includes('safety') || t.includes('training')) {
    badgeElement = <BadgeSafety tag={tag} />;
  } else {
    const style = getTagStyle(tag);
    badgeElement = (
      <span
        title={tag}
        className={`
          inline-flex items-center px-2 py-0.5 rounded-[4px]
          text-[9px] font-black uppercase tracking-tight
          ${style.color}
          border border-slate-300 border-b-[2.5px] border-r-[1.5px] border-b-slate-600 border-r-slate-600
          shadow-xs transition-all hover:scale-105 hover:z-20 select-none
        `}
      >
        {tag}
      </span>
    );
  }

  return (
    <div
      style={{ transform: `rotate(${rot}deg)` }}
      className={`transition-all duration-200 hover:rotate-0 hover:z-30 relative ${
        isFeatured
          ? 'ring-2 ring-amber-400 rounded-lg p-0.5 shadow-[0_0_14px_rgba(245,158,11,0.7),0_4px_10px_rgba(0,0,0,0.35)] bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 scale-105 z-20'
          : ''
      }`}
    >
      {isFeatured && (
        <>
          <div className="absolute -inset-1 rounded-xl bg-amber-400/40 blur-[3px] animate-pulse pointer-events-none" />
          <span className="absolute -top-2.5 -right-2 z-30 px-1.5 py-0.2 bg-gradient-to-r from-amber-600 via-amber-500 to-yellow-500 text-white font-black text-[7.5px] uppercase tracking-wider rounded-full shadow-[0_2px_6px_rgba(0,0,0,0.4)] border border-yellow-200 flex items-center gap-0.5 pointer-events-none select-none">
            <Star className="w-2 h-2 fill-white text-white" /> FOCUS
          </span>
        </>
      )}
      {badgeElement}
    </div>
  );
});
MaterialTagBadge.displayName = 'MaterialTagBadge';

// Map skin ID to CSS class
export const SKIN_CLASSES: Record<string, string> = {
  emerald_circuit: 'skin-emerald-circuit text-white',
  blueprint: 'skin-blueprint text-white',
  ruby_optics: 'skin-ruby-optics text-white',
  gold_inlay: 'skin-gold-inlay text-amber-100',
  obsidian: 'skin-obsidian text-zinc-100',
  synthwave: 'skin-synthwave text-pink-100',
  glass: 'skin-glass',
  holo_prism: 'skin-holo-prism text-white',
  aurora: 'skin-aurora text-white',
  signature_onyx: 'skin-signature-onyx text-amber-50',
  natural_craft: 'skin-natural-craft text-amber-100',
};

/* =========================================================================
   MAIN MAKER USER CARD COMPONENT (MEMOIZED & HARDWARE ACCELERATED)
   ========================================================================= */

function MakerUserCardComponent({
  user,
  accessTags: accessTagsProp,
  stripes = [],
  isFab: isFabProp,
  activeLoans,
  onClick,
  onEdit,
  className = '',
  interactiveDrag = false,
  onTagPositionChange,
  selectedTag,
  onSelectTag,
}: MakerUserCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  // 1. Access tags & Session stripes
  const accessTags = useMemo(() => {
    const raw = accessTagsProp !== undefined ? accessTagsProp : (Array.isArray(user.tags) ? user.tags : []);
    return sortMakerTags(raw);
  }, [accessTagsProp, user.tags]);

  const sessionStripes = useMemo(() => stripes || [], [stripes]);
  const totalMilestones = accessTags.length + sessionStripes.length;

  const hasFaCert = useMemo(() => {
    return accessTags.some(t => t.toLowerCase().startsWith('fa 20') || t.toLowerCase().includes('fab academy'));
  }, [accessTags]);

  const isFab = isFabProp !== undefined ? isFabProp : (hasFaCert || totalMilestones >= 4);

  const { tier, tierName } = useMemo(() => {
    return getMakerMilestoneTier(totalMilestones, hasFaCert);
  }, [totalMilestones, hasFaCert]);

  const isSeniorMaker = Boolean(tier >= 4 || isFab);

  // Parse custom freeform positions (Senior Contributors / Fab Experts)
  const tagPositions = useMemo(() => {
    if (!user.cardTagPositions) return null;
    try {
      return typeof user.cardTagPositions === 'string' ? JSON.parse(user.cardTagPositions) : user.cardTagPositions;
    } catch {
      return null;
    }
  }, [user.cardTagPositions]);

  // Is full-card freeform canvas active?
  const hasCustomPositions = Boolean(tagPositions && Object.keys(tagPositions).length > 0);
  const isFreeformActive = user.cardBadgeAlignment === 'freeform' || (interactiveDrag && user.cardBadgeAlignment !== 'aligned');

  // Card Shape
  const cardShape = user.cardLayoutSize || 'standard';
  const shapeClass = useMemo(() => {
    if (cardShape === 'circle') return 'rounded-[2.85rem]';
    if (cardShape === 'squircle') return 'rounded-[2.5rem]';
    if (cardShape === 'chamfer') return 'rounded-xl [clip-path:polygon(14px_0,calc(100%-14px)_0,100%_14px,100%_calc(100%-14px),calc(100%-14px)_100%,14px_100%,0_calc(100%-14px),0_14px)]';
    if (cardShape === 'arch') return 'rounded-t-[3.5rem] rounded-b-2xl';
    return 'rounded-3xl';
  }, [cardShape]);

  // Dynamic Freeform Canvas Height scaling with accumulated milestones
  const freeformWorkbenchMinHeight = useMemo(() => {
    if (totalMilestones <= 2) return 'min-h-[110px]';
    if (totalMilestones <= 4) return 'min-h-[135px]';
    if (totalMilestones <= 7) return 'min-h-[165px]';
    return 'min-h-[195px]';
  }, [totalMilestones]);

  // Background Opacity
  const bgOpacity = typeof user.cardBgOpacity === 'number' ? Math.max(0.1, Math.min(1, user.cardBgOpacity / 100)) : 0.9;

  // Strict check for website/documentation link
  const rawPageLink = (user.myPageLink || '').trim();
  const hasPageLink = Boolean(
    rawPageLink &&
    rawPageLink !== '' &&
    rawPageLink !== '#' &&
    (rawPageLink.startsWith('http://') || rawPageLink.startsWith('https://') || rawPageLink.includes('.'))
  );

  // Profile image & Custom cover banner
  const rawImage = user.profileImageUrl?.trim() || user.imageUrl?.trim() || user.avatar?.trim() || user.photoUrl?.trim() || '';
  const profileImage = useMemo(() => getOptimizedImageUrl(rawImage), [rawImage]);

  const rawCover = user.cardCoverUrl?.trim() || '';
  const coverImage = useMemo(() => rawCover ? getOptimizedImageUrl(rawCover) : '', [rawCover]);

  const hasBadges = accessTags.length > 0 || sessionStripes.length > 0 || Boolean(activeLoans && activeLoans.length > 0);

  const roleText = useMemo(() => {
    const r = (user.role || '').toUpperCase();
    if (r === 'ADMIN' || r === 'TEAM') return 'FACULTY / TEAM';
    if (r === 'INSTRUCTOR' || r === 'MENTOR') return 'INSTRUCTOR';
    return 'MAKER';
  }, [user.role]);

  // Online status
  const isOnline = user.laptopStatus === 'ONLINE' || user.laptopStatus === 'ACTIVE' || user.status === 'APPROVED';

  // Custom Theme Color resolution
  const themeColor = useMemo(() => resolveThemeColor(user.customTheme), [user.customTheme]);

  // Skin finish class
  const skinClass = user.cardSkin && SKIN_CLASSES[user.cardSkin] ? SKIN_CLASSES[user.cardSkin] : '';
  const isCustomSkin = Boolean(skinClass);

  // Badge Alignment class
  const badgeAlignmentClass = useMemo(() => {
    return 'flex flex-wrap items-center gap-1.5';
  }, []);

  // Session Joint Positions for Elastic Chain Network
  const sessionJoints = useMemo(() => {
    return sessionStripes.map((stripe, idx) => {
      const key = `stripe_${stripe.planId || idx}`;
      const defaultX = 6 + (idx * 28) % 64;
      const defaultY = 60 + Math.floor(idx / 3) * 14;
      const pos = (tagPositions && tagPositions[key]) || { x: defaultX, y: defaultY, rot: 0 };
      return {
        stripe,
        key,
        index: idx,
        x: pos.x,
        y: pos.y,
        rot: pos.rot,
      };
    });
  }, [sessionStripes, tagPositions]);

  const handleClick = (e: React.MouseEvent) => {
    if (interactiveDrag) return;
    if (onClick) {
      onClick();
      return;
    }
    if (onEdit) {
      onEdit(user);
      return;
    }
    if (hasPageLink) {
      window.open(rawPageLink, '_blank', 'noopener,noreferrer');
    }
  };

  const cardBorderColor = hasPageLink
    ? (themeColor ? `${themeColor}` : '#06b6d4')
    : undefined;

  const cardStyle: React.CSSProperties = hasPageLink
    ? ({
        borderColor: cardBorderColor,
        '--shine-color': themeColor ? `${themeColor}88` : 'rgba(56, 189, 248, 0.45)',
        '--shine-color-soft': themeColor ? `${themeColor}33` : 'rgba(16, 185, 129, 0.2)',
      } as React.CSSProperties)
    : {};

  // Generic Drag & Rotate Handlers for Full Card Freeform Canvas
  const createDragHandlers = (itemKey: string, currentPos: { x: number; y: number; rot?: number }) => {
    const handleDragStart = (e: React.MouseEvent | React.TouchEvent) => {
      if (!interactiveDrag) return;
      e.preventDefault();
      onSelectTag?.(itemKey);
      const cardElem = cardRef.current;
      if (!cardElem) return;
      const cardRect = cardElem.getBoundingClientRect();

      const calculatePos = (clientX: number, clientY: number) => {
        const rawX = ((clientX - cardRect.left) / cardRect.width) * 100;
        const rawY = ((clientY - cardRect.top) / cardRect.height) * 100;
        return {
          x: Math.round(Math.max(2, Math.min(74, rawX))),
          y: Math.round(Math.max(4, Math.min(82, rawY))),
        };
      };

      const onMouseMove = (moveEvent: MouseEvent) => {
        const { x, y } = calculatePos(moveEvent.clientX, moveEvent.clientY);
        onTagPositionChange?.(itemKey, x, y, currentPos.rot);
      };

      const onTouchMove = (touchEvent: TouchEvent) => {
        if (touchEvent.touches.length > 0) {
          const { x, y } = calculatePos(touchEvent.touches[0].clientX, touchEvent.touches[0].clientY);
          onTagPositionChange?.(itemKey, x, y, currentPos.rot);
        }
      };

      const onDragEnd = () => {
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onDragEnd);
        window.removeEventListener('touchmove', onTouchMove);
        window.removeEventListener('touchend', onDragEnd);
      };

      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onDragEnd);
      window.addEventListener('touchmove', onTouchMove);
      window.addEventListener('touchend', onDragEnd);
    };

    const handleRotateStart = (e: React.MouseEvent | React.TouchEvent) => {
      if (!interactiveDrag) return;
      e.preventDefault();
      e.stopPropagation();
      const parent = (e.currentTarget as HTMLElement).closest('[data-element-container]') as HTMLElement;
      if (!parent) return;
      const rect = parent.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const calculateAngle = (clientX: number, clientY: number) => {
        const rad = Math.atan2(clientY - centerY, clientX - centerX);
        let deg = Math.round(rad * (180 / Math.PI)) + 90;
        if (deg > 180) deg -= 360;
        if (deg < -180) deg += 360;
        return deg;
      };

      const onRotateMove = (moveEvent: MouseEvent) => {
        const angle = calculateAngle(moveEvent.clientX, moveEvent.clientY);
        onTagPositionChange?.(itemKey, currentPos.x, currentPos.y, angle);
      };

      const onTouchRotateMove = (touchEvent: TouchEvent) => {
        if (touchEvent.touches.length > 0) {
          const angle = calculateAngle(touchEvent.touches[0].clientX, touchEvent.touches[0].clientY);
          onTagPositionChange?.(itemKey, currentPos.x, currentPos.y, angle);
        }
      };

      const onRotateEnd = () => {
        window.removeEventListener('mousemove', onRotateMove);
        window.removeEventListener('mouseup', onRotateEnd);
        window.removeEventListener('touchmove', onTouchRotateMove);
        window.removeEventListener('touchend', onRotateEnd);
      };

      window.addEventListener('mousemove', onRotateMove);
      window.addEventListener('mouseup', onRotateEnd);
      window.addEventListener('touchmove', onTouchRotateMove);
      window.addEventListener('touchend', onRotateEnd);
    };

    return { handleDragStart, handleRotateStart };
  };

  return (
    <div
      ref={cardRef}
      onClick={handleClick}
      style={cardStyle}
      className={`
        group relative ${shapeClass} p-3.5 transition-all duration-300 select-none w-full
        maker-card-optimized
        ${hasBadges ? (isFreeformActive ? 'min-h-[180px]' : 'min-h-[130px]') : 'min-h-0'}
        ${isCustomSkin ? skinClass : 'bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 text-slate-900 dark:text-white'}
        shadow-[0_4px_14px_rgba(0,0,0,0.05),inset_0_1px_1px_rgba(255,255,255,0.9)]
        dark:shadow-[0_4px_16px_rgba(0,0,0,0.35)]
        overflow-hidden flex flex-col justify-between
        ${hasPageLink ? 'doc-shine-card' : ''}
        ${!interactiveDrag && (hasPageLink || onClick || onEdit) ? 'cursor-pointer hover:-translate-y-1 hover:shadow-[0_12px_26px_rgba(0,0,0,0.12)] dark:hover:shadow-[0_12px_28px_rgba(0,0,0,0.5)]' : ''}
        ${interactiveDrag ? 'ring-2 ring-emerald-500/40' : ''}
        ${className}
      `}
    >
      {/* =========================================================================
          BACKGROUND LAYER: Workshop Banner Cover OR Profile Image Backdrop
          ========================================================================= */}
      {coverImage ? (
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-0" style={{ opacity: bgOpacity }}>
          <img
            src={coverImage}
            alt="Workshop Cover"
            referrerPolicy="no-referrer"
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            onError={(e) => {
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/60 to-slate-950/30" />
        </div>
      ) : profileImage && !isCustomSkin ? (
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-0" style={{ opacity: bgOpacity }}>
          <img
            src={profileImage}
            alt={user.name}
            referrerPolicy="no-referrer"
            loading="lazy"
            className="w-full h-full object-cover scale-100 transition-transform duration-500 group-hover:scale-105"
            onError={(e) => {
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-white/95 via-white/75 to-white/40 dark:from-slate-950/95 dark:via-slate-950/80 dark:to-slate-950/50" />
        </div>
      ) : null}

      {/* =========================================================================
          DOCUMENTATION LINK SHINE EFFECT
          ========================================================================= */}
      {hasPageLink && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-10">
          <div 
            className="w-[80%] h-[250%] -top-[75%] -left-[40%] doc-shine-sweep pointer-events-none" 
            style={{
              background: `linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.65) 40%, ${themeColor || '#06b6d4'}bb 50%, rgba(255,255,255,0.65) 60%, transparent 100%)`,
            }}
          />
          <div
            className="absolute top-0 inset-x-0 h-[2.5px] pointer-events-none opacity-90"
            style={{
              background: `linear-gradient(90deg, transparent, ${themeColor || '#06b6d4'}, transparent)`,
            }}
          />
        </div>
      )}

      {/* =========================================================================
          TOP PROFILE BAR
          ========================================================================= */}
      <div className="relative z-10 flex items-start justify-between gap-2.5 pb-1.5 pointer-events-none">
        {/* Left: Avatar with Spray Aura */}
        <div className="relative shrink-0 pointer-events-auto">
          <div
            className="absolute -inset-2 rounded-full blur-md opacity-80 group-hover:opacity-100 transition-all duration-300 pointer-events-none"
            style={{
              background: themeColor
                ? `radial-gradient(circle at 40% 40%, ${themeColor} 0%, ${themeColor}66 50%, transparent 100%)`
                : 'radial-gradient(circle at 40% 40%, rgba(6,182,212,0.85) 0%, rgba(16,185,129,0.75) 50%, rgba(245,158,11,0.4) 80%, transparent 100%)',
            }}
          />

          <div
            className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full pointer-events-none transition-all duration-300"
            style={{
              backgroundColor: themeColor || '#22d3ee',
              boxShadow: `0 0 6px ${themeColor || '#22d3ee'}`,
            }}
          />

          {/* Avatar Thumbnail */}
          <div className="relative w-12 h-12 sm:w-13 sm:h-13 rounded-2xl bg-white dark:bg-slate-800 border-2 border-white/95 dark:border-slate-700 shadow-[0_2px_8px_rgba(0,0,0,0.15)] overflow-hidden flex items-center justify-center">
            {profileImage ? (
              <img
                src={profileImage}
                alt={user.name}
                referrerPolicy="no-referrer"
                loading="lazy"
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            ) : (
              <div className="w-full h-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                <UsersIcon className="w-6 h-6 text-cyan-600 dark:text-cyan-400" />
              </div>
            )}
          </div>

          {/* Stencil Monogram Badge on Avatar Corner */}
          <div
            className="absolute -bottom-1 -right-1 px-1 py-0.2 bg-white dark:bg-slate-800 rounded-[3px] font-mono font-black text-[8px] leading-tight shadow-xs select-none border"
            style={{
              transform: 'rotate(-6deg)',
              color: themeColor || '#0891b2',
              borderColor: themeColor ? `${themeColor}66` : '#67e8f9',
            }}
          >
            {totalMilestones > 0 ? `${totalMilestones}★` : '20'}
          </div>
        </div>

        {/* Center: Name, Role Sticker & Maker Focus Tagline */}
        <div className="flex-1 min-w-0 pl-1 pointer-events-auto">
          <div className="flex items-center gap-1.5 flex-wrap">
            <h3
              title={user.name}
              className="font-black text-sm sm:text-base tracking-tight leading-snug truncate"
            >
              {user.name || 'Anonymous Maker'}
            </h3>
            {hasPageLink && (
              <span title="Documentation Available" className="inline-flex items-center">
                <Sparkles 
                  className="w-3.5 h-3.5 animate-pulse shrink-0" 
                  style={{ color: themeColor || '#06b6d4' }}
                />
              </span>
            )}
          </div>

          {/* Role Sticker & Milestone Badge */}
          <div className="mt-1 flex items-center gap-1.5 flex-wrap">
            <span
              className="
                inline-block px-2 py-0.5 rounded-[4px]
                bg-white/95 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-black text-[9px] sm:text-[10px]
                uppercase tracking-wider shadow-xs
                border border-slate-200 dark:border-slate-700 select-none font-sans
                transform -rotate-1 hover:rotate-0 transition-transform duration-200
              "
            >
              {roleText}
            </span>

            {totalMilestones > 0 && (
              <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 dark:bg-emerald-500/20 px-1.5 py-0.5 rounded-full border border-emerald-500/20 flex items-center gap-0.5">
                <Star className="w-2.5 h-2.5 fill-emerald-500" />
                {totalMilestones} {totalMilestones === 1 ? 'Milestone' : 'Milestones'}
              </span>
            )}
          </div>

          {/* Maker Focus & Peer Learning Tagline */}
          {user.customTagline && (
            <div className="mt-1.5 flex items-center gap-1 text-[10px] text-slate-600 dark:text-slate-300 font-medium italic truncate max-w-full bg-white/40 dark:bg-slate-800/40 px-2 py-0.5 rounded-lg backdrop-blur-xs border border-slate-200/50 dark:border-slate-700/50">
              <Lightbulb className="w-3.5 h-3.5 text-amber-500 shrink-0 not-italic" />
              <span className="truncate">{user.customTagline}</span>
            </div>
          )}
        </div>

        {/* Right: FAB Alumni Medallion & Clean LED Power Switch */}
        <div className="flex flex-col items-end gap-2 shrink-0 pointer-events-auto">
          {/* FAB Alumni Medallion */}
          {isFab && (
            <div
              title="Fab Academy Alumni / Fab Expert"
              className="
                relative w-8 h-8 rounded-full flex items-center justify-center select-none
                shadow-[0_3px_8px_rgba(0,0,0,0.15),inset_0_2px_4px_rgba(255,255,255,0.9)]
                border-[2px] border-white dark:border-slate-300
                transition-transform duration-300 group-hover:scale-105 group-hover:rotate-6
              "
              style={{
                background: 'conic-gradient(from 180deg at 50% 50%, #fef08a 0deg, #a7f3d0 90deg, #bae6fd 180deg, #fbcfe8 270deg, #fef08a 360deg)',
              }}
            >
              <div className="absolute top-0.5 left-1 w-2 h-1 bg-white/90 rounded-full blur-[0.5px]" />
              <span className="font-black text-[9px] text-slate-800 tracking-wider [text-shadow:_0_1px_1px_rgba(255,255,255,0.8)]">
                FAB
              </span>
            </div>
          )}

          {/* Clean LED Power Switch */}
          <div
            title={isOnline ? 'Online / Active in Lab' : 'Offline / Standby'}
            className={`
              w-6 h-6 rounded-full flex items-center justify-center select-none
              bg-white/95 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs transition-all
              ${isOnline ? 'shadow-[0_0_8px_#10b981]' : ''}
            `}
          >
            <div
              className={`
                w-3 h-3 rounded-full flex items-center justify-center
                ${isOnline ? 'text-emerald-500 drop-shadow-[0_0_4px_#10b981]' : 'text-slate-400 dark:text-slate-500'}
              `}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="w-3 h-3">
                <path d="M12 2v10" />
                <path d="M18.36 6.64a9 9 0 1 1-12.73 0" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          FULL-CARD FREEFORM CANVAS LAYER (Senior Category Privilege)
          Renders elastic stretchable chain links & free-roaming draggable badges!
          ========================================================================= */}
      {isFreeformActive ? (
        <div className="absolute inset-0 z-20 pointer-events-none">
          {/* Subtle Grid Canvas Guide when Interactive Drag is active */}
          {interactiveDrag && (
            <div className="absolute inset-0 border-2 border-dashed border-emerald-500/40 rounded-3xl bg-emerald-500/[0.03] pointer-events-none flex items-start justify-end p-2.5">
              <span className="text-[9px] font-mono font-bold text-emerald-700 dark:text-emerald-400 bg-white/90 dark:bg-slate-900/90 border border-emerald-500/30 px-2 py-0.5 rounded-full shadow-xs flex items-center gap-1">
                <LinkIcon className="w-3 h-3" /> Full Card Canva Canvas
              </span>
            </div>
          )}

          {/* SVG Stretchable Elastic Chain Links connecting Session Stripe Joints */}
          {sessionJoints.length > 1 && (
            <svg className="absolute inset-0 w-full h-full pointer-events-none z-10 overflow-visible">
              <defs>
                <linearGradient id="chainLinkGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#10b981" />
                  <stop offset="50%" stopColor="#f59e0b" />
                  <stop offset="100%" stopColor="#10b981" />
                </linearGradient>
              </defs>
              {sessionJoints.map((joint, idx) => {
                if (idx === sessionJoints.length - 1) return null;
                const nextJoint = sessionJoints[idx + 1];
                // Center coordinates relative to card
                const x1 = joint.x + 3.5;
                const y1 = joint.y + 7.5;
                const x2 = nextJoint.x + 3.5;
                const y2 = nextJoint.y + 7.5;
                const dx = x2 - x1;
                const dy = y2 - y1;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const sag = Math.min(6, Math.max(1.5, dist * 0.12));
                const midX = (x1 + x2) / 2;
                const midY = (y1 + y2) / 2 + sag;
                const pathD = `M ${x1}% ${y1}% Q ${midX}% ${midY}% ${x2}% ${y2}%`;

                return (
                  <g key={`chain_link_${joint.key}_${nextJoint.key}`}>
                    {/* Outer Glow */}
                    <path d={pathD} stroke="rgba(16, 185, 129, 0.4)" strokeWidth="5" fill="none" strokeLinecap="round" />
                    {/* Braided Elastic Chain Line */}
                    <path d={pathD} stroke="url(#chainLinkGrad)" strokeWidth="2.5" fill="none" strokeDasharray="4 2" strokeLinecap="round" />
                    {/* Core Pulse Wire */}
                    <path d={pathD} stroke="#ffffff" strokeWidth="0.8" fill="none" opacity="0.85" />
                    {/* Eyelet Connector Rings */}
                    <circle cx={`${x1}%`} cy={`${y1}%`} r="2" fill="#10b981" stroke="#ffffff" strokeWidth="0.75" />
                    <circle cx={`${x2}%`} cy={`${y2}%`} r="2" fill="#10b981" stroke="#ffffff" strokeWidth="0.75" />
                  </g>
                );
              })}
            </svg>
          )}

          {/* Draggable Session Stripe Chain Joints */}
          {sessionJoints.map((joint) => {
            const isSelected = selectedTag === joint.key && interactiveDrag;
            const { handleDragStart, handleRotateStart } = createDragHandlers(joint.key, { x: joint.x, y: joint.y, rot: joint.rot });

            return (
              <div
                key={joint.key}
                data-element-container={joint.key}
                style={{
                  position: 'absolute',
                  left: `${joint.x}%`,
                  top: `${joint.y}%`,
                }}
                onClick={(e) => {
                  if (interactiveDrag) {
                    e.stopPropagation();
                    onSelectTag?.(joint.key);
                  }
                }}
                className={`pointer-events-auto transition-shadow select-none z-30 ${
                  interactiveDrag
                    ? `cursor-grab active:cursor-grabbing p-1 rounded-xl ${
                        isSelected
                          ? 'ring-2 ring-emerald-500 bg-emerald-500/20 shadow-2xl scale-105 z-50'
                          : 'hover:ring-1 hover:ring-emerald-400 bg-slate-900/10 hover:scale-105'
                      }`
                    : ''
                }`}
                onMouseDown={interactiveDrag ? handleDragStart : undefined}
                onTouchStart={interactiveDrag ? handleDragStart : undefined}
              >
                {/* Canva Selection Bounding Box + Rotation Handle */}
                {isSelected && (
                  <>
                    <span className="absolute -top-1 -left-1 w-2 h-2 rounded-[1px] bg-white border border-emerald-600 shadow-sm pointer-events-none" />
                    <span className="absolute -top-1 -right-1 w-2 h-2 rounded-[1px] bg-white border border-emerald-600 shadow-sm pointer-events-none" />
                    <span className="absolute -bottom-1 -left-1 w-2 h-2 rounded-[1px] bg-white border border-emerald-600 shadow-sm pointer-events-none" />
                    <span className="absolute -bottom-1 -right-1 w-2 h-2 rounded-[1px] bg-white border border-emerald-600 shadow-sm pointer-events-none" />

                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-0.5 h-4 bg-emerald-500 pointer-events-none" />
                    <div
                      title="Drag to rotate angle"
                      className="absolute -top-7 left-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-white border-2 border-emerald-500 shadow-md flex items-center justify-center cursor-crosshair hover:scale-125 transition-transform z-50 text-emerald-600"
                      onMouseDown={handleRotateStart}
                      onTouchStart={handleRotateStart}
                    >
                      <RotateCw className="w-2.5 h-2.5 pointer-events-none" />
                    </div>
                  </>
                )}

                <SessionStripeJoint
                  stripe={joint.stripe}
                  index={joint.index}
                  totalStripes={sessionJoints.length}
                  customRot={joint.rot}
                />
              </div>
            );
          })}

          {/* Draggable Freeform Access Badges */}
          {accessTags.map((tag, idx) => {
            const defaultX = (idx % 3) * 31 + 4;
            const defaultY = 78 + Math.floor(idx / 3) * 12;
            const pos = (tagPositions && tagPositions[tag]) || { x: defaultX, y: defaultY, rot: undefined };
            const isSelected = selectedTag === tag && interactiveDrag;
            const { handleDragStart, handleRotateStart } = createDragHandlers(tag, pos);

            return (
              <div
                key={tag}
                data-element-container={tag}
                style={{
                  position: 'absolute',
                  left: `${pos.x}%`,
                  top: `${pos.y}%`,
                }}
                onClick={(e) => {
                  if (interactiveDrag) {
                    e.stopPropagation();
                    onSelectTag?.(tag);
                  }
                }}
                className={`pointer-events-auto transition-shadow select-none z-30 ${
                  interactiveDrag
                    ? `cursor-grab active:cursor-grabbing p-1 rounded-lg ${
                        isSelected
                          ? 'ring-2 ring-emerald-500 bg-emerald-500/20 shadow-2xl scale-105 z-50'
                          : 'hover:ring-1 hover:ring-emerald-400 bg-slate-900/10 hover:scale-105'
                      }`
                    : ''
                }`}
                onMouseDown={interactiveDrag ? handleDragStart : undefined}
                onTouchStart={interactiveDrag ? handleDragStart : undefined}
              >
                {/* Canva Selection Controls */}
                {isSelected && (
                  <>
                    <span className="absolute -top-1 -left-1 w-2 h-2 rounded-[1px] bg-white border border-emerald-600 shadow-sm pointer-events-none" />
                    <span className="absolute -top-1 -right-1 w-2 h-2 rounded-[1px] bg-white border border-emerald-600 shadow-sm pointer-events-none" />
                    <span className="absolute -bottom-1 -left-1 w-2 h-2 rounded-[1px] bg-white border border-emerald-600 shadow-sm pointer-events-none" />
                    <span className="absolute -bottom-1 -right-1 w-2 h-2 rounded-[1px] bg-white border border-emerald-600 shadow-sm pointer-events-none" />

                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-0.5 h-4 bg-emerald-500 pointer-events-none" />
                    <div
                      title="Drag to rotate angle"
                      className="absolute -top-7 left-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-white border-2 border-emerald-500 shadow-md flex items-center justify-center cursor-crosshair hover:scale-125 transition-transform z-50 text-emerald-600"
                      onMouseDown={handleRotateStart}
                      onTouchStart={handleRotateStart}
                    >
                      <RotateCw className="w-2.5 h-2.5 pointer-events-none" />
                    </div>
                  </>
                )}

                <MaterialTagBadge
                  tag={tag}
                  index={idx}
                  seedString={user.email || user.name || ''}
                  isFeatured={user.featuredBadge === tag}
                  customRot={pos.rot}
                />
              </div>
            );
          })}
        </div>
      ) : null}

      {/* =========================================================================
          BOTTOM WORKBENCH BOARD
          ========================================================================= */}
      {hasBadges && (
        <div className={`relative z-10 mt-2 bg-white/95 dark:bg-slate-900/95 rounded-2xl p-2.5 sm:p-3 border border-slate-200/90 dark:border-slate-800 shadow-[0_2px_8px_rgba(0,0,0,0.04)] overflow-hidden flex flex-col justify-between ${isFreeformActive ? freeformWorkbenchMinHeight : 'min-h-[85px]'}`}>
          {/* Masking Tape Decal */}
          <div
            className="absolute -top-1.5 left-8 w-20 h-3.5 bg-amber-100/90 dark:bg-amber-900/40 border-y border-amber-300/70 shadow-xs pointer-events-none select-none backdrop-blur-[1px]"
            style={{ transform: 'rotate(-1.5deg)' }}
          />

          {/* Faint Stencil Monogram Background */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none opacity-[0.03] dark:opacity-[0.05]">
            <span className="font-black text-6xl text-slate-800 dark:text-white tracking-tighter">FAB</span>
          </div>

          {/* Mini QR Code Decal */}
          <div
            className="absolute -bottom-1 -right-1 w-6 h-6 bg-white p-0.5 rounded-[2px] shadow-sm border border-slate-300 pointer-events-none select-none opacity-80 group-hover:opacity-100 transition-opacity"
            style={{ transform: 'rotate(4deg)' }}
          >
            <div className="w-full h-full bg-slate-800 grid grid-cols-3 gap-0.5 p-0.5">
              <div className="bg-white" /><div className="bg-slate-800" /><div className="bg-white" />
              <div className="bg-slate-800" /><div className="bg-white" /><div className="bg-slate-800" />
              <div className="bg-white" /><div className="bg-white" /><div className="bg-white" />
            </div>
          </div>

          <div className="space-y-2 relative z-10">
            {/* Session Stripes Rack (Standard Mode) */}
            {!isFreeformActive && sessionStripes.length > 0 && (
              <div className="flex items-center pt-0.5">
                <MakerStripesRack stripes={sessionStripes} size="sm" editable={false} />
              </div>
            )}

            {/* Access Badges (Standard Aligned Mode) */}
            {!isFreeformActive && accessTags.length > 0 && (
              <div className={`${badgeAlignmentClass} pt-0.5 pb-1`}>
                {accessTags.map((tag, idx) => (
                  <MaterialTagBadge
                    key={tag}
                    tag={tag}
                    index={idx}
                    seedString={user.email || user.name || ''}
                    isFeatured={user.featuredBadge === tag}
                  />
                ))}
              </div>
            )}

            {/* Active Loans */}
            {activeLoans && activeLoans.length > 0 && (
              <div className="mt-1 pt-1.5 border-t border-slate-200/60 dark:border-slate-800/80 space-y-0.5">
                {activeLoans.map((loan, idx) => (
                  <div key={idx} className="flex items-center gap-1 text-[9px] text-cyan-700 dark:text-cyan-400 font-semibold truncate">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 shrink-0" />
                    <span className="truncate">{loan.itemName} (x{loan.quantity})</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default React.memo(MakerUserCardComponent);
