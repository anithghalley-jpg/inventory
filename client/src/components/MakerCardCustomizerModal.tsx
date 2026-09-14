import React, { useState, useMemo, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Sparkles,
  Palette,
  Image as ImageIcon,
  Lightbulb,
  Award,
  Star,
  Lock,
  Check,
  Layout,
  ExternalLink,
  User as UserIcon,
  Move,
  RotateCcw,
  RotateCw,
  HelpCircle,
  Circle,
  Square,
  Hexagon,
  Shield,
  Layers,
  Compass,
} from 'lucide-react';
import MakerUserCard from './MakerUserCard';
import ThemeColorPicker from './ThemeColorPicker';
import { MakerStripe } from './MakerStripesRack';
import { getMakerMilestoneTier } from '@/hooks/useCommunityMakers';
import { toast } from 'sonner';
import { useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';

const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbySg1K6fL2eR_m38lZ8m_zJ26mQ6475tC5Pdr00tG8Z49g8xS1a3R-nF7Y4w12P7d7f/exec";

export interface MakerCardCustomizerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: any;
  stripes?: MakerStripe[];
  accessTags?: string[];
  onOpenStripesCustomizer?: () => void;
}

interface SkinOption {
  id: string;
  name: string;
  minTier: 1 | 2 | 3 | 4;
  minMilestones: number;
  previewBg: string;
}

const MAKER_SKINS: SkinOption[] = [
  { id: 'default', name: 'Clean Slate', minTier: 1, minMilestones: 0, previewBg: 'linear-gradient(135deg, #ffffff 0%, #f1f5f9 100%)' },
  { id: 'natural_craft', name: 'Workshop Craft', minTier: 1, minMilestones: 0, previewBg: 'linear-gradient(135deg, #78350f 0%, #451a03 100%)' },
  { id: 'emerald_circuit', name: 'Emerald Circuit', minTier: 2, minMilestones: 2, previewBg: 'linear-gradient(135deg, #064e3b 0%, #022c22 100%)' },
  { id: 'blueprint', name: 'Blueprint Tech', minTier: 2, minMilestones: 2, previewBg: 'linear-gradient(135deg, #0369a1 0%, #082f49 100%)' },
  { id: 'ruby_optics', name: 'Ruby Optics', minTier: 2, minMilestones: 2, previewBg: 'linear-gradient(135deg, #be123c 0%, #4c0519 100%)' },
  { id: 'gold_inlay', name: 'Gold Inlay', minTier: 3, minMilestones: 4, previewBg: 'linear-gradient(135deg, #b45309 0%, #78350f 100%)' },
  { id: 'obsidian', name: 'Obsidian Stealth', minTier: 3, minMilestones: 4, previewBg: 'linear-gradient(135deg, #27272a 0%, #09090b 100%)' },
  { id: 'synthwave', name: 'Synthwave Glow', minTier: 3, minMilestones: 4, previewBg: 'linear-gradient(135deg, #a21caf 0%, #3b0764 100%)' },
  { id: 'glass', name: 'Prismatic Glass', minTier: 3, minMilestones: 4, previewBg: 'linear-gradient(135deg, rgba(255,255,255,0.6) 0%, rgba(203,213,225,0.3) 100%)' },
  { id: 'holo_prism', name: 'Holo Prism Foil', minTier: 4, minMilestones: 7, previewBg: 'linear-gradient(135deg, #38bdf8 0%, #ec4899 50%, #eab308 100%)' },
  { id: 'aurora', name: 'Cosmic Aurora', minTier: 4, minMilestones: 7, previewBg: 'linear-gradient(135deg, #0f766e 0%, #1e1b4b 100%)' },
  { id: 'signature_onyx', name: 'Signature Onyx', minTier: 4, minMilestones: 7, previewBg: 'linear-gradient(135deg, #ca8a04 0%, #09090b 100%)' },
];

