import React, { useState, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Laptop,
  Plus,
  Search,
  Check,
  Edit2,
  Trash2,
  Clock,
  Calendar,
  Activity,
  Cpu,
  Layers,
  Sparkles,
  Sliders,
  Filter,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Shield,
  RotateCcw,
  ArrowRight,
  ChevronRight,
  Info,
} from "lucide-react";
import { toast } from "sonner";
import DeviceSidePanel, { SelectedSidePanelData } from "./DeviceSidePanel";

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
  createdAt: string;
  updatedAt: string;
}

const BRAND_OPTIONS = [
  "Dell",
  "Apple / Mac",
  "Lenovo",
  "HP",
  "Asus",
  "Acer",
  "Microsoft Surface",
  "Custom / Other",
];

export default function DeviceUsageTracker() {
  const matrixData = useQuery(api.devices.get30DayMatrix);
  const settingsData = useQuery(api.devices.getSettings);
  const updateSettingsMut = useMutation(api.devices.updateSettings);
  const registerDeviceMut = useMutation(api.devices.registerDevice);
  const updateDeviceMut = useMutation(api.devices.updateDevice);
  const deleteDeviceMut = useMutation(api.devices.deleteDevice);

  // View Mode: "daily" (default) | "matrix" | "inventory"
  const [activeViewMode, setActiveViewMode] = useState<"daily" | "matrix" | "inventory">("daily");
  const [filterOnlyActiveDays, setFilterOnlyActiveDays] = useState(false);

  // Side Panel State
  const [selectedSidePanel, setSelectedSidePanel] = useState<SelectedSidePanelData | null>(null);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBrandFilter, setSelectedBrandFilter] = useState("all");

  // Device Add/Edit Modal
  const [deviceModalOpen, setDeviceModalOpen] = useState(false);
  const [editingDevice, setEditingDevice] = useState<DeviceItem | null>(null);
  const [deviceForm, setDeviceForm] = useState({
    name: "",
    brand: "Dell",
    serialNumber: "",
    macAddress: "",
    notes: "",
  });

  // Delete Confirmation
  const [deleteConfirmDevice, setDeleteConfirmDevice] = useState<DeviceItem | null>(null);

  // Master switch handler
  const handleToggleDeviceTracking = async (checked: boolean) => {
    try {
      await updateSettingsMut({
        enableDeviceTracking: checked,
      });
      toast.success(
        checked
          ? "Device tracking requirement ENABLED for all dashboards."
          : "Device tracking requirement DISABLED (Standard mode)."
      );
    } catch (err: any) {
      console.error("Failed to update setting:", err);
      toast.error(err?.message || "Failed to update setting");
    }
  };

  // Open Add Modal
  const handleOpenAddModal = () => {
    setEditingDevice(null);
    setDeviceForm({
      name: "",
      brand: "Dell",
      serialNumber: "",
      macAddress: "",
      notes: "",
    });
    setDeviceModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (dev: DeviceItem) => {
    setEditingDevice(dev);
    setDeviceForm({
      name: dev.name,
      brand: dev.brand || "Dell",
      serialNumber: dev.serialNumber || "",
      macAddress: dev.macAddress || "",
      notes: dev.notes || "",
    });
    setDeviceModalOpen(true);
  };

  // Save Device Form
  const handleSaveDevice = async () => {
    const trimmedName = deviceForm.name.trim();
    if (!trimmedName) {
      toast.error("Device Name / Number is required");
      return;
    }

    try {
      if (editingDevice) {
        await updateDeviceMut({
          deviceId: editingDevice.deviceId,
          name: trimmedName,
          brand: deviceForm.brand,
          serialNumber: deviceForm.serialNumber,
          macAddress: deviceForm.macAddress,
          notes: deviceForm.notes,
        });
        toast.success(`Device "${trimmedName}" updated.`);
      } else {
        await registerDeviceMut({
          name: trimmedName,
          brand: deviceForm.brand,
          serialNumber: deviceForm.serialNumber,
          macAddress: deviceForm.macAddress,
          notes: deviceForm.notes,
        });
        toast.success(`Device "${trimmedName}" registered successfully.`);
      }
      setDeviceModalOpen(false);
    } catch (err: any) {
      console.error("Failed to save device:", err);
      toast.error(err?.message || "Failed to save device");
    }
  };

  // Delete Device
  const handleDeleteDevice = async () => {
    if (!deleteConfirmDevice) return;
    try {
      await deleteDeviceMut({
        deviceId: deleteConfirmDevice.deviceId,
      });
      toast.success(`Device "${deleteConfirmDevice.name}" removed.`);
      setDeleteConfirmDevice(null);
    } catch (err: any) {
      console.error("Failed to delete device:", err);
      toast.error(err?.message || "Failed to delete device");
    }
  };

  // Devices & Logs from matrix query
  const devices = (matrixData?.devices || []) as DeviceItem[];
  const dates = matrixData?.dates || [];
  const logs = matrixData?.logs || [];

  // Filter devices
  const filteredDevices = useMemo(() => {
    return devices.filter((d) => {
      if (selectedBrandFilter !== "all" && !d.brand.toLowerCase().includes(selectedBrandFilter.toLowerCase())) {
        return false;
      }
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        d.name.toLowerCase().includes(q) ||
        d.serialNumber.toLowerCase().includes(q) ||
        d.macAddress.toLowerCase().includes(q) ||
        d.brand.toLowerCase().includes(q)
      );
    });
  }, [devices, searchQuery, selectedBrandFilter]);

  // Index logs by [deviceId][date] -> list of formatted logs
  const logsByDeviceAndDate = useMemo(() => {
    const map = new Map<string, Map<string, typeof logs>>();
    logs.forEach((l) => {
      if (!map.has(l.deviceId)) {
        map.set(l.deviceId, new Map());
      }
      const byDate = map.get(l.deviceId)!;
      if (!byDate.has(l.date)) {
        byDate.set(l.date, []);
      }
      byDate.get(l.date)!.push(l);
    });
    return map;
  }, [logs]);

  // Daily Usage Breakdown: For each day, find devices used on that day
  const dailyUsageList = useMemo(() => {
    // Newest date first (Today -> 29 days ago)
    const reversedDates = [...dates].reverse();

    return reversedDates.map((d) => {
      const dateLogs = logs.filter((l) => l.date === d.date);

      // Group logs by deviceId
      const deviceMap = new Map<string, typeof logs>();
      dateLogs.forEach((l) => {
        if (!deviceMap.has(l.deviceId)) {
          deviceMap.set(l.deviceId, []);
        }
        deviceMap.get(l.deviceId)!.push(l);
      });

      const devicesUsed: Array<{
        deviceId: string;
        deviceName: string;
        deviceDoc?: DeviceItem;
        brand: string;
        serialNumber: string;
        sessions: typeof logs;
        totalMinutes: number;
        userNames: string[];
        isActiveNow: boolean;
      }> = [];

      deviceMap.forEach((sessions, devId) => {
        const devDoc = devices.find((dev) => dev.deviceId === devId);
        const devName = sessions[0]?.deviceName || devDoc?.name || devId;
        const brand = devDoc?.brand || "Generic";
        const serialNumber = devDoc?.serialNumber || "-";
        const totalMinutes = sessions.reduce((acc, s) => acc + (s.durationMinutes || 0), 0);
        const userNames = Array.from(new Set(sessions.map((s) => s.userName || s.userEmail.split("@")[0])));
        const isActiveNow = sessions.some((s) => s.isActive);

        devicesUsed.push({
          deviceId: devId,
          deviceName: devName,
          deviceDoc: devDoc,
          brand,
          serialNumber,
          sessions,
          totalMinutes,
          userNames,
          isActiveNow,
        });
      });

      // Sort devices by name (e.g. 5-ASC, 6-ASC...)
      devicesUsed.sort((a, b) =>
        a.deviceName.localeCompare(b.deviceName, undefined, { numeric: true, sensitivity: "base" })
      );

      const totalDayMinutes = devicesUsed.reduce((acc, d) => acc + d.totalMinutes, 0);

      return {
        ...d,
        devicesUsed,
        totalDayMinutes,
        totalDaySessions: dateLogs.length,
      };
    });
  }, [dates, logs, devices]);

  // Lookups for the active side panel
  const selectedDeviceDoc = useMemo(() => {
    if (!selectedSidePanel) return undefined;
    return devices.find((d) => d.deviceId === selectedSidePanel.deviceId);
  }, [devices, selectedSidePanel]);

  const sessionsForSidePanel = useMemo(() => {
    if (!selectedSidePanel) return [];
    return logs.filter(
      (l) => l.deviceId === selectedSidePanel.deviceId && l.date === selectedSidePanel.date
    );
  }, [logs, selectedSidePanel]);

  // KPI calculations
  const totalInUseNow = useMemo(() => {
    return devices.filter((d) => d.status === "IN_USE").length;
  }, [devices]);

  const totalLogs30d = logs.length;

  const totalMinutes30d = useMemo(() => {
    return logs.reduce((acc, l) => acc + (l.durationMinutes || 0), 0);
  }, [logs]);

  const getBrandBadgeClass = (brand: string) => {
    const b = (brand || "").toLowerCase();
    if (b.includes("apple") || b.includes("mac"))
      return "bg-slate-900 text-white border-slate-700 dark:bg-white dark:text-slate-900";
    if (b.includes("dell"))
      return "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950 dark:text-sky-300";
    if (b.includes("lenovo"))
      return "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950 dark:text-rose-300";
    if (b.includes("hp"))
      return "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300";
    if (b.includes("asus"))
      return "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-300";
    return "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300";
  };

  const isEnabled = Boolean(settingsData?.enableDeviceTracking);

  return (
    <div className="space-y-6">
      {/* ── 1. Top Hero / Control Header ── */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 sm:p-7 shadow-xl border border-slate-800">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <div className="h-10 w-10 rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center shadow-inner">
                <Laptop className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-black tracking-tight">
                  Device Management & Usage Tracker
                </h2>
                <p className="text-xs text-slate-300">
                  Track devices used per day, inspect member timestamps, and manage hardware inventory (GMT+6)
                </p>
              </div>
            </div>
          </div>

          {/* Master Enable/Disable Control */}
          <div className="flex flex-wrap items-center gap-4 bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800/80 shrink-0">
            <div className="flex items-center gap-3">
              <div className="space-y-0.5">
                <p className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <Shield className="h-3.5 w-3.5 text-indigo-400" />
                  Require Device Selection
                </p>
                <p className="text-[11px] text-slate-400">
                  Prompt users for device when toggling work online
                </p>
              </div>
              <Switch
                checked={isEnabled}
                onCheckedChange={handleToggleDeviceTracking}
                className="data-[state=checked]:bg-emerald-500"
              />
            </div>

            <div className="h-6 w-[1px] bg-slate-800 hidden sm:block" />

            <Button
              onClick={handleOpenAddModal}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl h-9 shadow-md shadow-emerald-600/20 gap-1.5 cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Add Device</span>
            </Button>
          </div>
        </div>

        {/* KPI Mini Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-slate-800/80">
          <div className="bg-slate-950/40 p-3 rounded-2xl border border-slate-800/60">
            <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
              Total Registered
            </p>
            <p className="text-xl font-black text-white mt-0.5">{devices.length}</p>
          </div>

          <div className="bg-slate-950/40 p-3 rounded-2xl border border-slate-800/60">
            <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
              In Use Today
            </p>
            <div className="flex items-center gap-2 mt-0.5">
              <p className="text-xl font-black text-emerald-400">{totalInUseNow}</p>
              {totalInUseNow > 0 && (
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              )}
            </div>
          </div>

          <div className="bg-slate-950/40 p-3 rounded-2xl border border-slate-800/60">
            <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
              30-Day Sessions
            </p>
            <p className="text-xl font-black text-indigo-300 mt-0.5">{totalLogs30d}</p>
          </div>

          <div className="bg-slate-950/40 p-3 rounded-2xl border border-slate-800/60">
            <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
              Total Screen Time (30d)
            </p>
            <p className="text-xl font-black text-cyan-300 mt-0.5">
              {Math.floor(totalMinutes30d / 60)}h {totalMinutes30d % 60}m
            </p>
          </div>
        </div>
      </div>

      {/* ── 2. View Mode Switcher Bar ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 p-2 sm:p-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-950 rounded-xl">
          <button
            type="button"
            onClick={() => setActiveViewMode("daily")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeViewMode === "daily"
                ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-black"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Calendar className="h-3.5 w-3.5 text-emerald-600" />
            <span>Daily Activity (By Day)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveViewMode("matrix")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeViewMode === "matrix"
                ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-black"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Layers className="h-3.5 w-3.5 text-indigo-500" />
            <span>30-Day Matrix Table</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveViewMode("inventory")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeViewMode === "inventory"
                ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-black"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Cpu className="h-3.5 w-3.5 text-cyan-500" />
            <span>Device Inventory ({devices.length})</span>
          </button>
        </div>

        {activeViewMode === "daily" && (
          <div className="flex items-center gap-2 px-2">
            <span className="text-xs text-slate-500 font-medium">Show only days with activity:</span>
            <Switch
              checked={filterOnlyActiveDays}
              onCheckedChange={setFilterOnlyActiveDays}
              className="data-[state=checked]:bg-emerald-500"
            />
          </div>
        )}
      </div>

      {/* ── 3. VIEW MODE: Daily Activity (By Day) ── */}
      {activeViewMode === "daily" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              For each day, the active device IDs are shown below. Click any device to open the side panel and inspect all users with timestamps.
            </p>
            <span className="text-xs font-bold text-slate-400">
              Showing past 30 days (Newest first)
            </span>
          </div>

          <div className="space-y-4">
            {dailyUsageList
              .filter((day) => (filterOnlyActiveDays ? day.devicesUsed.length > 0 : true))
              .map((day) => {
                const hasDevices = day.devicesUsed.length > 0;

                return (
                  <div
                    key={day.date}
                    className={`rounded-3xl border transition-all ${
                      day.isToday
                        ? "bg-emerald-50/20 dark:bg-emerald-950/10 border-emerald-300 dark:border-emerald-800/80 shadow-xs"
                        : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-2xs"
                    }`}
                  >
                    {/* Day Header Banner */}
                    <div className="p-4 sm:p-5 pb-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 flex-wrap">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`h-9 w-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                            day.isToday
                              ? "bg-emerald-600 text-white shadow-xs"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                          }`}
                        >
                          <Calendar className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white">
                              {day.displayDate} ({day.dayOfWeek || "GMT+6"})
                            </h4>
                            {day.isToday && (
                              <Badge className="bg-emerald-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-2xs">
                                Today (Day 30)
                              </Badge>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                            {day.date}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge
                          variant="outline"
                          className={`text-xs font-bold px-2.5 py-1 ${
                            hasDevices
                              ? "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800"
                              : "bg-slate-50 text-slate-500 border-slate-200 dark:bg-slate-950 dark:text-slate-400"
                          }`}
                        >
                          {day.devicesUsed.length} Device{day.devicesUsed.length === 1 ? "" : "s"} Used
                        </Badge>
                        {hasDevices && (
                          <>
                            <Badge
                              variant="outline"
                              className="text-xs font-bold px-2.5 py-1 bg-indigo-50 text-indigo-800 border-indigo-200 dark:bg-indigo-950 dark:text-indigo-300 dark:border-indigo-800"
                            >
                              {day.totalDaySessions} Session{day.totalDaySessions === 1 ? "" : "s"}
                            </Badge>
                            <Badge
                              variant="outline"
                              className="text-xs font-bold px-2.5 py-1 bg-cyan-50 text-cyan-800 border-cyan-200 dark:bg-cyan-950 dark:text-cyan-300 dark:border-cyan-800"
                            >
                              {Math.floor(day.totalDayMinutes / 60)}h {day.totalDayMinutes % 60}m Total
                            </Badge>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Devices Used Grid for this Day */}
                    <div className="p-4 sm:p-5">
                      {!hasDevices ? (
                        <p className="text-xs text-slate-400 italic py-1">
                          No devices were logged active on this day.
                        </p>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                          {day.devicesUsed.map((dev) => (
                            <button
                              key={dev.deviceId}
                              id={`device-card-${dev.deviceId}`}
                              type="button"
                              onClick={() =>
                                setSelectedSidePanel({
                                  deviceId: dev.deviceId,
                                  deviceName: dev.deviceName,
                                  date: day.date,
                                  displayDate: day.displayDate,
                                  dayOfWeek: day.dayOfWeek,
                                  isToday: day.isToday,
                                })
                              }
                              className="group text-left p-3.5 bg-slate-50/70 hover:bg-white dark:bg-slate-950/50 dark:hover:bg-slate-800/80 border border-slate-200/80 hover:border-emerald-400 dark:border-slate-800 dark:hover:border-emerald-600 rounded-2xl shadow-2xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between space-y-2.5"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 min-w-0">
                                  <div className="h-7 w-7 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 flex items-center justify-center shrink-0">
                                    <Laptop className="h-3.5 w-3.5" />
                                  </div>
                                  <span className="font-extrabold text-sm text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors truncate">
                                    {dev.deviceName}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <Badge
                                    variant="outline"
                                    className={`text-[9px] px-1.5 py-0 uppercase font-extrabold ${getBrandBadgeClass(
                                      dev.brand
                                    )}`}
                                  >
                                    {dev.brand}
                                  </Badge>
                                  {dev.isActiveNow && (
                                    <span
                                      className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shrink-0"
                                      title="Live active session"
                                    />
                                  )}
                                </div>
                              </div>

                              <div className="space-y-1">
                                <p className="text-[11px] text-slate-600 dark:text-slate-300 line-clamp-1">
                                  <span className="font-bold text-slate-400">Users:</span>{" "}
                                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                                    {dev.userNames.join(", ")}
                                  </span>
                                </p>
                                <p className="text-[10px] text-slate-400 truncate font-mono">
                                  SN: {dev.serialNumber}
                                </p>
                              </div>

                              <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800 flex items-center justify-between text-[11px]">
                                <span className="text-slate-500 dark:text-slate-400 font-medium">
                                  {dev.sessions.length} session{dev.sessions.length > 1 ? "s" : ""} •{" "}
                                  {Math.floor(dev.totalMinutes / 60)}h {dev.totalMinutes % 60}m
                                </span>
                                <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                                  <span>View Users</span>
                                  <ArrowRight className="h-3 w-3" />
                                </span>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* ── 4. VIEW MODE: 30-Day Matrix Table ── */}
      {activeViewMode === "matrix" && (
        <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
          <div className="p-4 sm:p-5 pb-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-emerald-600" />
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">
                30-Day Rolling Usage Matrix (GMT+6)
              </h3>
            </div>
            <p className="text-[11px] text-slate-400">
              Click any cell with activity to open the side panel with timestamps
            </p>
          </div>

          {/* Scrollable Matrix Table */}
          <div className="overflow-x-auto max-w-full">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-950/70 border-b border-slate-200 dark:border-slate-800">
                  {/* Col 1: Device Name / Number (Sticky) */}
                  <th className="p-3.5 pl-5 font-bold text-slate-700 dark:text-slate-300 sticky left-0 z-20 bg-slate-50 dark:bg-slate-950 min-w-[180px] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] border-r border-slate-200 dark:border-slate-800">
                    Device Name / Number
                  </th>

                  {/* Col 2: Specs Collection (Sticky) */}
                  <th className="p-3.5 font-bold text-slate-700 dark:text-slate-300 sticky left-[180px] z-20 bg-slate-50 dark:bg-slate-950 min-w-[240px] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] border-r border-slate-200 dark:border-slate-800">
                    Specs [ Serial, MAC, Brand ]
                  </th>

                  {/* Columns 3 to 32: 30 Rolling Days */}
                  {dates.map((d) => (
                    <th
                      key={d.date}
                      className={`p-2.5 text-center min-w-[180px] border-r border-slate-100 dark:border-slate-800 ${
                        d.isToday
                          ? "bg-emerald-50/80 dark:bg-emerald-950/40 text-emerald-950 dark:text-emerald-100 font-extrabold"
                          : "text-slate-600 dark:text-slate-400"
                      }`}
                    >
                      <div className="flex flex-col items-center">
                        <span className="text-[9px] uppercase font-bold text-slate-400">
                          {d.isToday ? "Day 30 (Today)" : `Day ${d.dayIndex}`}
                        </span>
                        <span
                          className={`text-xs font-bold ${
                            d.isToday ? "text-emerald-700 dark:text-emerald-300 font-black" : ""
                          }`}
                        >
                          {d.displayDate}
                        </span>
                        <span className="text-[10px] text-slate-400 font-normal">
                          {d.dayOfWeek}
                        </span>
                      </div>
                    </th>
                  ))}

                  {/* Actions Column */}
                  <th className="p-3.5 pr-5 text-right font-bold text-slate-700 dark:text-slate-300 sticky right-0 z-20 bg-slate-50 dark:bg-slate-950 min-w-[100px] shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.05)] border-l border-slate-200 dark:border-slate-800">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredDevices.length === 0 ? (
                  <tr>
                    <td
                      colSpan={dates.length + 3}
                      className="text-center py-12 text-slate-400 bg-slate-50/30 dark:bg-slate-950/20 space-y-2"
                    >
                      <Laptop className="h-8 w-8 text-slate-300 mx-auto" />
                      <p className="font-bold text-slate-700 dark:text-slate-300">
                        No devices registered yet
                      </p>
                      <p className="text-xs text-slate-400">
                        Click "Add Device" above to register your first lab computer or workstation.
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredDevices.map((dev) => {
                    const devLogsByDate = logsByDeviceAndDate.get(dev.deviceId);
                    const isBusy = dev.status === "IN_USE";

                    return (
                      <tr
                        key={dev.deviceId}
                        className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors group"
                      >
                        {/* Col 1: Device Name (Sticky) */}
                        <td className="p-3.5 pl-5 sticky left-0 z-10 bg-white dark:bg-slate-900 group-hover:bg-slate-50 dark:group-hover:bg-slate-900/90 border-r border-slate-200 dark:border-slate-800 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                          <div className="flex items-center gap-2.5">
                            <div className="h-8 w-8 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-300 shrink-0">
                              <Laptop className="h-4 w-4" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-slate-900 dark:text-slate-100 truncate">
                                {dev.name}
                              </p>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                {isBusy ? (
                                  <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-[9px] font-bold px-1.5 py-0">
                                    In Use ({dev.currentUserName || "Member"})
                                  </Badge>
                                ) : (
                                  <span className="text-[10px] text-slate-400 font-medium">
                                    Available
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Col 2: Specs Collection (Sticky) */}
                        <td className="p-3.5 sticky left-[180px] z-10 bg-white dark:bg-slate-900 group-hover:bg-slate-50 dark:group-hover:bg-slate-900/90 border-r border-slate-200 dark:border-slate-800 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                          <div className="p-2 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-1">
                            <div className="flex items-center justify-between gap-1">
                              <span className="text-[10px] font-bold text-slate-400">Brand:</span>
                              <Badge
                                variant="outline"
                                className={`text-[9px] px-1.5 py-0 font-bold uppercase ${getBrandBadgeClass(
                                  dev.brand
                                )}`}
                              >
                                {dev.brand}
                              </Badge>
                            </div>
                            <div className="flex items-center justify-between gap-1">
                              <span className="text-[10px] font-bold text-slate-400">SN:</span>
                              <span className="text-[11px] font-mono text-slate-700 dark:text-slate-300 truncate max-w-[140px]">
                                {dev.serialNumber || "-"}
                              </span>
                            </div>
                            <div className="flex items-center justify-between gap-1">
                              <span className="text-[10px] font-bold text-slate-400">MAC:</span>
                              <span className="text-[10px] font-mono text-slate-500 truncate max-w-[140px]">
                                {dev.macAddress || "-"}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Columns 3 to 32: Day Cells with clickable badges to open side panel */}
                        {dates.map((d) => {
                          const cellLogs = devLogsByDate?.get(d.date) || [];

                          return (
                            <td
                              key={d.date}
                              className={`p-2.5 align-top border-r border-slate-100 dark:border-slate-800 ${
                                d.isToday
                                  ? "bg-emerald-50/30 dark:bg-emerald-950/10"
                                  : ""
                              }`}
                            >
                              {cellLogs.length === 0 ? (
                                <div className="text-center text-slate-300 dark:text-slate-700 py-3 select-none text-[11px]">
                                  —
                                </div>
                              ) : (
                                <div
                                  onClick={() =>
                                    setSelectedSidePanel({
                                      deviceId: dev.deviceId,
                                      deviceName: dev.name,
                                      date: d.date,
                                      displayDate: d.displayDate,
                                      dayOfWeek: d.dayOfWeek,
                                      isToday: d.isToday,
                                    })
                                  }
                                  className="space-y-1.5 cursor-pointer group/cell"
                                  title="Click to view all users & timestamps in side panel"
                                >
                                  {cellLogs.map((log) => (
                                    <div
                                      key={log.logId}
                                      className={`p-1.5 px-2 rounded-xl text-[11px] font-medium border shadow-2xs leading-tight transition-transform group-hover/cell:scale-[1.02] ${
                                        log.isActive
                                          ? "bg-emerald-50 border-emerald-300 text-emerald-950 dark:bg-emerald-950 dark:border-emerald-700 dark:text-emerald-100 font-bold"
                                          : "bg-slate-50 border-slate-200 text-slate-800 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200"
                                      }`}
                                    >
                                      <div className="flex items-center gap-1.5">
                                        {log.isActive && (
                                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                                        )}
                                        <span className="truncate">
                                          <strong className="text-slate-900 dark:text-white">
                                            {log.userName || log.userEmail.split("@")[0]}
                                          </strong>{" "}
                                          <span className="text-[10px] text-slate-500 dark:text-slate-400">
                                            ({log.startFormatted} to {log.endFormatted})
                                          </span>
                                        </span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </td>
                          );
                        })}

                        {/* Actions (Sticky Right) */}
                        <td className="p-3.5 pr-5 text-right sticky right-0 z-10 bg-white dark:bg-slate-900 group-hover:bg-slate-50 dark:group-hover:bg-slate-900/90 border-l border-slate-200 dark:border-slate-800 shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => handleOpenEditModal(dev)}
                              className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950 rounded-lg transition-colors cursor-pointer"
                              title="Edit Device"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteConfirmDevice(dev)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950 rounded-lg transition-colors cursor-pointer"
                              title="Delete Device"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── 5. VIEW MODE: Hardware Inventory ── */}
      {activeViewMode === "inventory" && (
        <div className="space-y-4">
          {/* Filter & Search Bar */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="relative flex-1 min-w-[220px] max-w-md">
              <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by device name, serial number, MAC, or brand..."
                className="pl-9 text-xs rounded-xl h-9 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-700"
              />
            </div>

            <div className="flex items-center gap-2 overflow-x-auto">
              <span className="text-xs font-bold text-slate-400 mr-1 flex items-center gap-1">
                <Filter className="h-3.5 w-3.5" /> Brand:
              </span>
              <button
                type="button"
                onClick={() => setSelectedBrandFilter("all")}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  selectedBrandFilter === "all"
                    ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
                }`}
              >
                All ({devices.length})
              </button>
              {["Dell", "Mac", "Lenovo", "HP"].map((b) => (
                <button
                  key={b}
                  type="button"
                  onClick={() => setSelectedBrandFilter(b)}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    selectedBrandFilter.toLowerCase() === b.toLowerCase()
                      ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
                  }`}
                >
                  {b}
                </button>
              ))}
            </div>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredDevices.map((dev) => {
              const isBusy = dev.status === "IN_USE";
              return (
                <div
                  key={dev.deviceId}
                  className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-3.5 flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-300 shadow-inner shrink-0">
                          <Laptop className="h-5 w-5" />
                        </div>
                        <div>
                          <h4 className="font-extrabold text-base text-slate-900 dark:text-white">
                            {dev.name}
                          </h4>
                          <Badge
                            variant="outline"
                            className={`text-[9px] px-1.5 py-0 uppercase font-extrabold ${getBrandBadgeClass(
                              dev.brand
                            )}`}
                          >
                            {dev.brand}
                          </Badge>
                        </div>
                      </div>

                      {isBusy ? (
                        <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-[10px] font-bold">
                          In Use
                        </Badge>
                      ) : (
                        <Badge className="bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 text-[10px]">
                          Available
                        </Badge>
                      )}
                    </div>

                    <div className="p-3 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-100 dark:border-slate-800 space-y-1.5 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 font-bold">Serial Number:</span>
                        <span className="font-mono text-slate-700 dark:text-slate-300 font-medium">
                          {dev.serialNumber || "-"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 font-bold">MAC Address:</span>
                        <span className="font-mono text-slate-500">
                          {dev.macAddress || "-"}
                        </span>
                      </div>
                      {dev.notes && (
                        <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 dark:border-slate-800">
                          <span className="text-slate-400 font-bold">Notes:</span>
                          <span className="text-slate-600 dark:text-slate-400 truncate max-w-[180px]">
                            {dev.notes}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenEditModal(dev)}
                      className="rounded-xl text-xs font-bold h-8 cursor-pointer gap-1"
                    >
                      <Edit2 className="h-3 w-3" />
                      <span>Edit</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDeleteConfirmDevice(dev)}
                      className="rounded-xl text-xs font-bold h-8 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/50 cursor-pointer gap-1"
                    >
                      <Trash2 className="h-3 w-3" />
                      <span>Delete</span>
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── 6. Add / Edit Device Modal ── */}
      <Dialog open={deviceModalOpen} onOpenChange={setDeviceModalOpen}>
        <DialogContent className="max-w-md w-full p-0 overflow-hidden rounded-3xl border-slate-200 dark:border-slate-800 shadow-2xl bg-white dark:bg-slate-900">
          <DialogHeader className="p-5 pb-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shrink-0">
                <Laptop className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-slate-900 dark:text-slate-100">
                  {editingDevice ? "Edit Device Specs" : "Register New Lab Device"}
                </DialogTitle>
                <p className="text-xs text-slate-400 mt-0.5">
                  Enter device hardware credentials for user tracking
                </p>
              </div>
            </div>
          </DialogHeader>

          <div className="p-5 space-y-3.5">
            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Device Name / ID <span className="text-rose-500">*</span>
              </Label>
              <Input
                placeholder="e.g. 5-ASC, 10-ASC, LAPTOP-01"
                value={deviceForm.name}
                onChange={(e) => setDeviceForm({ ...deviceForm, name: e.target.value })}
                className="h-10 text-xs rounded-xl"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Device Brand Name
              </Label>
              <select
                value={deviceForm.brand}
                onChange={(e) => setDeviceForm({ ...deviceForm, brand: e.target.value })}
                className="w-full h-10 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 text-slate-900 dark:text-slate-100 font-medium focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              >
                {BRAND_OPTIONS.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Serial Number
                </Label>
                <Input
                  placeholder="e.g. FVFSTNKAH3QD"
                  value={deviceForm.serialNumber}
                  onChange={(e) =>
                    setDeviceForm({ ...deviceForm, serialNumber: e.target.value })
                  }
                  className="h-10 text-xs font-mono rounded-xl"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  MAC Address
                </Label>
                <Input
                  placeholder="e.g. 00:1A:2B:3C:4D:5E"
                  value={deviceForm.macAddress}
                  onChange={(e) =>
                    setDeviceForm({ ...deviceForm, macAddress: e.target.value })
                  }
                  className="h-10 text-xs font-mono rounded-xl"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Notes / Location (Optional)
              </Label>
              <Input
                placeholder="e.g. Station 4, 3D printing area, UBUNTU OS"
                value={deviceForm.notes}
                onChange={(e) => setDeviceForm({ ...deviceForm, notes: e.target.value })}
                className="h-10 text-xs rounded-xl"
              />
            </div>
          </div>

          <DialogFooter className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 flex flex-row items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDeviceModalOpen(false)}
              className="rounded-xl text-xs font-bold h-9 cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSaveDevice}
              className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold h-9 gap-1.5 cursor-pointer"
            >
              <Check className="h-3.5 w-3.5" />
              <span>{editingDevice ? "Save Changes" : "Register Device"}</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── 7. Delete Confirm Dialog ── */}
      <Dialog
        open={Boolean(deleteConfirmDevice)}
        onOpenChange={(open) => !open && setDeleteConfirmDevice(null)}
      >
        <DialogContent className="max-w-sm w-full p-5 rounded-3xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Trash2 className="h-4 w-4 text-rose-500" />
              Remove Device?
            </DialogTitle>
          </DialogHeader>

          <p className="text-xs text-slate-500 dark:text-slate-400">
            Are you sure you want to remove{" "}
            <strong className="text-slate-900 dark:text-white">
              "{deleteConfirmDevice?.name}"
            </strong>
            ? This action cannot be undone.
          </p>

          <DialogFooter className="pt-3 flex flex-row items-center justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeleteConfirmDevice(null)}
              className="rounded-xl text-xs font-bold h-9 cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDeleteDevice}
              className="rounded-xl text-xs font-bold h-9 cursor-pointer"
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── 8. Slide-Over Side Panel for Daily Device Sessions ── */}
      <DeviceSidePanel
        isOpen={Boolean(selectedSidePanel)}
        onClose={() => setSelectedSidePanel(null)}
        data={selectedSidePanel}
        device={selectedDeviceDoc}
        sessionsOnDate={sessionsForSidePanel}
      />
    </div>
  );
}
