import React, { useMemo } from 'react';
import { Users as UsersIcon, ExternalLink, Award, Sparkles } from 'lucide-react';
import MakerStripesRack, { MakerStripe } from './MakerStripesRack';
import { getTagStyle } from '@/lib/tagUtils';
import { getOptimizedImageUrl } from '@/lib/utils';

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
    [key: string]: any;
  };
  accessTags?: string[];
  stripes?: MakerStripe[];
  isFab?: boolean;
  activeLoans?: Array<{ itemName: string; quantity: number }>;
  onClick?: () => void;
  onEdit?: (user: any) => void;
  className?: string;
}

// Helper: Identify FAB Users (4+ tags or FA certification)
export const isUserFab = (u: any, sessionStripesCount: number = 0): boolean => {
  if (!u) return false;
  const directTags = Array.isArray(u.tags) ? u.tags : [];
  const hasFatag = directTags.some((t: string) => t.toLowerCase().startsWith("fa 20"));
  const totalCount = directTags.length + sessionStripesCount;
  return Boolean(hasFatag || totalCount >= 4);
};

// Helper: Sort tags with FA 20XX first
export const sortUserBadges = (tags: string[] = []): string[] => {
  return [...tags].sort((a, b) => {
    const isFA_a = a.toLowerCase().startsWith("fa 20");
    const isFA_b = b.toLowerCase().startsWith("fa 20");
    if (isFA_a && !isFA_b) return -1;
    if (!isFA_a && isFA_b) return 1;
    return a.localeCompare(b);
  });
};

/* =========================================================================
   TACTILE SKEUOMORPHIC MATERIAL BADGE RENDERERS
   ========================================================================= */

// 1. 3D Filament Extruded Brass/Gold Badge
const Badge3D = ({ tag }: { tag: string }) => (
  <div
    title={tag}
    className="inline-flex items-center justify-center px-2.5 py-1 rounded-lg select-none relative overflow-hidden transition-all duration-200 hover:scale-105 hover:z-20 cursor-default shadow-[0_3px_6px_rgba(0,0,0,0.25),inset_0_1px_1px_rgba(255,255,255,0.4)]"
    style={{
      background: 'linear-gradient(145deg, #e3b337 0%, #ba8a1c 50%, #8c6407 100%)',
      border: '1.5px solid #f6cf65',
    }}
  >
    {/* Micro layer lines texture */}
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
);

// 2. CNC Matte Anodized Slate Aluminum Plate
const BadgeCNC = ({ tag }: { tag: string }) => (
  <div
    title={tag}
    className="inline-flex items-center justify-center px-2.5 py-1 rounded-md select-none relative overflow-hidden transition-all duration-200 hover:scale-105 hover:z-20 cursor-default shadow-[0_3px_8px_rgba(0,0,0,0.3),inset_0_1px_1px_rgba(255,255,255,0.25)]"
    style={{
      background: 'linear-gradient(135deg, #475569 0%, #334155 100%)',
      border: '1.5px solid #94a3b8',
    }}
  >
    {/* Corner rivet drill holes */}
    <span className="absolute top-1 left-1 w-1 h-1 rounded-full bg-slate-300 border border-slate-500 shadow-inner" />
    <span className="absolute top-1 right-1 w-1 h-1 rounded-full bg-slate-300 border border-slate-500 shadow-inner" />
    <span className="absolute bottom-1 left-1 w-1 h-1 rounded-full bg-slate-300 border border-slate-500 shadow-inner" />
    <span className="absolute bottom-1 right-1 w-1 h-1 rounded-full bg-slate-300 border border-slate-500 shadow-inner" />

    <span className="font-black text-[10px] text-slate-100 uppercase tracking-wider relative z-10 px-1 [text-shadow:_0_1px_2px_rgba(0,0,0,0.8)]">
      {tag.length > 8 ? 'CNC MILL' : tag}
    </span>
  </div>
);

// 3. Translucent Edge-Lit Ruby Acrylic Sheet
const BadgeLaser = ({ tag }: { tag: string }) => (
  <div
    title={tag}
    className="inline-flex items-center justify-center px-3 py-1 rounded-lg select-none relative overflow-visible transition-all duration-200 hover:scale-105 hover:z-20 cursor-default shadow-[0_0_12px_rgba(239,68,68,0.45),0_3px_8px_rgba(0,0,0,0.2),inset_0_1px_2px_rgba(255,255,255,0.5)]"
    style={{
      background: 'linear-gradient(135deg, rgba(239,68,68,0.88) 0%, rgba(185,28,28,0.95) 100%)',
      border: '1.5px solid rgba(254,202,202,0.9)',
    }}
  >
    {/* Laser cutting etched gridlines */}
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
);