const PRESET_COVERS = [
  { name: 'None', url: '' },
  { name: 'Circuit Matrix', url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=80' },
  { name: 'Dark Workshop', url: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80' },
  { name: 'Neon Fiber', url: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=800&q=80' },
  { name: 'Laser Beam', url: 'https://images.unsplash.com/photo-1504639725590-34d0984388bd?auto=format&fit=crop&w=800&q=80' },
  { name: 'Woodcraft', url: 'https://images.unsplash.com/photo-1546484396-fb3fc6f95f98?auto=format&fit=crop&w=800&q=80' },
];

// Helper: Section Label with Interactive Question Mark Tooltip
const InfoLabel: React.FC<{
  label: string;
  info: string;
  icon?: any;
  badge?: React.ReactNode;
}> = ({ label, info, icon: Icon, badge }) => (
  <div className="flex items-center justify-between">
    <div className="flex items-center gap-1.5">
      {Icon && <Icon className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
      <Label className="text-xs font-bold text-slate-800">{label}</Label>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className="text-slate-400 hover:text-slate-700 transition-colors cursor-help p-0.5 rounded-full inline-flex items-center justify-center"
          >
            <HelpCircle className="w-3.5 h-3.5" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs bg-slate-900 text-white text-xs p-2.5 rounded-xl shadow-xl border border-slate-700 leading-relaxed z-50">
          <p>{info}</p>
        </TooltipContent>
      </Tooltip>
    </div>
    {badge}
  </div>
);

export default function MakerCardCustomizerModal({
  open,
  onOpenChange,
  user,
  stripes = [],
  accessTags: accessTagsProp,
  onOpenStripesCustomizer,
}: MakerCardCustomizerModalProps) {
  const updateProfileMutation = useMutation(api.users.updateProfile);

  // Active sub-tab
  const [activeTab, setActiveTab] = useState<'profile' | 'theme' | 'layout'>('profile');

  // Currently selected tag for Canva-style editing in Layout tab
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  // Derived access tags & milestone metrics
  const accessTags = useMemo(() => {
    return accessTagsProp !== undefined ? accessTagsProp : (Array.isArray(user?.tags) ? user.tags : []);
  }, [accessTagsProp, user?.tags]);

  const totalMilestones = accessTags.length + (stripes?.length || 0);
  const hasFaCert = useMemo(() => {
    return accessTags.some((t: string) => t.toLowerCase().startsWith('fa 20') || t.toLowerCase().includes('fab academy'));
  }, [accessTags]);

  const isFab = Boolean(hasFaCert || totalMilestones >= 4);
  const { tier, tierName } = useMemo(() => {
    return getMakerMilestoneTier(totalMilestones, hasFaCert);
  }, [totalMilestones, hasFaCert]);

  // Form states
  const [skin, setSkin] = useState<string>(user?.cardSkin || 'default');
  const [profileImage, setProfileImage] = useState<string>(user?.profileImageUrl || '');
  const [coverUrl, setCoverUrl] = useState<string>(user?.cardCoverUrl || '');
  const [bgOpacity, setBgOpacity] = useState<number>(typeof user?.cardBgOpacity === 'number' ? user.cardBgOpacity : 85);
  const [docLink, setDocLink] = useState<string>(user?.myPageLink || '');
  const [customTheme, setCustomTheme] = useState<string>(user?.customTheme || '');
  const [customTagline, setCustomTagline] = useState<string>(user?.customTagline || '');
  const [featuredBadge, setFeaturedBadge] = useState<string>(user?.featuredBadge || '');
  
  // Layout mode: 'aligned' (Default) vs 'freeform'
  const [layoutMode, setLayoutMode] = useState<'aligned' | 'freeform'>(() => {
    if (user?.cardBadgeAlignment === 'freeform') return 'freeform';
    if (user?.cardTagPositions && user.cardTagPositions !== '{}' && user.cardBadgeAlignment !== 'aligned') return 'freeform';
    return 'aligned';
  });

  // Card Shape: 'standard' | 'squircle' | 'circle' | 'chamfer' | 'arch'
  const [cardShape, setCardShape] = useState<string>(user?.cardLayoutSize || 'standard');

  const [tagPositions, setTagPositions] = useState<Record<string, { x: number; y: number; rot?: number }>>(() => {
    if (!user?.cardTagPositions) return {};
    try {
      return typeof user.cardTagPositions === 'string' ? JSON.parse(user.cardTagPositions) : user.cardTagPositions;
    } catch {
      return {};
    }
  });

  const [isSaving, setIsSaving] = useState(false);

  // Sync state when opened or user changes
  useEffect(() => {
    if (user && open) {
      setSkin(user.cardSkin || 'default');
      setProfileImage(user.profileImageUrl || '');
      setCoverUrl(user.cardCoverUrl || '');
      setBgOpacity(typeof user.cardBgOpacity === 'number' ? user.cardBgOpacity : 85);
      setDocLink(user.myPageLink || '');
      setCustomTheme(user.customTheme || '');
      setCustomTagline(user.customTagline || '');
      setFeaturedBadge(user.featuredBadge || '');
      
      const isFree = user.cardBadgeAlignment === 'freeform' || (Boolean(user.cardTagPositions && user.cardTagPositions !== '{}') && user.cardBadgeAlignment !== 'aligned');
      setLayoutMode(isFree ? 'freeform' : 'aligned');
      
      setCardShape(user.cardLayoutSize || 'standard');
      try {
        setTagPositions(user.cardTagPositions ? (typeof user.cardTagPositions === 'string' ? JSON.parse(user.cardTagPositions) : user.cardTagPositions) : {});
      } catch {
        setTagPositions({});
      }
      setSelectedTag(null);
    }
  }, [user, open]);

  // Live tag position and rotation updater
  const handleTagPositionChange = (tag: string, x: number, y: number, rot?: number) => {
    setTagPositions((prev) => ({
      ...prev,
      [tag]: {
        x,
        y,
        rot: rot !== undefined ? rot : prev[tag]?.rot,
      },
    }));
  };

  // Specific tag rotation angle updater (from inspector slider/presets)
  const handleSelectedTagAngleChange = (angle: number) => {
    if (!selectedTag) return;
    const currentPos = tagPositions[selectedTag] || { x: 30, y: 30 };
    setTagPositions((prev) => ({
      ...prev,
      [selectedTag]: {
        ...currentPos,
        rot: angle,
      },
    }));
  };

  const handleResetTagPositions = () => {
    setTagPositions({});
    setSelectedTag(null);
    toast.info("Tag positions reset to standard alignment");
  };

  // Live preview user object
  const previewUser = useMemo(() => {
    return {
      ...user,
      cardSkin: skin,
      profileImageUrl: profileImage,
      cardCoverUrl: coverUrl,
      cardBgOpacity: bgOpacity,
      customTagline: customTagline,
      featuredBadge: featuredBadge,
      cardBadgeAlignment: layoutMode,
      cardTagPositions: layoutMode === 'freeform' && Object.keys(tagPositions).length > 0 ? JSON.stringify(tagPositions) : '',
      cardLayoutSize: cardShape,
      myPageLink: docLink,
      customTheme: customTheme,
    };
  }, [user, skin, profileImage, coverUrl, bgOpacity, customTagline, featuredBadge, layoutMode, tagPositions, cardShape, docLink, customTheme]);

  // Save handler
  const handleSave = async () => {
    if (!user?.email) return;
    setIsSaving(true);
    try {
      await updateProfileMutation({
        email: user.email,
        profileImageUrl: profileImage,
        cardCoverUrl: coverUrl,
        cardBgOpacity: bgOpacity,
        customTagline: customTagline,
        featuredBadge: featuredBadge,
        cardBadgeAlignment: layoutMode,
        cardTagPositions: layoutMode === 'freeform' && Object.keys(tagPositions).length > 0 ? JSON.stringify(tagPositions) : '',
        cardSkin: skin,
        cardLayoutSize: cardShape,
        myPageLink: docLink,
        customTheme: customTheme,
        scriptUrl: SCRIPT_URL,
      });
      toast.success("Profile & Card updated successfully!");
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  };

  const isSkinUnlocked = (s: SkinOption): boolean => {
    if (s.minTier <= tier) return true;
    if (hasFaCert) return true;
    if (totalMilestones >= s.minMilestones) return true;
    return false;
  };

  const isSeniorMaker = Boolean(tier >= 4 || isFab);
  const isActiveMaker = Boolean(tier >= 2 || hasFaCert || totalMilestones >= 2);

  // Selected tag data for Canva Inspector
  const selectedTagData = selectedTag ? (tagPositions[selectedTag] || { x: 30, y: 30, rot: 0 }) : null;
  const selectedTagAngle = selectedTagData?.rot ?? 0;

  // Pretty title for selected element (Access Tag vs Session Stripe Joint)
  const selectedElementTitle = useMemo(() => {
    if (!selectedTag) return '';
    if (selectedTag.startsWith('stripe_')) {
      const rawId = selectedTag.replace('stripe_', '');
      const found = stripes.find(s => s.planId === rawId || String(s.planId) === rawId);
      return found ? `Session Stripe Joint: ${found.title}` : `Session Stripe Joint #${rawId}`;
    }
    return `Access Badge: ${selectedTag}`;
  }, [selectedTag, stripes]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl w-[94vw] max-h-[92vh] flex flex-col p-0 overflow-hidden bg-slate-50 text-slate-900 border border-slate-200/90 rounded-3xl shadow-2xl">
        {/* =========================================================================
            1. FIXED HEADER
            ========================================================================= */}
        <div className="px-6 py-3.5 border-b border-slate-200 bg-white/95 shrink-0 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-600 shadow-xs">
              <Palette className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                Edit Profile & Maker Identity
              </DialogTitle>
              <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                <span className="text-slate-800 font-semibold">{user?.name || 'Maker'}</span>
                <span>·</span>
                <span className="text-emerald-600 font-bold">{totalMilestones} Milestones</span>
                <span className="text-slate-500">({tierName})</span>
              </p>
            </div>
          </div>

          {/* Stripes edit shortcut */}
          {stripes.length > 0 && onOpenStripesCustomizer && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onOpenStripesCustomizer}
              className="text-emerald-700 bg-emerald-50/70 hover:bg-emerald-100/80 text-xs font-bold h-8.5 px-3 rounded-xl border-emerald-200"
            >
              <Award className="w-4 h-4 mr-1.5" /> Edit Stripes
            </Button>
          )}
        </div>

        {/* =========================================================================
            2. FIXED TOP CARD PREVIEW STAGE (Pinned & Identical Proportions to Community Tab)
            ========================================================================= */}
        <div className="px-8 py-5 bg-gradient-to-b from-slate-100 via-slate-100/95 to-slate-200/80 border-b border-slate-200/90 shrink-0 shadow-xs flex flex-col items-center justify-center relative transition-all duration-300 min-h-[310px]">
          {/* Subtle Ambient Radial Glow */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-40">
            <div className="w-80 h-80 rounded-full bg-emerald-500/15 blur-3xl" />
          </div>

          <div className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-2 flex items-center gap-1.5 z-10">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            {layoutMode === 'freeform' ? 'Interactive Canva Design Canvas (1:1 Live Community Preview)' : 'Live Card Preview (1:1 Community Match)'}
          </div>

          {/* Card Preview Container - Exact community card dimensions for 100% fidelity */}
          <div className="w-full max-w-[345px] sm:max-w-[350px] transition-all duration-300 z-10 relative flex justify-center">
            <MakerUserCard
              user={previewUser}
              accessTags={accessTags}
              stripes={stripes}
              isFab={isFab}
              interactiveDrag={activeTab === 'layout' && layoutMode === 'freeform'}
              onTagPositionChange={handleTagPositionChange}
              selectedTag={selectedTag}
              onSelectTag={setSelectedTag}
            />
          </div>

          {/* Drag & Rotate Banner when on Layout Tab in Freeform Mode */}
          {activeTab === 'layout' && layoutMode === 'freeform' && (
            <div className="mt-2.5 flex items-center gap-2 text-xs font-semibold text-emerald-800 bg-emerald-100/90 border border-emerald-300/80 px-3.5 py-1 rounded-xl z-10 shadow-xs">
              <Move className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>Click any badge to select, drag to reposition, or pull the circular top knob to rotate its angle!</span>
            </div>
          )}
        </div>

        {/* =========================================================================
            3. SCROLLABLE TAB CONTENT SECTION (Positioned Below Fixed Preview)
            ========================================================================= */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 scrollbar-thin">
          <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v as any); setSelectedTag(null); }} className="w-full space-y-4">
            {/* Menu Tab Selectors */}
            <TabsList className="grid grid-cols-3 bg-slate-200/90 border border-slate-300 rounded-2xl p-1.5 h-12 shadow-xs">
              <TabsTrigger
                value="profile"
                className="rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 data-[state=active]:bg-white data-[state=active]:text-emerald-700 data-[state=active]:shadow-sm transition-all cursor-pointer text-slate-600"
              >
                <UserIcon className="w-4 h-4" />
                Profile
              </TabsTrigger>
              <TabsTrigger
                value="theme"
                className="rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 data-[state=active]:bg-white data-[state=active]:text-emerald-700 data-[state=active]:shadow-sm transition-all cursor-pointer text-slate-600"
              >
                <Palette className="w-4 h-4" />
                Theme
              </TabsTrigger>
              <TabsTrigger
                value="layout"
                className="rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 data-[state=active]:bg-white data-[state=active]:text-emerald-700 data-[state=active]:shadow-sm transition-all cursor-pointer text-slate-600"
              >
                <Layout className="w-4 h-4" />
                Layout
              </TabsTrigger>
            </TabsList>

            {/* =========================================================================
                TAB 1: PROFILE
                ========================================================================= */}
            <TabsContent value="profile" className="space-y-4 mt-0 bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
              {/* Avatar Photo Link */}
              <div className="space-y-1.5">
                <InfoLabel
                  label="Avatar Photo URL"
                  info="Supports Google Drive share links, Imgur, Dropbox, and direct image links. Google Drive links are automatically converted and optimized."
                  icon={UserIcon}
                />
                <Input
                  placeholder="https://drive.google.com/file/d/... or direct image URL"
                  value={profileImage}
                  onChange={(e) => setProfileImage(e.target.value)}
                  className="bg-white border-slate-300 text-slate-900 text-xs sm:text-sm h-10 rounded-xl focus:border-emerald-500"
                />
              </div>

              {/* Documentation / Portfolio Link */}
              <div className="space-y-1.5 pt-3 border-t border-slate-100">
                <InfoLabel
                  label="Documentation / Portfolio Link"
                  info="Adds an interactive holographic light sweep across your card and activates custom shine colors in the Theme tab."
                  icon={ExternalLink}
                />
                <Input
                  placeholder="https://fabacademy.org/... or https://yourportfolio.dev"
                  value={docLink}
                  onChange={(e) => setDocLink(e.target.value)}
                  className="bg-white border-slate-300 text-slate-900 text-xs sm:text-sm h-10 rounded-xl focus:border-cyan-500"
                />
              </div>

              {/* Maker Focus & Peer Learning Tagline */}
              <div className="space-y-1.5 pt-3 border-t border-slate-100">
                <InfoLabel
                  label="Maker Focus / What I Can Help With"
                  info="Helps fellow community makers find who has expertise in specific tools, software, or techniques."
                  icon={Lightbulb}
                />
                <Input
                  placeholder="e.g. Ask me about 3D printing & Arduino / Mentoring in CAD"
                  maxLength={85}
                  value={customTagline}
                  onChange={(e) => setCustomTagline(e.target.value)}
                  className="bg-white border-slate-300 text-slate-900 text-xs sm:text-sm h-10 rounded-xl focus:border-amber-500"
                />
              </div>
            </TabsContent>

            {/* =========================================================================
                TAB 2: THEME
                ========================================================================= */}
            <TabsContent value="theme" className="space-y-5 mt-0 bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
              {/* Background Theme Finish */}
              <div className="space-y-2">
                <InfoLabel
                  label="Background Theme Finish"
                  info="Select a skeuomorphic tactile card finish unlocked through your milestones."
                  icon={Palette}
                  badge={<span className="text-[11px] font-normal text-slate-500">{tierName} unlocked</span>}
                />
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 max-h-[190px] overflow-y-auto pr-1 scrollbar-thin">
                  {MAKER_SKINS.map((s) => {
                    const unlocked = isSkinUnlocked(s);
                    const isSelected = skin === s.id;

                    return (
                      <button
                        key={s.id}
                        type="button"
                        disabled={!unlocked}
                        onClick={() => setSkin(s.id)}
                        className={`
                          relative text-left p-2.5 rounded-xl border transition-all select-none
                          ${isSelected ? 'border-emerald-500 bg-emerald-50/60 ring-2 ring-emerald-500/30' : 'border-slate-200 bg-slate-50/80 hover:border-slate-300'}
                          ${!unlocked ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer hover:scale-[1.02]'}
                        `}
                      >
                        <div
                          className="w-full h-6 rounded-lg border border-black/10 mb-1.5 flex items-center justify-end pr-1.5"
                          style={{ background: s.previewBg }}
                        >
                          {isSelected && <Check className="w-3 h-3 text-white drop-shadow" />}
                          {!unlocked && <Lock className="w-3 h-3 text-slate-400" />}
                        </div>
                        <p className="font-bold text-[11px] text-slate-900 truncate">{s.name}</p>
                        <p className="text-[9px] text-slate-500 truncate">
                          {s.minMilestones === 0 ? 'Universal' : `${s.minMilestones}+ Milestones`}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Custom Background Image Link */}
              <div className="space-y-2 pt-3 border-t border-slate-100">
                <InfoLabel
                  label="Background Image Link"
                  info="Optionally use a custom workshop image background instead of or blended with your card theme."
                  icon={ImageIcon}
                />
                <Input
                  placeholder="https://... (Custom background image link)"
                  value={coverUrl}
                  onChange={(e) => setCoverUrl(e.target.value)}
                  className="bg-white border-slate-300 text-slate-900 text-xs sm:text-sm h-10 rounded-xl focus:border-cyan-500"
                />

                {/* Presets */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[11px] text-slate-500 font-medium mr-1">Presets:</span>
                  {PRESET_COVERS.map((preset) => {
                    const active = coverUrl === preset.url;
                    return (
                      <button
                        key={preset.name}
                        type="button"
                        onClick={() => setCoverUrl(preset.url)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                          active ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs' : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        {preset.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Backdrop / Theme Transparency Slider */}
              <div className="space-y-2 pt-3 border-t border-slate-100">
                <InfoLabel
                  label="Card Background / Image Transparency"
                  info="Adjust the opacity of the background cover image or avatar backdrop."
                  icon={Palette}
                  badge={<span className="text-xs font-mono font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">{bgOpacity}%</span>}
                />
                <div className="px-1 py-1">
                  <Slider
                    min={10}
                    max={100}
                    step={5}
                    value={[bgOpacity]}
                    onValueChange={(val) => setBgOpacity(val[0])}
                    className="cursor-pointer"
                  />
                </div>
              </div>

              {/* Documentation Shine & Border Color */}
              <div className="space-y-2 pt-3 border-t border-slate-100">
                <InfoLabel
                  label="Card Theme & Documentation Shine Color"
                  info="Controls the neon border and holographic sweep animation color when a documentation link is provided."
                  icon={Sparkles}
                />
                <ThemeColorPicker
                  value={customTheme}
                  onChange={setCustomTheme}
                  hasDocLink={Boolean(docLink && docLink.trim() !== '')}
                />
              </div>
            </TabsContent>

            {/* =========================================================================
                TAB 3: LAYOUT (Mode, Shape, Spotlight Pin & Canva Inspector)
                ========================================================================= */}
            <TabsContent value="layout" className="space-y-5 mt-0 bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
              {/* Layout Mode Selection: Aligned vs Freeform */}
              <div className="space-y-2.5">
                <InfoLabel
                  label="Badge Layout Mode"
                  info="Aligned keeps all badges neatly placed inside the bottom workbench area. Freeform unlocks Canva drag-and-drop placement across the entire card area with kinetic stretchable session chains."
                  icon={Layout}
                />
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setLayoutMode('aligned');
                      setTagPositions({});
                      setSelectedTag(null);
                    }}
                    className={`
                      p-3.5 rounded-2xl border text-left transition-all cursor-pointer select-none
                      ${layoutMode === 'aligned' ? 'border-emerald-500 bg-emerald-50 text-emerald-950 ring-2 ring-emerald-500/20 shadow-xs' : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300'}
                    `}
                  >
                    <div className="flex items-center gap-2 font-bold text-xs sm:text-sm">
                      <Layers className="w-4 h-4 text-emerald-600" />
                      Aligned (Default)
                    </div>
                    <p className="text-[10.5px] text-slate-500 mt-1">All tags neatly organized inside the tag area</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setLayoutMode('freeform')}
                    className={`
                      p-3.5 rounded-2xl border text-left transition-all cursor-pointer select-none
                      ${layoutMode === 'freeform' ? 'border-emerald-500 bg-emerald-50 text-emerald-950 ring-2 ring-emerald-500/20 shadow-xs' : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300'}
                    `}
                  >
                    <div className="flex items-center gap-2 font-bold text-xs sm:text-sm">
                      <Move className="w-4 h-4 text-emerald-600" />
                      Freeform Canvas (Drag & Drop)
                    </div>
                    <p className="text-[10.5px] text-slate-500 mt-1">Freely drag, rotate, and chain badges anywhere</p>
                  </button>
                </div>
              </div>

              {/* Card Shape Selection */}
              <div className="space-y-2.5 pt-3 border-t border-slate-100">
                <InfoLabel
                  label="Card Silhouette & Shape"
                  info="Customize the outline shape of your maker identity card."
                  icon={Shield}
                />
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                  {[
                    { id: 'standard', name: 'Classic Rounded', icon: Square, desc: 'Rounded ID' },
                    { id: 'squircle', name: 'Smooth Squircle', icon: Square, desc: 'Ultra-curved' },
                    { id: 'circle', name: 'Circular Medallion', icon: Circle, desc: 'Token badge' },
                    { id: 'chamfer', name: 'Cyber Chamfer', icon: Hexagon, desc: 'Beveled tech' },
                    { id: 'arch', name: 'Cathedral Arch', icon: Shield, desc: 'Crest arch' },
                  ].map((shape) => {
                    const isSelected = cardShape === shape.id;
                    const Icon = shape.icon;
                    return (
                      <button
                        key={shape.id}
                        type="button"
                        onClick={() => setCardShape(shape.id)}
                        className={`
                          p-2.5 rounded-xl border text-left transition-all cursor-pointer select-none
                          ${isSelected ? 'border-emerald-500 bg-emerald-50/70 text-emerald-950 ring-2 ring-emerald-500/25 shadow-xs' : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300'}
                        `}
                      >
                        <div className="flex items-center gap-1.5 font-bold text-xs">
                          <Icon className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="truncate">{shape.name}</span>
                        </div>
                        <p className="text-[9.5px] text-slate-500 mt-0.5 truncate">{shape.desc}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Highlight Expertise Tag (Spotlight Pin) */}
              {accessTags.length > 0 && (
                <div className="space-y-2.5 pt-3 border-t border-slate-100">
                  <InfoLabel
                    label="Highlight Expertise Tag (Focus Badge)"
                    info="Highlights your primary skill with an illuminated golden halo and glowing FOCUS crest so fellow makers can instantly identify your strengths."
                    icon={Star}
                  />
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setFeaturedBadge('')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        !featuredBadge ? 'border-emerald-500 bg-emerald-50 text-emerald-700 ring-1 ring-emerald-500/30' : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      None
                    </button>
                    {accessTags.map((tag: string) => {
                      const isPin = featuredBadge === tag;
                      return (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => setFeaturedBadge(tag)}
                          className={`
                            px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5
                            ${isPin ? 'border-amber-400 bg-gradient-to-r from-amber-50 to-yellow-50 text-amber-900 ring-2 ring-amber-400/50 shadow-xs' : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300'}
                          `}
                        >
                          <Star className={`w-3.5 h-3.5 ${isPin ? 'fill-amber-400 text-amber-500' : 'text-slate-400'}`} />
                          <span>{tag}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* SELECTED ELEMENT CANVA INSPECTOR (Active when a tag or session joint is clicked in Freeform mode) */}
              {layoutMode === 'freeform' && selectedTag && (
                <div className="p-4 rounded-2xl bg-emerald-50/70 border-2 border-emerald-300/80 space-y-3.5 shadow-xs animate-in fade-in duration-200">
                  <div className="flex items-center justify-between pb-2 border-b border-emerald-200/80">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                        <Compass className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-extrabold text-emerald-950 uppercase tracking-wide">
                          Selected: {selectedElementTitle}
                        </p>
                        <p className="text-[10px] text-emerald-700">
                          X: {selectedTagData?.x ?? 0}% · Y: {selectedTagData?.y ?? 0}% · Angle: {selectedTagAngle}°
                        </p>
                      </div>
                    </div>

                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedTag(null)}
                      className="text-xs text-emerald-700 hover:text-emerald-900 hover:bg-emerald-100/80 h-7 px-2 rounded-lg"
                    >
                      Deselect
                    </Button>
                  </div>

                  {/* Angle / Rotation Controls */}
                  <div className="space-y-2">
                    <InfoLabel
                      label="Element Angle & Rotation Control"
                      info="Rotate individual badges and session joints to create custom organic layouts."
                      icon={RotateCw}
                      badge={
                        <span className="text-xs font-mono font-bold text-emerald-800 bg-white px-2 py-0.5 rounded-md border border-emerald-300 shadow-2xs">
                          {selectedTagAngle > 0 ? `+${selectedTagAngle}°` : `${selectedTagAngle}°`}
                        </span>
                      }
                    />

                    {/* Angle Slider */}
                    <div className="px-1 py-1">
                      <Slider
                        min={-180}
                        max={180}
                        step={1}
                        value={[selectedTagAngle]}
                        onValueChange={(val) => handleSelectedTagAngleChange(val[0])}
                        className="cursor-pointer"
                      />
                    </div>

                    {/* Quick Angle Presets */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <span className="text-[10px] text-emerald-800 font-semibold mr-1">Angle Presets:</span>
                      {[
                        { label: '-45°', val: -45 },
                        { label: '-15°', val: -15 },
                        { label: '-5°', val: -5 },
                        { label: '0° Level', val: 0 },
                        { label: '+5°', val: 5 },
                        { label: '+15°', val: 15 },
                        { label: '+45°', val: 45 },
                        { label: '+90°', val: 90 },
                      ].map((preset) => (
                        <button
                          key={preset.label}
                          type="button"
                          onClick={() => handleSelectedTagAngleChange(preset.val)}
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold border transition-all cursor-pointer ${
                            selectedTagAngle === preset.val
                              ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                              : 'bg-white text-emerald-900 border-emerald-200 hover:border-emerald-400'
                          }`}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Freeform Canvas Position Reset Button */}
              {layoutMode === 'freeform' && Object.keys(tagPositions).length > 0 && (
                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <span className="text-[11px] text-slate-500">
                    {Object.keys(tagPositions).length} custom tag positions saved
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleResetTagPositions}
                    className="text-xs text-slate-600 hover:text-slate-900 bg-white h-7.5 px-3 rounded-xl border-slate-300"
                  >
                    <RotateCcw className="w-3.5 h-3.5 mr-1" /> Reset All Tag Positions
                  </Button>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* =========================================================================
            4. FIXED FOOTER
            ========================================================================= */}
        <div className="px-6 py-3.5 bg-slate-100 border-t border-slate-200 flex items-center justify-end gap-2 shrink-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="text-slate-700 hover:text-slate-900 text-xs sm:text-sm h-9 px-4 rounded-xl border-slate-300"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm h-9 px-5 rounded-xl shadow-xs cursor-pointer transition-all hover:scale-[1.02]"
          >
            {isSaving ? "Saving Card..." : "Save Profile & Card"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
