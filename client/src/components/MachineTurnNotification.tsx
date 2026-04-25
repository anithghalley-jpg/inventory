import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Clock, Zap, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

export const MachineTurnNotification: React.FC<{ scriptUrl: string }> = ({ scriptUrl }) => {
    const { user } = useAuth();
    const convexMachines = useQuery(api.machines.getAll);
    const passTurn = useMutation(api.machines.passTurn);
    const startSession = useMutation(api.machines.startSession);

    const [activeTurnMachine, setActiveTurnMachine] = useState<any>(null);

    useEffect(() => {
        if (!convexMachines || !user) return;

        // Find if any machine is reserved for the current user
        const myTurnMachine = convexMachines.find(m => m.status === "RESERVED" && m.currentTurnEmail === user.email);
        
        if (myTurnMachine) {
            setActiveTurnMachine(myTurnMachine);
        } else {
            setActiveTurnMachine(null);
        }
    }, [convexMachines, user]);

    const handleStart = async () => {
        if (!activeTurnMachine) return;
        try {
            await startSession({
                machineId: activeTurnMachine.machineId,
                userEmail: user?.email || '',
                userName: user?.name || '',
                scriptUrl: scriptUrl
            });
            toast.success(`Session started on ${activeTurnMachine.name}`);
            setActiveTurnMachine(null);
        } catch (e: any) {
            toast.error(e.message || "Failed to start session");
        }
    };

    const handlePass = async () => {
        if (!activeTurnMachine) return;
        try {
            await passTurn({
                machineId: activeTurnMachine.machineId,
                userEmail: user?.email || ''
            });
            toast.info(`Turn passed for ${activeTurnMachine.name}`);
            setActiveTurnMachine(null);
        } catch (e: any) {
            toast.error(e.message || "Failed to pass turn");
        }
    };

    if (!activeTurnMachine) return null;

    return (
        <Dialog open={!!activeTurnMachine} onOpenChange={() => {}}>
            <DialogContent className="sm:max-w-md border-emerald-500 border-2 shadow-2xl shadow-emerald-100">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-black text-emerald-600 flex items-center gap-2 uppercase tracking-tight">
                        <Zap className="w-6 h-6 animate-pulse text-amber-500 fill-amber-500" />
                        It's Your Turn!
                    </DialogTitle>
                    <DialogDescription className="text-slate-600 text-lg font-medium">
                        The <strong>{activeTurnMachine.name}</strong> is now available for you.
                    </DialogDescription>
                </DialogHeader>
                <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100 flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full bg-white flex items-center justify-center shadow-sm">
                        <Clock className="w-6 h-6 text-emerald-600" />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-emerald-900 leading-tight">Reserved for you</p>
                        <p className="text-xs text-emerald-600">You were next in the waiting list.</p>
                    </div>
                </div>
                <DialogFooter className="flex flex-col sm:flex-row gap-3 mt-4">
                    <Button 
                        variant="outline" 
                        onClick={handlePass}
                        className="flex-1 border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-rose-600 hover:border-rose-200 font-bold h-12 rounded-xl transition-all"
                    >
                        Pass it to Next
                    </Button>
                    <Button 
                        onClick={handleStart}
                        className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-black h-12 rounded-xl shadow-lg shadow-emerald-200 group transition-all"
                    >
                        Start My Session
                        <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