// 4. Real FR4 Dark Emerald Green PCB with Copper Traces & Microchip
const BadgePCB = ({ tag }: { tag: string }) => (
  <div
    title={tag}
    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg select-none relative overflow-hidden transition-all duration-200 hover:scale-105 hover:z-20 cursor-default shadow-[0_3px_8px_rgba(0,0,0,0.3),inset_0_1px_1px_rgba(255,255,255,0.2)]"
    style={{
      background: 'linear-gradient(145deg, #0b4526 0%, #062b17 100%)',
      border: '1.5px solid #1e7e48',
    }}
  >
    {/* Gold Copper Traces & Vias SVG */}
    <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-45" viewBox="0 0 100 30" preserveAspectRatio="none">
      <path d="M0,8 L25,8 L35,22 L100,22" stroke="#eab308" strokeWidth="1.2" fill="none" />
      <path d="M0,20 L15,20 L22,12 L50,12" stroke="#eab308" strokeWidth="1" fill="none" />
      <circle cx="25" cy="8" r="2" fill="#ca8a04" stroke="#fef08a" strokeWidth="0.5" />
      <circle cx="35" cy="22" r="2" fill="#ca8a04" stroke="#fef08a" strokeWidth="0.5" />
      <circle cx="85" cy="10" r="1.8" fill="#ca8a04" stroke="#fef08a" strokeWidth="0.5" />
    </svg>

    {/* Surface Mount Miniature IC Chip */}
    <div className="relative shrink-0 w-3 h-3.5 bg-slate-800 rounded-[2px] border border-slate-600 shadow-xs flex items-center justify-center">
      <div className="w-1 h-1 rounded-full bg-slate-400 absolute top-0.5 left-0.5" />
      <span className="text-[5px] text-slate-300 font-mono scale-75">IC</span>
    </div>

    <span className="font-mono font-black text-[10px] text-amber-300 uppercase tracking-wider relative z-10 [text-shadow:_0_1px_2px_rgba(0,0,0,0.9)]">
      {tag.length > 10 ? 'PCB / CIRC' : tag}
    </span>
  </div>
);

// 5. Layered Matte Vinyl Sticker
const BadgeVinyl = ({ tag }: { tag: string }) => (
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
);

// 6. Laser-Burnt Walnut Wood Grain Plaque
const BadgeWood = ({ tag }: { tag: string }) => (
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
);

// 7. Fab Academy Enamel Medal Ribbon Badge
const BadgeFabAcademy = ({ tag }: { tag: string }) => (
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
);

// 8. Industrial Safety / Hazard Badge
const BadgeSafety = ({ tag }: { tag: string }) => (
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
);

// Dispatcher for Material Badges
const MaterialTagBadge = ({ tag, index, seedString }: { tag: string; index: number; seedString: string }) => {
  const t = tag.toLowerCase().trim();
  const rotations = [-3, 2.5, -2, 3, -1.5, 3.5, -2.5, 2, -3.5, 1.5];
  const rot = rotations[(index + (seedString?.length || 0)) % rotations.length];

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
    // Default tactile die-cut sticker badge
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
      className="transition-transform duration-200 hover:rotate-0 hover:z-30"
    >
      {badgeElement}
    </div>
  );
};

/* =========================================================================
   MAIN MAKER USER CARD COMPONENT
   ========================================================================= */

