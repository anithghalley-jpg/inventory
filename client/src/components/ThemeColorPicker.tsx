import React, { useMemo } from 'react';
import { Pipette, Check, Sparkles, RotateCcw, Palette, Lock, Globe } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export interface ThemePreset {
  id: string;
  name: string;
  color: string;
  gradient: string;
  description?: string;
}

export const SAMPLE_THEMES: ThemePreset[] = [
  { id: 'emerald', name: 'Cyber Emerald', color: '#10b981', gradient: 'linear-gradient(135deg, #34d399, #059669)' },
  { id: 'cyan', name: 'Electric Cyan', color: '#06b6d4', gradient: 'linear-gradient(135deg, #22d3ee, #0891b2)' },
  { id: 'violet', name: 'Arcane Violet', color: '#8b5cf6', gradient: 'linear-gradient(135deg, #a78bfa, #7c3aed)' },
  { id: 'fuchsia', name: 'Hyper Fuchsia', color: '#d946ef', gradient: 'linear-gradient(135deg, #f472b6, #c026d3)' },
  { id: 'amber', name: 'Solar Gold', color: '#f59e0b', gradient: 'linear-gradient(135deg, #fbbf24, #d97706)' },
  { id: 'ruby', name: 'Laser Ruby', color: '#f43f5e', gradient: 'linear-gradient(135deg, #fb7185, #e11d48)' },
  { id: 'blue', name: 'Deep Sapphire', color: '#3b82f6', gradient: 'linear-gradient(135deg, #60a5fa, #2563eb)' },
  { id: 'lime', name: 'Acid Lime', color: '#84cc16', gradient: 'linear-gradient(135deg, #a3e635, #65a30d)' },
  { id: 'indigo', name: 'Cosmic Indigo', color: '#6366f1', gradient: 'linear-gradient(135deg, #818cf8, #4f46e5)' },
  { id: 'copper', name: 'Warm Copper', color: '#d97706', gradient: 'linear-gradient(135deg, #f59e0b, #b45309)' },
  { id: 'slate', name: 'Industrial Slate', color: '#64748b', gradient: 'linear-gradient(135deg, #94a3b8, #475569)' },
  { id: 'pink', name: 'Holo Pink', color: '#ec4899', gradient: 'linear-gradient(135deg, #f472b6, #db2777)' },
];

/**
 * Universal Theme Color Resolver
 * Handles Preset IDs ('violet', 'emerald'), Names ('Arcane Violet'), Hex ('#8b5cf6'), or CSS colors.
 */
export function resolveThemeColor(theme?: string | null): string | null {
  if (!theme || typeof theme !== 'string') return null;
  const clean = theme.trim();
  if (!clean) return null;
  const match = SAMPLE_THEMES.find(
    (p) =>
      p.id.toLowerCase() === clean.toLowerCase() ||
      p.name.toLowerCase() === clean.toLowerCase() ||
      p.color.toLowerCase() === clean.toLowerCase()
  );
  if (match) return match.color;
  if (clean.startsWith('#') || clean.startsWith('rgb') || clean.startsWith('hsl')) {
    return clean;
  }
  if (/^[0-9A-Fa-f]{3,8}$/.test(clean)) {
    return `#${clean}`;
  }
  return clean;
}

interface ThemeColorPickerProps {
  value?: string;
  onChange: (color: string) => void;
  hasDocLink?: boolean;
  className?: string;
}

