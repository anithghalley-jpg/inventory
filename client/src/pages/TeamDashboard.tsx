import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import {
    Search, Package, LogOut, Users as UsersIcon,
    LayoutDashboard, ShoppingBag, History, Monitor
} from 'lucide-react';
import { toast } from 'sonner';

const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyXcj74jsDteyR0SFs9Mon0FC8ojVDkJnSm4m47r_FGKHTInP1ih78I7Na42Hyb2Oeu/exec';

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
    name: string;
    email: string;
    status: string;
    role: string;
    createdDate: string;
    laptopStatus?: string;
    totalTime?: number;
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
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
    const [checkoutQuantity, setCheckoutQuantity] = useState('1');
    const [viewItem, setViewItem] = useState<InventoryItem | null>(null);
    const [returnItem, setReturnItem] = useState<UsageRecord | null>(null);
    const [returnTarget, setReturnTarget] = useState('');
    const [selectedReturn, setSelectedReturn] = useState<any | null>(null);
    const [returnRemarks, setReturnRemarks] = useState('');

    // Laptop State
    const [laptopStatus, setLaptopStatus] = useState<'Online' | 'Offline'>(user?.laptopStatus || 'Offline');
    const [totalScreenTime, setTotalScreenTime] = useState(user?.totalTime || 0);

    // Initial Side Effects
    useEffect(() => {
        if (user) {
            setLaptopStatus(user.laptopStatus || 'Offline');
            setTotalScreenTime(user.totalTime || 0);
        }
    }, [user]);

    // Firestore Integration
    useEffect(() => {
        if (!isAuthenticated) return;

        // Dynamic import to be safe, or just standard import if I add it to top
        import('firebase/firestore').then(({ collection, query, onSnapshot }) => {
            import('../firebase').then(({ db }) => {
                const q = query(collection(db, 'inventory'));
                const unsubscribe = onSnapshot(q, (snapshot) => {
                    const items: InventoryItem[] = [];
                    snapshot.forEach((doc) => {
                        const data = doc.data();
                        items.push({
                            id: doc.id,
                            name: data.name,
                            quantity: data.quantity,
                            category: data.category,
                            company: data.company,
                            imageUrl: data.imageUrl,
                            remarks: data.remarks,
                            links: data.links,
                            tags: Array.isArray(data.tags) ? data.tags.join(',') : (data.tags || '')
                        });
                    });
                    setInventory(items);

                    // Extract unique categories
                    const uniqueCats = Array.from(new Set(items.map((i) => i.category)));
                    setCategories(['all', ...uniqueCats as string[]]);

                    // Only set loading false if users are also done? 
                    // Actually users fetch is separate. We can rely on separate loading states or just let it flow.
                });

                return () => unsubscribe();
            });
        });
    }, [isAuthenticated]);

    useEffect(() => {
        if (isAuthenticated && (user?.role === 'TEAM' || user?.role === 'ADMIN')) {
            fetchUsers();
        }
    }, [isAuthenticated, user]);

    // Data Fetching Logic
    const fetchAllData = async () => {
        // Wrapper for manual refreshes
        setIsLoading(true);
        try {
            await fetchUsers(); // Only fetch users manually, inventory is real-time
        } catch (e) {
            toast.error("Failed to load data");
        } finally {
            setIsLoading(false);
        }
    };


    const fetchUsers = async () => {
        // SECURED: Pass requesterRole
        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({
                action: 'getAllUsers',
                requesterRole: user?.role
            })
        });
        const result = await response.json();
        if (result.success) {
            setAllUsers(result.users);

            // Set Approvers (Admins + Approved Team)
            // Logic moved to inside success block to handle role-based filtering dynamically
            const validApprovers = result.users.filter((u: any) =>
                (u.role === 'ADMIN' || u.role === 'TEAM') && u.status === 'APPROVED'
            );
            // Default, will be overridden below if Team
            setApprovers(validApprovers);

            // Fetch Transaction History (Secured)
            const reqResponse = await fetch(SCRIPT_URL, {
                method: 'POST',
                body: JSON.stringify({
                    action: 'getRequests',
                    requesterEmail: user?.email,
                    requesterRole: user?.role
                })
            });
            const reqResult = await reqResponse.json();

            if (reqResult.success) {
                // 1. My Active Checkouts
                setMyItems(reqResult.requests.filter((r: any) =>
                    r.userEmail === user?.email &&
                    (r.status === 'APPROVED' || r.status === 'PENDING') && // Show Pending checkouts too
                    r.returnRequestStatus !== 'RETURN_APPROVED' &&
                    (r.returnStatus || '').toLowerCase() !== 'yes'
                ).map((r: any) => ({ ...r, id: r.date })));

                // 2. Incoming Returns (For Team/Admin to Process)
                setPendingReturns(reqResult.requests.filter((r: any) =>
                    r.status === 'APPROVED' &&
                    r.returnRequestStatus === 'RETURN_PENDING' &&
                    (user?.role === 'ADMIN' || r.returnTarget === user?.name)
                ));

                // 3. Pending Checkout Requests (For Team to Approve)
                // RULE: Team can only approve USER requests, not other TEAM members (Admin only).
                // RULE: Team cannot approve their own request.
                const teamPendingCheckouts = reqResult.requests.filter((r: any) => {
                    const requester = result.users.find((u: any) => u.email === r.userEmail);
                    const isRequesterTeam = requester?.role === 'TEAM' || requester?.role === 'ADMIN'; // Treat Admin/Team requests as restricted
                    return r.status === 'PENDING' && !isRequesterTeam;
                });
                setPendingCheckouts(teamPendingCheckouts);

                // Refine Approvers for Team Members (Must return to Admin)
                if (user?.role === 'TEAM') {
                    setApprovers(result.users.filter((u: any) => u.role === 'ADMIN' && u.status === 'APPROVED'));
                } else {
                    setApprovers(result.users.filter((u: any) =>
                        (u.role === 'ADMIN' || u.role === 'TEAM') && u.status === 'APPROVED'
                    ));
                }

                // 3. All Active Loans (For Monitor)
                setActiveRequests(reqResult.requests.filter((r: any) =>
                    r.status === 'APPROVED' &&
                    r.returnRequestStatus !== 'RETURN_APPROVED' && // Hide returned items
                    (r.returnStatus || '').toLowerCase() !== 'yes'
                ));
            }
        }
    };

    // Actions Handlers
    const handleCheckout = async () => {
        if (!selectedItem) return;

        const itemToRequest = { ...selectedItem };
        const qty = checkoutQuantity;
        setSelectedItem(null); // Close modal immediately
        setCheckoutQuantity('1');

        toast.promise(
            fetch(SCRIPT_URL, {
                method: 'POST',
                body: JSON.stringify({
                    action: 'checkoutRequest',
                    userEmail: user?.email,
                    userName: user?.name,
                    itemId: itemToRequest.id,
                    itemName: itemToRequest.name,
                    quantity: parseInt(qty)
                })
            }).then(async (res) => {
                const result = await res.json();
                if (!result.success) throw new Error(result.message);
                fetchUsers();
                return result;
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

        // 1. Close modal immediately
        setReturnItem(null);
        setReturnTarget('');

        // 2. Optimistic Update: Remove from My Items immediately
        setMyItems(prev => prev.filter(i => i.id !== item.id));

        toast.promise(
            fetch(SCRIPT_URL, {
                method: 'POST',
                body: JSON.stringify({
                    action: 'initiateReturn',
                    date: item.id,
                    returnTarget: target
                })
            }).then(async (res) => {
                const result = await res.json();
                if (!result.success) throw new Error(result.message);
                // Background refresh eventually
                // fetchAllData(); 
                return result;
            }),
            {
                loading: `Returning item to ${target}...`,
                success: `Return initiated!`,
                error: (err) => {
                    // Rollback
                    fetchAllData();
                    return `Failed: ${err.message}`;
                }
            }
        );
    };

    const handleProcessReturn = async () => {
        if (!selectedReturn) return;

        const returnData = { ...selectedReturn };
        const remarks = returnRemarks;

        // 1. Close modal immediately
        setSelectedReturn(null);
        setReturnRemarks('');

        // 2. Optimistic Update (Optional: Remove from list immediately)
        // We can keep the optimistic update for the list to feel snappy
        setPendingReturns(prev => prev.filter(r => r.date !== returnData.date));
        setActiveRequests(prev => prev.filter(r => r.date !== returnData.date));

        toast.promise(
            fetch(SCRIPT_URL, {
                method: 'POST',
                body: JSON.stringify({
                    action: 'processReturn',
                    date: returnData.date,
                    receiverName: user?.name,
                    remarks: remarks,
                    quantity: returnData.quantity,
                    itemId: returnData.itemId,
                    userEmail: returnData.userEmail
                })
            }).then(async (res) => {
                const result = await res.json();
                if (!result.success) throw new Error(result.message);
                fetchUsers();
                // fetchInventory handled by listener
                return result;
            }),
            {
                loading: 'Receiving item...',
                success: 'Item successfully received!',
                error: (err) => {
                    // Rollback optimistic update if failed
                    fetchUsers();
                    return `Failed: ${err.message}`;
                }
            }
        );
    };


    const handleApproveRequest = async (req: any) => {
        try {
            // Optimistic Update
            const prevCheckouts = [...pendingCheckouts];
            setPendingCheckouts(prev => prev.filter(r => r.date !== req.date));
            toast.success("Request Approved");

            await fetch(SCRIPT_URL, {
                method: 'POST',
                body: JSON.stringify({
                    action: 'approveCheckoutRequest',
                    requestId: req.date,
                    approverName: user?.name
                })
            });
            fetchUsers();
            // fetchInventory(1, true); // Handled by Firestore listener
        } catch (e) {
            toast.error("Approval failed");
            fetchUsers(); // Rollback
        }
    };

    const handleLaptopToggle = async (checked: boolean) => {
        const newStatus = checked ? 'Online' : 'Offline';
        setLaptopStatus(newStatus);
        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'toggleLaptop', email: user?.email, status: newStatus })
        });
        const res = await response.json();
        if (res.success && newStatus === 'Offline') setTotalScreenTime(res.totalTime);
    };

    // Helpers
    const formatTime = (minutes: number) => {
        const hrs = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${hrs}h ${mins}m`;
    };

    const getItemImage = (itemName: string) => {
        const found = inventory.find(i => i.name === itemName);
        return found?.imageUrl || '';
    };

    const getItemObject = (itemName: string) => {
        return inventory.find(i => i.name === itemName);
    };

    // Access Check
    if (!isAuthenticated || (user?.role !== 'TEAM' && user?.role !== 'ADMIN')) {
        return <div className="h-screen flex items-center justify-center text-muted-foreground">Access Denied</div>;
    }

    /* --- FILTER LOGIC (Inlined) --- */
    const filteredItems = inventory.filter(item =>
        (selectedCategory === 'all' || item.category === selectedCategory) &&
        (item.name.toLowerCase().includes(searchQuery.toLowerCase()) || (item.tags || '').includes(searchQuery))
    );

    const groupedItems = filteredItems.reduce((acc, item) => {
        if (!acc[item.category]) acc[item.category] = [];
        acc[item.category].push(item);
        return acc;
    }, {} as Record<string, InventoryItem[]>);

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
                            <span className="font-bold text-lg leading-tight block">Team Dashboard</span>
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground">Team View</span>
                                {isLoading && <span className="text-xs text-emerald-600 animate-pulse">• Syncing ...</span>}
                            </div>
                        </div>
                    </div>

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

                        <Button variant="ghost" size="icon" className="text-muted-foreground" onClick={() => logout()}>
                            <LogOut className="w-5 h-5 text-red-400 hover:text-red-600" />
                        </Button>
                    </div>
                </div>
            </header>

            {/* MAIN CONTENT WITH TABS */}
            <main className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
                <Tabs defaultValue="store" className="space-y-6">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                        <TabsList className="bg-white border border-slate-200 p-1 h-auto shadow-sm gap-1 self-start sm:self-auto overflow-x-auto max-w-full">
                            <TabsTrigger value="store" className="data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-700">
                                <ShoppingBag className="w-4 h-4 mr-2" /> Store
                            </TabsTrigger>
                            <TabsTrigger value="my-items" className="data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-700">
                                <History className="w-4 h-4 mr-2" /> My Items
                                {myItems.length > 0 && <span className="ml-2 bg-slate-100 text-slate-600 text-[10px] font-bold px-1.5 rounded-full">{myItems.length}</span>}
                            </TabsTrigger>
                            <TabsTrigger value="users" className="data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-700">
                                <UsersIcon className="w-4 h-4 mr-2" /> Users
                            </TabsTrigger>
                            <TabsTrigger value="returns" className="data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-700">
                                <History className="w-4 h-4 mr-2" /> History & Returns
                                {(pendingReturns.length + pendingCheckouts.length) > 0 && <span className="ml-2 bg-yellow-100 text-yellow-700 text-[10px] font-bold px-1.5 rounded-full">{pendingReturns.length + pendingCheckouts.length}</span>}
                            </TabsTrigger>
                            <TabsTrigger value="monitor" className="data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-700">
                                <Monitor className="w-4 h-4 mr-2" /> Monitor
                            </TabsTrigger>
                        </TabsList>
                    </div>

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
                                                            <img src={item.imageUrl} referrerPolicy="no-referrer" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
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

                                {/* Load More Button */}
                                {/* Load More Button - Removed for Firestore Realtime */}

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
                                                </div>

                                                {item.status === 'PENDING' ? (
                                                    <div className="mt-auto pt-2 text-center bg-orange-50 text-orange-700 text-xs py-1.5 rounded font-bold border border-orange-100">
                                                        Pending Approval
                                                    </div>
                                                ) : item.returnRequestStatus === 'RETURN_PENDING' ? (
                                                    <div className="mt-auto pt-2 text-center bg-yellow-50 text-yellow-700 text-xs py-1.5 rounded font-bold border border-yellow-100">
                                                        Return Pending...
                                                    </div>
                                                ) : (
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="mt-auto w-full text-xs hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setReturnItem(item);
                                                        }}
                                                    >
                                                        Return Item
                                                    </Button>
                                                )}
                                            </Card>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </TabsContent>

                    {/* --- USERS TAB (WITH HOLDINGS) --- */}
                    <TabsContent value="users" className="focus-visible:outline-none focus-visible:ring-0">
                        <div className="space-y-6">
                            <h2 className="text-2xl font-bold tracking-tight">Team Directory</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {allUsers.map(u => {
                                    const userHoldings = activeRequests.filter(r => r.userEmail === u.email);

                                    return (
                                        <Card key={u.id} className="flex flex-col p-0 overflow-hidden hover:shadow-md transition-all border-slate-200">
                                            <div className="p-5 flex items-start space-x-4 border-b border-slate-50">
                                                <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                                                    <UsersIcon className="h-6 w-6 text-slate-400" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex justify-between items-start">
                                                        <p className="font-bold text-slate-900 truncate">{u.name}</p>
                                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${u.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                                            {u.status}
                                                        </span>
                                                    </div>
                                                    <p className="text-sm text-slate-500 truncate">{u.email}</p>
                                                    <div className="flex items-center gap-2 mt-2">
                                                        <span className="text-[10px] font-medium bg-slate-100 px-2 py-1 rounded text-slate-600 uppercase tracking-wide">
                                                            {u.role}
                                                        </span>
                                                        {u.laptopStatus === 'Online' && (
                                                            <span className="text-[10px] font-medium text-emerald-600 flex items-center gap-1">
                                                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Online
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Holdings Section */}
                                            <div className="bg-slate-50/50 p-4 flex-1">
                                                <p className="text-xs font-bold text-slate-400 uppercase mb-2">Active Holdings</p>
                                                {userHoldings.length > 0 ? (
                                                    <div className="space-y-1">
                                                        {userHoldings.map((h, idx) => (
                                                            <div key={idx} className="flex justify-between text-xs text-slate-600 bg-white px-2 py-1.5 rounded border border-slate-100">
                                                                <span className="truncate pr-2">{h.itemName}</span>
                                                                <span className="font-bold text-slate-900 shrink-0">x{h.quantity}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <p className="text-xs text-slate-400 italic">No active items.</p>
                                                )}
                                            </div>
                                        </Card>
                                    );
                                })}
                            </div>
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
                                                        <Button size="sm" onClick={() => handleApproveRequest(req)} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                                                            Approve
                                                        </Button>
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
                                                        <Button onClick={() => setSelectedReturn(req)} className="shrink-0 bg-slate-900 hover:bg-slate-800 ml-4">
                                                            Receive
                                                        </Button>
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
                                                    <th className="px-4 py-3">Date Borrowed</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {activeRequests.map((req, idx) => (
                                                    <tr key={idx} className="hover:bg-slate-50/50">
                                                        <td className="px-4 py-3 font-medium text-slate-900">{req.userName}</td>
                                                        <td className="px-4 py-3">{req.itemName}</td>
                                                        <td className="px-4 py-3 text-slate-500">x{req.quantity}</td>
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
                            <h2 className="text-2xl font-bold tracking-tight">Live Monitor</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                {allUsers.filter(u => u.laptopStatus === 'Online').map(u => (
                                    <Card key={u.id} className="group p-5 border-l-4 border-l-emerald-500 shadow-sm hover:shadow-md transition-all">
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
                                    </Card>
                                ))}
                                {allUsers.filter(u => u.laptopStatus === 'Online').length === 0 && (
                                    <div className="col-span-full py-12 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-500">
                                        <Monitor className="w-10 h-10 mx-auto text-slate-300 mb-3" />
                                        <p>No team members are currently online.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </TabsContent>
                </Tabs>
            </main>

            {/* --- DIALOGS --- */}

            {/* ITEM DETAILS DIALOG (New) */}
            <Dialog open={!!viewItem} onOpenChange={(o) => !o && setViewItem(null)}>
                <DialogContent className="max-w-4xl overflow-hidden p-0 gap-0 border-0 rounded-2xl h-[80vh] flex flex-col md:flex-row">
                    {/* Left: Image (Larger) */}
                    <div className="bg-slate-100 h-64 md:h-auto md:w-1/2 relative flex items-center justify-center p-8">
                        {viewItem?.imageUrl ? (
                            <img src={viewItem.imageUrl} referrerPolicy="no-referrer" className="max-w-full max-h-full object-contain drop-shadow-md" />
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

            {/* RETURN CONFIRM DIALOG - Missing in previous code, essential for 'Return Item' action */}
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
