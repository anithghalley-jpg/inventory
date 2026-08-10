import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import DashboardLanding from '@/components/DashboardLanding';
import { MachineCard } from '@/components/MachineCard';
import { MachineTurnNotification } from '@/components/MachineTurnNotification';
import ProjectAssignmentDialog from '@/components/ProjectAssignmentDialog';
import ProjectsWorkspace from '@/components/ProjectsWorkspace';
import MyPlansTab from '@/components/MyPlansTab';
import {
    Search, Package, LogOut, Users as UsersIcon,
    LayoutDashboard, ShoppingBag, History, Monitor,
    Printer, Scissors, Zap, BookOpen, XCircle, Sparkles, FolderKanban
} from 'lucide-react';
import { toast } from 'sonner';

import { SCRIPT_URL } from '@/config';
import { getTagStyle } from '@/lib/tagUtils';
import { getOptimizedImageUrl } from '@/lib/utils';
import { useQuery, useMutation, usePaginatedQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";

const glowStyles = [
    {
        border: 'border-emerald-400',
        shadow: 'shadow-[0_0_15px_rgba(16,185,129,0.35)]',
        hoverShadow: 'hover:shadow-[0_0_25px_rgba(16,185,129,0.55)]',
        beforeBorder: 'before:border-emerald-400/50',
        iconColor: 'text-emerald-500',
        textColor: 'text-emerald-900',
        badgeBg: 'bg-emerald-100',
        badgeText: 'text-emerald-700',
        badgeBorder: 'border-emerald-200'
    },
    {
        border: 'border-blue-400',
        shadow: 'shadow-[0_0_15px_rgba(59,130,246,0.35)]',
        hoverShadow: 'hover:shadow-[0_0_25px_rgba(59,130,246,0.55)]',
        beforeBorder: 'before:border-blue-400/50',
        iconColor: 'text-blue-500',
        textColor: 'text-blue-900',
        badgeBg: 'bg-blue-100',
        badgeText: 'text-blue-700',
        badgeBorder: 'border-blue-200'
    },
    {
        border: 'border-violet-400',
        shadow: 'shadow-[0_0_15px_rgba(139,92,246,0.35)]',
        hoverShadow: 'hover:shadow-[0_0_25px_rgba(139,92,246,0.55)]',
        beforeBorder: 'before:border-violet-400/50',
        iconColor: 'text-violet-500',
        textColor: 'text-violet-900',
        badgeBg: 'bg-violet-100',
        badgeText: 'text-violet-700',
        badgeBorder: 'border-violet-200'
    },
    {
        border: 'border-rose-400',
        shadow: 'shadow-[0_0_15px_rgba(244,63,94,0.35)]',
        hoverShadow: 'hover:shadow-[0_0_25px_rgba(244,63,94,0.55)]',
        beforeBorder: 'before:border-rose-400/50',
        iconColor: 'text-rose-500',
        textColor: 'text-rose-900',
        badgeBg: 'bg-rose-100',
        badgeText: 'text-rose-700',
        badgeBorder: 'border-rose-200'
    },
    {
        border: 'border-amber-400',
        shadow: 'shadow-[0_0_15px_rgba(245,158,11,0.35)]',
        hoverShadow: 'hover:shadow-[0_0_25px_rgba(245,158,11,0.55)]',
        beforeBorder: 'before:border-amber-400/50',
        iconColor: 'text-amber-500',
        textColor: 'text-amber-900',
        badgeBg: 'bg-amber-100',
        badgeText: 'text-amber-700',
        badgeBorder: 'border-amber-200'
    },
    {
        border: 'border-cyan-400',
        shadow: 'shadow-[0_0_15px_rgba(6,182,212,0.35)]',
        hoverShadow: 'hover:shadow-[0_0_25px_rgba(6,182,212,0.55)]',
        beforeBorder: 'before:border-cyan-400/50',
        iconColor: 'text-cyan-500',
        textColor: 'text-cyan-900',
        badgeBg: 'bg-cyan-100',
        badgeText: 'text-cyan-700',
        badgeBorder: 'border-cyan-200'
    },
    {
        border: 'border-fuchsia-400',
        shadow: 'shadow-[0_0_15px_rgba(217,70,239,0.35)]',
        hoverShadow: 'hover:shadow-[0_0_25px_rgba(217,70,239,0.55)]',
        beforeBorder: 'before:border-fuchsia-400/50',
        iconColor: 'text-fuchsia-500',
        textColor: 'text-fuchsia-900',
        badgeBg: 'bg-fuchsia-100',
        badgeText: 'text-fuchsia-700',
        badgeBorder: 'border-fuchsia-200'
    }
];

const getGlowStyleIndex = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return Math.abs(hash) % glowStyles.length;
};

// Helper: Generate Unique HSL Colors for a User
const getDynamicGlow = (str: string, customTheme?: string) => {
    if (customTheme && customTheme.trim() !== '') {
        const ct = customTheme.trim();
        return {
            hue: 0,
            glow: ct,
            hoverGlow: ct,
            border: ct,
            beforeBorder: ct,
            bg: 'rgba(255, 255, 255, 0.5)', 
            text: ct,
            icon: ct
        };
    }
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const h = Math.abs(hash) % 360;
    return {
        hue: h,
        glow: `hsla(${h}, 70%, 50%, 0.35)`,
        hoverGlow: `hsla(${h}, 70%, 50%, 0.55)`,
        border: `hsl(${h}, 70%, 65%)`,
        beforeBorder: `hsla(${h}, 70%, 65%, 0.5)`,
        bg: `hsl(${h}, 80%, 96%)`,
        text: `hsl(${h}, 80%, 25%)`,
        icon: `hsl(${h}, 70%, 50%)`
    };
};

// Helper: Identify FAB Users (4+ tags or FA certification)
const isFabUser = (u: any) => {
    const hasFatag = u.tags?.some((t: string) => t.toLowerCase().startsWith("fa 20"));
    return hasFatag || (u.tags?.length || 0) >= 4;
};

// Helper: Custom Saluting Figure Icon (Half Body)
const SaluteIcon = ({ className = "w-4 h-4", style }: { className?: string, style?: React.CSSProperties }) => (
    <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        style={style}
    >
        {/* Head */}
        <circle cx="9" cy="7" r="4" />
        {/* Torso */}
        <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        {/* Saluting Arm/Hand */}
        <path d="M18 10l2-2l-2-2" className="animate-pulse" />
        <path d="M15 10h5" />
    </svg>
);

// Helper to sort tags (FA 20XX tags at the beginning)
const sortUserTags = (tags: string[] = []) => {
    return [...tags].sort((a, b) => {
        const isFA_a = a.toLowerCase().startsWith("fa 20");
        const isFA_b = b.toLowerCase().startsWith("fa 20");
        if (isFA_a && !isFA_b) return -1;
        if (!isFA_a && isFA_b) return 1;
        return a.localeCompare(b);
    });
};

// Types
interface InventoryItem {
    id: string;
    name: string;
    quantity: number;
    category: string;
    company: string;
    imageUrl: string;
    remarks?: string;
    links?: string;
    tags?: string;
}

interface User {
    id: string;
    _id?: string;
    name: string;
    email: string;
    status: string;
    role: string;
    createdDate: string;
    laptopStatus?: string;
    totalTime?: number;
    tags?: string[];
    myPageLink?: string;
    profileImageUrl?: string;
    customTheme?: string;
}

interface UsageRecord {
    id: string;
    itemId: string;
    itemName: string;
    userEmail: string;
    action: 'CHECKOUT' | 'RETURN';
    quantity: number;
    timestamp: string;
    actionBy?: string;
    imageUrl?: string;
    returnStatus?: string;
    returnRequestStatus?: string;
    returnTarget?: string;
    userName?: string;
    status?: string;
}

interface ProjectAssignmentRecord {
    projectId: string;
    projectName: string;
    projectStatus: string;
    requestId: string;
}