export default function ThemeColorPicker({
  value = '',
  onChange,
  hasDocLink = true,
  className = '',
}: ThemeColorPickerProps) {
  // Normalize color value (default fallback)
  const resolved = resolveThemeColor(value);
  const currentColor = resolved || '#06b6d4';
  const isHex = currentColor.startsWith('#');
  const hexInputVal = isHex ? currentColor : '#06b6d4';

  // Find if matched with a preset
  const activePreset = useMemo(() => {
    return SAMPLE_THEMES.find(
      (p) =>
        p.color.toLowerCase() === currentColor.toLowerCase() ||
        p.id.toLowerCase() === (value || '').toLowerCase() ||
        p.name.toLowerCase() === (value || '').toLowerCase()
    );
  }, [currentColor, value]);

  const handleHexChange = (val: string) => {
    let clean = val.trim();
    if (clean && !clean.startsWith('#') && /^[0-9A-Fa-f]{3,6}$/.test(clean)) {
      clean = `#${clean}`;
    }
    onChange(clean);
  };

  // If user has NOT entered their documentation site link, show locked gate banner
  if (!hasDocLink) {
    return (
      <div className={`space-y-2 select-none ${className}`}>
        <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
          <Palette className="w-3.5 h-3.5 text-slate-400" />
          Custom Card Accent & Holographic Theme
        </Label>
        <div className="p-3.5 rounded-2xl bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/30 flex items-start gap-3">
          <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
            <Lock className="w-4 h-4" />
          </div>
          <div className="space-y-1 min-w-0">
            <h4 className="text-xs font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
              Documentation Link Required
            </h4>
            <p className="text-[11px] text-amber-700 dark:text-amber-300/90 leading-relaxed">
              Enter your <strong>Documentation Site / Portfolio Link</strong> above to unlock the Color Wheel, sample themes, and holographic shine effects on your community card!
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* 1. Header & Color Wheel + Hex Input */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <Palette className="w-3.5 h-3.5 text-cyan-500" />
            Custom Card Accent & Holographic Theme
          </Label>
          {value && (
            <button
              type="button"
              onClick={() => onChange('')}
              className="text-[10px] font-semibold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex items-center gap-1 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" /> Reset
            </button>
          )}
        </div>

        {/* Color Wheel Controller Bar */}
        <div className="flex items-center gap-2.5 p-2 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-inner">
          {/* Circular Rainbow Wheel Trigger */}
          <div className="relative group shrink-0">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center cursor-pointer shadow-md transition-transform group-hover:scale-105 active:scale-95 border-2 border-white dark:border-slate-700 overflow-hidden relative"
              style={{
                background:
                  'conic-gradient(from 180deg at 50% 50%, #ff0000 0deg, #ffa500 45deg, #ffff00 90deg, #008000 135deg, #00ffff 180deg, #0000ff 225deg, #800080 270deg, #ff00ff 315deg, #ff0000 360deg)',
              }}
              title="Click to open full color wheel"
            >
              {/* Inner Color Ring */}
              <div
                className="w-5 h-5 rounded-full border-2 border-white shadow-sm flex items-center justify-center transition-all pointer-events-none"
                style={{ backgroundColor: currentColor }}
              >
                <Pipette className="w-2.5 h-2.5 text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]" />
              </div>

              {/* Hidden Native Full Spectrum Color Wheel Input */}
              <input
                type="color"
                value={hexInputVal}
                onChange={(e) => onChange(e.target.value)}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                title="Choose custom color from wheel"
              />
            </div>
          </div>

          {/* Hex Input */}
          <div className="flex-1 relative">
            <Input
              type="text"
              placeholder="#06b6d4 or color name"
              value={currentColor}
              onChange={(e) => handleHexChange(e.target.value)}
              className="text-xs h-9 font-mono font-bold bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 pl-7 uppercase"
            />
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 font-mono text-xs text-slate-400 font-bold">
              #
            </span>
          </div>

          {/* Live Color Swatch Indicator */}
          <div
            className="w-9 h-9 rounded-xl border border-slate-300 dark:border-slate-600 shadow-xs shrink-0 flex items-center justify-center transition-all"
            style={{ backgroundColor: currentColor }}
            title={`Current Theme: ${currentColor}`}
          >
            <Sparkles className="w-3.5 h-3.5 text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]" />
          </div>
        </div>
      </div>

      {/* 2. Curated Sample Themes Grid */}
      <div className="space-y-1.5">
        <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
          Suggested Sample Themes
        </span>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1.5 max-h-44 overflow-y-auto pr-0.5 scrollbar-thin">
          {SAMPLE_THEMES.map((theme) => {
            const isSelected =
              activePreset?.id === theme.id ||
              currentColor.toLowerCase() === theme.color.toLowerCase();

            return (
              <button
                key={theme.id}
                type="button"
                onClick={() => onChange(theme.color)}
                className={`
                  relative flex items-center gap-2 p-1.5 rounded-xl text-left transition-all select-none cursor-pointer
                  border text-xs font-semibold
                  ${
                    isSelected
                      ? 'border-slate-900 dark:border-white bg-slate-900/5 dark:bg-white/10 ring-2 ring-slate-900/20 dark:ring-white/20 scale-[1.02]'
                      : 'border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-850'
                  }
                `}
              >
                {/* Gradient Swatch Pill */}
                <div
                  className="w-5 h-5 rounded-lg shrink-0 shadow-xs flex items-center justify-center border border-white/50"
                  style={{ background: theme.gradient }}
                >
                  {isSelected && <Check className="w-3 h-3 text-white drop-shadow-md" />}
                </div>

                <span className="truncate text-[11px] font-bold text-slate-800 dark:text-slate-200">
                  {theme.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Live Card Shine & Aura Preview */}
      <div
        className="relative overflow-hidden p-3 rounded-2xl bg-white dark:bg-slate-900 border-2 transition-all duration-300 flex items-center justify-between gap-3 shadow-md select-none"
        style={{
          borderColor: currentColor,
          boxShadow: `0 0 16px ${currentColor}44, inset 0 1px 2px rgba(255,255,255,0.8)`,
        }}
      >
        {/* Holographic sweep live shimmer */}
        <div
          className="absolute inset-0 pointer-events-none overflow-hidden"
          style={{
            background: `linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.6) 45%, ${currentColor}88 50%, rgba(255,255,255,0.6) 55%, transparent 100%)`,
            opacity: 0.35,
          }}
        />

        <div className="flex items-center gap-2.5 min-w-0 relative z-10">
          {/* Avatar Aura Live Swatch */}
          <div className="relative shrink-0">
            <div
              className="absolute -inset-1.5 rounded-full blur-sm opacity-90 transition-all duration-300"
              style={{
                background: `radial-gradient(circle, ${currentColor} 0%, transparent 70%)`,
              }}
            />
            <div
              className="relative w-8 h-8 rounded-xl bg-white dark:bg-slate-900 border-2 shadow-sm flex items-center justify-center text-[10px] font-black"
              style={{ borderColor: currentColor, color: currentColor }}
            >
              FAB
            </div>
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="text-xs font-black text-slate-900 dark:text-white truncate">
                {activePreset ? activePreset.name : 'Custom Glow'}
              </p>
              <Sparkles className="w-3 h-3 animate-pulse" style={{ color: currentColor }} />
            </div>
            <p className="text-[10px] font-mono text-slate-500 dark:text-slate-400 truncate">
              Shine & Aura: {currentColor}
            </p>
          </div>
        </div>

        <div
          className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider text-white shadow-xs shrink-0 relative z-10"
          style={{ backgroundColor: currentColor }}
        >
          Active Shine
        </div>
      </div>
    </div>
  );
}
