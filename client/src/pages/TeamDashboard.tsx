import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Search, Plus, Filter, Trash2, Edit2, CheckCircle, XCircle, Package, Download, BarChart2, Monitor, LogOut, Users as UsersIcon, Camera, Clock, History } from 'lucide-react';
import { toast } from 'sonner';

const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwXHLzLob0rScK6t0AaxZeKyi7HxG5NG8HEWNm0_Vs2Hkt4yd_pg81AqCPucjwpJ7o6/exec';

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
}

export default function TeamDashboard() {
    const { user, logout, isAuthenticated } = useAuth();
    const [, navigate] = useLocation();

    // State
    const [activeTab, setActiveTab] = useState('store');
    const [isLoading, setIsLoading] = useState(true);
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [categories, setCategories] = useState<string[]>([]);
    const [myItems, setMyItems] = useState<UsageRecord[]>([]);
    const [allUsers, setAllUsers] = useState<User[]>([]);
    const [activeLoans, setActiveLoans] = useState<any[]>([]);
    const [activeRequests, setActiveRequests] = useState<any[]>([]); // Current holdings for Admin View
    const [pendingReturns, setPendingReturns] = useState<any[]>([]); // Incoming returns
    const [approvers, setApprovers] = useState<User[]>([]);

    // Actions State
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null); // For Checkout
    const [checkoutQuantity, setCheckoutQuantity] = useState('1');
    const [viewItem, setViewItem] = useState<InventoryItem | null>(null); // For Details
    const [returnItem, setReturnItem] = useState<UsageRecord | null>(null); // For User Return Dialog
    const [returnTarget, setReturnTarget] = useState(''); // For User Return Dropdown
    const [selectedReturn, setSelectedReturn] = useState<any | null>(null); // For Team Receive Dialog
    const [returnRemarks, setReturnRemarks] = useState('');

    // Laptop State
    const [laptopStatus, setLaptopStatus] = useState<'Online' | 'Offline'>(user?.laptopStatus || 'Offline');
    const [totalScreenTime, setTotalScreenTime] = useState(user?.totalTime || 0);

    useEffect(() => {
        if (user) {
            setLaptopStatus(user.laptopStatus || 'Offline');
            setTotalScreenTime(user.totalTime || 0);
        }
    }, [user]);

    if (!isAuthenticated || (user?.role !== 'TEAM' && user?.role !== 'ADMIN')) {
        return <div className="p-8 text-center">Access Denied</div>;
    }

    // Initial Fetch
    useEffect(() => {
        fetchAllData();
    }, []);

    const fetchAllData = async () => {
        setIsLoading(true);
        try {
            await Promise.all([fetchInventory(), fetchUsers()]);
        } catch (e) {
            toast.error("Failed to load data");
        } finally {
            setIsLoading(false);
        }
    };

    const fetchInventory = async () => {
        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'getInventory' }),
        });
        const result = await response.json();
        if (result.success) {
            setInventory(result.inventory);
            const uniqueCats = Array.from(new Set(result.inventory.map((i: any) => i.category)));
            setCategories(['all', ...uniqueCats as string[]]);
        }
    };

    const fetchUsers = async () => {
        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'getAllUsers' })
        });
        const result = await response.json();
        if (result.success) {
            setAllUsers(result.users);

            // Set Approvers for Dropdown
            const qualified = result.users.filter((u: any) =>
                (u.role === 'ADMIN' || u.role === 'TEAM') && u.status === 'APPROVED'
            );
            setApprovers(qualified);

            // Fetch Requests (Used for My Items + Admin Views)
            const reqResponse = await fetch(SCRIPT_URL, {
                method: 'POST',
                body: JSON.stringify({ action: 'getRequests' }) // Fetch ALL requests
            });
            const reqResult = await reqResponse.json();

            if (reqResult.success) {
                // 1. Process "My Items" for the Team Member themselves
                const myActiveItems = reqResult.requests.filter((r: any) =>
                    r.userEmail === user?.email &&
                    r.status === 'APPROVED' &&
                    (r.returnStatus || '').toLowerCase() !== 'yes'
                );

                // Need inventory for images
                // Note: fetchInventory creates state, but here we might run parallel. 
                // It's safer to rely on re-render or wait. For now, we assume simple mapping.

                setMyItems(myActiveItems.map((r: any) => ({
                    ...r,
                    id: r.date,
                    imageUrl: '' // Will need lookup if inventory not ready, but OK for now
                })));

                // 2. Process "Incoming Returns" (Where Team member is the Target)
                const returns = reqResult.requests.filter((r: any) =>
                    r.status === 'APPROVED' &&
                    r.returnRequestStatus === 'PENDING' &&
                    (user?.role === 'ADMIN' || r.returnTarget === user?.name)
                );
                setPendingReturns(returns);

                // 3. Process "Current Holdings" (All Users)
                const validLoans = reqResult.requests.filter((r: any) =>
                    r.status === 'APPROVED' && (r.returnStatus || '').toLowerCase() !== 'yes'
                );
                setActiveRequests(validLoans);
            }
        }
    };

    // --- ACTIONS: USER SIDE ---

    const handleCheckout = async () => {
        if (!selectedItem) return;
        try {
            await fetch(SCRIPT_URL, {
                method: 'POST',
                body: JSON.stringify({
                    action: 'checkoutRequest',
                    userEmail: user?.email,
                    userName: user?.name,
                    itemId: selectedItem.id,
                    itemName: selectedItem.name,
                    quantity: parseInt(checkoutQuantity)
                })
            });
            toast.success("Request sent");
            setSelectedItem(null);
            fetchUsers(); // Refresh "My items"
        } catch (e) { toast.error("Error"); }
    };

    const handleReturnSubmit = async () => {
        if (!returnItem || !returnTarget) return;
        try {
            await fetch(SCRIPT_URL, {
                method: 'POST',
                body: JSON.stringify({
                    action: 'initiateReturn',
                    date: returnItem.id,
                    returnTarget: returnTarget
                })
            });
            toast.success("Return initiated");
            setReturnItem(null);
            fetchAllData();
        } catch (e) { toast.error("Error"); }
    };

    const handleLaptopToggle = async (checked: boolean) => {
        const newStatus = checked ? 'Online' : 'Offline';
        setLaptopStatus(newStatus);
        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({
                action: 'toggleLaptop',
                email: user?.email,
                status: newStatus
            })
        });
        const res = await response.json();
        if (res.success && newStatus === 'Offline') setTotalScreenTime(res.totalTime);
    };

    // --- ACTIONS: ADMIN SIDE ---
    const handleProcessReturn = async () => {
        if (!selectedReturn) return;
        try {
            await fetch(SCRIPT_URL, {
                method: 'POST',
                body: JSON.stringify({
                    action: 'processReturn',
                    date: selectedReturn.date,
                    receiverName: user?.name,
                    remarks: returnRemarks,
                    quantity: selectedReturn.quantity,
                    itemId: selectedReturn.itemId,
                    userEmail: selectedReturn.userEmail
                })
            });
            toast.success("Item Received");
            setSelectedReturn(null);
            fetchAllData();
        } catch (e) { toast.error("Error"); }
    };

    // --- UI HELPERS ---
    const filteredItems = inventory.filter(item =>
        (selectedCategory === 'all' || item.category === selectedCategory) &&
        (item.name.toLowerCase().includes(searchQuery.toLowerCase()) || (item.tags || '').includes(searchQuery))
    );

    const groupedItems = filteredItems.reduce((acc, item) => {
        if (!acc[item.category]) acc[item.category] = [];
        acc[item.category].push(item);
        return acc;
    }, {} as Record<string, InventoryItem[]>);

    const formatTime = (minutes: number) => {
        const hrs = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${hrs}h ${mins}m`;
    };

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-card border-b border-border shadow-sm">
                <div className="container flex items-center justify-between h-16">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-emerald-600 flex items-center justify-center">
                            <Package className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-lg font-bold text-foreground">Inventory Manager</h1>
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground">Team Dashboard</span>
                                {isLoading && <span className="text-xs text-emerald-600 animate-pulse">• Syncing...</span>}
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="text-right hidden sm:block">
                            <p className="text-sm font-medium text-foreground">{user?.name}</p>
                            <p className="text-xs text-muted-foreground">{user?.role}</p>
                        </div>
                        {/* Laptop Toggle */}
                        <div className="flex items-center gap-3 bg-muted/50 px-3 py-1.5 rounded-full border border-border">
                            <div className="flex flex-col items-end mr-1">
                                <span className={`text-xs font-bold ${laptopStatus === 'Online' ? 'text-emerald-500' : 'text-muted-foreground'}`}>
                                    {laptopStatus === 'Online' ? 'Online' : 'Offline'}
                                </span>
                                {laptopStatus === 'Offline' && (
                                    <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                                        Time: {formatTime(totalScreenTime)}
                                    </span>
                                )}
                            </div>
                            <Switch checked={laptopStatus === 'Online'} onCheckedChange={handleLaptopToggle} className="data-[state=checked]:bg-emerald-500" />
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => { logout(); navigate('/'); }} className="text-muted-foreground hover:text-foreground">
                            <LogOut className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            </header>

            <main className="container py-8">
                <Tabs defaultValue="store" className="space-y-6">
                    <TabsList className="grid w-full max-w-4xl grid-cols-5 bg-muted">
                        <TabsTrigger value="store">Store</TabsTrigger>
                        <TabsTrigger value="my-items">My Items</TabsTrigger>
                        <TabsTrigger value="users">Users</TabsTrigger>
                        <TabsTrigger value="history">Return Requests</TabsTrigger>
                        <TabsTrigger value="monitor">Monitor</TabsTrigger>
                    </TabsList>

                    {/* 1. STORE TAB */}
                    <TabsContent value="store" className="space-y-6">
                        {/* Actions Bar */}
                        <div className="flex flex-col sm:flex-row gap-4 justify-between">
                            <div className="flex gap-4 flex-1">
                                <div className="relative flex-1 max-w-sm">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                                    <Input
                                        placeholder="Search items..."
                                        className="pl-10"
                                        value={searchQuery}
                                        onChange={e => setSearchQuery(e.target.value)}
                                    />
                                </div>
                                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                                    <SelectTrigger className="w-40"><SelectValue placeholder="Category" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Categories</SelectItem>
                                        {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Content Grid */}
                        <div className="space-y-8">
                            {Object.keys(groupedItems).sort().map(cat => (
                                <div key={cat} className="space-y-4">
                                    <div className="flex items-center gap-2 pb-2 border-b border-border">
                                        <h2 className="text-xl font-display font-bold text-foreground capitalize">{cat}</h2>
                                        <span className="text-xs bg-muted px-2 py-1 rounded-full text-muted-foreground">
                                            {groupedItems[cat].length} items
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {groupedItems[cat].map(item => (
                                            <Card
                                                key={item.id}
                                                className="group overflow-hidden hover:shadow-lg transition-all border-border/50 cursor-pointer"
                                                onClick={() => setViewItem(item)}
                                            >
                                                <div className="relative h-48 bg-muted overflow-hidden">
                                                    {item.imageUrl ? (
                                                        <img
                                                            src={item.imageUrl}
                                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                                        />
                                                    ) : (
                                                        <div className="flex items-center justify-center h-full text-muted-foreground">No Image</div>
                                                    )}
                                                    <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm text-foreground px-3 py-1 rounded-full text-xs font-bold shadow-sm">
                                                        {item.quantity} in stock
                                                    </div>
                                                </div>

                                                <div className="p-4 space-y-3">
                                                    <div>
                                                        <h3 className="font-bold text-lg leading-tight">{item.name}</h3>
                                                        <p className="text-xs text-muted-foreground">{item.company}</p>
                                                        {item.tags && (
                                                            <div className="flex flex-wrap gap-1 mt-2">
                                                                {item.tags.split(',').map((tag: string, i: number) => (
                                                                    tag.trim() && (
                                                                        <span key={i} className="px-2 py-0.5 text-[10px] uppercase font-bold tracking-wider rounded-sm bg-gray-100 text-gray-600 border border-gray-200">
                                                                            {tag.trim()}
                                                                        </span>
                                                                    )
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <Button
                                                        className="w-full mt-2"
                                                        variant="outline"
                                                        onClick={(e) => { e.stopPropagation(); setSelectedItem(item); }}
                                                    >
                                                        Checkout
                                                    </Button>
                                                </div>
                                            </Card>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </TabsContent>

                    {/* 2. MY ITEMS TAB */}
                    <TabsContent value="my-items">
                        <Card className="card-soft p-6">
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <h2 className="text-2xl font-bold">My Checked Out Items</h2>
                                    <p className="text-muted-foreground">History of items you have requested and received.</p>
                                </div>
                            </div>

                            {myItems.length > 0 ? (
                                <div className="space-y-4">
                                    {myItems.map((item, idx) => (
                                        <div key={item.id || idx} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-background border border-border rounded-lg hover:border-emerald-200 transition-colors gap-4">
                                            <div className="flex items-center gap-4">
                                                <div className="w-16 h-16 rounded-md bg-muted overflow-hidden shrink-0 border border-border">
                                                    {item.imageUrl ?
                                                        <img src={item.imageUrl} className="w-full h-full object-cover" /> :
                                                        <div className="flex items-center justify-center h-full text-xs text-muted-foreground">No Img</div>
                                                    }
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <h4 className="font-bold text-foreground text-lg">{item.itemName}</h4>
                                                        <span className="text-xs bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">
                                                            x{item.quantity}
                                                        </span>
                                                    </div>
                                                    <p className="text-xs text-muted-foreground mt-1">
                                                        {item.timestamp ? new Date(item.timestamp).toLocaleDateString() : 'Date N/A'}
                                                    </p>
                                                </div>
                                            </div>

                                            {item.returnRequestStatus === 'PENDING' ? (
                                                <div className="px-3 py-1 bg-yellow-100 text-yellow-800 text-xs font-bold rounded-md border border-yellow-200">
                                                    Return Pending...
                                                </div>
                                            ) : (
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => setReturnItem(item)}
                                                    className="text-xs w-full sm:w-auto hover:bg-red-50 hover:text-red-600 hover:border-red-200"
                                                >
                                                    Return Item
                                                </Button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-12 border-2 border-dashed border-border rounded-xl">
                                    <History className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                                    <h3 className="font-medium text-lg">No history yet</h3>
                                    <p className="text-muted-foreground">Items you checkout will appear here.</p>
                                </div>
                            )}
                        </Card>
                    </TabsContent>

                    {/* 3. USERS TAB */}
                    <TabsContent value="users">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {allUsers.map(u => (
                                <Card key={u.id} className="p-4 flex items-center space-x-4 hover:shadow transition-all">
                                    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                                        <UsersIcon className="h-5 w-5 text-muted-foreground" />
                                    </div>
                                    <div className="flex-1 overflow-hidden">
                                        <div className="flex justify-between items-start">
                                            <p className="font-bold truncate">{u.name}</p>
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold text-white ${u.status === 'APPROVED' ? 'bg-emerald-500' : 'bg-yellow-500'}`}>
                                                {u.status}
                                            </span>
                                        </div>
                                        <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                                        <span className="inline-block mt-1 text-[10px] bg-muted px-1.5 py-0.5 rounded border uppercase tracking-wider">
                                            {u.role}
                                        </span>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    </TabsContent>

                    {/* 4. HISTORY (RETURNS) TAB */}
                    <TabsContent value="history">
                        <h2 className="text-xl font-bold mb-4">Incoming Returns</h2>
                        {pendingReturns.length === 0 && <p className="text-muted-foreground">No pending returns.</p>}
                        {pendingReturns.map(req => (
                            <Card key={req.date} className="p-4 flex justify-between items-center mb-2 border-l-4 border-l-yellow-400">
                                <div>
                                    <p className="font-bold">{req.itemName} (x{req.quantity})</p>
                                    <p className="text-sm">From: {req.userName}</p>
                                </div>
                                <Button onClick={() => setSelectedReturn(req)}>Receive</Button>
                            </Card>
                        ))}

                        <h2 className="text-xl font-bold mt-8 mb-4">Current User Holdings</h2>
                        {/* Simplified Holdings View */}
                        <div className="grid gap-4">
                            {activeRequests.map(req => (
                                <div key={req.date} className="p-2 border rounded flex justify-between">
                                    <span>{req.userName} has {req.itemName}</span>
                                    <span className="font-bold">x{req.quantity}</span>
                                </div>
                            ))}
                        </div>
                    </TabsContent>

                    {/* 5. MONITOR TAB */}
                    <TabsContent value="monitor">
                        <h2 className="text-xl font-bold mb-4">Online Users</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            {allUsers.filter(u => u.laptopStatus === 'Online').map(u => (
                                <Card key={u.id} className="p-4 border-l-4 border-l-emerald-500 hover:shadow-md transition-all">
                                    <div className="flex items-center gap-3">
                                        <div className="relative">
                                            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold">
                                                {u.name.charAt(0)}
                                            </div>
                                            <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full"></div>
                                        </div>
                                        <div>
                                            <p className="font-bold text-sm">{u.name}</p>
                                            <p className="text-xs text-muted-foreground">Active Now</p>
                                        </div>
                                    </div>
                                </Card>
                            ))}
                            {allUsers.filter(u => u.laptopStatus === 'Online').length === 0 && (
                                <div className="col-span-full text-center py-8 text-muted-foreground bg-muted/30 rounded-lg">
                                    No users currently online.
                                </div>
                            )}
                        </div>
                    </TabsContent>
                </Tabs>
            </main>

            {/* DIALOGS */}
            <Dialog open={!!selectedItem} onOpenChange={(o) => !o && setSelectedItem(null)}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Checkout {selectedItem?.name}</DialogTitle></DialogHeader>
                    <Input type="number" value={checkoutQuantity} onChange={e => setCheckoutQuantity(e.target.value)} />
                    <Button onClick={handleCheckout}>Confirm</Button>
                </DialogContent>
            </Dialog>

            <Dialog open={!!returnItem} onOpenChange={(o) => !o && setReturnItem(null)}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Return {returnItem?.itemName}</DialogTitle></DialogHeader>
                    <Select value={returnTarget} onValueChange={setReturnTarget}>
                        <SelectTrigger><SelectValue placeholder="Return to..." /></SelectTrigger>
                        <SelectContent>{approvers.map(a => <SelectItem key={a.id} value={a.name}>{a.name}</SelectItem>)}</SelectContent>
                    </Select>
                    <Button onClick={handleReturnSubmit}>Confirm</Button>
                </DialogContent>
            </Dialog>

            <Dialog open={!!selectedReturn} onOpenChange={(o) => !o && setSelectedReturn(null)}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Receive {selectedReturn?.itemName}</DialogTitle></DialogHeader>
                    <Input placeholder="Remarks" value={returnRemarks} onChange={e => setReturnRemarks(e.target.value)} />
                    <Button onClick={handleProcessReturn}>Confirm Receipt</Button>
                </DialogContent>
            </Dialog>

            <Dialog open={!!viewItem} onOpenChange={(o) => !o && setViewItem(null)}>
                <DialogContent>
                    <DialogHeader><DialogTitle>{viewItem?.name}</DialogTitle></DialogHeader>
                    {viewItem?.imageUrl && <img src={viewItem.imageUrl} className="w-full h-64 object-contain mb-4" />}
                    <p>Stock: {viewItem?.quantity}</p>
                    <p>Category: {viewItem?.category}</p>
                    <p>Company: {viewItem?.company}</p>
                    <p>Tags: {viewItem?.tags}</p>
                    <div className="flex gap-2 mt-4">
                        <Button variant="outline" onClick={() => setViewItem(null)}>Close</Button>
                        <Button onClick={() => { setSelectedItem(viewItem); setViewItem(null); }}>Request This Item</Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
