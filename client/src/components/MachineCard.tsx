import React, { useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, Clock, User, Zap, Users, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { useMutation } from 'convex/react';
import { toast } from 'sonner';

export interface MachineLog {
    rfid: string;
    name: string;
    command: string; // "ON", "OFF", etc.
    machineId: string;
    start: string;
    stop: string;
    duration: number;
    note?: string;
}

export interface MachineData {
    id: string;
    name: string;
    isOnline: boolean;
    currentUser: string;
    waitingList?: { userEmail: string; userName: string; note: string; timestamp: number }[];
    currentTurnEmail?: string;
    currentTurnName?: string;
}

interface MachineCardProps {
    machine: MachineData;
    actionButton?: React.ReactNode;
    hideHistory?: boolean;
}

export const MachineCard: React.FC<MachineCardProps> = ({ machine, actionButton, hideHistory = false }) => {
    const { user } = useAuth();
    const [isExpanded, setIsExpanded] = useState(false);
    const [showBookModal, setShowBookModal] = useState(false);
    const [bookingNote, setBookingNote] = useState('');
    const convexLogs = useQuery(api.machines.getLogsByMachine, { machineId: machine.id });

    const bookMutation = useMutation(api.machines.bookMachine);
    const cancelMutation = useMutation(api.machines.cancelBooking);

    const isInQueue = machine.waitingList?.some(u => u.userEmail === user?.email);
    const queueCount = machine.waitingList?.length || 0;
    const isQueueFull = queueCount >= 5;

    const handleBook = async () => {
        if (!bookingNote.trim()) return;
        try {
            await bookMutation({
                machineId: machine.id,
                userEmail: user?.email || '',
                userName: user?.name || '',
                note: bookingNote
            });
            toast.success("Added to waiting list");
            setShowBookModal(false);
            setBookingNote('');
        } catch (e: any) {
            toast.error(e.message || "Failed to book");
        }
    };

    const handleCancelBooking = async () => {
        try {
            await cancelMutation({
                machineId: machine.id,
                userEmail: user?.email || ''
            });
            toast.success("Removed from waiting list");
        } catch (e: any) {
            toast.error(e.message || "Failed to cancel booking");
        }
    };

    // Helper functions for duration calculation
    const calculateDuration = (start: string, stop: string) => {
        if (!start || !stop) return 0;
        try {
            const startMs = new Date(start).getTime();
            const stopMs = new Date(stop).getTime();
            return Math.floor((stopMs - startMs) / 60000); // Minutes
        } catch (e) { return 0; }
    };

    const formatDuration = (mins: number) => {
        if (mins < 60) return `${mins}m`;
        const h = Math.floor(mins / 60);
        const m = mins % 60;
        return m > 0 ? `${h}h ${m}m` : `${h}h`;
    };

    // Map Convex logs to MachineLog interface
    const machineLogs: MachineLog[] = (convexLogs || []).map(log => {
        const durationMins = calculateDuration(log.startTime, log.endTime || '');
        return {
            rfid: '', // Not used currently
            name: log.userName,
            command: log.command || 'ON',
            machineId: log.machineId,
            start: log.startTime,
            stop: log.endTime || '',
            duration: durationMins,
            note: log.note
        };
    });

    // Get ONLY completed sessions for the "Previous User" section
    const completedLogs = machineLogs.filter(log => log.stop);
    const lastPreviousUser = completedLogs.length > 0 ? completedLogs[0] : null;

    // The history should show all other completed logs
    const historyLogs = completedLogs.slice(1);

    return (
        <Card className="p-4 border-l-4 border-l-slate-200 overflow-hidden relative transition-all hover:shadow-md">
            {/* ... preserved Status Indicator Bar ... */}
            <div className="flex justify-between items-start mb-2">
                <div>
                    <h3 className="text-lg font-bold flex items-center gap-2">
                        {machine.name}
                        <span className={`h-2.5 w-2.5 rounded-full animate-pulse ${machine.isOnline ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-red-400'}`} />
                    </h3>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mt-0.5">
                        {machine.isOnline ? 'Active Now' : (machine.currentTurnEmail ? 'Reserved' : 'Offline')}
                    </p>
                </div>

                {machine.isOnline && (
                    <div className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded text-xs font-bold flex items-center gap-1">
                        <Zap className="w-3 h-3" /> In Use
                    </div>
                )}
                {!machine.isOnline && machine.currentTurnEmail && (
                    <div className="bg-amber-100 text-amber-700 px-2 py-1 rounded text-xs font-bold flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Reserved
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
                    </div>
                </div>
            </div>

            {/* Previous User (Enhanced Detail) */}
            {lastPreviousUser && (
                <div className="mb-3 px-1">
                    <p className="text-[10px] text-slate-400 uppercase font-bold mb-1">Last Previous User</p>
                    <div className="space-y-1">
                        <div className="flex justify-between items-center text-sm">
                            <span className="font-medium text-slate-700 flex items-center gap-1.5">
                                <User className="w-3 h-3 text-slate-400" /> {lastPreviousUser.name}
                            </span>
                            <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-500 font-mono">
                                {formatDuration(lastPreviousUser.duration)}
                            </span>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-slate-400">
                            <Clock className="w-3 h-3" />
                            <span>{formatDate(lastPreviousUser.start)} at {formatTime(lastPreviousUser.start)}</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Action Button for Users (Start/End Session) */}
            {actionButton && <div className="mb-2">{actionButton}</div>}

            {/* Waiting List / Booking Feature */}
            {machine.isOnline && (
                <div className="mb-4 space-y-2">
                    <div className="flex items-center justify-between px-1">
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                            <Users className="w-3 h-3" /> Waiting List ({queueCount}/5)
                        </div>
                        {isInQueue && (
                            <button 
                                onClick={handleCancelBooking}
                                className="text-[10px] text-rose-500 hover:text-rose-600 font-bold flex items-center gap-0.5"
                            >
                                <X className="w-3 h-3" /> Cancel Mine
                            </button>
                        )}
                    </div>

                    {machine.waitingList && machine.waitingList.length > 0 && (
                        <div className="space-y-1 bg-slate-50/50 rounded-lg p-2 border border-slate-100">
                            {machine.waitingList.map((entry, idx) => (
                                <div key={idx} className="flex flex-col gap-0.5 text-[10px] border-b border-slate-100/50 last:border-0 pb-1 mb-1 last:pb-0 last:mb-0">
                                    <div className="flex justify-between items-center">
                                        <span className="font-bold text-slate-700">{idx + 1}. {entry.userName}</span>
                                        <span className="text-[9px] text-slate-400 italic">#{idx + 1} in line</span>
                                    </div>
                                    <p className="text-slate-500 italic truncate" title={entry.note}>"{entry.note}"</p>
                                </div>
                            ))}
                        </div>
                    )}

                    {!isInQueue && machine.currentUser !== user?.name && (
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={isQueueFull}
                            onClick={() => setShowBookModal(true)}
                            className="w-full text-xs h-8 border-dashed border-emerald-200 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700"
                        >
                            {isQueueFull ? 'Waiting List Full' : 'Book Next in Line'}
                        </Button>
                    )}
                </div>
            )}

            {/* Booking Dialog */}
            <Dialog open={showBookModal} onOpenChange={setShowBookModal}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold flex items-center gap-2">
                            <Clock className="w-5 h-5 text-emerald-500" />
                            Book {machine.name}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="booking-note" className="text-slate-700 font-medium text-sm">
                                Why do you need to use this machine? (Small note for others)
                            </Label>
                            <Textarea
                                id="booking-note"
                                placeholder="Example: Need to cut 3mm MDF for project X..."
                                className="h-24 resize-none rounded-xl"
                                value={bookingNote}
                                onChange={(e) => setBookingNote(e.target.value)}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setShowBookModal(false)}>Cancel</Button>
                        <Button 
                            onClick={handleBook} 
                            disabled={!bookingNote.trim()}
                            className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl"
                        >
                            Join Waiting List
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Show More / History (up to 9 more) - Conditionally Hidden */}
            {!hideHistory && historyLogs.length > 0 && (
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
                            {historyLogs.map((log, idx) => (
                                <div key={idx} className="flex justify-between items-center text-[10px] p-1.5 hover:bg-slate-50 rounded transition-colors group">
                                    <div className="flex flex-col">
                                        <span className="text-slate-700 font-bold">{log.name}</span>
                                        <span className="text-slate-400">{formatDate(log.start)} • {formatTime(log.start)}</span>
                                    </div>
                                    <span className="font-mono text-slate-500 bg-slate-50 px-1 rounded border border-slate-100">
                                        {formatDuration(log.duration)}
                                    </span>
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
