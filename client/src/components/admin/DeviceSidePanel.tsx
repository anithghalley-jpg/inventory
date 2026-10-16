import React, { useEffect, useState, useMemo } from "react";
import { createPortal } from "react-dom";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  X,
  Laptop,
  Calendar,
  Clock,
  User,
  Users,
  CheckCircle2,
  Activity,
  History,
  Shield,
  Layers,
  ChevronRight,
  ArrowRight,
  Info,
} from "lucide-react";

export interface SelectedSidePanelData {
  deviceId: string;
  deviceName: string;
  date: string;
  displayDate: string;
  dayOfWeek?: string;
  isToday?: boolean;
}

interface DeviceItem {
  _id: string;
  deviceId: string;
  name: string;
  serialNumber: string;
  macAddress: string;
  brand: string;
  status?: string;
  currentUserEmail?: string;
  currentUserName?: string;
  currentSessionStart?: string;
  notes?: string;
}

interface DeviceSidePanelProps {
  isOpen: boolean;
  onClose: () => void;
  data: SelectedSidePanelData | null;
  device?: DeviceItem;
  sessionsOnDate: Array<{
    _id: string;
    logId: string;
    deviceId: string;
    deviceName: string;
    userEmail: string;
    userName: string;
    startTime: string;
    endTime?: string;
    durationMinutes?: number;
    date: string;
    startFormatted: string;
    endFormatted: string;
    displayString: string;
    isActive: boolean;
  }>;
}

