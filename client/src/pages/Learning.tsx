import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { motion } from "framer-motion";

import { Menu, X, LayoutGrid, List, ArrowRight, CheckCircle2, Users, ChevronDown, ChevronUp, Clock, UserCheck, UserX, Star, History, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";


import { toast } from "sonner";

import { getOptimizedImageUrl } from "@/lib/utils";

function getEmbedUrl(url: string) {
  if (!url) return '';
  let embedUrl = url;
  if (url.includes("youtube.com/watch?v=")) {
    const videoId = url.split("v=")[1].split("&")[0];
    embedUrl = `https://www.youtube.com/embed/${videoId}`;
  } else if (url.includes("youtu.be/")) {
    const videoId = url.split("youtu.be/")[1].split("?")[0];
    embedUrl = `https://www.youtube.com/embed/${videoId}`;
  } else if (url.includes("vimeo.com/")) {
    const videoId = url.split("vimeo.com/")[1].split("?")[0];
    embedUrl = `https://player.vimeo.com/video/${videoId}`;
  } else if (url.includes("drive.google.com/file/d/")) {
    const fileId = url.split("/d/")[1].split("/")[0];
    embedUrl = `https://drive.google.com/file/d/${fileId}/preview`;
  }
  return embedUrl;
}

function getImageUrl(url: string) {
  return getOptimizedImageUrl(url);
}

function isDateTimeExpired(dateStr?: string, timeStr?: string): boolean {
  if (!dateStr || !dateStr.trim()) return false;
  const trimmedDate = dateStr.trim();
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  if (trimmedDate < todayStr) return true;
  if (trimmedDate > todayStr) return false;

  if (!timeStr || !timeStr.trim()) return false;

  const trimmedTime = timeStr.trim();
  const nowHours = today.getHours();
  const nowMinutes = today.getMinutes();

  const match24 = trimmedTime.match(/^(\d{1,2}):(\d{2})$/);
  if (match24) {
    const targetHours = parseInt(match24[1], 10);
    const targetMinutes = parseInt(match24[2], 10);
    if (nowHours > targetHours) return true;
    if (nowHours === targetHours && nowMinutes >= targetMinutes) return true;
    return false;
  }

  const match12 = trimmedTime.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (match12) {
    let targetHours = parseInt(match12[1], 10);
    const targetMinutes = parseInt(match12[2], 10);
    const ampm = match12[3].toUpperCase();
    if (ampm === "PM" && targetHours < 12) targetHours += 12;
    if (ampm === "AM" && targetHours === 12) targetHours = 0;

    if (nowHours > targetHours) return true;
    if (nowHours === targetHours && nowMinutes >= targetMinutes) return true;
    return false;
  }

  return false;
}

function PlanParticipantsPanel({ plan }: { plan: any }) {
  const currentRegistered = plan.registeredUsers || [];
  const maxCap = plan.maxParticipants || 20;
  const pastEditions = (plan.pastEditions || []) as Array<{
    editionNumber: number;
    date?: string;
    time?: string;
    location?: string;
    registeredUsers: Array<{
      name: string;
      email: string;
      registeredAt?: number;
      attended?: boolean;
      submissionUrl?: string;
      submissionStatus?: "PENDING" | "APPROVED" | "REJECTED";
      submittedAt?: number;
      feedbackNote?: string;
    }>;
    completedAt: number;
  }>;

  const isExpired = isDateTimeExpired(plan.date, plan.time);
  const isCurrentCompleted = plan.status === "COMPLETED" || (plan.status === "PUBLISHED" && isExpired);

  // Selected edition: "current" or `past-${ed.editionNumber}`
  const [selectedEditionKey, setSelectedEditionKey] = useState<string>("current");

  // Determine active edition data
  const isViewingPast = selectedEditionKey.startsWith("past-");
  const pastEditionNum = isViewingPast ? parseInt(selectedEditionKey.replace("past-", ""), 10) : null;
  const activePastEdition = pastEditionNum ? pastEditions.find((p) => p.editionNumber === pastEditionNum) : null;

  const rawRegisteredList = isViewingPast
    ? (activePastEdition?.registeredUsers || [])
    : currentRegistered;

  // Chronologically sort strictly by registration timestamp ascending
  const sortedActiveList = [...rawRegisteredList].sort((a: any, b: any) => (a.registeredAt || 0) - (b.registeredAt || 0));

  const isEditionCompleted = isViewingPast ? true : isCurrentCompleted;

  const confirmedSpotUsers = sortedActiveList.slice(0, maxCap);
  const standbyUsers = sortedActiveList.slice(maxCap);
  const attendedUsers = sortedActiveList.filter((u: any) => u.attended === true);
  const absentUsers = confirmedSpotUsers.filter((u: any) => !u.attended);

  // Subtab for active view: "attended" | "absent" | "confirmed" | "standby"
  const [activeSubTab, setActiveSubTab] = useState<"attended" | "absent" | "confirmed" | "standby">(
    isEditionCompleted ? "attended" : "confirmed"
  );

  // Calculate total historical attendees
  const totalHistoricalAttendees = pastEditions.reduce(
    (sum, ed) => sum + (ed.registeredUsers || []).filter((u: any) => u.attended).length,
    0
  ) + (isCurrentCompleted ? currentRegistered.filter((u: any) => u.attended).length : 0);

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.25 }}
      className="mt-6 pt-6 border-t border-slate-200 bg-slate-50/90 rounded-2xl p-4 md:p-6 w-full text-left"
    >
      {/* ── Top Edition Selector Bar (If past editions exist) ── */}
      {pastEditions.length > 0 && (
        <div className="mb-5 pb-4 border-b border-slate-200">
          <div className="flex items-center justify-between gap-2 mb-2.5 flex-wrap">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <History className="w-3.5 h-3.5 text-purple-600" />
              Session Editions & Attendance History ({pastEditions.length + 1} Total)
            </span>
            <span className="text-[11px] font-semibold text-purple-800 bg-purple-100/80 px-2.5 py-0.5 rounded-full border border-purple-200">
              {totalHistoricalAttendees} Total Verified Attendees
            </span>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1 hide-scrollbar">
            {/* Current Edition Tab */}
            <button
              type="button"
              onClick={() => {
                setSelectedEditionKey("current");
                setActiveSubTab(isCurrentCompleted ? "attended" : "confirmed");
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
                selectedEditionKey === "current"
                  ? isCurrentCompleted
                    ? "bg-purple-600 text-white shadow-sm"
                    : "bg-emerald-600 text-white shadow-sm"
                  : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
              }`}
            >
              {isCurrentCompleted ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Users className="w-3.5 h-3.5" />}
              <span>Edition {plan.edition || 1} {isCurrentCompleted ? "(Current • Completed)" : "(Upcoming Registration)"}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                selectedEditionKey === "current" ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
              }`}>
                {isCurrentCompleted ? `${currentRegistered.filter((u: any) => u.attended).length} Attended` : `${currentRegistered.length}/${maxCap}`}
              </span>
            </button>

            {/* Past Editions Tabs (sorted latest first) */}
            {[...pastEditions].reverse().map((ed) => {
              const edAttendedCount = (ed.registeredUsers || []).filter((u: any) => u.attended).length;
              const isSelected = selectedEditionKey === `past-${ed.editionNumber}`;
              return (
                <button
                  key={ed.editionNumber}
                  type="button"
                  onClick={() => {
                    setSelectedEditionKey(`past-${ed.editionNumber}`);
                    setActiveSubTab("attended");
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
                    isSelected
                      ? "bg-purple-700 text-white shadow-sm"
                      : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-purple-300" />
                  <span>Edition {ed.editionNumber} ({ed.date || "Completed"})</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                    isSelected ? "bg-white/20 text-white" : "bg-purple-50 text-purple-800 border border-purple-200"
                  }`}>
                    {edAttendedCount} Attended
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Active Edition Content ── */}
      {(() => {
        const edGroupImg = isViewingPast ? (activePastEdition as any)?.groupImageUrl : plan.groupImageUrl;
        const edGroupLink = isViewingPast ? (activePastEdition as any)?.groupImageLink : plan.groupImageLink;
        const edGroupCaption = isViewingPast ? (activePastEdition as any)?.groupImageCaption : plan.groupImageCaption;

        if (!edGroupImg) return null;

        return (
          <div className="mb-4 p-3.5 bg-white rounded-2xl border border-purple-200/80 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-16 h-12 rounded-xl overflow-hidden bg-slate-100 border border-purple-200 shadow-2xs shrink-0">
                <img
                  src={getOptimizedImageUrl(edGroupImg)}
                  alt="Group"
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="min-w-0">
                <span className="text-xs font-bold text-slate-900 flex items-center gap-1">
                  📸 Official Edition {isViewingPast ? pastEditionNum : (plan.edition || 1)} Group Photo
                </span>
                <p className="text-[11px] text-slate-600 truncate mt-0.5">
                  {edGroupCaption || "Group completion memories & showcase"}
                </p>
              </div>
            </div>
            {edGroupLink && (
              <a
                href={edGroupLink}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 shadow-2xs flex items-center gap-1 shrink-0 cursor-pointer"
              >
                <span>Showcase / Album</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        );
      })()}

      {isEditionCompleted ? (
        <div>
          {/* Completed Session View: Attended vs Absent vs Waiting List */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Users className="w-4 h-4 text-purple-600" />
                Session Attendance Record (Edition {isViewingPast ? pastEditionNum : (plan.edition || 1)})
              </h4>
              {isViewingPast && activePastEdition && (
                <p className="text-xs text-slate-500 mt-0.5">
                  Held on {activePastEdition.date || "Past Date"} {activePastEdition.time ? `at ${activePastEdition.time}` : ""} {activePastEdition.location ? `• 📍 ${activePastEdition.location}` : ""}
                </p>
              )}
            </div>
            <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-200 shadow-xs text-xs font-semibold">
              <button
                type="button"
                onClick={() => setActiveSubTab("attended")}
                className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${activeSubTab === 'attended' ? 'bg-emerald-100 text-emerald-800 font-bold' : 'text-slate-600 hover:bg-slate-100'}`}
              >
                Attended ({attendedUsers.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveSubTab("absent")}
                className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${activeSubTab === 'absent' ? 'bg-rose-100 text-rose-800 font-bold' : 'text-slate-600 hover:bg-slate-100'}`}
              >
                Absent ({absentUsers.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveSubTab("standby")}
                className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${activeSubTab === 'standby' ? 'bg-amber-100 text-amber-800 font-bold' : 'text-slate-600 hover:bg-slate-100'}`}
              >
                Waiting List ({standbyUsers.length})
              </button>
            </div>
          </div>

          {activeSubTab === "attended" && (
            <div>
              <div className="text-xs font-semibold text-slate-500 mb-3 flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Verified participants who attended this session ({attendedUsers.length})</span>
              </div>
              {attendedUsers.length === 0 ? (
                <div className="bg-white p-4 rounded-xl border border-slate-200 text-center text-xs text-slate-500">
                  No attendance was recorded for this edition.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-64 overflow-y-auto pr-1">
                  {attendedUsers.map((u: any, idx: number) => {
                    const isSubmissionApproved = u.submissionStatus === "APPROVED";
                    return (
                      <div key={idx} className={`p-3 rounded-xl border flex items-center justify-between gap-3 shadow-xs transition-colors ${isSubmissionApproved ? 'bg-amber-50/50 border-amber-300' : 'bg-white border-slate-200 hover:border-emerald-200'}`}>
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className={`w-8 h-8 rounded-full font-bold text-xs flex items-center justify-center shrink-0 border ${isSubmissionApproved ? 'bg-amber-400 text-slate-950 border-amber-300' : 'bg-emerald-100 text-emerald-800 border-emerald-200'}`}>
                            {u.name ? u.name.charAt(0).toUpperCase() : '?'}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-xs text-slate-900 truncate">{u.name}</p>
                            <p className="text-[11px] text-slate-500 truncate">{u.email}</p>
                          </div>
                        </div>
                        {isSubmissionApproved ? (
                          <span className="shrink-0 bg-amber-400 text-slate-950 border border-amber-300 text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1 shadow-xs">
                            <Star className="w-3 h-3 fill-slate-950" />
                            Approved ⭐
                          </span>
                        ) : (
                          <span className="shrink-0 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            Attended
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeSubTab === "absent" && (
            <div>
              <div className="text-xs font-semibold text-slate-500 mb-3 flex items-center gap-1.5">
                <UserX className="w-3.5 h-3.5 text-rose-600" />
                <span>Confirmed registrants who were marked absent ({absentUsers.length})</span>
              </div>
              {absentUsers.length === 0 ? (
                <div className="bg-white p-4 rounded-xl border border-slate-200 text-center text-xs text-slate-500">
                  All confirmed registrants attended this session.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-64 overflow-y-auto pr-1">
                  {absentUsers.map((u: any, idx: number) => (
                    <div key={idx} className="bg-white p-3 rounded-xl border border-slate-200 flex items-center justify-between gap-3 shadow-xs hover:border-rose-200 transition-colors">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-rose-100 text-rose-800 font-bold text-xs flex items-center justify-center shrink-0 border border-rose-200">
                          {u.name ? u.name.charAt(0).toUpperCase() : '?'}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-xs text-slate-900 truncate">{u.name}</p>
                          <p className="text-[11px] text-slate-500 truncate">{u.email}</p>
                        </div>
                      </div>
                      <span className="shrink-0 bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-bold px-2 py-0.5 rounded-full">
                        Absent
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeSubTab === "standby" && (
            <div>
              <div className="text-xs font-semibold text-slate-500 mb-3 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-600" />
                <span>Waiting List Members (Beyond Max Capacity of {maxCap}) ({standbyUsers.length})</span>
              </div>
              {standbyUsers.length === 0 ? (
                <div className="bg-white p-4 rounded-xl border border-slate-200 text-center text-xs text-slate-500">
                  No members on the waiting list for this edition.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-64 overflow-y-auto pr-1">
                  {standbyUsers.map((u: any, idx: number) => (
                    <div key={idx} className="bg-white p-3 rounded-xl border border-slate-200 flex items-center justify-between gap-3 shadow-xs hover:border-amber-200 transition-colors">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="text-[11px] font-extrabold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded shrink-0 border border-amber-200">
                          #{maxCap + idx + 1}
                        </span>
                        <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-800 font-bold text-xs flex items-center justify-center shrink-0 border border-amber-200">
                          {u.name ? u.name.charAt(0).toUpperCase() : '?'}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-xs text-slate-900 truncate">{u.name}</p>
                          <p className="text-[11px] text-slate-500 truncate">{u.email}</p>
                        </div>
                      </div>
                      <span className="shrink-0 bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Clock className="w-3 h-3 text-amber-600" />
                        Waiting List
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div>
          {/* Active / Upcoming Session View: Confirmed Spots vs Standby List */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-600" />
              Registration List (Edition {plan.edition || 1} • Capacity: {maxCap})
            </h4>
            <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-200 shadow-xs text-xs font-semibold">
              <button
                type="button"
                onClick={() => setActiveSubTab("confirmed")}
                className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${activeSubTab === 'confirmed' ? 'bg-emerald-100 text-emerald-800 font-bold' : 'text-slate-600 hover:bg-slate-100'}`}
              >
                Confirmed Spots ({confirmedSpotUsers.length}/{maxCap})
              </button>
              <button
                type="button"
                onClick={() => setActiveSubTab("standby")}
                className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${activeSubTab === 'standby' ? 'bg-amber-100 text-amber-800 font-bold' : 'text-slate-600 hover:bg-slate-100'}`}
              >
                Standby List ({standbyUsers.length})
              </button>
            </div>
          </div>

          {activeSubTab === "confirmed" && (
            <div>
              <div className="text-xs font-semibold text-slate-500 mb-3 flex items-center justify-between">
                <span>Registered Members with Confirmed Spots (First Come, First Served)</span>
                <span className="bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded text-[10px]">
                  Max Capacity: {maxCap}
                </span>
              </div>
              {confirmedSpotUsers.length === 0 ? (
                <div className="bg-white p-4 rounded-xl border border-slate-200 text-center text-xs text-slate-500">
                  No registrations for this edition yet. Be the first to join!
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-64 overflow-y-auto pr-1">
                  {confirmedSpotUsers.map((u: any, idx: number) => (
                    <div key={idx} className="bg-white p-3 rounded-xl border border-slate-200 flex items-center justify-between gap-3 shadow-xs hover:border-emerald-200 transition-colors">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="text-[11px] font-extrabold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded shrink-0 border border-emerald-200">
                          #{idx + 1}
                        </span>
                        <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center shrink-0 border border-emerald-200">
                          {u.name ? u.name.charAt(0).toUpperCase() : '?'}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-xs text-slate-900 truncate">{u.name}</p>
                          <p className="text-[11px] text-slate-500 truncate">{u.email}</p>
                        </div>
                      </div>
                      <span className="shrink-0 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded-full">
                        Confirmed Spot
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeSubTab === "standby" && (
            <div>
              <div className="text-xs font-semibold text-slate-500 mb-3 flex items-center justify-between">
                <span>Standby / Waiting List Members (Beyond Max Capacity of {maxCap})</span>
                <span className="bg-amber-100 text-amber-900 font-bold px-2 py-0.5 rounded text-[10px]">
                  {standbyUsers.length} in Standby
                </span>
              </div>
              {standbyUsers.length === 0 ? (
                <div className="bg-white p-4 rounded-xl border border-slate-200 text-center text-xs text-slate-500">
                  No members currently on the standby list.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-64 overflow-y-auto pr-1">
                  {standbyUsers.map((u: any, idx: number) => (
                    <div key={idx} className="bg-white p-3 rounded-xl border border-slate-200 flex items-center justify-between gap-3 shadow-xs hover:border-amber-200 transition-colors">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="text-[11px] font-extrabold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded shrink-0 border border-amber-200">
                          #{maxCap + idx + 1}
                        </span>
                        <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-800 font-bold text-xs flex items-center justify-center shrink-0 border border-amber-200">
                          {u.name ? u.name.charAt(0).toUpperCase() : '?'}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-xs text-slate-900 truncate">{u.name}</p>
                          <p className="text-[11px] text-slate-500 truncate">{u.email}</p>
                        </div>
                      </div>
                      <span className="shrink-0 bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Clock className="w-3 h-3 text-amber-600" />
                        Standby
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}


export default function Learning() {

  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"alternating" | "grid">("alternating");
  const [expandedPlanIds, setExpandedPlanIds] = useState<Record<string, boolean>>({});

  const toggleExpandPlan = (planId: string) => {
    setExpandedPlanIds((prev) => ({
      ...prev,
      [planId]: !prev[planId],
    }));
  };

  const { user } = useAuth();
  const [, navigate] = useLocation();
  const registerForPlan = useMutation(api.learningPlans.registerForPlan);

  const publishedPlans = useQuery(api.learningPlans.getPublishedPlans) || [];

  useEffect(() => {
    const pendingPlanId = sessionStorage.getItem('pendingSessionJoin');
    if (pendingPlanId && user?.email) {
      sessionStorage.removeItem('pendingSessionJoin');
      registerForPlan({ planId: pendingPlanId as any, name: user.name, email: user.email })
        .then((res) => {
          if (res.success) {
            toast.success(res.message);
          } else {
            toast.error(res.message);
          }
        })
        .catch(() => toast.error("Failed to register"));
    }
  }, [user, registerForPlan]);

  const handleJoin = async (planId: string) => {
    if (!user?.email) {
      sessionStorage.setItem('pendingSessionJoin', planId);
      sessionStorage.setItem('returnTo', '/learning');
      navigate('/login');
      return;
    }

    try {
      const res = await registerForPlan({ planId: planId as any, name: user.name, email: user.email });
      if (res.success) {
        toast.success(res.message);
      } else {
        toast.error(res.message);
      }
    } catch (err) {
      toast.error("Failed to register");
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans overflow-x-hidden">
      {/* Navigation Bar */}
      <header className={`fixed top-0 left-0 w-full z-50 pointer-events-auto transition-all duration-500 ${isScrolled ? 'bg-white/90 backdrop-blur-xl border-b border-slate-200 shadow-sm' : 'bg-white/80 backdrop-blur-md border-b border-slate-200'}`}>
        <div className={`px-4 md:px-8 py-4 md:py-6 flex items-center justify-between transition-all duration-500 ${isScrolled ? 'py-3 md:py-4' : ''}`}>
          {/* Left: Logo */}
          <Link href="/">
            <div className="flex flex-col cursor-pointer group">
              <span className="font-display font-black text-xl leading-none tracking-tight group-hover:text-emerald-500 transition-colors text-slate-900">AESTHETIC</span>
              <span className="font-sans font-medium text-[0.65rem] leading-none tracking-[0.3em] text-emerald-600 group-hover:text-emerald-400 transition-colors mt-0.5 uppercase">Centre</span>
            </div>
          </Link>

          {/* Center: Navigation Links — desktop only */}
          <div className="hidden md:flex items-center gap-12 absolute left-1/2 -translate-x-1/2">
            <Link href="/community">
              <button className="text-sm font-medium tracking-wide transition-colors duration-200 text-slate-500 hover:text-slate-900">
                Community
              </button>
            </Link>
            <Link href="/">
              <button className="text-sm font-medium tracking-wide transition-colors duration-200 text-slate-500 hover:text-slate-900">
                Aesthetic Centre
              </button>
            </Link>
            <Link href="/learning">
              <button className="text-sm font-semibold tracking-wide transition-colors duration-200 text-slate-900">
                Learning
              </button>
            </Link>
          </div>

          {/* Right: Sign In (desktop) + hamburger (mobile) */}
          <div className="flex items-center gap-3">
            <Link href="/login">
              <button className="hidden md:inline-flex px-6 py-2.5 text-white text-sm font-semibold rounded-full shadow-md transition-all hover:scale-105 active:scale-95 bg-slate-900 hover:bg-slate-800">
                Sign In
              </button>
            </Link>
            {/* Hamburger — mobile only */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen((o) => !o)}
              className="flex h-9 w-9 items-center justify-center rounded-full border shadow-sm transition-colors md:hidden border-slate-200 bg-white/80 text-slate-700 active:bg-slate-100"
            >
              {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Mobile drawer */}
        <motion.div
          initial={false}
          animate={mobileMenuOpen ? { height: "auto", opacity: 1 } : { height: 0, opacity: 0 }}
          transition={{ duration: 0.28, ease: "easeInOut" }}
          className="overflow-hidden border-t border-slate-200 bg-white/95 backdrop-blur-xl md:hidden"
        >
          <nav className="flex flex-col gap-1 px-4 py-4">
            <Link href="/community">
              <button onClick={() => setMobileMenuOpen(false)} className="w-full rounded-2xl px-4 py-3 text-left text-sm font-medium tracking-wide text-slate-600 hover:bg-slate-50">
                Community
              </button>
            </Link>
            <Link href="/">
              <button onClick={() => setMobileMenuOpen(false)} className="w-full rounded-2xl px-4 py-3 text-left text-sm font-medium tracking-wide text-slate-600 hover:bg-slate-50">
                Aesthetic Centre
              </button>
            </Link>
            <Link href="/learning">
              <button onClick={() => setMobileMenuOpen(false)} className="w-full rounded-2xl px-4 py-3 text-left text-sm font-semibold tracking-wide text-slate-900 bg-emerald-50 text-emerald-700">
                Learning
              </button>
            </Link>
            <div className="mt-2 border-t border-slate-100 pt-3">
              <Link href="/login">
                <button onClick={() => setMobileMenuOpen(false)} className="w-full rounded-full bg-slate-900 py-3 text-sm font-semibold text-white shadow-sm">
                  Sign In
                </button>
              </Link>
            </div>
          </nav>
        </motion.div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 md:px-8 pt-32 pb-24">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div>
            <p className="mt-4 text-lg text-slate-600 max-w-2xl">
              Explore upcoming activity sessions, workshops, and deep dives curated by our team members.
            </p>
          </div>
          <div className="flex items-center gap-2 bg-white p-1 rounded-lg border border-slate-200 shadow-sm shrink-0">
            <button
              onClick={() => setViewMode("alternating")}
              className={`p-2 rounded-md flex items-center justify-center transition-colors ${viewMode === 'alternating' ? 'bg-emerald-100 text-emerald-700' : 'text-slate-500 hover:bg-slate-50'}`}
              title="Alternating View"
            >
              <List className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode("grid")}
              className={`p-2 rounded-md flex items-center justify-center transition-colors ${viewMode === 'grid' ? 'bg-emerald-100 text-emerald-700' : 'text-slate-500 hover:bg-slate-50'}`}
              title="Grid View"
            >
              <LayoutGrid className="w-5 h-5" />
            </button>
          </div>
        </div>

        {publishedPlans.length === 0 ? (
          <div className="text-center py-24 bg-white rounded-3xl border border-slate-200 shadow-sm">
            <h3 className="text-2xl font-bold text-slate-800 mb-2">Check back soon!</h3>
            <p className="text-slate-500">No session plans have been published yet.</p>
          </div>
        ) : (
          <div className={viewMode === "alternating" ? "space-y-24" : "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"}>
            {publishedPlans.map((plan: any, index: number) => {
              const validImages = (plan.imageUrls || []).filter((u: string) => typeof u === "string" && u.trim().length > 5);
              const validVideos = (plan.videoUrls || []).filter((u: string) => typeof u === "string" && u.trim().length > 5);

              const hasImage = validImages.length > 0;
              const hasVideo = validVideos.length > 0;

              const myRecord = plan.registeredUsers?.find(
                (u: { email: string }) => u.email.toLowerCase() === user?.email?.toLowerCase()
              ) || (plan.pastEditions || []).flatMap((e: any) => e.registeredUsers || []).find(
                (u: any) => u.email.toLowerCase() === user?.email?.toLowerCase()
              );

              const isMySubmissionApproved = Boolean(myRecord?.attended && myRecord?.submissionStatus === "APPROVED");
              const isRegistered = Boolean(user?.email && myRecord);

              const isExpired = isDateTimeExpired(plan.date, plan.time);
              const isCompleted = plan.status === "COMPLETED" || (plan.status === "PUBLISHED" && isExpired) || isMySubmissionApproved;

              const registered = plan.registeredUsers || [];
              const attendedUsers = registered.filter((u: any) => u.attended === true);
              const pastEditions = plan.pastEditions || [];
              const totalPastAttendees = pastEditions.reduce((sum: number, ed: any) => sum + (ed.registeredUsers || []).filter((u: any) => u.attended).length, 0);
              const isExpanded = Boolean(expandedPlanIds[plan._id]);
              const editionNum = plan.edition || 1;
              const completedEditions = plan.completedEditionsCount || (isCompleted ? 1 : pastEditions.length);
              const maxCap = plan.maxParticipants || 20;

              // Media rendering logic
              const MediaElement = () => {
                const roundedClass = viewMode === 'grid' ? 'rounded-2xl' : 'rounded-[2rem]';

                return (
                  <div className="relative w-full">
                    {isMySubmissionApproved ? (
                      <div className="absolute top-3 right-3 z-20 bg-amber-400 text-slate-950 font-black text-xs px-3.5 py-1.5 rounded-full shadow-lg flex items-center gap-1.5 backdrop-blur-md ring-1 ring-amber-300 animate-in fade-in zoom-in duration-300">
                        <Star className="w-4 h-4 fill-slate-950 text-slate-950" />
                        <span>Completed • Mastered ⭐</span>
                      </div>
                    ) : isCompleted ? (
                      <div className="absolute top-3 right-3 z-20 bg-purple-700/90 text-white font-bold text-xs px-3.5 py-1.5 rounded-full shadow-lg flex items-center gap-1.5 backdrop-blur-md ring-1 ring-white/30 animate-in fade-in zoom-in duration-300">
                        <CheckCircle2 className="w-4 h-4 text-purple-200" />
                        <span>Completed Session</span>
                      </div>
                    ) : isRegistered ? (
                      <div className="absolute top-3 right-3 z-20 bg-emerald-600/90 text-white font-bold text-xs px-3.5 py-1.5 rounded-full shadow-lg flex items-center gap-1.5 backdrop-blur-md ring-1 ring-white/30 animate-in fade-in zoom-in duration-300">
                        <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                        <span>Registered</span>
                      </div>
                    ) : null}
                    {hasImage ? (
                      <div className={`bg-slate-100 overflow-hidden shadow-xl border border-slate-200 relative group w-full flex items-center justify-center ${roundedClass}`}>
                        <img
                          src={getImageUrl(validImages[0])}
                          alt={plan.title}
                          className={`w-full group-hover:scale-105 transition-transform duration-700 ${viewMode === 'grid' ? 'aspect-video object-cover' : 'h-auto object-contain max-h-[75vh]'}`}
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    ) : hasVideo ? (
                      <div className={`bg-slate-900 overflow-hidden shadow-xl border border-slate-200 relative group w-full aspect-video ${roundedClass}`}>
                        <iframe
                          src={getEmbedUrl(validVideos[0])}
                          className="absolute inset-0 w-full h-full"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        ></iframe>
                      </div>
                    ) : (
                      <div className={`bg-slate-100 overflow-hidden shadow-xl border border-slate-200 relative group w-full aspect-video flex items-center justify-center text-slate-500 ${roundedClass}`}>
                        No media provided
                      </div>
                    )}
                  </div>
                );
              };

              if (viewMode === "alternating") {
                const isEven = index % 2 === 0;
                return (
                  <div key={plan._id} className="flex flex-col">
                    <div className={`flex flex-col ${isEven ? 'md:flex-row' : 'md:flex-row-reverse'} gap-12 items-center`}>
                      <div className="w-full md:w-1/2">
                        <MediaElement />
                      </div>
                      <div className="w-full md:w-1/2 space-y-6">
                        <div className="flex flex-wrap gap-2 items-center">
                          {plan.tags?.map((tag: string) => (
                            <span key={tag} className="px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold uppercase tracking-wider rounded-full">
                              {tag}
                            </span>
                          ))}
                          <span className="px-3 py-1 bg-purple-50 text-purple-800 border border-purple-200 text-xs font-extrabold uppercase tracking-wider rounded-full shadow-xs">
                            {editionNum === 1 ? '1st Edition' : editionNum === 2 ? '2nd Edition' : editionNum === 3 ? '3rd Edition' : `${editionNum}th Edition`}
                          </span>
                          {completedEditions > 0 && (
                            <span className="px-3 py-1 bg-amber-100 text-amber-900 border border-amber-300 text-xs font-extrabold rounded-full flex items-center gap-1 shadow-xs">
                              <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-600" />
                              {completedEditions} Star{completedEditions === 1 ? '' : 's'}
                            </span>
                          )}
                          {pastEditions.length > 0 && (
                            <button
                              type="button"
                              onClick={() => toggleExpandPlan(plan._id)}
                              className="px-3 py-1 bg-purple-100 hover:bg-purple-200 text-purple-900 border border-purple-300 text-xs font-extrabold rounded-full flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                            >
                              <History className="w-3.5 h-3.5 text-purple-700" />
                              <span>{pastEditions.length} Past Session{pastEditions.length === 1 ? '' : 's'} ({totalPastAttendees} Attended)</span>
                            </button>
                          )}
                          {isMySubmissionApproved ? (
                            <span className="px-3 py-1 bg-amber-400 text-slate-950 border border-amber-300 text-xs font-black uppercase tracking-wider rounded-full flex items-center gap-1.5 shadow-sm">
                              <Star className="w-3.5 h-3.5 fill-slate-950 text-slate-950" />
                              Completed • Approved ⭐
                            </span>
                          ) : isCompleted ? (
                            <span className="px-3 py-1 bg-purple-100 text-purple-800 border border-purple-300 text-xs font-bold uppercase tracking-wider rounded-full flex items-center gap-1.5 shadow-sm">
                              <CheckCircle2 className="w-3.5 h-3.5 text-purple-600" />
                              Completed
                            </span>
                          ) : isRegistered ? (
                            <span className="px-3 py-1 bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-bold uppercase tracking-wider rounded-full flex items-center gap-1.5 shadow-sm">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              Registered
                            </span>
                          ) : null}
                        </div>
                        <h2 className="text-3xl md:text-4xl font-display font-bold text-slate-900 leading-tight">
                          {plan.title}
                        </h2>
                        {(plan.date || plan.time || plan.location) && (
                          <div className="flex flex-wrap gap-4 text-sm font-medium text-slate-600">
                            {plan.date && <span>📅 {plan.date}</span>}
                            {plan.time && <span>⏰ {plan.time}</span>}
                            {plan.location && <span>📍 {plan.location}</span>}
                            <span>👥 Max: {maxCap}</span>
                          </div>
                        )}
                        <p className="text-lg text-slate-600 leading-relaxed whitespace-pre-wrap">
                          {plan.description}
                        </p>

                        <div className="flex flex-col sm:flex-row sm:items-center gap-4 pt-6 flex-wrap">
                          {plan.documentationUrl && (
                            <a href={plan.documentationUrl} target="_blank" rel="noopener noreferrer">
                              <Button variant="outline" className="rounded-full px-6 py-6 h-auto text-lg w-full sm:w-auto border-slate-300 text-slate-700 hover:bg-slate-50">
                                Documentation
                              </Button>
                            </a>
                          )}
                          {isCompleted ? (
                            <button
                              type="button"
                              onClick={() => toggleExpandPlan(plan._id)}
                              className="bg-purple-50 hover:bg-purple-100 border border-purple-300 text-purple-900 font-bold rounded-full px-8 py-4 text-base flex items-center justify-center gap-2 shadow-sm transition-all w-full sm:w-auto cursor-pointer"
                            >
                              <CheckCircle2 className="w-5 h-5 text-purple-600" />
                              <span>Session Completed</span>
                              <span className="text-xs bg-purple-200/80 text-purple-900 px-2.5 py-1 rounded-full font-bold ml-1">
                                {attendedUsers.length} Attended
                              </span>
                              {isExpanded ? <ChevronUp className="w-5 h-5 text-purple-600 ml-1" /> : <ChevronDown className="w-5 h-5 text-purple-600 ml-1" />}
                            </button>
                          ) : isRegistered ? (
                            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                              <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 font-bold rounded-full px-8 py-4 text-base flex items-center justify-center gap-2 shadow-sm w-full sm:w-auto">
                                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                                <span>Joined & Registered</span>
                              </div>
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => toggleExpandPlan(plan._id)}
                                className="rounded-full px-6 py-6 h-auto text-base w-full sm:w-auto border-slate-300 text-slate-700 hover:bg-slate-100 flex items-center justify-center gap-2 cursor-pointer"
                              >
                                <Users className="w-5 h-5 text-emerald-600" />
                                <span>{registered.length}/{maxCap} Registered{totalPastAttendees > 0 ? ` • ${totalPastAttendees} Past Attendees` : ''}</span>
                                {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
                              </Button>
                            </div>
                          ) : (
                            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                              <Button onClick={() => handleJoin(plan._id)} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-full px-8 py-6 h-auto text-lg w-full sm:w-auto shadow-md transition-all hover:scale-105">
                                Join <ArrowRight className="ml-2 w-5 h-5" />
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => toggleExpandPlan(plan._id)}
                                className="rounded-full px-6 py-6 h-auto text-base w-full sm:w-auto border-slate-300 text-slate-700 hover:bg-slate-100 flex items-center justify-center gap-2 cursor-pointer"
                              >
                                <Users className="w-5 h-5 text-emerald-600" />
                                <span>{registered.length}/{maxCap} Registered{totalPastAttendees > 0 ? ` • ${totalPastAttendees} Past Attendees` : ''}</span>
                                {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
                              </Button>
                            </div>
                          )}
                          <div className="text-sm text-slate-500 font-medium sm:ml-auto">
                            Curated by <span className="text-slate-900 font-bold">{plan.authorName}</span>
                          </div>
                        </div>
                      </div>
                    </div>


                    {/* Expandable Attendees / Waiting List Panel */}
                    {isExpanded && (
                      <PlanParticipantsPanel plan={plan} />
                    )}
                  </div>
                );
              } else {
                // Grid view
                return (
                  <div key={plan._id} className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm hover:shadow-lg transition-all flex flex-col h-full group">
                    <MediaElement />
                    <div className="pt-6 flex flex-col flex-1">
                      <div className="flex flex-wrap gap-1.5 mb-3 items-center">
                        <span className="px-2 py-0.5 bg-purple-50 text-purple-800 border border-purple-200 text-[10px] font-extrabold rounded-sm">
                          Ed. {editionNum}
                        </span>
                        {completedEditions > 0 && (
                          <span className="px-2 py-0.5 bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-extrabold rounded-sm flex items-center gap-0.5">
                            <Star className="w-3 h-3 fill-amber-500 text-amber-600" />
                            {completedEditions} ⭐
                          </span>
                        )}
                        {pastEditions.length > 0 && (
                          <span className="px-2 py-0.5 bg-purple-100 text-purple-900 border border-purple-300 text-[10px] font-extrabold rounded-sm flex items-center gap-0.5">
                            <History className="w-3 h-3 text-purple-700" />
                            {totalPastAttendees} Attended
                          </span>
                        )}
                        {plan.tags?.slice(0, 2).map((tag: string) => (

                          <span key={tag} className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-bold uppercase tracking-wider rounded-sm">
                            {tag}
                          </span>
                        ))}
                      </div>
                      <h3 className="text-xl font-bold text-slate-900 mb-3 group-hover:text-emerald-600 transition-colors">{plan.title}</h3>
                      {(plan.date || plan.time || plan.location) && (
                        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs font-medium text-slate-500 mb-3">
                          {plan.date && <span>📅 {plan.date}</span>}
                          {plan.time && <span>⏰ {plan.time}</span>}
                          {plan.location && <span>📍 {plan.location}</span>}
                          <span>👥 Max: {maxCap}</span>
                        </div>
                      )}
                      <p className="text-slate-600 text-sm line-clamp-3 mb-6 flex-1">
                        {plan.description}
                      </p>
                      <div className="flex items-center justify-between pt-4 border-t border-slate-100 mt-auto">
                        <span className="text-xs font-medium text-slate-500">By {plan.authorName}</span>
                        <div className="flex items-center gap-2">
                          {plan.documentationUrl && (
                            <a href={plan.documentationUrl} target="_blank" rel="noopener noreferrer" className="text-slate-500 font-semibold text-xs hover:text-slate-900 transition-colors mr-1">
                              Docs
                            </a>
                          )}
                          {isMySubmissionApproved ? (
                            <button
                              type="button"
                              onClick={(e) => { e.preventDefault(); toggleExpandPlan(plan._id); }}
                              className="text-slate-950 font-black text-xs flex items-center bg-amber-400 hover:bg-amber-500 border border-amber-300 px-3 py-1.5 rounded-full shadow-sm transition-colors cursor-pointer"
                            >
                              <Star className="w-3.5 h-3.5 mr-1 fill-slate-950 text-slate-950" />
                              Completed ⭐
                              {isExpanded ? <ChevronUp className="w-3.5 h-3.5 ml-1" /> : <ChevronDown className="w-3.5 h-3.5 ml-1" />}
                            </button>
                          ) : isCompleted ? (
                            <button
                              type="button"
                              onClick={(e) => { e.preventDefault(); toggleExpandPlan(plan._id); }}
                              className="text-purple-800 font-bold text-xs flex items-center bg-purple-100 hover:bg-purple-200 border border-purple-300 px-3 py-1.5 rounded-full shadow-sm transition-colors cursor-pointer"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-purple-600" />
                              Completed
                              {isExpanded ? <ChevronUp className="w-3.5 h-3.5 ml-1" /> : <ChevronDown className="w-3.5 h-3.5 ml-1" />}
                            </button>
                          ) : isRegistered ? (
                            <div className="flex items-center gap-1.5">
                              <span className="text-emerald-800 font-bold text-xs flex items-center bg-emerald-100 border border-emerald-300 px-3 py-1.5 rounded-full shadow-sm">
                                <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                                Registered
                              </span>
                              <button
                                type="button"
                                onClick={(e) => { e.preventDefault(); toggleExpandPlan(plan._id); }}
                                className="p-1.5 hover:bg-slate-100 text-slate-600 rounded-full transition-colors cursor-pointer"
                                title="View Registered Members"
                              >
                                {isExpanded ? <ChevronUp className="w-4 h-4 text-emerald-600" /> : <Users className="w-4 h-4 text-emerald-600" />}
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5">
                              <button type="button" onClick={(e) => { e.preventDefault(); handleJoin(plan._id); }} className="text-emerald-600 font-semibold text-xs flex items-center hover:underline bg-emerald-50 px-3 py-1.5 rounded-full cursor-pointer">
                                Join <ArrowRight className="w-3 h-3 ml-1" />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => { e.preventDefault(); toggleExpandPlan(plan._id); }}
                                className="p-1.5 hover:bg-slate-100 text-slate-600 rounded-full transition-colors cursor-pointer"
                                title="View Registered Members"
                              >
                                {isExpanded ? <ChevronUp className="w-4 h-4 text-emerald-600" /> : <Users className="w-4 h-4 text-emerald-600" />}
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Expandable Attendees / Waiting List Panel */}
                      {isExpanded && (
                        <PlanParticipantsPanel plan={plan} />
                      )}
                    </div>
                  </div>
                );
              }
            })}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-12 mt-auto">
        <div className="max-w-7xl mx-auto px-4 md:px-8 text-center text-slate-500 text-sm">
          <p>© {new Date().getFullYear()} Aesthetic Centre. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

