import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, Clock, User, Zap } from 'lucide-react';

export interface MachineLog {
    rfid: string;
    name: string;
    command: string; // "ON", "OFF", etc.
    machineId: string;
    start: string;
    stop: string;
    duration: number;
}

export interface MachineData {
    id: string;
    name: string;
    logs: MachineLog[];
    isOnline: boolean;
    currentUser: string;
}

interface MachineCardProps {
    machine: MachineData;
}

export const MachineCard: React.FC<MachineCardProps> = ({ machine }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    // Get previous users (filtering out current session if online)
    // Filter out 'Unknown' users from history
    const previousLogs = machine.logs
        .slice(1) // Skip the first one (latest) as that's handled by 'currentUser' logic usually
        .filter(log => log.name && log.name !== 'Unknown') // Filter out unknown
        .slice(0, 5); // Take top 5 accurate ones

    return (
        <Card className="p-4 border-l-4 border-l-slate-200 overflow-hidden relative transition-all hover:shadow-md">
            {/* Status Indicator Bar */}
            <div className="flex justify-between items-start mb-2">
                <div>
                    <h3 className="text-lg font-bold flex items-center gap-2">
                        {machine.name}
                        <span className={`h-2.5 w-2.5 rounded-full animate-pulse ${machine.isOnline ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-red-400'}`} />
                    </h3>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mt-0.5">
                        {machine.isOnline ? 'Active Now' : 'Offline'}
                    </p>
                </div>

                {machine.isOnline && (
                    <div className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded text-xs font-bold flex items-center gap-1">
                        <Zap className="w-3 h-3" /> In Use
                    </div>
                )}
            </div>

            {/* Current User Section */}
            <div className="mb-4 bg-slate-50 p-3 rounded-lg border border-slate-100">
                <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">
                    {machine.isOnline ? 'Current Operator' : 'Last Operator'}
                </p>
                <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xs">
                        {machine.currentUser ? machine.currentUser.charAt(0) : '?'}
                    </div>
                    <div>
                        <p className="font-bold text-sm text-slate-800">{machine.currentUser || 'Unknown'}</p>
                        {/* Time display hidden as per request */}
                    </div>
                </div>
            </div>

            {/* Previous User (Immediate) */}
            {previousLogs.length > 0 && (
                <div className="mb-3 px-1">
                    <p className="text-[10px] text-slate-400 uppercase font-bold mb-1">Previously Used By</p>
                    <div className="flex justify-between items-center text-sm">
                        <span className="font-medium text-slate-700 flex items-center gap-1.5">
                            <User className="w-3 h-3 text-slate-400" /> {previousLogs[0].name}
                        </span>
                    </div>
                </div>
            )}

            {/* Show More / History */}
            {previousLogs.length > 1 && (
                <div className="mt-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="w-full text-xs h-7 text-muted-foreground hover:bg-slate-50"
                        onClick={() => setIsExpanded(!isExpanded)}
                    >
                        {isExpanded ? 'Hide History' : 'Show Recent History'}
                        {isExpanded ? <ChevronUp className="w-3 h-3 ml-1" /> : <ChevronDown className="w-3 h-3 ml-1" />}
                    </Button>

                    {isExpanded && (
                        <div className="mt-2 space-y-2 border-t border-slate-100 pt-2">
                            {previousLogs.slice(1).map((log, idx) => (
                                <div key={idx} className="flex justify-between items-center text-xs p-1.5 hover:bg-slate-50 rounded transition-colors">
                                    <div className="flex items-center gap-2">
                                        <div className="w-1 h-1 rounded-full bg-slate-300" />
                                        <span className="text-slate-700 font-medium">{log.name}</span>
                                    </div>
                                    {/* Time hidden */}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </Card>
    );
};

// Helpers
const formatTime = (dateStr: string) => {
    if (!dateStr) return '';
    try {
        const d = new Date(dateStr);
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (e) { return dateStr; }
};

const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    try {
        const d = new Date(dateStr);
        return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
    } catch (e) { return dateStr; }
};