export default function DeviceSidePanel({
  isOpen,
  onClose,
  data,
  device,
  sessionsOnDate = [],
}: DeviceSidePanelProps) {
  const [activeTab, setActiveTab] = useState<"date" | "history">("date");

  // Query all historical logs for this device across all dates
  const fullHistory = useQuery(
    api.devices.getDeviceHistory,
    data?.deviceId ? { deviceId: data.deviceId } : "skip"
  );

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Reset tab to date on open
  useEffect(() => {
    if (isOpen) {
      setActiveTab("date");
    }
  }, [isOpen, data?.date, data?.deviceId]);

  // Total minutes for this date
  const totalMinutesOnDate = useMemo(() => {
    return sessionsOnDate.reduce((sum, s) => sum + (s.durationMinutes || 0), 0);
  }, [sessionsOnDate]);

  // Unique users on this date
  const uniqueUsersOnDate = useMemo(() => {
    const set = new Set(sessionsOnDate.map((s) => s.userEmail));
    return set.size;
  }, [sessionsOnDate]);

  // Other sessions (not on this selected date)
  const otherDateSessions = useMemo(() => {
    if (!fullHistory || !data) return [];
    return fullHistory.filter((s) => s.date !== data.date);
  }, [fullHistory, data]);

  if (!isOpen || !data) return null;

  const brand = device?.brand || "Generic";
  const serialNumber = device?.serialNumber || "-";
  const macAddress = device?.macAddress || "-";
  const isBusyNow = device?.status === "IN_USE";

  const getBrandBadgeClass = (b: string) => {
    const brandLower = (b || "").toLowerCase();
    if (brandLower.includes("apple") || brandLower.includes("mac"))
      return "bg-slate-900 text-white border-slate-700 dark:bg-white dark:text-slate-900";
    if (brandLower.includes("dell"))
      return "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950 dark:text-sky-300";
    if (brandLower.includes("lenovo"))
      return "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950 dark:text-rose-300";
    if (brandLower.includes("hp"))
      return "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300";
    return "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300";
  };

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-[9998] transition-opacity animate-in fade-in duration-200"
      />

      {/* Slide-over Drawer Panel */}
      <div
        id="device-side-panel"
        className="fixed inset-y-0 right-0 z-[9999] w-full sm:w-[480px] md:w-[520px] bg-white dark:bg-slate-900 shadow-2xl border-l border-slate-200 dark:border-slate-800 flex flex-col animate-in slide-in-from-right duration-300 ease-out"
        role="dialog"
        aria-modal="true"
      >
        {/* Panel Header */}
        <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/60 shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-emerald-500 via-teal-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-emerald-600/20 shrink-0">
                <Laptop className="h-6 w-6" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight truncate">
                    {data.deviceName}
                  </h3>
                  <Badge
                    variant="outline"
                    className={`text-[10px] px-2 py-0.5 font-extrabold uppercase ${getBrandBadgeClass(
                      brand
                    )}`}
                  >
                    {brand}
                  </Badge>
                  {isBusyNow ? (
                    <Badge className="bg-emerald-500 text-white text-[10px] font-bold px-2 py-0.5 flex items-center gap-1 shadow-xs">
                      <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                      In Use Now
                    </Badge>
                  ) : (
                    <Badge className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-bold px-2 py-0.5">
                      Available
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                  SN: <span className="font-mono font-medium text-slate-700 dark:text-slate-300">{serialNumber}</span>
                  {macAddress !== "-" && ` • MAC: ${macAddress}`}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="h-8 w-8 rounded-full bg-slate-200/70 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center transition-colors cursor-pointer shrink-0"
              title="Close panel (Esc)"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Date & Quick Stats Row */}
          <div className="mt-4 p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  Target Date
                </p>
                <p className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                  <span>{data.displayDate} ({data.dayOfWeek || "GMT+6"})</span>
                  {data.isToday && (
                    <span className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-[9px] font-black px-1.5 py-0.2 rounded-md">
                      Today
                    </span>
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 text-right">
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  Users
                </p>
                <p className="text-xs font-black text-slate-900 dark:text-white">
                  {uniqueUsersOnDate} {uniqueUsersOnDate === 1 ? "User" : "Users"}
                </p>
              </div>
              <div className="h-7 w-[1px] bg-slate-100 dark:bg-slate-800" />
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  Total Time
                </p>
                <p className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                  {Math.floor(totalMinutesOnDate / 60)}h {totalMinutesOnDate % 60}m
                </p>
              </div>
            </div>
          </div>

          {/* Tab Switcher */}
          <div className="flex items-center gap-1.5 mt-4 p-1 bg-slate-200/60 dark:bg-slate-800/60 rounded-xl text-xs font-bold">
            <button
              type="button"
              onClick={() => setActiveTab("date")}
              className={`flex-1 py-1.5 px-3 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === "date"
                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-extrabold"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <Users className="h-3.5 w-3.5 text-emerald-600" />
              <span>Users on {data.displayDate}</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                {sessionsOnDate.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("history")}
              className={`flex-1 py-1.5 px-3 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === "history"
                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-extrabold"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <History className="h-3.5 w-3.5 text-indigo-500" />
              <span>Other Sessions / History</span>
              {otherDateSessions.length > 0 && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
                  {otherDateSessions.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Panel Content (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
          {activeTab === "date" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Activity className="h-3.5 w-3.5 text-emerald-500" />
                  <span>Session Log for {data.displayDate}</span>
                </h4>
                <span className="text-[11px] text-slate-400">
                  Chronological Order (GMT+6)
                </span>
              </div>

              {sessionsOnDate.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 dark:bg-slate-950/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 space-y-2">
                  <Laptop className="h-8 w-8 text-slate-300 dark:text-slate-600 mx-auto" />
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    No users logged on this date
                  </p>
                  <p className="text-[11px] text-slate-400">
                    This device was not checked out by any members on {data.displayDate}.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {sessionsOnDate.map((session, idx) => {
                    const isSessionActive = session.isActive;
                    const durationHours = Math.floor((session.durationMinutes || 0) / 60);
                    const durationMins = (session.durationMinutes || 0) % 60;

                    return (
                      <div
                        key={session.logId || idx}
                        className={`p-4 rounded-2xl border transition-all ${
                          isSessionActive
                            ? "bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700 shadow-sm ring-1 ring-emerald-400/30"
                            : "bg-white dark:bg-slate-950 border-slate-200/90 dark:border-slate-800 shadow-2xs hover:border-slate-300"
                        }`}
                      >
                        {/* Top: User info & session index */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div
                              className={`h-9 w-9 rounded-xl font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs ${
                                isSessionActive
                                  ? "bg-emerald-600 text-white"
                                  : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                              }`}
                            >
                              {session.userName ? session.userName.charAt(0).toUpperCase() : "U"}
                            </div>
                            <div className="min-w-0">
                              <p className="font-extrabold text-sm text-slate-900 dark:text-white truncate flex items-center gap-1.5">
                                <span>{session.userName || "Lab Member"}</span>
                                <span className="text-[10px] font-bold text-slate-400 px-1.5 py-0.2 rounded-md bg-slate-100 dark:bg-slate-800">
                                  #{idx + 1}
                                </span>
                              </p>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                                {session.userEmail}
                              </p>
                            </div>
                          </div>

                          {isSessionActive ? (
                            <span className="shrink-0 bg-emerald-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1 shadow-xs animate-pulse">
                              <span className="h-1.5 w-1.5 rounded-full bg-white" />
                              Active Session
                            </span>
                          ) : (
                            <span className="shrink-0 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                              <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                              Completed
                            </span>
                          )}
                        </div>

                        {/* Timestamp Box */}
                        <div className="mt-3.5 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
                            <Clock className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                            <span>
                              {session.startFormatted}
                              <span className="text-slate-400 mx-1.5">→</span>
                              {isSessionActive ? (
                                <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                                  Currently In Progress
                                </span>
                              ) : (
                                session.endFormatted
                              )}
                            </span>
                          </div>

                          <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900 px-2 py-0.5 rounded-md border border-slate-200/60 dark:border-slate-800">
                            {isSessionActive ? (
                              <span className="text-emerald-600 dark:text-emerald-400">Live Session</span>
                            ) : (
                              <span>
                                {durationHours > 0 ? `${durationHours}h ` : ""}
                                {durationMins}m
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === "history" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <History className="h-3.5 w-3.5 text-indigo-500" />
                  <span>Other Users on {data.deviceName}</span>
                </h4>
                <span className="text-[11px] text-slate-400">
                  All recorded dates
                </span>
              </div>

              {otherDateSessions.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 dark:bg-slate-950/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 space-y-2">
                  <History className="h-8 w-8 text-slate-300 dark:text-slate-600 mx-auto" />
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    No sessions on other dates
                  </p>
                  <p className="text-[11px] text-slate-400">
                    This laptop has only been logged on {data.displayDate}.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {otherDateSessions.map((hist, idx) => (
                    <div
                      key={hist.logId || idx}
                      className="p-3 bg-white dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="h-7 w-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-bold text-xs flex items-center justify-center shrink-0">
                            {hist.userName ? hist.userName.charAt(0).toUpperCase() : "U"}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-xs text-slate-900 dark:text-white truncate">
                              {hist.userName}
                            </p>
                            <p className="text-[10px] text-slate-400 truncate">
                              {hist.userEmail}
                            </p>
                          </div>
                        </div>

                        <Badge
                          variant="outline"
                          className="text-[10px] font-bold px-2 py-0.5 bg-slate-50 dark:bg-slate-900 shrink-0"
                        >
                          📅 {hist.date}
                        </Badge>
                      </div>

                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
                        <span className="flex items-center gap-1 font-medium">
                          <Clock className="h-3 w-3 text-slate-400" />
                          {hist.startFormatted} → {hist.endFormatted}
                        </span>
                        {hist.durationMinutes && (
                          <span className="font-bold text-slate-700 dark:text-slate-300">
                            {Math.floor(hist.durationMinutes / 60)}h {hist.durationMinutes % 60}m
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Panel Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50 flex items-center justify-between shrink-0">
          <p className="text-[11px] text-slate-400 flex items-center gap-1.5">
            <Info className="h-3.5 w-3.5" />
            <span>Time stamps recorded in UTC+6 (Bangladesh Standard Time).</span>
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            className="rounded-xl text-xs font-bold h-8 cursor-pointer"
          >
            Close Panel
          </Button>
        </div>
      </div>
    </>,
    document.body
  );
}
