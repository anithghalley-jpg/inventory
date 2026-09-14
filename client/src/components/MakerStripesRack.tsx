import React, { useState } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Edit3, Award, Star, Sparkles, Smile } from "lucide-react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { toast } from "sonner";

export interface MakerStripe {
  planId: string;
  rawPlanId?: string;
  title: string;
  edition?: number;
  char?: string;
  sessionTag?: string;
  customColor?: string;
  tags?: string[];
  approvedAt?: number;
}

const STRIPE_GRADIENTS = [
  { id: "emerald", gradient: "bg-gradient-to-b from-emerald-500 via-teal-600 to-emerald-700", text: "text-white [text-shadow:_0_1px_1px_rgba(0,0,0,0.9)]", border: "border-emerald-400/80" },
  { id: "ruby", gradient: "bg-gradient-to-b from-rose-500 via-red-600 to-rose-700", text: "text-white [text-shadow:_0_1px_1px_rgba(0,0,0,0.9)]", border: "border-rose-400/80" },
  { id: "sapphire", gradient: "bg-gradient-to-b from-blue-500 via-indigo-600 to-blue-700", text: "text-white [text-shadow:_0_1px_1px_rgba(0,0,0,0.9)]", border: "border-blue-400/80" },
  { id: "amber", gradient: "bg-gradient-to-b from-amber-300 via-amber-400 to-yellow-500", text: "text-slate-950 font-black", border: "border-amber-300" },
  { id: "violet", gradient: "bg-gradient-to-b from-violet-500 via-purple-600 to-indigo-700", text: "text-white [text-shadow:_0_1px_1px_rgba(0,0,0,0.9)]", border: "border-violet-400/80" },
  { id: "cyan", gradient: "bg-gradient-to-b from-cyan-300 via-teal-400 to-cyan-500", text: "text-slate-950 font-black", border: "border-cyan-300" },
  { id: "orange", gradient: "bg-gradient-to-b from-orange-500 via-amber-600 to-orange-700", text: "text-white [text-shadow:_0_1px_1px_rgba(0,0,0,0.9)]", border: "border-orange-400/80" },
  { id: "fuchsia", gradient: "bg-gradient-to-b from-fuchsia-500 via-pink-600 to-rose-700", text: "text-white [text-shadow:_0_1px_1px_rgba(0,0,0,0.9)]", border: "border-pink-400/80" },
  { id: "lime", gradient: "bg-gradient-to-b from-lime-300 via-emerald-400 to-lime-500", text: "text-slate-950 font-black", border: "border-lime-300" },
  { id: "gold", gradient: "bg-gradient-to-b from-yellow-300 via-amber-400 to-yellow-500", text: "text-slate-950 font-black", border: "border-yellow-300" },
];

const QUICK_EMOJIS = ["★", "⚡", "🔥", "🚀", "✨", "⭐", "🎯", "💡", "🛠️", "🎨", "💻", "🤖", "👑", "🏆", "💎", "🦾"];

export function getStripeStyle(stripe: MakerStripe, index: number) {
  if (stripe.customColor) {
    const matched = STRIPE_GRADIENTS.find(g => g.id === stripe.customColor);
    if (matched) return matched;
  }
  const key = `${stripe.planId}_${stripe.title}`;
  const hash = Math.abs(key.split("").reduce((acc, char) => acc + char.charCodeAt(0), index));
  return STRIPE_GRADIENTS[hash % STRIPE_GRADIENTS.length];
}

interface MakerStripesRackProps {
  stripes: MakerStripe[];
  size?: "sm" | "md" | "lg";
  editable?: boolean;
  userEmail?: string;
  userName?: string;
  className?: string;
}