export default function MakerUserCard({
  user,
  accessTags: accessTagsProp,
  stripes = [],
  isFab: isFabProp,
  activeLoans,
  onClick,
  onEdit,
  className = '',
}: MakerUserCardProps) {
  // 1. Access tags: directly from the user database
  const accessTags = useMemo(() => {
    const raw = accessTagsProp !== undefined ? accessTagsProp : (Array.isArray(user.tags) ? user.tags : []);
    return sortUserBadges(raw);
  }, [accessTagsProp, user.tags]);

  // 2. Session stripes: 1 session tag (word/emoji/letter) for each approved session
  const sessionStripes = useMemo(() => stripes || [], [stripes]);

  const isFab = isFabProp !== undefined ? isFabProp : isUserFab(user, sessionStripes.length);

  // Strict check for website/documentation link (must be a non-empty string)
  const rawPageLink = (user.myPageLink || '').trim();
  const hasPageLink = Boolean(
    rawPageLink &&
    rawPageLink !== '' &&
    rawPageLink !== '#' &&
    (rawPageLink.startsWith('http://') || rawPageLink.startsWith('https://') || rawPageLink.includes('.'))
  );

  // Resolve user profile image with Google Drive / external thumbnail optimization
  const rawImage = user.profileImageUrl?.trim() || user.imageUrl?.trim() || user.avatar?.trim() || user.photoUrl?.trim() || '';
  const profileImage = useMemo(() => {
    return getOptimizedImageUrl(rawImage);
  }, [rawImage]);

  const hasBadges = accessTags.length > 0 || sessionStripes.length > 0 || Boolean(activeLoans && activeLoans.length > 0);

  const roleText = useMemo(() => {
    const r = (user.role || '').toUpperCase();
    if (r === 'ADMIN' || r === 'TEAM') return 'FACULTY / TEAM';
    if (r === 'INSTRUCTOR' || r === 'MENTOR') return 'INSTRUCTOR';
    return 'STUDENT';
  }, [user.role]);

  // Online / active status
  const isOnline = user.laptopStatus === 'ONLINE' || user.laptopStatus === 'ACTIVE' || user.status === 'APPROVED';

  const handleClick = (e: React.MouseEvent) => {
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

  return (
    <div
      onClick={handleClick}
      className={`
        group relative rounded-3xl p-3.5 transition-all duration-300 select-none w-full
        bg-white dark:bg-slate-900
        border border-slate-200/90 dark:border-slate-800
        shadow-[0_4px_14px_rgba(0,0,0,0.05),inset_0_1px_1px_rgba(255,255,255,0.9)]
        dark:shadow-[0_4px_16px_rgba(0,0,0,0.35)]
        overflow-hidden flex flex-col justify-between
        ${hasPageLink ? 'doc-shine-card border-cyan-400/80 dark:border-cyan-400/70 shadow-[0_0_16px_rgba(56,189,248,0.35)]' : ''}
        ${hasPageLink || onClick || onEdit ? 'cursor-pointer hover:-translate-y-1 hover:shadow-[0_12px_26px_rgba(0,0,0,0.12)] dark:hover:shadow-[0_12px_28px_rgba(0,0,0,0.5)]' : ''}
        ${className}
      `}
    >
      {/* =========================================================================
          BACKGROUND LAYER: Student Profile Image (if uploaded)
          ========================================================================= */}
      {profileImage ? (
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
          <img
            src={profileImage}
            alt={user.name}
            className="w-full h-full object-cover scale-100 transition-transform duration-500 group-hover:scale-105"
            onError={(e) => {
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
          {/* Soft translucent gradient scrim: clearly shows image while ensuring high text readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-white/95 via-white/75 to-white/40 dark:from-slate-950/95 dark:via-slate-950/80 dark:to-slate-950/50" />
        </div>
      ) : null}

      {/* =========================================================================
          DOCUMENTATION LINK SHINE EFFECT (ONLY rendered if user has website/doc link)
          ========================================================================= */}
      {hasPageLink && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-20">
          <div className="w-[80%] h-[250%] -top-[75%] -left-[40%] bg-gradient-to-r from-transparent via-white/60 dark:via-cyan-300/30 to-transparent doc-shine-sweep pointer-events-none" />
        </div>
      )}

      {/* =========================================================================
          TOP PROFILE BAR (Avatar + Spray Aura + Name + Role Vinyl + FAB / Power)
          ========================================================================= */}
      <div className="relative z-10 flex items-start justify-between gap-2.5 pb-1.5">
        {/* Left: Avatar with Bright Cyan & Emerald Spray Aura */}
        <div className="relative shrink-0">
          {/* Cyan/Emerald/Gold Spray Glow */}
          <div
            className="absolute -inset-2 rounded-full blur-md opacity-80 group-hover:opacity-100 transition-all duration-300 pointer-events-none"
            style={{
              background: 'radial-gradient(circle at 40% 40%, rgba(6,182,212,0.85) 0%, rgba(16,185,129,0.75) 50%, rgba(245,158,11,0.4) 80%, transparent 100%)',
            }}
          />

          {/* Cyan & Emerald spray accent dots */}
          <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-cyan-300 shadow-[0_0_6px_#22d3ee] pointer-events-none" />
          <div className="absolute -bottom-0.5 left-1 w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_4px_#34d399] pointer-events-none" />

          {/* Avatar Thumbnail Container */}
          <div className="relative w-12 h-12 sm:w-13 sm:h-13 rounded-2xl bg-white dark:bg-slate-800 border-2 border-white/95 dark:border-slate-700 shadow-[0_2px_8px_rgba(0,0,0,0.15)] overflow-hidden flex items-center justify-center">
            {profileImage ? (
              <img src={profileImage} alt={user.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                <UsersIcon className="w-6 h-6 text-cyan-600 dark:text-cyan-400" />
              </div>
            )}
          </div>

          {/* Clean Stencil Badge on Avatar Corner (e.g. '20') */}
          <div
            className="absolute -bottom-1 -right-1 px-1 py-0.2 bg-white dark:bg-slate-800 text-cyan-600 dark:text-cyan-400 border border-cyan-300 dark:border-cyan-600 rounded-[3px] font-mono font-black text-[8px] leading-tight shadow-xs select-none"
            style={{ transform: 'rotate(-6deg)' }}
          >
            20
          </div>
        </div>

        {/* Center: Name & Die-Cut Sticker Role Badge */}
        <div className="flex-1 min-w-0 pl-1">
          {/* User Name */}
          <div className="flex items-center gap-1.5">
            <h3
              title={user.name}
              className="font-black text-sm sm:text-base text-slate-900 dark:text-white tracking-tight leading-snug truncate"
            >
              {user.name || 'Anonymous Maker'}
            </h3>
            {hasPageLink && (
              <span title="Documentation Available" className="inline-flex items-center">
                <Sparkles className="w-3.5 h-3.5 text-cyan-500 animate-pulse shrink-0" />
              </span>
            )}
          </div>

          {/* Die-Cut White Vinyl Sticker for Role */}
          <div className="mt-1">
            <span
              className="
                inline-block px-2.5 py-0.5 rounded-[4px]
                bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-black text-[10px] sm:text-[11px]
                uppercase tracking-wider shadow-[0_2px_5px_rgba(0,0,0,0.18)]
                border-2 border-white dark:border-slate-700 select-none font-sans
                transform -rotate-2 hover:rotate-0 transition-transform duration-200
              "
            >
              {roleText}
            </span>
          </div>
        </div>

        {/* Right: Holographic FAB Medallion & Clean LED Power Switch */}
        <div className="flex flex-col items-end gap-2 shrink-0">
          {/* Holographic FAB Medallion */}
          {isFab && (
            <div
              title="Fab Academy Certified / Master Maker"
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
              {/* Specular Glint */}
              <div className="absolute top-0.5 left-1 w-2 h-1 bg-white/90 rounded-full blur-[0.5px]" />
              <span className="font-black text-[9px] text-slate-800 tracking-wider [text-shadow:_0_1px_1px_rgba(255,255,255,0.8)]">
                FAB
              </span>
            </div>
          )}

          {/* Clean LED Power Switch (White/Slate bezel with emerald indicator) */}
          <div
            title={isOnline ? 'Online / Active' : 'Offline / Standby'}
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
          BOTTOM WORKBENCH STICKER BOARD: Only rendered if badges/stripes exist!
          ========================================================================= */}
      {hasBadges && (
        <div className="relative z-10 mt-2 bg-white/90 dark:bg-slate-900/90 rounded-2xl p-2.5 sm:p-3 border border-slate-200/90 dark:border-slate-800 shadow-[0_2px_8px_rgba(0,0,0,0.04)] overflow-hidden flex flex-col justify-between min-h-[50px]">
          {/* Masking Tape Decal across top edge */}
          <div
            className="absolute -top-1.5 left-8 w-20 h-3.5 bg-amber-100/90 dark:bg-amber-900/40 border-y border-amber-300/70 shadow-xs pointer-events-none select-none backdrop-blur-[1px]"
            style={{ transform: 'rotate(-1.5deg)' }}
          />

          {/* Faint Stencil Monogram Background */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none opacity-[0.03] dark:opacity-[0.05]">
            <span className="font-black text-6xl text-slate-800 dark:text-white tracking-tighter">FAB</span>
          </div>

          {/* Mini QR Code Sticker Decal in Corner */}
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

          {/* Content: Session Tags (Stripes Rack) and/or Access Tags (Material Badges) */}
          <div className="space-y-2 relative z-10">
            {/* Session Tags Rack: 1 colorful stripe with user's word/emoji/char per approved session */}
            {sessionStripes.length > 0 && (
              <div className="flex items-center pt-0.5">
                <MakerStripesRack stripes={sessionStripes} size="sm" editable={false} />
              </div>
            )}

            {/* Access Tags: Material badges for tags found in the user database */}
            {accessTags.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 pt-0.5 pb-1">
                {accessTags.map((tag, idx) => (
                  <MaterialTagBadge
                    key={tag}
                    tag={tag}
                    index={idx}
                    seedString={user.email || user.name || ''}
                  />
                ))}
              </div>
            )}

            {/* Active Loans (Optional for Admin or detail view) */}
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
