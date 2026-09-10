import React, { useState, useMemo, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Laptop,
  Search,
  Check,
  X,
  Sparkles,
  Cpu,
  Hash,
  Activity,
  Layers,
} from "lucide-react";

export interface RegisteredDevice {
  _id: string;
  deviceId: string;
  name: string;
  serialNumber: string;
  macAddress: string;
  brand: string;
  status?: string;
  currentUserName?: string;
  currentUserEmail?: string;
  notes?: string;
}

interface DeviceSelectModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  devices: RegisteredDevice[];
  onConfirm: (selectedDevice: { deviceId: string; name: string }) => void;
  onCancel: () => void;
  userName?: string;
}

export default function DeviceSelectModal({
  open,
  onOpenChange,
  devices = [],
  onConfirm,
  onCancel,
  userName = "User",
}: DeviceSelectModalProps) {
  const [inputValue, setInputValue] = useState("");
  const [selectedDevice, setSelectedDevice] = useState<RegisteredDevice | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset state on open
  useEffect(() => {
    if (open) {
      setInputValue("");
      setSelectedDevice(null);
      setIsDropdownOpen(true);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  // Filter suggestions based on input
  const suggestions = useMemo(() => {
    const q = inputValue.trim().toLowerCase();
    if (!q) return devices;
    return devices.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        d.brand.toLowerCase().includes(q) ||
        d.serialNumber.toLowerCase().includes(q) ||
        d.macAddress.toLowerCase().includes(q)
    );
  }, [devices, inputValue]);

  const handleSelectDevice = (device: RegisteredDevice) => {
    setSelectedDevice(device);
    setInputValue(device.name);
    setIsDropdownOpen(false);
  };

  const handleConfirm = () => {
    if (selectedDevice) {
      onConfirm({
        deviceId: selectedDevice.deviceId,
        name: selectedDevice.name,
      });
      onOpenChange(false);
      return;
    }

    // If typed a matching name
    const exactMatch = devices.find(
      (d) => d.name.toLowerCase() === inputValue.trim().toLowerCase()
    );
    if (exactMatch) {
      onConfirm({
        deviceId: exactMatch.deviceId,
        name: exactMatch.name,
      });
      onOpenChange(false);
      return;
    }

    // If typed a custom name
    const customName = inputValue.trim();
    if (customName) {
      onConfirm({
        deviceId: `custom_${customName.toLowerCase().replace(/[^a-z0-9]+/g, "_")}`,
        name: customName,
      });
      onOpenChange(false);
    }
  };

  const getBrandBadgeClass = (brand: string) => {
    const b = (brand || "").toLowerCase();
    if (b.includes("apple") || b.includes("mac"))
      return "bg-slate-900 text-white border-slate-700";
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

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) onCancel();
        onOpenChange(isOpen);
      }}
    >
      <DialogContent className="max-w-md w-full p-0 overflow-hidden rounded-3xl border-slate-200 dark:border-slate-800 shadow-2xl bg-white dark:bg-slate-900">
        {/* Header */}
        <DialogHeader className="p-5 pb-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-indigo-600 text-white flex items-center justify-center shadow-md shrink-0">
              <Laptop className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                Select Lab Device
              </DialogTitle>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Which computer or workstation are you using today?
              </p>
            </div>
          </div>
        </DialogHeader>

        {/* Form Body */}
        <div className="p-5 space-y-4">
          <div className="space-y-2 relative">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
              <span>Device Name / Number</span>
              <span className="text-[10px] text-slate-400 font-normal">
                Type or select from registered devices
              </span>
            </label>

            <div className="relative">
              <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <Input
                ref={inputRef}
                value={inputValue}
                onChange={(e) => {
                  setInputValue(e.target.value);
                  setSelectedDevice(null);
                  setIsDropdownOpen(true);
                }}
                onFocus={() => setIsDropdownOpen(true)}
                placeholder="e.g. LAPTOP-01, MacBook Lab A..."
                className="pl-9 pr-9 h-11 text-xs rounded-xl font-medium border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-950/50 focus-visible:ring-emerald-500"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    if (suggestions.length > 0 && !selectedDevice) {
                      handleSelectDevice(suggestions[0]);
                    } else {
                      handleConfirm();
                    }
                  }
                }}
              />
              {inputValue && (
                <button
                  type="button"
                  onClick={() => {
                    setInputValue("");
                    setSelectedDevice(null);
                    setIsDropdownOpen(true);
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Suggestions Dropdown List */}
            {isDropdownOpen && suggestions.length > 0 && (
              <div className="max-h-56 overflow-y-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-xl p-1.5 space-y-1 z-50">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2.5 py-1">
                  Registered Devices ({suggestions.length})
                </div>
                {suggestions.map((device) => {
                  const isSelected = selectedDevice?.deviceId === device.deviceId;
                  const isBusy = device.status === "IN_USE";

                  return (
                    <div
                      key={device.deviceId}
                      onClick={() => handleSelectDevice(device)}
                      className={`px-3 py-2.5 rounded-xl cursor-pointer transition-all flex items-center justify-between gap-3 text-xs ${
                        isSelected
                          ? "bg-emerald-50 text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-100 font-bold border border-emerald-200 dark:border-emerald-800"
                          : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="h-7 w-7 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400 shrink-0">
                          <Laptop className="h-3.5 w-3.5" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 dark:text-white truncate">
                              {device.name}
                            </span>
                            <Badge
                              variant="outline"
                              className={`text-[9px] px-1.5 py-0 uppercase font-extrabold ${getBrandBadgeClass(
                                device.brand
                              )}`}
                            >
                              {device.brand}
                            </Badge>
                          </div>
                          <p className="text-[10px] text-slate-400 truncate mt-0.5">
                            SN: {device.serialNumber || "-"} • MAC: {device.macAddress || "-"}
                          </p>
                        </div>
                      </div>

                      {isBusy && (
                        <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 text-[9px] font-bold border-amber-200 shrink-0">
                          In Use ({device.currentUserName || "Member"})
                        </Badge>
                      )}

                      {isSelected && (
                        <div className="h-5 w-5 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
                          <Check className="h-3 w-3" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Selected Device Preview Card */}
          {selectedDevice && (
            <div className="p-3 bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/80 rounded-2xl flex items-center justify-between text-xs animate-in fade-in-50 duration-200">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="h-8 w-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs shrink-0">
                  <Check className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-emerald-950 dark:text-emerald-100 truncate">
                    {selectedDevice.name}
                  </p>
                  <p className="text-[11px] text-emerald-700 dark:text-emerald-300 truncate">
                    Brand: <span className="font-semibold">{selectedDevice.brand}</span> | SN:{" "}
                    <span className="font-mono">{selectedDevice.serialNumber}</span>
                  </p>
                </div>
              </div>
              <Badge className="bg-emerald-600 text-white text-[10px] font-bold uppercase shadow-xs">
                Ready
              </Badge>
            </div>
          )}

          {/* Fallback note if no devices configured */}
          {devices.length === 0 && (
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 text-center space-y-1">
              <Cpu className="h-6 w-6 text-slate-400 mx-auto" />
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                No registered devices found
              </p>
              <p className="text-[11px] text-slate-400">
                Type the name of the device you are working on to log your session.
              </p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <DialogFooter className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 flex flex-row items-center justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              onCancel();
              onOpenChange(false);
            }}
            className="rounded-xl text-xs font-bold h-9"
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleConfirm}
            disabled={!inputValue.trim() && !selectedDevice}
            className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold h-9 shadow-md shadow-emerald-500/20 gap-1.5"
          >
            <Check className="h-3.5 w-3.5" />
            <span>Confirm & Start Work</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