export default function MakerStripesRack({
  stripes,
  size = "md",
  editable = false,
  userEmail,
  userName,
  className = "",
}: MakerStripesRackProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStripes, setEditingStripes] = useState<MakerStripe[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const updateStripeCustomizations = useMutation(api.users.updateStripeCustomizations);

  if (!stripes || stripes.length === 0) return null;

  const handleOpenModal = () => {
    if (!editable) return;
    setEditingStripes(
      stripes.map(s => ({
        ...s,
        char: s.char || s.title.charAt(0).toUpperCase(),
      }))
    );
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!userEmail) return;
    setIsSaving(true);
    try {
      await updateStripeCustomizations({
        email: userEmail,
        stripes: editingStripes.map(s => ({
          planId: s.planId,
          char: (s.char || s.title.charAt(0) || "★").trim(),
          color: s.customColor,
        })),
      });
      toast.success("Maker stripes updated!");
      setIsModalOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to update stripes");
    } finally {
      setIsSaving(false);
    }
  };

  // Ultra-crisp dimension classes
  const sizeClasses = {
    sm: "w-4 h-6 text-[10px] rounded-[3px] border",
    md: "w-6 sm:w-6.5 h-8 sm:h-8.5 text-xs sm:text-[12px] rounded-[4px] border",
    lg: "w-7 sm:w-8 h-10 text-sm sm:text-base rounded-md border",
  }[size];

  return (
    <>
      <TooltipProvider delayDuration={100}>
        <div
          className={`relative inline-flex items-center p-1 rounded-xl bg-slate-950/95 border border-slate-700/80 shadow-[0_2px_8px_rgba(0,0,0,0.3)] ${
            editable ? "cursor-pointer hover:border-emerald-500 transition-all hover:scale-[1.02]" : ""
          } ${className}`}
          onClick={editable ? handleOpenModal : undefined}
          title={editable ? "Click to edit letters or emojis" : undefined}
        >
          {/* Continuous Braided Thread Filament Channel */}
          <div className="absolute inset-x-2.5 top-1/2 -translate-y-1/2 h-[3px] bg-gradient-to-r from-emerald-500 via-amber-400 to-emerald-500 opacity-70 rounded-full shadow-[0_0_4px_rgba(16,185,129,0.5)] pointer-events-none" />
          <div className="absolute inset-x-2.5 top-1/2 -translate-y-1/2 h-[1px] bg-white/70 pointer-events-none" />

          {/* Left Terminal Anchor Rivet */}
          <div className="relative z-10 mr-1.5 flex items-center justify-center pointer-events-none select-none">
            <span className="w-2 h-2 rounded-full bg-gradient-to-b from-slate-200 to-slate-400 border border-slate-600 shadow-[0_1px_2px_rgba(0,0,0,0.5)] flex items-center justify-center">
              <span className="w-0.5 h-0.5 rounded-full bg-slate-900" />
            </span>
          </div>

          {/* Threaded Session Chiclet Nodes */}
          <div className="relative z-10 inline-flex items-center gap-[4px]">
            {stripes.map((stripe, idx) => {
              const style = getStripeStyle(stripe, idx);
              const displayChar = stripe.char || stripe.title.charAt(0).toUpperCase();

              return (
                <React.Fragment key={`${stripe.planId}_${idx}`}>
                  {/* Intermediate Braided Thread Link Segment */}
                  {idx > 0 && (
                    <div className="w-2 h-[2.5px] bg-gradient-to-r from-emerald-400 via-yellow-300 to-amber-400 rounded-full shadow-[0_0_5px_rgba(52,211,153,0.8)] pointer-events-none -mx-[1px] relative flex items-center justify-center">
                      <span className="w-full h-[0.75px] bg-white/90" />
                    </div>
                  )}

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div
                        className={`relative flex items-center justify-center font-sans font-black select-none ${style.border} ${style.gradient} ${style.text} ${sizeClasses} shadow-md transition-all hover:-translate-y-0.5 hover:z-20 hover:shadow-[0_0_10px_rgba(255,255,255,0.5)]`}
                      >
                        {/* Subtle top bevel */}
                        <div className="absolute top-0 left-0 right-0 h-[2px] bg-white/40 pointer-events-none rounded-t-[2px]"></div>

                        {/* Thread Eyelet Left */}
                        <span className="absolute -left-[1.5px] top-1/2 -translate-y-1/2 w-[2px] h-[3.5px] bg-slate-200 border border-slate-700 rounded-r-[1px] pointer-events-none" />

                        {/* Sharp centered character */}
                        <span className="relative z-10 leading-none tracking-normal antialiased">
                          {displayChar}
                        </span>

                        {/* Thread Eyelet Right */}
                        <span className="absolute -right-[1.5px] top-1/2 -translate-y-1/2 w-[2px] h-[3.5px] bg-slate-200 border border-slate-700 rounded-l-[1px] pointer-events-none" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="bg-slate-900 text-white border-slate-700 p-2.5 max-w-xs shadow-xl rounded-xl z-50">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-emerald-400 text-[10px] font-bold uppercase tracking-wider">
                          <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                          <span>Session Chain Node #{idx + 1} of {stripes.length}</span>
                        </div>
                        <p className="font-bold text-xs text-white leading-tight">{stripe.title}</p>
                        {stripe.edition && (
                          <p className="text-[10px] text-slate-400">Edition {stripe.edition}</p>
                        )}
                        {editable && (
                          <p className="text-[9px] text-emerald-300 font-medium pt-1 border-t border-slate-800 flex items-center gap-1">
                            <Edit3 className="w-2.5 h-2.5" /> Click to customize
                          </p>
                        )}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </React.Fragment>
              );
            })}
          </div>

          {/* Right Terminal Anchor Rivet */}
          <div className="relative z-10 ml-1.5 flex items-center justify-center pointer-events-none select-none">
            <span className="w-2 h-2 rounded-full bg-gradient-to-b from-slate-200 to-slate-400 border border-slate-600 shadow-[0_1px_2px_rgba(0,0,0,0.5)] flex items-center justify-center">
              <span className="w-0.5 h-0.5 rounded-full bg-slate-900" />
            </span>
          </div>
        </div>
      </TooltipProvider>

      {/* Stripe Customization Modal */}
      {editable && (
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="max-w-md bg-slate-950 text-white border border-slate-800 rounded-2xl p-5 shadow-2xl">
            <DialogHeader>
              <DialogTitle className="text-base font-bold flex items-center justify-between text-white">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    <Award className="w-4 h-4" />
                  </div>
                  <span>Customize Session Chain</span>
                </div>
                <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                  {stripes.length} chain {stripes.length === 1 ? 'node' : 'nodes'}
                </span>
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-3 py-1">
              {/* Live Preview Rack with Thread Links */}
              <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800 flex flex-col items-center justify-center space-y-1.5">
                <div className="relative inline-flex items-center p-1 rounded-xl bg-slate-950 border border-slate-800 shadow-inner">
                  {/* Continuous Thread in Preview */}
                  <div className="absolute inset-x-2 top-1/2 -translate-y-1/2 h-[2.5px] bg-gradient-to-r from-emerald-500 via-amber-400 to-emerald-500 opacity-70 pointer-events-none" />
                  
                  {/* Left Rivet */}
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-300 border border-slate-600 mr-1 shrink-0 relative z-10" />

                  <div className="relative z-10 flex items-center gap-1">
                    {editingStripes.map((s, idx) => {
                      const style = getStripeStyle(s, idx);
                      return (
                        <React.Fragment key={idx}>
                          {idx > 0 && (
                            <span className="w-1.5 h-[2px] bg-gradient-to-r from-emerald-400 to-amber-300 rounded-full shrink-0" />
                          )}
                          <div
                            className={`w-7 h-9 rounded-[4px] flex items-center justify-center font-sans font-black text-sm select-none border ${style.border} ${style.gradient} ${style.text} shadow-xs relative`}
                          >
                            <div className="absolute top-0 left-0 right-0 h-[2px] bg-white/40 pointer-events-none rounded-t-[3px]"></div>
                            <span className="relative z-10 leading-none">
                              {s.char || s.title.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        </React.Fragment>
                      );
                    })}
                  </div>

                  {/* Right Rivet */}
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-300 border border-slate-600 ml-1 shrink-0 relative z-10" />
                </div>
                <span className="text-xs font-mono font-bold text-emerald-400 tracking-wider">
                  "{editingStripes.map(s => s.char || s.title.charAt(0).toUpperCase()).join("")}"
                </span>
              </div>

              {/* Input Slots */}
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 scrollbar-thin">
                {editingStripes.map((stripe, idx) => {
                  const style = getStripeStyle(stripe, idx);
                  const initialChar = stripe.title.charAt(0).toUpperCase();

                  return (
                    <div
                      key={stripe.planId || idx}
                      className="p-2.5 rounded-xl bg-slate-900/70 border border-slate-800/80 space-y-2"
                    >
                      <div className="flex items-center gap-2.5">
                        {/* Stripe Visual preview */}
                        <div
                          className={`w-6 h-8 rounded-[4px] flex items-center justify-center font-sans font-black text-xs shrink-0 select-none border ${style.border} ${style.gradient} ${style.text}`}
                        >
                          <span className="relative z-10">{stripe.char || initialChar}</span>
                        </div>

                        {/* Session Title */}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-white truncate">{stripe.title}</p>
                          <p className="text-[10px] text-slate-400">Stripe #{idx + 1}</p>
                        </div>

                        {/* Character / Emoji Input */}
                        <div className="w-16 shrink-0">
                          <Input
                            type="text"
                            maxLength={6}
                            value={stripe.char ?? ""}
                            placeholder={initialChar}
                            onChange={(e) => {
                              const val = e.target.value;
                              setEditingStripes(prev =>
                                prev.map((item, i) => (i === idx ? { ...item, char: val } : item))
                              );
                            }}
                            className="h-8 text-center font-black text-xs bg-slate-950 border-slate-700 text-emerald-400 focus:border-emerald-500 rounded-lg p-0"
                          />
                        </div>
                      </div>

                      {/* Quick Emoji / Symbol Toolbar */}
                      <div className="flex items-center gap-1 overflow-x-auto pb-0.5 pt-0.5 scrollbar-hide">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingStripes(prev =>
                              prev.map((item, i) => (i === idx ? { ...item, char: initialChar } : item))
                            );
                          }}
                          className="px-1.5 py-0.5 text-[10px] font-mono font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 cursor-pointer shrink-0 transition-colors"
                          title={`Reset to initial '${initialChar}'`}
                        >
                          {initialChar}
                        </button>
                        {QUICK_EMOJIS.map((emoji) => (
                          <button
                            key={emoji}
                            type="button"
                            onClick={() => {
                              setEditingStripes(prev =>
                                prev.map((item, i) => (i === idx ? { ...item, char: emoji } : item))
                              );
                            }}
                            className="w-6 h-6 flex items-center justify-center text-xs bg-slate-950 hover:bg-slate-800 text-white rounded border border-slate-800 hover:border-slate-600 cursor-pointer shrink-0 transition-all active:scale-95"
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <DialogFooter className="flex items-center gap-2 justify-end pt-2 border-t border-slate-800">
              <Button
                variant="ghost"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white rounded-xl text-xs h-8"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={isSaving}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs px-4 h-8 shadow-md cursor-pointer"
              >
                {isSaving ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