export default function TeamDashboard() {
    const { user, logout, isAuthenticated } = useAuth();
    const [, navigate] = useLocation();

    // Data State
    const [isLoading, setIsLoading] = useState(true);
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [categories, setCategories] = useState<string[]>([]);
    const [myItems, setMyItems] = useState<UsageRecord[]>([]);
    const [allUsers, setAllUsers] = useState<User[]>([]);
    const [activeRequests, setActiveRequests] = useState<any[]>([]);
    const [pendingReturns, setPendingReturns] = useState<any[]>([]);
    const [pendingCheckouts, setPendingCheckouts] = useState<any[]>([]); // New State
    const [approvers, setApprovers] = useState<User[]>([]);

    // Pagination State (Removed for Firestore Real-time)
    // const [page, setPage] = useState(1);
    // const [hasMore, setHasMore] = useState(true);
    // const PAGE_SIZE = 50;

    // Actions State
    const [editProfileOpen, setEditProfileOpen] = useState(false);
    const [editProfileImage, setEditProfileImage] = useState("");
    const [editProfileTheme, setEditProfileTheme] = useState("");
    const [editProfileLink, setEditProfileLink] = useState("");
    const [isSavingProfile, setIsSavingProfile] = useState(false);
    const updateProfileMutation = useMutation(api.users.updateProfile);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
    const [checkoutQuantity, setCheckoutQuantity] = useState('1');
    const [viewItem, setViewItem] = useState<InventoryItem | null>(null);
    const [returnItem, setReturnItem] = useState<UsageRecord | null>(null);
    const [returnTarget, setReturnTarget] = useState('');
    const [selectedReturn, setSelectedReturn] = useState<any | null>(null);
    const [returnRemarks, setReturnRemarks] = useState('');
    const [projectAssignmentTarget, setProjectAssignmentTarget] = useState<UsageRecord | null>(null);
    const [activeTab, setActiveTab] = useState('store');

    const [communitySearchQuery, setCommunitySearchQuery] = useState('');
    const [selectedCommunityTag, setSelectedCommunityTag] = useState('all');
    const [monitorSearchQuery, setMonitorSearchQuery] = useState('');

    // Laptop State
    const [laptopStatus, setLaptopStatus] = useState<'Online' | 'Offline'>(user?.laptopStatus || 'Offline');
    const [totalScreenTime, setTotalScreenTime] = useState(user?.totalTime || 0);

    // Machine Logic State
    const [showMachineNoteModal, setShowMachineNoteModal] = useState(false);
    const [machineToEnd, setMachineToEnd] = useState<string | null>(null);
    const [fabricationNote, setFabricationNote] = useState('');

    // Community Search & Filter Logic
    const availableTags = useMemo(() => {
        const tags = new Set<string>();
        allUsers.forEach(u => {
            if (u.tags && Array.isArray(u.tags)) {
                u.tags.forEach((t: string) => tags.add(t));
            }
        });
        return Array.from(tags).sort();
    }, [allUsers]);

    const filteredCommunityUsers = useMemo(() => {
        return allUsers.filter(u => {
            const matchesSearch = !communitySearchQuery ||
                (u.name || "").toLowerCase().includes(communitySearchQuery.toLowerCase()) ||
                (u.email || "").toLowerCase().includes(communitySearchQuery.toLowerCase());

            const matchesTag = selectedCommunityTag === 'all' ||
                (u.tags && u.tags.includes(selectedCommunityTag));

            return matchesSearch && matchesTag;
        });
    }, [allUsers, communitySearchQuery, selectedCommunityTag]);

    const filteredTeam = useMemo(() =>
        filteredCommunityUsers
            .filter(u => u.role === 'TEAM' || u.role === 'ADMIN')
            .sort((a, b) => (b.tags?.length || 0) - (a.tags?.length || 0)),
        [filteredCommunityUsers]);

    const filteredStudents = useMemo(() =>
        filteredCommunityUsers.filter(u => u.role === 'USER'),
        [filteredCommunityUsers]);

    const filteredOnlineUsers = useMemo(() => {
        return allUsers.filter(u => {
            if (u.laptopStatus !== 'Online') return false;
            const matchesSearch = !monitorSearchQuery ||
                (u.name || "").toLowerCase().includes(monitorSearchQuery.toLowerCase()) ||
                (u.email || "").toLowerCase().includes(monitorSearchQuery.toLowerCase());
            return matchesSearch;
        });
    }, [allUsers, monitorSearchQuery]);

    // Initial Side Effects
    useEffect(() => {
        if (user) {
            setLaptopStatus(user.laptopStatus || 'Offline');
            setTotalScreenTime(user.totalTime || 0);
        }
    }, [user]);

    // Track if we're using the fallback (Sheets) or Convex
    const [inventorySource, setInventorySource] = React.useState<'convex' | 'sheets' | 'loading'>('loading');
    
    // Server-side pagination and search/category filtering
    const {
        results: paginatedInventory,
        status: paginatedStatus,
        loadMore: loadMoreInventory
    } = usePaginatedQuery(
        api.inventory.getPaginated,
        {
            searchTerm: searchQuery,
            category: selectedCategory
        },
        { initialNumItems: 30 }
    );

    // Helper: load inventory from Google Sheets (Golden Rule fallback)
    const fetchInventoryFromSheets = React.useCallback(async () => {
        try {
            const res = await fetch(SCRIPT_URL, {
                method: 'POST',
                body: JSON.stringify({ action: 'getInventory' }),
            });
            const result = await res.json();
            if (result.success && result.inventory) {
                const items: InventoryItem[] = result.inventory.map((item: any) => ({
                    id: item.id,
                    name: item.name,
                    quantity: item.quantity,
                    category: item.category,
                    company: item.company,
                    imageUrl: item.imageUrl,
                    remarks: item.remarks,
                    links: item.links,
                    tags: Array.isArray(item.tags) ? item.tags.join(',') : (item.tags || '')
                }));
                setInventory(items);
                const uniqueCats = Array.from(new Set(items.map((i) => i.category)));
                setCategories(['all', ...uniqueCats as string[]]);
                setInventorySource('sheets');
            }
        } catch (err) {
            console.error('Sheets fallback also failed:', err);
            setInventorySource('sheets');
        }
    }, []);

    // Inventory: Convex is primary. Sheets is the error-only fallback.
    useEffect(() => {
        if (paginatedInventory !== undefined) {
            const items: InventoryItem[] = paginatedInventory.map(doc => ({
                id: doc.itemId || doc._id,
                name: doc.name || '',
                quantity: doc.quantity || 0,
                category: doc.category || 'Uncategorized',
                company: doc.company || '',
                imageUrl: doc.imageUrl || '',
                remarks: doc.remarks || '',
                links: doc.links || '',
                tags: doc.tags || [],
                scriptUrl: SCRIPT_URL
            })) as unknown as InventoryItem[];
            setInventory(items);
            if (paginatedStatus === 'LoadingMore') {
               setInventorySource('loading');
            } else {
               setInventorySource('convex');
            }
        }
    }, [paginatedInventory, paginatedStatus]);

    useEffect(() => {
        if (isAuthenticated && (user?.role === 'TEAM' || user?.role === 'ADMIN')) {
            fetchUsers();
        }
    }, [isAuthenticated, user]);

    // Data Fetching Logic
    const convexRequests = useQuery(api.requests.getAll);
    const convexUsers = useQuery(api.users.getAll);

    const checkoutRequestMut = useMutation(api.requests.checkoutRequest);
    const initiateReturnMut = useMutation(api.requests.initiateReturn);
    const processReturnMut = useMutation(api.requests.processReturn);
    const cancelReturnMut = useMutation(api.requests.cancelReturn);
    const approveCheckoutMut = useMutation(api.requests.approveCheckoutRequest);
    const cancelCheckoutRequestMut = useMutation(api.requests.cancelCheckoutRequest);
    const toggleLaptopMut = useMutation(api.users.toggleLaptop);
    const updateUserStatusMut = useMutation(api.users.updateStatus);

    // Machine Queries & Mutations
    const convexMachines = useQuery(api.machines.getAll);
    const convexDashboardUpdates = useQuery(api.dashboardUpdates.getForAudience, {
        audience: "team",
        userEmail: user?.email || "",
    });
    const projectWorkspace = useQuery(api.projects.getMemberWorkspace, {
        userEmail: user?.email || "",
    });
    const projectAssignments = useQuery(api.projects.getAssignmentsOverview);
    const adminSettings = useQuery(api.settings.getAdmin);
    const startMachineMutation = useMutation(api.machines.startSession);
    const endMachineMutation = useMutation(api.machines.endSession);
    const addItemToProjectMut = useMutation(api.projects.addItemToProject);

    useEffect(() => {
        if (!convexUsers || !convexRequests) return;

        setAllUsers(convexUsers.map((u: any) => ({ ...u, id: u._id })));

        const vApprovers = convexUsers
            .filter((u: any) => (u.role === 'ADMIN' || u.role === 'TEAM') && u.status === 'APPROVED')
            .map((u: any) => ({ ...u, id: u._id }));

        // My Active Checkouts
        setMyItems(convexRequests.filter((r: any) =>
            r.userEmail === user?.email &&
            (r.status === 'APPROVED' || r.status === 'PENDING') &&
            r.returnStatus !== 'RETURN_APPROVED' &&
            (r.returnStatus || '').toLowerCase() !== 'yes'
        ).map((r: any) => ({ ...r, id: r.date })));

        // Incoming Returns
        setPendingReturns(convexRequests.filter((r: any) =>
            r.status === 'APPROVED' &&
            r.returnStatus === 'RETURN_PENDING' &&
            (user?.role === 'ADMIN' || r.returnTarget === user?.name)
        ));

        // Pending Checkouts
        const teamPendingCheckouts = convexRequests.filter((r: any) => {
            const requester = convexUsers.find((u: any) => u.email === r.userEmail);
            const isRequesterTeam = requester?.role === 'TEAM' || requester?.role === 'ADMIN';
            return r.status === 'PENDING' && !isRequesterTeam;
        });
        setPendingCheckouts(teamPendingCheckouts);

        // Approvers Refinement
        if (user?.role === 'TEAM') {
            setApprovers(convexUsers
                .filter((u: any) => u.role === 'ADMIN' && u.status === 'APPROVED')
                .map((u: any) => ({ ...u, id: u._id })));
        } else {
            setApprovers(vApprovers);
        }

        // Active Loans
        setActiveRequests(convexRequests.filter((r: any) =>
            r.status === 'APPROVED' &&
            r.returnStatus !== 'RETURN_APPROVED' &&
            (r.returnStatus || '').toLowerCase() !== 'yes'
        ));
    }, [convexUsers, convexRequests, user]);

    // Keep function for the manual refresh button to not break UI
    const fetchUsers = async () => { };

    const fetchAllData = async () => {
        toast.success("Synchronized with Convex!");
    };

    // Actions Handlers
    const handleCheckout = async () => {
        if (!selectedItem) return;

        const itemToRequest = { ...selectedItem };
        const qty = checkoutQuantity;
        setSelectedItem(null); // Close modal immediately
        setCheckoutQuantity('1');

        toast.promise(
            checkoutRequestMut({
                userEmail: user?.email || '',
                userName: user?.name || '',
                itemId: itemToRequest.id,
                itemName: itemToRequest.name,
                quantity: parseInt(qty),
                scriptUrl: SCRIPT_URL
            }),
            {
                loading: `Requesting ${qty} ${itemToRequest.name}(s)...`,
                success: `Request sent!`,
                error: (err) => `Failed: ${err.message}`
            }
        );
    };

    const handleReturnSubmit = async () => {
        if (!returnItem || !returnTarget) return;

        const item = { ...returnItem };
        const target = returnTarget;

        setReturnItem(null);
        setReturnTarget('');

        toast.promise(
            initiateReturnMut({
                requestId: item.id,
                returnTarget: target,
                scriptUrl: SCRIPT_URL
            }),
            {
                loading: `Returning item to ${target}...`,
                success: `Return initiated!`,
                error: (err) => `Failed: ${err.message}`
            }
        );
    };

    const handleCancelReturn = async (req: any) => {
        toast.promise(
            cancelReturnMut({
                requestId: req.date,
                scriptUrl: SCRIPT_URL,
            }),
            {
                loading: 'Cancelling return request...',
                success: 'Return cancelled — item remains with you.',
                error: (err) => `Failed: ${err.message}`,
            }
        );
    };

    const handleProcessReturn = async () => {
        if (!selectedReturn) return;

        const returnData = { ...selectedReturn };
        const remarks = returnRemarks;

        setSelectedReturn(null);
        setReturnRemarks('');

        toast.promise(
            processReturnMut({
                requestId: returnData.date,
                approverName: user?.name || '',
                remarks,
                scriptUrl: SCRIPT_URL
            }),
            {
                loading: 'Receiving item...',
                success: 'Item successfully received!',
                error: (err) => `Failed: ${err.message}`
            }
        );
    };


    const handleCancelCheckout = async (req: any) => {
        // Optimistic Update
        const prevCheckouts = [...pendingCheckouts];
        setPendingCheckouts(prev => prev.filter(r => r.date !== req.date));

        toast.promise(
            cancelCheckoutRequestMut({
                requestId: req.date,
                scriptUrl: SCRIPT_URL,
            }).then(async (result) => {
                return result;
            }),
            {
                loading: 'Cancelling request...',
                success: 'Request Cancelled!',
                error: (err) => {
                    // Rollback on failure
                    setPendingCheckouts(prevCheckouts);
                    return `Cancellation failed: ${err.message}`;
                }
            }
        );
    };

    const handleApproveRequest = async (req: any) => {
        try {
            toast.success("Request Approved");
            await approveCheckoutMut({
                requestId: req.date,
                approverName: user?.name || '',
                scriptUrl: SCRIPT_URL
            });
        } catch (e) {
            toast.error("Approval failed");
        }
    };

    const handleLaptopToggle = async (checked: boolean) => {
        const newStatus = checked ? 'Online' : 'Offline';
        setLaptopStatus(newStatus);
        try {
            await toggleLaptopMut({
                email: user?.email || '',
                isTurningOn: checked,
                newTotal: totalScreenTime,
                scriptUrl: SCRIPT_URL,
            });
            if (newStatus === 'Offline') {
                toast.success('Session Ended.');
            } else {
                toast.success('Lab Session Started');
            }

        } catch (e) {
            toast.error("Status update failed");
            setLaptopStatus(checked ? 'Offline' : 'Online');
        }
    };

    const handleForceTurnOff = async (email: string) => {
        const targetUser = allUsers.find(u => u.email === email);
        toast.promise(
            toggleLaptopMut({
                email: email,
                isTurningOn: false,
                newTotal: targetUser?.totalTime || 0,
                scriptUrl: SCRIPT_URL,
            }),
            {
                loading: 'Forcing session to close...',
                success: 'User session terminated.',
                error: (err) => `Failed: ${err.message}`
            }
        );
    };

    const handleApprovePendingUser = async (email: string) => {
        await toast.promise(
            (async () => {
                const response = await fetch(SCRIPT_URL, {
                    method: 'POST',
                    body: JSON.stringify({ action: 'approveUser', userId: email }),
                });
                const result = await response.json();
                if (!response.ok || result?.success === false) {
                    throw new Error(result?.message || 'Failed to update Google Sheets approval');
                }

                await updateUserStatusMut({
                    email,
                    status: 'APPROVED',
                    scriptUrl: SCRIPT_URL,
                });
            })(),
            {
                loading: 'Approving user...',
                success: 'User approved.',
                error: (error: any) => error?.message || 'Approval failed',
            },
        );
    };

    const handleRejectPendingUser = async (email: string) => {
        await toast.promise(
            (async () => {
                const response = await fetch(SCRIPT_URL, {
                    method: 'POST',
                    body: JSON.stringify({ action: 'rejectUser', userId: email }),
                });
                const result = await response.json();
                if (!response.ok || result?.success === false) {
                    throw new Error(result?.message || 'Failed to update Google Sheets status');
                }

                await updateUserStatusMut({
                    email,
                    status: 'REJECTED',
                    scriptUrl: SCRIPT_URL,
                });
            })(),
            {
                loading: 'Rejecting application...',
                success: 'Application rejected.',
                error: (error: any) => error?.message || 'Rejection failed',
            },
        );
    };

    // Machine Session Handlers
    const handleStartMachine = async (id: string) => {
        try {
            await startMachineMutation({
                machineId: id,
                userEmail: user?.email || '',
                userName: user?.name || '',
                scriptUrl: SCRIPT_URL
            });
            toast.success("Machine Session Started");
        } catch (e: any) {
            toast.error(e.message || "Failed to start machine");
        }
    };

    const handleEndMachineClick = (id: string) => {
        setMachineToEnd(id);
        setFabricationNote('');
        setShowMachineNoteModal(true);
    };

    const handleConfirmEndMachine = async () => {
        if (!machineToEnd || !fabricationNote.trim()) return;

        const id = machineToEnd;
        const note = fabricationNote;

        setShowMachineNoteModal(false);
        setMachineToEnd(null);
        setFabricationNote('');

        try {
            await endMachineMutation({
                machineId: id,
                note: note,
                scriptUrl: SCRIPT_URL
            });
            toast.success("Session Ended.");
        } catch (e: any) {
            toast.error(e.message || "Failed to end machine session");
        }
    };

    const handleAddItemToProject = async (projectId: string) => {
        if (!projectAssignmentTarget || !user?.email) return;

        await addItemToProjectMut({
            projectId,
            userEmail: user.email,
            requestId: projectAssignmentTarget.id,
        });

        toast.success("Item added to the project box.");
        setProjectAssignmentTarget(null);
    };

    // Helpers
    const formatTime = (minutes: number) => {
        const hrs = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${hrs}h ${mins}m`;
    };

    const getItemImage = (itemName: string) => {
        const found = inventory.find(i => i.name === itemName);
        return getOptimizedImageUrl(found?.imageUrl || '');
    };

    const getItemObject = (itemName: string) => {
        return inventory.find(i => i.name === itemName);
    };

    // Access Check
    if (!isAuthenticated || (user?.role !== 'TEAM' && user?.role !== 'ADMIN')) {
        return <div className="h-screen flex items-center justify-center text-muted-foreground">Access Denied</div>;
    }

    /* --- FILTER LOGIC (Inlined) --- */
    // We do NOT filter locally anymore for store display since we use paginated query,
    // except for myItems and other local references where we might need a full list.
    // For the store itself, we just group the currently fetched inventory.
    const storeItemsToGroup = inventory;

    const groupedItems = storeItemsToGroup.reduce((acc, item) => {
        if (!acc[item.category]) acc[item.category] = [];
        acc[item.category].push(item);
        return acc;
    }, {} as Record<string, InventoryItem[]>);

    const activeMachineCount = (convexMachines || []).filter((machine) => machine.status === 'ENGAGED').length;
    const memberProjects = projectWorkspace?.projects ?? [];
    const viewerHasProjectMembership = memberProjects.some((project) => project.viewerIsMember);
    const showProjectsTab = memberProjects.length > 0 && (!!adminSettings?.allowPublicProjectAccess || viewerHasProjectMembership);
    const pendingApprovalUsers = allUsers.filter((member) => member.status === 'PENDING');

    // Project rejection notifications — any project the user is a member of that has an unresolved rejection note
    const projectRejectionAlerts = memberProjects.filter((project) => {
        if (!project.viewerIsMember) return false;
        const s = project.status;
        // Show rejection alert only when the team needs to resubmit (rejection note present + not yet re-pending)
        if (s === 'DRAFT' && project.setupRejectionNote) return true;          // Setup rejected
        if (s === 'SETUP_APPROVED' && project.boxRejectionNote) return true;   // Box rejected
        if (s === 'BOX_APPROVED' && project.planRejectionNote) return true;    // Plan rejected
        return false;
    });

    const hasLandingContent = (convexDashboardUpdates?.length ?? 0) > 0 || pendingApprovalUsers.length > 0 || projectRejectionAlerts.length > 0;

    const activeProjectOptions = useMemo(
        () =>
            memberProjects
                .filter((project) => project.status === 'ACTIVE' && project.viewerIsMember)
                .map((project) => ({
                    projectId: project.projectId,
                    name: project.name,
                })),
        [memberProjects],
    );
    const projectAssignmentByRequestId = useMemo(() => {
        const assignmentMap = new Map<string, ProjectAssignmentRecord>();
        (projectAssignments || []).forEach((assignment) => {
            assignmentMap.set(assignment.requestId, assignment);
        });
        return assignmentMap;
    }, [projectAssignments]);
    const teamStats = [
        {
            label: 'Inventory Lines',
            value: inventory.length,
            hint: 'Items your team can issue and track.',
        },
        {
            label: 'Pending Actions',
            value: pendingReturns.length + pendingCheckouts.length,
            hint: 'Returns and checkout approvals waiting on review.',
        },
        {
            label: 'Active Loans',
            value: activeRequests.length,
            hint: 'Approved requests currently out in the lab.',
        },
        {
            label: 'Live Machines',
            value: activeMachineCount,
            hint: 'Machines engaged in ongoing sessions right now.',
        },
    ];

    useEffect(() => {
        if (!hasLandingContent && activeTab === 'landing') {
            setActiveTab(showProjectsTab ? 'projects' : 'store');
        }
    }, [activeTab, hasLandingContent, showProjectsTab]);

    useEffect(() => {
        if (!showProjectsTab && activeTab === 'projects') {
            setActiveTab(hasLandingContent ? 'landing' : 'store');
        }
    }, [activeTab, hasLandingContent, showProjectsTab]);

    const teamTabCount =
        (hasLandingContent ? 1 : 0) +
        1 +
        1 +
        (showProjectsTab ? 1 : 0) +
        1 +
        1 +
        1 +
        1;

    // --- MAIN RENDER ---
    return (
        <div className="min-h-screen bg-slate-50">
            {/* TOP BAR */}
            <header className="bg-white border-b border-border sticky top-0 z-30 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center">
                            <Package className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <span className="font-display font-black text-xl leading-none tracking-tight group-hover:text-emerald-500 transition-colors">AESTHETIC</span>
                            <div className="flex items-center gap-2">
                                <span className="font-sans font-medium text-[0.65rem] leading-none tracking-[0.3em] text-emerald-600 group-hover:text-emerald-400 transition-colors mt-0.5 uppercase">Centre</span>
                                {isLoading && <span className="text-xs text-emerald-600 animate-pulse">• Syncing ...</span>}
                            </div>
                        </div>
                    </div>

                    {/* Center: 3D Army Badges */}
                    {user?.tags && user.tags.length > 0 && (
                        <div className="hidden md:flex items-center gap-3 mx-4">
                            <TooltipProvider>
                                {user.tags.map((tag, idx) => {
                                    const style = getTagStyle(tag);
                                    const dynamic = getDynamicGlow(user.email || '');
                                    return (
                                        <Tooltip key={idx}>
                                            <TooltipTrigger asChild>
                                                <span
                                                    style={{
                                                        '--dynamic-glow': dynamic.glow,
                                                        '--dynamic-border': dynamic.border
                                                    } as React.CSSProperties}
                                                    className={`
                                                        inline-flex items-center px-2.5 py-1 rounded
                                                        text-[9px] font-black uppercase tracking-tighter
                                                        ${style.color}
                                                        border-b-[3px] border-r-[2px] border-black
                                                        hover:translate-y-[-1px] hover:translate-x-[-0.5px] 
                                                        active:translate-y-[1px] active:translate-x-[0.5px] active:border-b-[1px] active:border-r-[0.5px]
                                                        transition-all cursor-help select-none shadow-[0_4px_10px_var(--dynamic-glow)]
                                                    `}
                                                >
                                                    {tag}
                                                </span>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                <p className="font-bold text-xs uppercase">Authorized: {tag}</p>
                                            </TooltipContent>
                                        </Tooltip>
                                    );
                                })}
                            </TooltipProvider>
                        </div>
                    )}

                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-3 bg-slate-100/50 px-3 py-1.5 rounded-full border border-border/50">
                            <div className="text-right mr-1 hidden sm:block">
                                <span className={`block text-xs font-bold ${laptopStatus === 'Online' ? 'text-emerald-500' : 'text-slate-500'}`}>
                                    {laptopStatus === 'Online' ? 'Online' : 'Offline'}
                                </span>
                                {laptopStatus === 'Offline' && <span className="block text-[10px] text-muted-foreground">{formatTime(totalScreenTime)}</span>}
                            </div>
                            <Switch checked={laptopStatus === 'Online'} onCheckedChange={handleLaptopToggle} className="data-[state=checked]:bg-emerald-500" />
                        </div>
                        
                        <Button 
                            variant="outline" 
                            size="sm" 
                            className="hidden sm:flex border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                            onClick={() => {
                                setEditProfileImage(user?.profileImageUrl || "");
                                setEditProfileTheme(user?.customTheme || "");
                                setEditProfileLink(user?.myPageLink || "");
                                setEditProfileOpen(true);
                            }}
                        >
                            <UsersIcon className="w-4 h-4 mr-2" /> Profile
                        </Button>

                        <Button variant="ghost" size="icon" className="text-muted-foreground" onClick={() => logout()}>
                            <LogOut className="w-5 h-5 text-red-400 hover:text-red-600" />
                        </Button>
                    </div>
                </div>
            </header>

            {/* MAIN CONTENT WITH TABS */}
            <main className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                        <TabsList className={`bg-white border border-slate-200 p-1 h-auto shadow-sm gap-1 self-start sm:self-auto overflow-x-auto max-w-full ${teamTabCount >= 7 ? 'w-full' : ''}`}>
                            {hasLandingContent && (
                                <TabsTrigger value="landing" className={`data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-700 ${activeTab !== 'landing' ? 'shadow-[0_0_18px_rgba(16,185,129,0.28)] ring-1 ring-emerald-200 animate-pulse' : ''}`}>
                                    <Sparkles className="w-4 h-4 mr-2" /> Landing
                                </TabsTrigger>
                            )}
                            <TabsTrigger value="store" className="data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-700">
                                <ShoppingBag className="w-4 h-4 mr-2" /> Store
                            </TabsTrigger>
                            <TabsTrigger value="my-items" className="data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-700">
                                <History className="w-4 h-4 mr-2" /> My Items
                                {myItems.length > 0 && <span className="ml-2 bg-slate-100 text-slate-600 text-[10px] font-bold px-1.5 rounded-full">{myItems.length}</span>}
                            </TabsTrigger>
                            {showProjectsTab && (
                                <TabsTrigger value="projects" className="data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-700">
                                    <FolderKanban className="w-4 h-4 mr-2" /> Projects
                                </TabsTrigger>
                            )}
                            <TabsTrigger value="users" className="data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-700">
                                <UsersIcon className="w-4 h-4 mr-2" /> Community
                            </TabsTrigger>
                            <TabsTrigger value="returns" className="data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-700">
                                <History className="w-4 h-4 mr-2" /> History & Returns
                                {(pendingReturns.length + pendingCheckouts.length) > 0 && <span className="ml-2 bg-yellow-100 text-yellow-700 text-[10px] font-bold px-1.5 rounded-full">{pendingReturns.length + pendingCheckouts.length}</span>}
                            </TabsTrigger>
                            <TabsTrigger value="monitor" className="data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-700">
                                <Monitor className="w-4 h-4 mr-2" /> Monitor
                            </TabsTrigger>
                            <TabsTrigger value="plans" className="data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-700">
                                <BookOpen className="w-4 h-4 mr-2" /> My plans
                            </TabsTrigger>
                            <TabsTrigger value="machines" className="data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-700">
                                <Zap className="w-4 h-4 mr-2" /> Machines
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    {hasLandingContent && (
                        <TabsContent value="landing" className="space-y-6 focus-visible:outline-none focus-visible:ring-0">

                            {/* ── Project rejection notifications ── */}
                            {projectRejectionAlerts.length > 0 && (
                                <div className="space-y-3">
                                    {projectRejectionAlerts.map((project) => {
                                        const isSetup = project.status === 'DRAFT' && project.setupRejectionNote;
                                        const isBox = project.status === 'SETUP_APPROVED' && project.boxRejectionNote;
                                        const isPlan = project.status === 'BOX_APPROVED' && project.planRejectionNote;
                                        const stepLabel = isSetup ? 'Step 1 — Team Setup' : isBox ? 'Step 2 — Project Box' : 'Step 3 — Project Planning';
                                        const note = (isSetup ? project.setupRejectionNote : isBox ? project.boxRejectionNote : project.planRejectionNote) ?? '';
                                        return (
                                            <div
                                                key={project.projectId}
                                                className="flex items-start gap-4 rounded-2xl border border-red-200 bg-red-50 p-4"
                                            >
                                                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600">
                                                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M12 3a9 9 0 100 18A9 9 0 0012 3z" />
                                                    </svg>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-bold text-red-800">
                                                        {project.name} — {stepLabel} Rejected
                                                    </p>
                                                    <p className="mt-1 text-sm text-red-700 italic">"{note}"</p>
                                                    <p className="mt-2 text-xs text-red-500">
                                                        Go to your <span className="font-semibold">Projects tab</span> to resubmit only this step.
                                                    </p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            <DashboardLanding
                                audience="team"
                                userName={user?.name}
                                title="Operations hub"
                                description="Use this landing tab as the team's daily briefing surface for notices, embedded references, machine activity, and the most important operational metrics."
                                stats={teamStats}
                                updates={convexDashboardUpdates || []}
                                machines={convexMachines || []}
                                pendingApprovals={pendingApprovalUsers.map((member) => ({
                                    email: member.email,
                                    name: member.name,
                                    createdDate: member.createdDate,
                                }))}
                                onApprovePendingUser={handleApprovePendingUser}
                                onRejectPendingUser={handleRejectPendingUser}
                            />
                        </TabsContent>
                    )}

                    {showProjectsTab && (
                        <TabsContent value="projects" className="space-y-6 focus-visible:outline-none focus-visible:ring-0">
                            <ProjectsWorkspace workspace={projectWorkspace} userEmail={user?.email} />
                        </TabsContent>
                    )}

                    {/* --- STORE TAB --- */}
                    <TabsContent value="store" className="space-y-6 focus-visible:outline-none focus-visible:ring-0">
                        <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-4 flex items-center gap-4 mb-6">
                            <div className="bg-white p-2 rounded-lg shadow-sm border border-emerald-100">
                                <LayoutDashboard className="w-5 h-5 text-emerald-600" />
                            </div>
                            <div>
                                <h2 className="font-bold text-emerald-900">Inventory Overview</h2>
                                <p className="text-sm text-emerald-700">Browse items, check availability, and request equipment.</p>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-white p-4 rounded-xl border border-border shadow-sm">
                                <div className="relative flex-1 w-full max-w-md">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                                    <Input
                                        placeholder="Search inventory..."
                                        className="pl-10 bg-slate-50 border-slate-200"
                                        value={searchQuery}
                                        onChange={e => setSearchQuery(e.target.value)}
                                    />
                                </div>
                                <div className="flex gap-2 w-full sm:w-auto">
                                    <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                                        <SelectTrigger className="w-40 bg-slate-50 border-slate-200"><SelectValue placeholder="Category" /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Categories</SelectItem>
                                            {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            {/* Data source indicator banner */}
                            {inventorySource === 'sheets' && (
                                <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700 mb-2">
                                    <span className="text-base">📋</span>
                                    <span><strong>Showing data from Google Sheets</strong> — Firebase quota may be exceeded. Data refreshed from master source.</span>
                                </div>
                            )}
                            {inventorySource === 'loading' && inventory.length === 0 && (
                                <div className="flex items-center gap-2 text-muted-foreground text-sm py-4">
                                    <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                                    Loading inventory...
                                </div>
                            )}

                            <div className="space-y-8">
                                {Object.keys(groupedItems).sort().map(cat => (
                                    <div key={cat} className="space-y-4">
                                        <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                                            <span className="w-1 h-6 bg-emerald-500 rounded-full"></span>
                                            {cat}
                                            <span className="text-xs font-normal text-muted-foreground bg-slate-100 px-2 py-0.5 rounded-full">{groupedItems[cat].length}</span>
                                        </h3>

                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                            {groupedItems[cat].map(item => (
                                                <div
                                                    key={item.id}
                                                    className="group bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-lg hover:border-emerald-200 transition-all cursor-pointer"
                                                    onClick={() => setViewItem(item)}
                                                >
                                                    <div className="relative h-40 bg-slate-100 overflow-hidden text-center">
                                                        {item.imageUrl ? (
                                                            <img src={getOptimizedImageUrl(item.imageUrl)} referrerPolicy="no-referrer" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                                        ) : (
                                                            <div className="flex items-center justify-center h-full text-slate-300"><Package className="w-8 h-8" /></div>
                                                        )}
                                                        <div className="absolute top-2 right-2 bg-white/90 backdrop-blur px-2 py-0.5 rounded-md text-[10px] font-bold shadow-sm">
                                                            {item.quantity} Left
                                                        </div>
                                                    </div>
                                                    <div className="p-4">
                                                        <h4 className="font-bold text-slate-900 truncate" title={item.name}>{item.name}</h4>
                                                        <p className="text-xs text-slate-500 mb-3">{item.company}</p>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="w-full border-slate-200 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200"
                                                            onClick={(e) => { e.stopPropagation(); setSelectedItem(item); }}
                                                        >
                                                            Request
                                                        </Button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}

                                {paginatedStatus === 'CanLoadMore' && (
                                    <div className="flex justify-center mt-8 pb-4">
                                        <Button 
                                            variant="outline" 
                                            onClick={() => loadMoreInventory(50)}
                                            className="px-8 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                                        >
                                            Load More Inventory
                                        </Button>
                                    </div>
                                )}
                                {paginatedStatus === 'LoadingMore' && (
                                    <div className="text-center py-4 text-emerald-600 animate-pulse">Loading more...</div>
                                )}

                            </div>
                        </div>
                    </TabsContent>

                    {/* --- MY ITEMS TAB (GRID VIEW) --- */}
                    <TabsContent value="my-items" className="focus-visible:outline-none focus-visible:ring-0">
                        <div className="space-y-6">
                            <div className="bg-white p-6 rounded-xl border border-border shadow-sm">
                                <div className="flex items-center justify-between mb-6">
                                    <div>
                                        <h2 className="text-xl font-bold">Item Usage History</h2>
                                        <p className="text-sm text-muted-foreground">Track your checkouts and returns.</p>
                                    </div>
                                </div>

                                {myItems.length === 0 ? (
                                    <div className="text-center py-12 text-muted-foreground">No items found.</div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                        {myItems.map(item => (
                                            <Card
                                                key={item.id}
                                                className="group p-4 flex flex-col gap-3 hover:shadow-md transition-all cursor-pointer border-slate-200"
                                                onClick={() => {
                                                    const fullItem = getItemObject(item.itemName);
                                                    if (fullItem) setViewItem(fullItem);
                                                }}
                                            >
                                                <div className="relative aspect-video bg-slate-100 rounded-lg overflow-hidden">
                                                    {getItemImage(item.itemName) ? (
                                                        <img src={getItemImage(item.itemName)} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="flex items-center justify-center h-full text-slate-300"><Package /></div>
                                                    )}
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-slate-900 truncate">{item.itemName}</h4>
                                                    <div className="flex justify-between items-center mt-1">
                                                        <span className="text-xs bg-slate-100 px-2 py-0.5 rounded font-medium text-slate-600">x{item.quantity}</span>
                                                        <span className="text-xs text-slate-400">{new Date(item.timestamp).toLocaleDateString()}</span>
                                                    </div>
                                                    {projectAssignmentByRequestId.get(item.id) && (
                                                        <div className="mt-2">
                                                            <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                                                                Project: {projectAssignmentByRequestId.get(item.id)?.projectName}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>

                                                {item.status === 'PENDING' ? (
                                                    <div className="mt-auto pt-2 text-center bg-orange-50 text-orange-700 text-xs py-1.5 rounded font-bold border border-orange-100">
                                                        Pending Approval
                                                    </div>
                                                ) : item.returnRequestStatus === 'RETURN_PENDING' ? (
                                                    <div className="mt-auto flex flex-col gap-1">
                                                        <div className="pt-2 text-center bg-yellow-50 text-yellow-700 text-xs py-1.5 rounded font-bold border border-yellow-100">
                                                            Return Pending...
                                                        </div>
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            className="w-full text-xs border-red-200 text-red-600 hover:bg-red-50 hover:border-red-400"
                                                            onClick={(e) => { e.stopPropagation(); handleCancelReturn(item); }}
                                                        >
                                                            Cancel Return
                                                        </Button>
                                                    </div>
                                                ) : (
                                                    <div className="mt-auto flex flex-col gap-2">
                                                        {!projectAssignmentByRequestId.get(item.id) && activeProjectOptions.length > 0 && (
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                className="w-full text-xs border-slate-200 hover:bg-slate-50"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setProjectAssignmentTarget(item);
                                                                }}
                                                            >
                                                                Add To Project
                                                            </Button>
                                                        )}
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            className="w-full text-xs hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setReturnItem(item);
                                                            }}
                                                        >
                                                            Return Item
                                                        </Button>
                                                    </div>
                                                )}
                                            </Card>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </TabsContent>

                    {/* --- COMMUNITY TAB (RENAMED FROM USERS) --- */}
                    <TabsContent value="users" className="focus-visible:outline-none focus-visible:ring-0">
                        <div className="space-y-6">
                            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
                                <div>
                                    <h2 className="text-2xl font-bold tracking-tight">Community Directory</h2>
                                    <p className="text-sm text-slate-500">View team members, their holdings, and skills.</p>
                                </div>

                                <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                                    {/* Search Bar */}
                                    <div className="relative w-full sm:w-64">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            placeholder="Search name or email..."
                                            className="pl-9 bg-white border-slate-200 focus:border-emerald-400 focus:ring-emerald-400"
                                            value={communitySearchQuery}
                                            onChange={(e) => setCommunitySearchQuery(e.target.value)}
                                        />
                                    </div>

                                    {/* Category Dropdown */}
                                    <Select value={selectedCommunityTag} onValueChange={setSelectedCommunityTag}>
                                        <SelectTrigger className="w-full sm:w-48 bg-white border-slate-200">
                                            <SelectValue placeholder="All Categories" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Categories</SelectItem>
                                            {availableTags.map((tag) => (
                                                <SelectItem key={tag} value={tag}>
                                                    {tag}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            {filteredCommunityUsers.length > 0 ? (
                                <div className="space-y-10">
                                    {/* GLOBAL FAB SECTION (Priority Members) */}
                                    {filteredCommunityUsers.filter(isFabUser).length > 0 && (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 items-start pb-8 border-b border-slate-100">
                                            {filteredCommunityUsers.filter(isFabUser).map((u) => {
                                                const hasPageLink = Boolean(u.myPageLink && u.myPageLink?.trim() !== "");
                                                const dynamic = getDynamicGlow(u.email || u._id || u.email || "", u.customTheme);

                                                return (
                                                    <Card
                                                        key={u._id || u.id}
                                                        style={{
                                                            '--user-glow': dynamic.glow,
                                                            '--user-hover-glow': dynamic.hoverGlow,
                                                            '--user-border': dynamic.border,
                                                            '--user-before-border': dynamic.beforeBorder,
                                                            '--user-text': dynamic.text,
                                                            '--user-badge-bg': dynamic.bg,
                                                            '--user-icon': dynamic.icon
                                                        } as React.CSSProperties}
                                                        className={`flex flex-col p-4 transition-all bg-white/50 border overflow-hidden w-full ${hasPageLink
                                                            ? `cursor-pointer border-[var(--user-border)] shadow-[0_0_15px_var(--user-glow)] hover:shadow-[0_0_25px_var(--user-hover-glow)] hover:-translate-y-1 relative before:absolute before:inset-0 before:rounded-xl before:border before:border-[var(--user-before-border)] before:animate-pulse`
                                                            : "border-slate-200 hover:shadow-md"
                                                            }`}
                                                        onClick={() => {
                                                            if (hasPageLink) {
                                                                window.open(u.myPageLink, '_blank', 'noopener,noreferrer');
                                                            }
                                                        }}
                                                    >
                                                        <div className="flex items-start gap-3 relative z-10">
                                                            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center shrink-0 border border-slate-200 overflow-hidden">
                                                                {u.profileImageUrl ? (
                                                                    <img src={u.profileImageUrl} alt={u.name} className="h-full w-full object-cover" />
                                                                ) : (
                                                                    <UsersIcon className={`h-5 w-5`} style={{ color: hasPageLink || u.customTheme ? 'var(--user-icon)' : '#94a3b8' }} />
                                                                )}
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex justify-between items-start">
                                                                    <div className="flex items-center gap-2 pr-2 min-w-0 font-display">
                                                                        <p className="font-bold text-sm truncate" style={{ color: hasPageLink ? 'var(--user-text)' : 'inherit' }}>{u.name}</p>
                                                                        {(u.role === 'ADMIN' || u.role === 'TEAM') && (
                                                                            <SaluteIcon className="shrink-0 w-3.5 h-3.5" style={{ color: hasPageLink ? 'var(--user-icon)' : '#059669' }} />
                                                                        )}
                                                                    </div>
                                                                    {/* Circular FAB Seal */}
                                                                    <div
                                                                        className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-[8px] font-black border shadow-sm"
                                                                        style={{
                                                                            backgroundColor: 'var(--user-badge-bg)',
                                                                            color: 'var(--user-text)',
                                                                            borderColor: 'var(--user-border)'
                                                                        }}
                                                                    >
                                                                        FAB
                                                                    </div>
                                                                </div>
                                                                <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wide mt-0.5">{u.role === 'ADMIN' || u.role === 'TEAM' ? 'Faculty / Team Member' : 'Student'}</p>

                                                                {/* Badges - One Horizontal Line */}
                                                                {u.tags && u.tags.length > 0 && (
                                                                    <div className="flex flex-nowrap gap-1.5 mt-3 overflow-x-auto pb-1 scrollbar-hide">
                                                                        {sortUserTags(u.tags).map((tag, idx) => {
                                                                            const style = getTagStyle(tag);
                                                                            return (
                                                                                <span
                                                                                    key={idx}
                                                                                    className={`shrink-0 px-1.5 py-0.5 rounded text-[8px] leading-tight font-bold uppercase ${style.color}`}
                                                                                >
                                                                                    {tag}
                                                                                </span>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </Card>
                                                );
                                            })}
                                        </div>
                                    )}

                                    {/* TEAM SECTION (Standard Members) */}
                                    {filteredTeam.filter(u => !isFabUser(u)).length > 0 && (
                                        <div className="space-y-6">
                                            <div className="flex items-center gap-3">
                                                <div className="h-px flex-1 bg-slate-200" />
                                                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">The Team</h3>
                                                <div className="h-px flex-1 bg-slate-200" />
                                            </div>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 items-start">
                                                {filteredTeam.filter(u => !isFabUser(u)).map((u) => {
                                                    const hasPageLink = Boolean(u.myPageLink && u.myPageLink?.trim() !== "");
                                                    const dynamic = getDynamicGlow(u.email || u._id || u.email || "", u.customTheme);

                                                    return (
                                                        <Card
                                                            key={u._id || u.id}
                                                            style={{
                                                                '--user-glow': dynamic.glow,
                                                                '--user-hover-glow': dynamic.hoverGlow,
                                                                '--user-border': dynamic.border,
                                                                '--user-before-border': dynamic.beforeBorder,
                                                                '--user-text': dynamic.text,
                                                                '--user-badge-bg': dynamic.bg,
                                                                '--user-icon': dynamic.icon
                                                            } as React.CSSProperties}
                                                            className={`flex flex-col p-4 transition-all bg-white/50 border overflow-hidden max-w-[280px] w-full mx-auto sm:mx-0 ${hasPageLink
                                                                ? `cursor-pointer border-[var(--user-border)] shadow-[0_0_15px_var(--user-glow)] hover:shadow-[0_0_25px_var(--user-hover-glow)] hover:-translate-y-1 relative before:absolute before:inset-0 before:rounded-xl before:border before:border-[var(--user-before-border)] before:animate-pulse`
                                                                : "border-slate-200 hover:shadow-md"
                                                                }`}
                                                            onClick={() => {
                                                                if (hasPageLink) {
                                                                    window.open(u.myPageLink, '_blank', 'noopener,noreferrer');
                                                                }
                                                            }}
                                                        >
                                                            <div className="flex items-start gap-3 relative z-10">
                                                                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center shrink-0 border border-slate-200 overflow-hidden">
                                                                    {u.profileImageUrl ? (
                                                                        <img src={u.profileImageUrl} alt={u.name} className="h-full w-full object-cover" />
                                                                    ) : (
                                                                        <UsersIcon className={`h-5 w-5`} style={{ color: hasPageLink || u.customTheme ? 'var(--user-icon)' : '#94a3b8' }} />
                                                                    )}
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="flex justify-between items-start">
                                                                        <div className="flex items-center gap-2 pr-2 min-w-0 font-display">
                                                                            <p className="font-bold text-sm truncate" style={{ color: hasPageLink ? 'var(--user-text)' : 'inherit' }}>{u.name}</p>
                                                                            <SaluteIcon className="shrink-0 w-3.5 h-3.5" style={{ color: hasPageLink ? 'var(--user-icon)' : '#059669' }} />
                                                                        </div>
                                                                    </div>
                                                                    <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wide mt-0.5">Faculty / Team Member</p>

                                                                    {/* Badges - One Horizontal Line */}
                                                                    {u.tags && u.tags.length > 0 && (
                                                                        <div className="flex flex-nowrap gap-1.5 mt-3 overflow-x-auto pb-1 scrollbar-hide">
                                                                            {sortUserTags(u.tags).map((tag, idx) => {
                                                                                const style = getTagStyle(tag);
                                                                                return (
                                                                                    <span
                                                                                        key={idx}
                                                                                        className={`shrink-0 px-1.5 py-0.5 rounded text-[8px] leading-tight font-bold uppercase ${style.color}`}
                                                                                    >
                                                                                        {tag}
                                                                                    </span>
                                                                                );
                                                                            })}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </Card>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    {/* STUDENTS SECTION (Standard Members) */}
                                    {filteredStudents.filter(u => !isFabUser(u)).length > 0 && (
                                        <div className="space-y-6">
                                            <div className="flex items-center gap-3">
                                                <div className="h-px flex-1 bg-slate-200" />
                                                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Makers & Students</h3>
                                                <div className="h-px flex-1 bg-slate-200" />
                                            </div>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 items-start">
                                                {filteredStudents.filter(u => !isFabUser(u)).map((u) => {
                                                    const hasPageLink = Boolean(u.myPageLink && u.myPageLink?.trim() !== "");
                                                    const dynamic = getDynamicGlow(u.email || u._id || u.email || "", u.customTheme);

                                                    return (
                                                        <Card
                                                            key={u._id || u.id}
                                                            style={{
                                                                '--user-glow': dynamic.glow,
                                                                '--user-hover-glow': dynamic.hoverGlow,
                                                                '--user-border': dynamic.border,
                                                                '--user-before-border': dynamic.beforeBorder,
                                                                '--user-text': dynamic.text,
                                                                '--user-badge-bg': dynamic.bg,
                                                                '--user-icon': dynamic.icon
                                                            } as React.CSSProperties}
                                                            className={`flex flex-col p-4 transition-all bg-white/50 border overflow-hidden max-w-[280px] w-full mx-auto sm:mx-0 ${hasPageLink
                                                                ? `cursor-pointer border-[var(--user-border)] shadow-[0_0_15px_var(--user-glow)] hover:shadow-[0_0_25px_var(--user-hover-glow)] hover:-translate-y-1 relative before:absolute before:inset-0 before:rounded-xl before:border before:border-[var(--user-before-border)] before:animate-pulse`
                                                                : "border-slate-200 hover:shadow-md"
                                                                }`}
                                                            onClick={() => {
                                                                if (hasPageLink) {
                                                                    window.open(u.myPageLink, '_blank', 'noopener,noreferrer');
                                                                }
                                                            }}
                                                        >
                                                            <div className="flex items-start gap-3 relative z-10">
                                                                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center shrink-0 border border-slate-200 overflow-hidden">
                                                                    {u.profileImageUrl ? (
                                                                        <img src={u.profileImageUrl} alt={u.name} className="h-full w-full object-cover" />
                                                                    ) : (
                                                                        <UsersIcon className={`h-5 w-5`} style={{ color: hasPageLink || u.customTheme ? 'var(--user-icon)' : '#94a3b8' }} />
                                                                    )}
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="flex justify-between items-start">
                                                                        <div className="min-w-0 font-display">
                                                                            <p className="font-bold text-sm truncate" style={{ color: hasPageLink ? 'var(--user-text)' : 'inherit' }}>{u.name}</p>
                                                                        </div>
                                                                    </div>
                                                                    <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wide mt-0.5">Student</p>

                                                                    {/* Badges - One Horizontal Line */}
                                                                    {u.tags && u.tags.length > 0 && (
                                                                        <div className="flex flex-nowrap gap-1.5 mt-3 overflow-x-auto pb-1 scrollbar-hide">
                                                                            {sortUserTags(u.tags).map((tag, idx) => {
                                                                                const style = getTagStyle(tag);
                                                                                return (
                                                                                    <span
                                                                                        key={idx}
                                                                                        className={`shrink-0 px-1.5 py-0.5 rounded text-[8px] leading-tight font-bold uppercase ${style.color}`}
                                                                                    >
                                                                                        {tag}
                                                                                    </span>
                                                                                );
                                                                            })}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </Card>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="text-center py-20 bg-slate-50/50 rounded-2xl border-2 border-dashed border-slate-200">
                                    <div className="bg-white w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                                        <UsersIcon className="w-8 h-8 text-slate-300" />
                                    </div>
                                    <h3 className="text-lg font-bold text-slate-900">No users found</h3>
                                    <p className="text-slate-500 mb-6">We couldn't find any users matching your criteria.</p>
                                    <Button
                                        variant="outline"
                                        onClick={() => {
                                            setCommunitySearchQuery('');
                                            setSelectedCommunityTag('all');
                                        }}
                                        className="border-slate-200 hover:bg-white"
                                    >
                                        Clear all filters
                                    </Button>
                                </div>
                            )}
                        </div>
                    </TabsContent>

                    {/* --- RETURNS TAB (WITH IMAGES) --- */}
                    <TabsContent value="returns" className="focus-visible:outline-none focus-visible:ring-0">
                        <div className="space-y-8">
                            <div className="space-y-4">
                                <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                                    Item Requests
                                    {pendingCheckouts.length > 0 && <span className="bg-red-100 text-red-800 text-sm px-2 py-0.5 rounded-full">{pendingCheckouts.length}</span>}
                                </h2>
                                {pendingCheckouts.length === 0 ? (
                                    <div className="text-sm text-slate-500 italic pb-4 border-b border-slate-100">No new item requests.</div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-8 border-b border-slate-200">
                                        {pendingCheckouts.map(req => {
                                            const img = getItemImage(req.itemName);
                                            return (
                                                <Card key={req.date} className="p-0 flex overflow-hidden border-l-4 border-l-orange-400 shadow-sm">
                                                    <div className="w-24 bg-slate-100 shrink-0">
                                                        {img ? <img src={img} referrerPolicy="no-referrer" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><Package className="text-slate-300" /></div>}
                                                    </div>
                                                    <div className="p-4 flex-1 flex justify-between items-center">
                                                        <div>
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <h4 className="font-bold text-slate-900">{req.itemName}</h4>
                                                                <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-xs font-bold">x{req.quantity}</span>
                                                            </div>
                                                            <p className="text-sm text-slate-500">Requested by <span className="font-medium text-slate-900">{req.userName}</span></p>
                                                            <p className="text-xs text-slate-400 mt-1">{new Date(req.date).toLocaleDateString()}</p>
                                                        </div>
                                                        <div className="flex flex-col gap-2 ml-4 shrink-0">
                                                            <Button onClick={() => handleApproveRequest(req)} className="bg-slate-900 hover:bg-slate-800">
                                                                Approve
                                                            </Button>
                                                            <Button
                                                                variant="outline"
                                                                className="border-red-200 text-red-600 hover:bg-red-50 hover:border-red-400 text-xs"
                                                                onClick={() => handleCancelCheckout(req)}
                                                            >
                                                                Cancel Request
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </Card>
                                            )
                                        })}
                                    </div>
                                )}
                            </div>

                            <div className="space-y-4">
                                <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                                    Incoming Returns
                                    {pendingReturns.length > 0 && <span className="bg-yellow-100 text-yellow-800 text-sm px-2 py-0.5 rounded-full">{pendingReturns.length}</span>}
                                </h2>

                                {pendingReturns.length === 0 ? (
                                    <Card className="p-8 text-center text-muted-foreground border-dashed">
                                        No pending returns at the moment.
                                    </Card>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {pendingReturns.map(req => {
                                            const img = getItemImage(req.itemName);
                                            return (
                                                <Card key={req.date} className="p-0 flex overflow-hidden border-l-4 border-l-yellow-400 shadow-sm">
                                                    <div className="w-24 bg-slate-100 shrink-0">
                                                        {img ? <img src={img} referrerPolicy="no-referrer" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><Package className="text-slate-300" /></div>}
                                                    </div>
                                                    <div className="p-4 flex-1 flex justify-between items-center">
                                                        <div>
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <h4 className="font-bold text-slate-900">{req.itemName}</h4>
                                                                <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-xs font-bold">x{req.quantity}</span>
                                                            </div>
                                                            <p className="text-sm text-slate-500">Returned by <span className="font-medium text-slate-900">{req.userName}</span></p>
                                                            <p className="text-xs text-slate-400 mt-1">{new Date(req.date).toLocaleDateString()}</p>
                                                        </div>
                                                        <div className="flex flex-col gap-2 ml-4 shrink-0">
                                                            <Button onClick={() => setSelectedReturn(req)} className="bg-slate-900 hover:bg-slate-800">
                                                                Receive
                                                            </Button>
                                                            <Button
                                                                variant="outline"
                                                                className="border-red-200 text-red-600 hover:bg-red-50 hover:border-red-400 text-xs"
                                                                onClick={() => handleCancelReturn(req)}
                                                            >
                                                                Cancel Return
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </Card>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            <div className="space-y-4">
                                <h2 className="text-xl font-bold tracking-tight text-slate-700">All Active Holdings</h2>
                                <Card className="overflow-hidden border-slate-200">
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm text-left">
                                            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                                                <tr>
                                                    <th className="px-4 py-3">User</th>
                                                    <th className="px-4 py-3">Item</th>
                                                    <th className="px-4 py-3">Qty</th>
                                                    <th className="px-4 py-3">Project</th>
                                                    <th className="px-4 py-3">Date Borrowed</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {activeRequests.map((req, idx) => (
                                                    <tr key={idx} className="hover:bg-slate-50/50">
                                                        <td className="px-4 py-3 font-medium text-slate-900">{req.userName}</td>
                                                        <td className="px-4 py-3">{req.itemName}</td>
                                                        <td className="px-4 py-3 text-slate-500">x{req.quantity}</td>
                                                        <td className="px-4 py-3 text-slate-500">
                                                            {projectAssignmentByRequestId.get(req.date)?.projectName || "Not linked"}
                                                        </td>
                                                        <td className="px-4 py-3 text-slate-400">{new Date(req.date).toLocaleDateString()}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </Card>
                            </div>
                        </div>
                    </TabsContent>

                    {/* --- MONITOR TAB --- */}
                    <TabsContent value="monitor" className="focus-visible:outline-none focus-visible:ring-0">
                        <div className="space-y-6">
                            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                                <div>
                                    <h2 className="text-2xl font-bold tracking-tight">Live Monitor</h2>
                                    <p className="text-sm text-slate-500">Track online team members and active lab sessions.</p>
                                </div>
                                <div className="relative w-full sm:w-72">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Search active members..."
                                        className="pl-9 bg-white border-slate-200 focus:border-emerald-400 focus:ring-emerald-400 rounded-xl"
                                        value={monitorSearchQuery}
                                        onChange={(e) => setMonitorSearchQuery(e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                {filteredOnlineUsers.map(u => (
                                    <Card key={u.id} className="group p-5 border-l-4 border-l-emerald-500 shadow-sm hover:shadow-md transition-all">
                                        <div className="flex items-center justify-between w-full">
                                            <div className="flex items-center gap-4">
                                                <div className="relative">
                                                    <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-700 font-bold text-lg group-hover:bg-emerald-100 transition-colors">
                                                        {u.name.charAt(0)}
                                                    </div>
                                                    <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full animate-pulse shadow-sm"></span>
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-900">{u.name}</p>
                                                    <p className="text-xs text-emerald-600 font-medium uppercase tracking-wide">Active Now</p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => handleForceTurnOff(u.email)}
                                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                                                title="Force Turn Off"
                                            >
                                                <XCircle className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </Card>
                                ))}
                                {filteredOnlineUsers.length === 0 && (
                                    <div className="col-span-full py-12 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-500">
                                        <Monitor className="w-10 h-10 mx-auto text-slate-300 mb-3" />
                                        {monitorSearchQuery ? (
                                            <p>No active members matching "{monitorSearchQuery}" found.</p>
                                        ) : (
                                            <p>No team members are currently online.</p>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </TabsContent>

                    {/* --- MY PLANS TAB --- */}
                    <TabsContent value="plans" className="focus-visible:outline-none focus-visible:ring-0">
                        <MyPlansTab teamMembers={filteredTeam} />
                    </TabsContent>


                    {/* --- MACHINES TAB (Team Edition) --- */}
                    <TabsContent value="machines" className="space-y-6">
                        <div className="space-y-6">
                            <div className="mb-6">
                                <h2 className="text-2xl font-black font-display text-slate-900 border-b-2 border-emerald-500 pb-1 w-fit mb-2 uppercase">Machine Status</h2>
                                <p className="text-muted-foreground text-sm max-w-2xl">
                                    Monitor and manage lab machines. Start or end sessions for yourself or track availability.
                                </p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                {(convexMachines || []).map((m) => {
                                    const machine = {
                                        id: m.machineId,
                                        name: m.name,
                                        isOnline: m.status === "ENGAGED",
                                        currentUser: m.currentUser || "",
                                        waitingList: m.waitingList || [],
                                        currentTurnEmail: m.currentTurnEmail,
                                        currentTurnName: m.currentTurnName,
                                    };
                                    const isUserOperating = machine.isOnline && machine.currentUser === user?.name;
                                    const isEngaged = machine.isOnline;

                                    return (
                                        <MachineCard
                                            key={machine.id}
                                            machine={machine}
                                            hideHistory={true}
                                            actionButton={
                                                isUserOperating ? (
                                                    <Button 
                                                        className="w-full bg-rose-500 hover:bg-rose-600 text-white font-bold h-10 shadow-sm"
                                                        onClick={() => handleEndMachineClick(machine.id)}
                                                    >
                                                        End My Session
                                                    </Button>
                                                ) : (
                                                    <Button 
                                                        className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold h-10 shadow-sm"
                                                        disabled={isEngaged || (!!machine.currentTurnEmail && machine.currentTurnEmail !== (user?.email ?? ""))}
                                                        onClick={() => handleStartMachine(machine.id)}
                                                    >
                                                        {isEngaged ? 'Machine Occupied' : (machine.currentTurnEmail && machine.currentTurnEmail !== (user?.email ?? "") ? 'Reserved' : 'Start Session')}
                                                    </Button>
                                                )
                                            }
                                        />
                                    );
                                })}
                                {convexMachines?.length === 0 && (
                                    <div className="col-span-full py-20 text-center border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50/50">
                                        <Zap className="w-12 h-12 text-slate-200 mx-auto mb-4 opacity-20" />
                                        <p className="text-slate-400 font-medium">No machines registered in Convex.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </TabsContent>
                </Tabs>
                <MachineTurnNotification scriptUrl={SCRIPT_URL} />
            </main>

            {/* --- DIALOGS --- */}

            {/* Machine Note Modal */}
            <Dialog open={showMachineNoteModal} onOpenChange={setShowMachineNoteModal}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold flex items-center gap-2">
                            <Scissors className="w-5 h-5 text-emerald-500" />
                            What did you fabricate?
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="fabrication-note" className="text-slate-700 font-medium">
                                Please share a brief note about your work. This is mandatory to complete the session.
                            </Label>
                            <Textarea
                                id="fabrication-note"
                                placeholder="Example: Cut acrylic for robot chassis, 3D printed sensor bracket..."
                                className="h-32 resize-none border-slate-200 focus:border-emerald-500 focus:ring-emerald-500 transition-all rounded-xl"
                                value={fabricationNote}
                                onChange={(e) => setFabricationNote(e.target.value)}
                            />
                        </div>
                    </div>
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button 
                            variant="outline" 
                            onClick={() => setShowMachineNoteModal(false)}
                            className="rounded-xl border-slate-200"
                        >
                            Cancel
                        </Button>
                        <Button 
                            onClick={handleConfirmEndMachine}
                            disabled={!fabricationNote.trim()}
                            className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl shadow-lg shadow-emerald-200 h-10"
                        >
                            Submit & End Session
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ITEM DETAILS DIALOG (New) */}
            <Dialog open={!!viewItem} onOpenChange={(o) => !o && setViewItem(null)}>
                <DialogContent className="max-w-4xl overflow-hidden p-0 gap-0 border-0 rounded-2xl h-[80vh] flex flex-col md:flex-row">
                    {/* Left: Image (Larger) */}
                    <div className="bg-slate-100 h-64 md:h-auto md:w-1/2 relative flex items-center justify-center p-8">
                        {viewItem?.imageUrl ? (
                            <img src={getOptimizedImageUrl(viewItem.imageUrl)} referrerPolicy="no-referrer" className="max-w-full max-h-full object-contain drop-shadow-md" />
                        ) : (
                            <Package className="w-32 h-32 text-slate-300" />
                        )}
                        <div className="absolute top-4 left-4 bg-white/90 backdrop-blur px-3 py-1.5 rounded-md text-sm font-bold shadow-sm border border-slate-200 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                            {viewItem?.category}
                        </div>
                    </div>

                    {/* Right: Info */}
                    <div className="p-8 md:w-1/2 flex flex-col h-full bg-white overflow-y-auto">
                        <DialogHeader className="mb-6">
                            <DialogTitle className="text-3xl font-bold text-slate-900 leading-tight">{viewItem?.name}</DialogTitle>
                            <p className="text-lg text-slate-500 font-medium">{viewItem?.company}</p>
                        </DialogHeader>

                        <div className="flex-1 space-y-6">
                            {/* Stock Indicator */}
                            <div className="flex items-center gap-3">
                                <span className={`px-3 py-1 rounded-full text-sm font-bold border ${viewItem && viewItem.quantity > 0 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                                    {viewItem && viewItem.quantity > 0 ? 'In Stock' : 'Out of Stock'}
                                </span>
                                <span className="text-sm text-muted-foreground font-medium">
                                    {viewItem?.quantity} units available
                                </span>
                            </div>

                            {/* Remarks */}
                            {viewItem?.remarks && (
                                <div className="space-y-2">
                                    <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wide">Description & Remarks</h4>
                                    <div className="text-sm text-slate-600 bg-slate-50 p-4 rounded-lg border border-slate-100 leading-relaxed">
                                        {viewItem.remarks}
                                    </div>
                                </div>
                            )}

                            {/* Links (NEW) */}
                            {viewItem?.links && (
                                <div className="space-y-2">
                                    <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wide">Useful Links</h4>
                                    <a href={viewItem.links} target="_blank" rel="noreferrer" className="block text-sm text-blue-600 bg-blue-50 p-4 rounded-lg border border-blue-100 hover:underline break-all">
                                        {viewItem.links}
                                    </a>
                                </div>
                            )}

                            {/* Tags */}
                            {viewItem?.tags && (
                                <div className="space-y-2">
                                    <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wide">Tags</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {viewItem.tags.split(',').map(tag => (
                                            <span key={tag} className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1 rounded border border-slate-200">
                                                {tag.trim()}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* CHECKOUT CONFIRM DIALOG */}
            <Dialog open={!!selectedItem && !viewItem} onOpenChange={(o) => !o && setSelectedItem(null)}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Checkout {selectedItem?.name}</DialogTitle></DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <label className="text-right text-sm">Quantity</label>
                            <Input
                                type="number"
                                min="1"
                                max={selectedItem?.quantity}
                                value={checkoutQuantity}
                                onChange={e => setCheckoutQuantity(e.target.value)}
                                className="col-span-3"
                            />
                        </div>
                    </div>
                    <Button onClick={handleCheckout} className="w-full bg-emerald-600 hover:bg-emerald-700">Confirm Request</Button>
                </DialogContent>
            </Dialog>

            <ProjectAssignmentDialog
                open={!!projectAssignmentTarget}
                onOpenChange={(open) => {
                    if (!open) setProjectAssignmentTarget(null);
                }}
                itemName={projectAssignmentTarget?.itemName || ''}
                projects={activeProjectOptions}
                onAssign={handleAddItemToProject}
            />

            {/* RETURN CONFIRM DIALOG - Missing in previous code, essential for 'Return Item' action */}
            <Dialog open={editProfileOpen} onOpenChange={setEditProfileOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Profile</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Profile Image URL</Label>
                            <Input 
                                placeholder="https://example.com/image.jpg"
                                value={editProfileImage}
                                onChange={(e) => setEditProfileImage(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Custom Theme (CSS Class, Hex Color, etc.)</Label>
                            <Input 
                                placeholder="e.g. emerald, blue, #10b981"
                                value={editProfileTheme}
                                onChange={(e) => setEditProfileTheme(e.target.value)}
                            />
                            <p className="text-xs text-muted-foreground">This customizes the glow and border color of your community card.</p>
                        </div>
                        <div className="space-y-2">
                            <Label>Personal Page / Portfolio Link</Label>
                            <Input 
                                placeholder="https://yourwebsite.com"
                                value={editProfileLink}
                                onChange={(e) => setEditProfileLink(e.target.value)}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditProfileOpen(false)}>Cancel</Button>
                        <Button 
                            className="bg-emerald-600 hover:bg-emerald-700 text-white"
                            disabled={isSavingProfile}
                            onClick={async () => {
                                if (!user?.email) return;
                                setIsSavingProfile(true);
                                try {
                                    await updateProfileMutation({
                                        email: user.email,
                                        profileImageUrl: editProfileImage,
                                        customTheme: editProfileTheme,
                                        myPageLink: editProfileLink,
                                        scriptUrl: SCRIPT_URL
                                    });
                                    toast.success("Profile updated successfully!");
                                    setEditProfileOpen(false);
                                } catch (e) {
                                    toast.error("Failed to update profile");
                                    console.error(e);
                                } finally {
                                    setIsSavingProfile(false);
                                }
                            }}
                        >
                            {isSavingProfile ? "Saving..." : "Save Changes"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={!!returnItem} onOpenChange={(o) => !o && setReturnItem(null)}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Return {returnItem?.itemName}</DialogTitle></DialogHeader>
                    <div className="py-4 space-y-4">
                        <p className="text-sm text-slate-600">
                            Who should approve this return? Select a Team Member or Admin locally available to verify.
                        </p>
                        <Select value={returnTarget} onValueChange={setReturnTarget}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select approver..." />
                            </SelectTrigger>
                            <SelectContent>
                                {approvers.map(u => (
                                    <SelectItem key={u.email} value={u.name}>
                                        {u.name} ({u.role})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Button
                            className="w-full bg-slate-900"
                            disabled={!returnTarget}
                            onClick={handleReturnSubmit}
                        >
                            Initiate Return
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* RECEIVE RETURN DIALOG (Admin/Team) - Added to fix "Receive" button responsiveness */}
            <Dialog open={!!selectedReturn} onOpenChange={(o) => !o && setSelectedReturn(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Receive Item: {selectedReturn?.itemName}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="p-3 bg-muted rounded-lg text-sm">
                            <p>You are receiving <strong>{selectedReturn?.quantity} unit(s)</strong> from <strong>{selectedReturn?.userName}</strong>.</p>
                            <p className="text-muted-foreground mt-1">This will return the items to inventory stock.</p>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Remarks (Optional)</label>
                            <Input
                                placeholder="e.g. Returned in good condition"
                                value={returnRemarks}
                                onChange={(e) => setReturnRemarks(e.target.value)}
                            />
                        </div>

                        <Button
                            className="w-full bg-emerald-600 hover:bg-emerald-700"
                            onClick={handleProcessReturn}
                        >
                            Confirm & Update Stock
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div >
    );
}
