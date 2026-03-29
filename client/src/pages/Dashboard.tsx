import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Search, Plus, LogOut, Package, History, Printer, Scissors, Zap, BookOpen, Users as UsersIcon, Monitor } from 'lucide-react';
import { toast } from 'sonner';
import { getOptimizedImageUrl } from '@/lib/utils';

/**
 * Design: Modern Minimalist - Dashboard Page
 * - Tabbed Interface: Store (Inventory) & My Items (Usage History)
 * - Real-time data fetching from Google Sheets
 * - Category-based grouping
 */

import { SCRIPT_URL } from '@/config';
import { useQuery, useMutation } from "convex/react";
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

interface UsageRecord {
  id: string;
  itemId: string;
  itemName: string;
  userEmail: string;
  action: 'CHECKOUT' | 'RETURN' | 'PENDING' | 'APPROVED';
  quantity: number;
  timestamp: string;
  // New Fields
  actionBy?: string;
  imageUrl?: string;
  returnStatus?: string;
  returnRequestStatus?: string;
}

interface ItemUser {
  name: string;
  email: string;
  role: string;
}

export default function Dashboard() {
  const { user, isAuthenticated, logout } = useAuth();
  const [, navigate] = useLocation();

  // State
  const [activeTab, setActiveTab] = useState('store');
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [myItems, setMyItems] = useState<UsageRecord[]>([]);
  const [requests, setRequests] = useState<any[]>([]); // Store raw requests
  const [categories, setCategories] = useState<string[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]); // Community Directory
  const [approvers, setApprovers] = useState<ItemUser[]>([]); // Admins & Team
  const [isLoading, setIsLoading] = useState(true);

  // Filters & Actions
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null); // For Checkout
  const [viewItem, setViewItem] = useState<InventoryItem | null>(null); // For Details Modal
  const [returnItem, setReturnItem] = useState<UsageRecord | null>(null); // For Return Modal
  const [returnTarget, setReturnTarget] = useState(''); // Selected Approver
  const [checkoutQuantity, setCheckoutQuantity] = useState('1');
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [newItemNameRequest, setNewItemNameRequest] = useState('');
  const [newItemRemarksRequest, setNewItemRemarksRequest] = useState('');

  // Laptop Tracking State
  const [laptopStatus, setLaptopStatus] = useState<'Online' | 'Offline'>(user?.laptopStatus || 'Offline');
  const [totalScreenTime, setTotalScreenTime] = useState(user?.totalTime || 0);

  // Sync state with user context updates
  useEffect(() => {
    if (user) {
      setLaptopStatus(user.laptopStatus || 'Offline');
      setTotalScreenTime(user.totalTime || 0);
    }
  }, [user]);


  // 1. Fetch Data on Mount
  useEffect(() => {
    // Data is now fetched reactively via Convex useQuery
  }, [isAuthenticated]);

  // Track if we're using the fallback (Sheets) or Convex
  const [inventorySource, setInventorySource] = React.useState<'convex' | 'sheets' | 'loading'>('loading');
  
  const convexInventory = useQuery(api.inventory.getAll);

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
      setInventorySource('sheets'); // Still set so loading spinner stops
    }
  }, []);

  // 2. Inventory: Convex is primary. Sheets is the error-only fallback.
  useEffect(() => {
    if (convexInventory !== undefined) {
      const items: InventoryItem[] = convexInventory.map(doc => ({
        id: doc.itemId || doc._id,
        name: doc.name,
        quantity: doc.quantity,
        category: doc.category,
        company: doc.company,
        imageUrl: doc.imageUrl,
        remarks: doc.remarks,
        links: doc.links,
        tags: Array.isArray(doc.tags) ? doc.tags.join(',') : (doc.tags || '')
      }));
      setInventory(items);
      const uniqueCats = Array.from(new Set(items.map((i) => i.category)));
      setCategories(['all', ...uniqueCats as string[]]);
      setInventorySource('convex');
    }
  }, [convexInventory]);

  const convexRequests = useQuery(api.requests.getAll);
  const convexUsers = useQuery(api.users.getAll);
  const initiateReturnMut = useMutation(api.requests.initiateReturn);
  const checkoutRequestMut = useMutation(api.requests.checkoutRequest);
  const toggleLaptopMut = useMutation(api.users.toggleLaptop);

  useEffect(() => {
    if (convexRequests) {
      setRequests(convexRequests as any);
    }
  }, [convexRequests]);

  useEffect(() => {
    if (convexUsers) {
      const qualifiedApprovers = convexUsers.filter((u: any) =>
        (u.role === 'ADMIN' || u.role === 'TEAM') && u.status === 'APPROVED'
      );
      setApprovers(qualifiedApprovers);

      const directoryUsers = convexUsers.filter((u: any) => u.status === 'APPROVED');
      setAllUsers(directoryUsers);
    }
  }, [convexUsers]);



  // Helper to process items (can be called when inventory updates too)
  const processMyItems = (requests: any[], currentInventory: InventoryItem[]) => {
    /*
      * Filter Logic:
      * 1. Must match current user email
      * 2. Must be APPROVED by admin
      * 3. Return Status must NOT be 'YES' (case-insensitive)
      */
    const myActiveItems = requests.filter((r: any) =>
      r.userEmail === user?.email &&
      (r.status === 'APPROVED' || r.status === 'PENDING') &&
      r.returnRequestStatus !== 'RETURN_APPROVED' &&
      (r.returnStatus || '').toLowerCase() !== 'yes'
    );

    const formattedItems = myActiveItems.map((r: any) => {
      const invItem = currentInventory.find((i) => i.id === r.itemId);
      return {
        id: r.date,
        itemId: r.itemId,
        itemName: r.itemName,
        userEmail: r.userEmail,
        quantity: r.quantity,
        timestamp: r.date,
        action: r.status,
        actionBy: r.actionBy,
        imageUrl: invItem?.imageUrl || '',
        returnRequestStatus: r.returnRequestStatus
      };
    });

    setMyItems(formattedItems);
  };

  // 3. Sync Requests + Inventory to create My Items
  useEffect(() => {
    if (requests.length > 0) {
      processMyItems(requests, inventory);
    }
  }, [requests, inventory]);


  const handleReturnSubmit = async () => {
    if (!returnItem || !returnTarget) return;

    const target = returnTarget;
    const item = { ...returnItem }; // Backup

    // 1. Close Modal Immediately
    setReturnItem(null);
    setReturnTarget('');

    toast.promise(
      initiateReturnMut({
        requestId: item.id,
        returnTarget: target,
        scriptUrl: SCRIPT_URL
      }),
      {
        loading: `Initiating return to ${target}...`,
        success: `Return initiated successfully!`,
        error: (err) => `Failed: ${err.message}`
      }
    );
  };

  const [isCheckingOut, setIsCheckingOut] = useState(false);

  const handleCheckout = async () => {
    if (!selectedItem || !checkoutQuantity || isCheckingOut) return;
    setIsCheckingOut(true);

    // 1. Close modal immediately as requested
    const itemToRequest = { ...selectedItem }; // Copy item data
    const qty = checkoutQuantity;
    setSelectedItem(null); // Close modal
    setCheckoutQuantity('1');

    // 2. Show loading/success/error flow
    toast.promise(
      checkoutRequestMut({
        userEmail: user?.email || '',
        userName: user?.name || '',
        itemId: itemToRequest.id,
        itemName: itemToRequest.name,
        quantity: parseInt(qty),
        scriptUrl: SCRIPT_URL
      }).finally(() => {
        setIsCheckingOut(false);
      }),
      {
        loading: `Requesting ${qty} ${itemToRequest.name}(s)...`,
        success: `Request for ${itemToRequest.name} successful!`,
        error: (err) => `Failed: ${err.message}`,
      }
    );
  };

  const handleRequestNewItem = () => {
    if (!newItemNameRequest) {
      toast.error('Please enter an item name');
      return;
    }

    toast.promise(
      fetch(SCRIPT_URL, {
        method: 'POST',
        body: JSON.stringify({
          action: 'requestItem',
          userEmail: user?.email,
          itemName: newItemNameRequest,
          remarks: newItemRemarksRequest
        })
      }).then(async (res) => {
        const result = await res.json();
        if (!result.success) throw new Error(result.message);
        setNewItemNameRequest('');
        setNewItemRemarksRequest('');
        setIsRequestModalOpen(false);
        return result;
      }),
      {
        loading: 'Submitting request...',
        success: 'New item request submitted successfully',
        error: (err) => `Failed: ${err.message}`
      }
    );
  };

  const handleLaptopToggle = async (checked: boolean) => {
    const newStatus = checked ? 'Online' : 'Offline';
    // Optimistic Update
    setLaptopStatus(newStatus);

    try {
      await toggleLaptopMut({
        email: user?.email || '',
        isTurningOn: checked,
        newTotal: totalScreenTime,
        scriptUrl: SCRIPT_URL,
      });
      toast.success(checked ? 'Lab Session Started' : 'Lab Session Ended');
    } catch (error) {
      console.error("Failed to toggle laptop", error);
      toast.error("Failed to update status");
      // Revert on error
      setLaptopStatus(checked ? 'Offline' : 'Online');
    }
  };

  const formatTime = (minutes: number) => {
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hrs}h ${mins}m`;
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="card-soft p-8 max-w-md text-center">
          <h2 className="text-xl font-semibold mb-4 text-foreground">Access Denied</h2>
          <Button onClick={() => navigate('/')} className="w-full">Return to Login</Button>
        </Card>
      </div>
    );
  }

  // Filter Logic
  const filteredItems = inventory.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.tags && item.tags.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Group by Category
  const groupedItems = filteredItems.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, InventoryItem[]>);

  // Sort categories alphabetically
  const sortedCategories = Object.keys(groupedItems).sort();


  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card border-b border-border shadow-sm">
        <div className="container px-4 md:px-6 h-20 flex items-center justify-between">

          {/* Left: Brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-md">
              <Package className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold tracking-tight text-foreground leading-none">
                <span className="font-display font-black text-xl leading-none tracking-tight group-hover:text-emerald-500 transition-colors">AESTHETIC</span>
              </h1>
              <span className="font-sans font-medium text-[0.65rem] leading-none tracking-[0.3em] text-emerald-600 group-hover:text-emerald-400 transition-colors mt-0.5 uppercase">Centre</span>
            </div>
          </div>

          {/* Center: Medals / Badges (Hidden on mobile) */}
          <div className="hidden md:flex flex-1 justify-center">
            {user?.tags && user.tags.length > 0 && (
              <TooltipProvider>
                <div className="flex items-center gap-2 px-6 py-2 bg-slate-50/80 backdrop-blur-sm rounded-full border border-slate-100 shadow-sm">
                  {user.tags.map((tag, idx) => {
                    const lower = tag.toLowerCase();
                    let icon = <div className="w-2 h-2 rounded-full bg-indigo-400 opacity-50" />;
                    let bg = 'bg-indigo-100 text-indigo-700 border-indigo-200';
                    let ring = 'ring-indigo-100';
                    let label = tag;

                    if (lower.includes('3d') || lower.includes('print')) {
                      icon = <Printer className="w-4 h-4" />;
                      bg = 'bg-orange-100 text-orange-700 border-orange-200';
                      ring = 'ring-orange-100';
                      label = "3D Printing Certified";
                    }
                    else if (lower.includes('laser') || lower.includes('cut')) {
                      icon = <Scissors className="w-4 h-4" />;
                      bg = 'bg-red-100 text-red-700 border-red-200';
                      ring = 'ring-red-100';
                      label = "Laser Cutter Certified";
                    }
                    else if (lower.includes('cnc') || lower.includes('mill')) {
                      icon = <Zap className="w-4 h-4" />;
                      bg = 'bg-slate-100 text-slate-700 border-slate-200';
                      ring = 'ring-slate-100';
                      label = "CNC Milling Certified";
                    }
                    else if (lower.includes('wood')) {
                      icon = <BookOpen className="w-4 h-4" />;
                      bg = 'bg-amber-100 text-amber-700 border-amber-200';
                      ring = 'ring-amber-100';
                      label = "Wood Shop Certified";
                    }

                    return (
                      <Tooltip key={idx}>
                        <TooltipTrigger asChild>
                          <div className={`relative group cursor-help p-2 rounded-full border ${bg} transition-all duration-300 hover:scale-110 hover:shadow-md ring-2 ${ring} ring-offset-2 ring-offset-background`}>
                            {icon}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="font-semibold">{label}</p>
                        </TooltipContent>
                      </Tooltip>
                    );
                  })}
                </div>
              </TooltipProvider>
            )}
          </div>

          {/* Right: Profile & Controls */}

          {/* Right: Profile & Controls */}
          <div className="flex items-center gap-4">
            {/* Laptop Toggle */}
            <div className="hidden sm:flex items-center space-x-2 bg-muted/30 p-1.5 rounded-lg border border-border/50">
              <Switch
                checked={laptopStatus === 'Online'}
                onCheckedChange={handleLaptopToggle}
                className="data-[state=checked]:bg-emerald-500"
              />
              <Monitor className={`h-4 w-4 ${laptopStatus === 'Online' ? 'text-emerald-500' : 'text-slate-400'}`} />
            </div>

            <div className="h-8 w-px bg-border hidden sm:block"></div>

            <div className="text-right hidden sm:block">
              <p className="text-sm font-bold text-foreground leading-none">{user?.name}</p>
              <p className="text-[10px] text-muted-foreground">{user?.email}</p>
            </div>

            <Button variant="ghost" size="icon" onClick={() => { logout(); navigate('/'); }} className="text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-colors rounded-full">
              <LogOut className="w-5 h-5" />
            </Button>
          </div>

        </div>
      </header>

      {/* Main Content */}
      <main className="container py-8">
        <Tabs defaultValue="store" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-3 bg-muted">
            <TabsTrigger value="store" className="flex items-center gap-2">
              <Package className="w-4 h-4" />
              Store
            </TabsTrigger>
            <TabsTrigger value="my-items" className="flex items-center gap-2">
              <History className="w-4 h-4" />
              My Items
              {myItems.length > 0 && <span className="ml-2 bg-slate-100 text-slate-600 text-[10px] font-bold px-1.5 rounded-full">{myItems.length}</span>}
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-2">
              <UsersIcon className="w-4 h-4" />
              Community
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: STORE */}
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
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat === 'all' ? 'All Categories' : cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Dialog open={isRequestModalOpen} onOpenChange={setIsRequestModalOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-emerald-600 hover:bg-emerald-700 text-white">
                    <Plus className="w-4 h-4 mr-2" /> Request New Item
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Request New Inventory Item</DialogTitle></DialogHeader>
                  <div className="space-y-4 pt-4">
                    <Input
                      value={newItemNameRequest}
                      onChange={(e) => setNewItemNameRequest(e.target.value)}
                      placeholder="Item Name (e.g. Ergonomic Mouse)"
                    />
                    <Input
                      value={newItemRemarksRequest}
                      onChange={(e) => setNewItemRemarksRequest(e.target.value)}
                      placeholder="Reason / Remarks"
                    />
                    <Button onClick={handleRequestNewItem} className="w-full bg-emerald-600">Submit Request</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {/* Data source indicator banner */}
            {inventorySource === 'sheets' && (
              <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
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

            {/* Content Grid (Grouped) */}
            {sortedCategories.length > 0 ? (
              sortedCategories.map(category => (
                <div key={category} className="space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-border">
                    <h2 className="text-xl font-display font-bold text-foreground capitalize">{category}</h2>
                    <span className="text-xs bg-muted px-2 py-1 rounded-full text-muted-foreground">
                      {groupedItems[category].length} items
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {groupedItems[category].map(item => (
                      <Card
                        key={item.id}
                        className="group overflow-hidden hover:shadow-lg transition-all border-border/50 cursor-pointer"
                        onClick={() => setViewItem(item)}
                      >
                        <div className="relative h-48 bg-muted overflow-hidden">
                          {item.imageUrl ? (
                            <img
                              src={getOptimizedImageUrl(item.imageUrl)}
                              alt={item.name}
                              referrerPolicy="no-referrer"
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
                            {/* Tags Display */}
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

                          {item.remarks && (
                            <p className="text-sm text-muted-foreground line-clamp-2 bg-muted/50 p-2 rounded">
                              {item.remarks}
                            </p>
                          )}

                          <Button
                            className="w-full mt-2"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedItem(item);
                            }}
                          >
                            Checkout
                          </Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                {isLoading ? 'Loading inventory...' : 'No items found matching your filters.'}
              </div>
            )}
          </TabsContent>

          {/* TAB 2: MY ITEMS */}
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
                  {myItems.map((record, idx) => (
                    <div key={idx} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-background border border-border rounded-lg hover:border-emerald-200 transition-colors gap-4">
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-md bg-muted overflow-hidden shrink-0 border border-border">
                          {record.imageUrl ?
                            <img src={getOptimizedImageUrl(record.imageUrl)} referrerPolicy="no-referrer" className="w-full h-full object-cover" /> :
                            <div className="flex items-center justify-center h-full text-xs text-muted-foreground">No Img</div>
                          }
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-foreground text-lg">{record.itemName}</h4>
                            <span className="text-xs bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">
                              x{record.quantity}
                            </span>
                            {record.action === 'PENDING' && (
                              <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full font-bold ml-2">
                                Pending Approval
                              </span>
                            )}
                          </div>

                          {record.action === 'APPROVED' && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Approved by <span className="font-medium text-foreground">{record.actionBy || 'Admin'}</span>
                            </p>
                          )}
                          <p className="text-[10px] text-muted-foreground">
                            {new Date(record.timestamp).toLocaleDateString()}
                          </p>
                        </div>
                      </div>

                      {record.returnRequestStatus === 'RETURN_PENDING' ? (
                        <div className="mt-auto pt-2 text-center bg-yellow-50 text-yellow-700 text-xs py-1.5 rounded font-bold border border-yellow-100">
                          Return Pending...
                        </div>
                      ) : record.action === 'PENDING' ? (
                        <div className="px-3 py-1 bg-gray-100 text-gray-500 text-xs font-bold rounded-md border border-gray-200">
                          Waiting for Approval
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs w-full sm:w-auto hover:bg-red-50 hover:text-red-600 hover:border-red-200"
                          onClick={() => setReturnItem(record)}
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


          {/* TAB 3: USERS (COMMUNITY) */}
          <TabsContent value="users">
            <Card className="card-soft p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold">Community Directory</h2>
                  <p className="text-muted-foreground">Certified makers in the space.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {allUsers.map((u) => {
                  const hasPageLink = Boolean(u.myPageLink && u.myPageLink.trim() !== "");
                  const glowIndex = getGlowStyleIndex(u.email || u.id || "");
                  const s = glowStyles[glowIndex];
                  
                  return (
                    <Card
                      key={u.id}
                      className={`flex flex-col p-4 transition-all bg-white/50 ${
                        hasPageLink
                          ? `cursor-pointer ${s.border} ${s.shadow} ${s.hoverShadow} hover:-translate-y-1 relative before:absolute before:inset-0 before:rounded-xl before:border ${s.beforeBorder} before:animate-pulse`
                          : "border-slate-200 hover:shadow-md"
                      }`}
                      onClick={() => {
                        if (hasPageLink) {
                          window.open(u.myPageLink, '_blank', 'noopener,noreferrer');
                        }
                      }}
                    >
                      <div className="flex items-start gap-3 relative z-10">
                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center shrink-0 border border-slate-200">
                          <UsersIcon className={`h-5 w-5 ${hasPageLink ? s.iconColor : 'text-slate-400'}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start">
                            <p className={`font-bold text-sm truncate pr-2 ${hasPageLink ? s.textColor : 'text-slate-900'}`}>{u.name}</p>
                            <span className={`shrink-0 px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase border shadow-sm ${hasPageLink ? `${s.badgeBg} ${s.badgeText} ${s.badgeBorder}` : 'bg-emerald-100 text-emerald-700 border-emerald-200'}`}>
                              Active
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wide mt-0.5">{u.role}</p>

                          {/* Badges */}
                          {u.tags && u.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2.5">
                              <TooltipProvider>
                                {u.tags.map((tag: string, idx: number) => {
                                  const lower = tag.toLowerCase();
                                  let icon = <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 opacity-50" />;
                                  let style = 'bg-indigo-50 text-indigo-700 border-indigo-100';
                                  let label = tag;

                                  if (lower.includes('3d') || lower.includes('print')) {
                                    icon = <Printer className="w-3 h-3" />;
                                    style = 'bg-orange-50 text-orange-700 border-orange-100';
                                    label = "3D Printing";
                                  }
                                  else if (lower.includes('laser') || lower.includes('cut')) {
                                    icon = <Scissors className="w-3 h-3" />;
                                    style = 'bg-red-50 text-red-700 border-red-100';
                                    label = "Laser Cutting";
                                  }
                                  else if (lower.includes('cnc') || lower.includes('mill')) {
                                    icon = <Zap className="w-3 h-3" />;
                                    style = 'bg-slate-50 text-slate-700 border-slate-100';
                                    label = "CNC Machining";
                                  }
                                  else if (lower.includes('wood')) {
                                    icon = <BookOpen className="w-3 h-3" />;
                                    style = 'bg-amber-50 text-amber-700 border-amber-100';
                                    label = "Wood Shop";
                                  }

                                  return (
                                    <Tooltip key={idx}>
                                      <TooltipTrigger asChild>
                                        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-medium border cursor-help ${style}`}>
                                          {icon} {tag}
                                        </span>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>{label}</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  );
                                })}
                              </TooltipProvider>
                            </div>
                          )}
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </Card>
          </TabsContent>

          {/* Return Item Modal */}
          <Dialog open={!!returnItem} onOpenChange={(open) => !open && setReturnItem(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Return {returnItem?.itemName}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="p-3 bg-muted rounded-lg text-sm">
                  <p>You are requesting to return <strong>{returnItem?.quantity} unit(s)</strong>.</p>
                  <p className="text-muted-foreground mt-1">Once approved by a team member, it will be removed from your list.</p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Select who to return to:</label>
                  <Select value={returnTarget} onValueChange={setReturnTarget}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Team Member / Admin" />
                    </SelectTrigger>
                    <SelectContent>
                      {approvers.map((u, i) => (
                        <SelectItem key={i} value={u.name}>
                          {u.name} ({u.role})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  className="w-full bg-emerald-600 hover:bg-emerald-700"
                  disabled={!returnTarget}
                  onClick={handleReturnSubmit}
                >
                  Confirm Return Request
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* View Details Modal */}
          <Dialog open={!!viewItem} onOpenChange={(open) => !open && setViewItem(null)}>
            <DialogContent className="max-w-2xl overflow-y-auto max-h-[90vh]">
              <DialogHeader>
                <DialogTitle>{viewItem?.name}</DialogTitle>
              </DialogHeader>
              {viewItem && (
                <div className="space-y-6">
                  <div className="relative aspect-video rounded-lg overflow-hidden bg-muted">
                    <img
                      src={getOptimizedImageUrl(viewItem.imageUrl)}
                      alt={viewItem.name}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-contain"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-muted/30 rounded-lg">
                      <p className="text-xs text-muted-foreground uppercase font-bold">Category</p>
                      <p className="font-medium">{viewItem.category}</p>
                    </div>
                    <div className="p-3 bg-muted/30 rounded-lg">
                      <p className="text-xs text-muted-foreground uppercase font-bold">Company</p>
                      <p className="font-medium">{viewItem.company}</p>
                    </div>
                  </div>

                  {viewItem.tags && (
                    <div>
                      <p className="text-sm font-medium mb-2">Tags</p>
                      <div className="flex flex-wrap gap-2">
                        {viewItem.tags.split(',').map((tag, i) => (
                          <span key={i} className="px-2 py-1 bg-emerald-100 text-emerald-800 text-xs rounded-full font-medium border border-emerald-200">
                            {tag.trim()}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {viewItem.remarks && (
                    <div className="p-4 bg-yellow-50/50 border border-yellow-100 rounded-lg">
                      <p className="text-sm font-medium text-yellow-800 mb-1">Remarks</p>
                      <p className="text-sm text-yellow-900/80">{viewItem.remarks}</p>
                    </div>
                  )}

                  {viewItem.links && (
                    <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-lg">
                      <p className="text-sm font-medium text-blue-800 mb-1">Useful Links</p>
                      <a href={viewItem.links} target="_blank" rel="noreferrer" className="text-sm text-blue-600 underline break-all">
                        {viewItem.links}
                      </a>
                    </div>
                  )}

                  <div className="pt-4 flex gap-3">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => setViewItem(null)}
                    >
                      Close
                    </Button>
                    <Button
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                      onClick={() => {
                        setSelectedItem(viewItem); // Set for checkout
                        setViewItem(null); // Close details
                      }}
                    >
                      Request Item
                    </Button>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>

          {/* Checkout Modal */}
          <Dialog open={!!selectedItem} onOpenChange={(open) => !open && setSelectedItem(null)}>
            <DialogContent>
              <DialogHeader><DialogTitle>Checkout {selectedItem?.name}</DialogTitle></DialogHeader>
              {selectedItem && (
                <div className="space-y-4 pt-4">
                  <div className="p-4 bg-muted rounded-lg flex gap-4">
                    <div className="w-16 h-16 bg-background rounded-md overflow-hidden shrink-0">
                      <img src={getOptimizedImageUrl(selectedItem.imageUrl)} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                    </div>
                    <div>
                      <p className="font-bold">{selectedItem.name}</p>
                      <p className="text-sm text-muted-foreground">{selectedItem.category} • {selectedItem.quantity} Available</p>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Quantity Required</label>
                    <Input
                      type="number"
                      min="1"
                      max={selectedItem.quantity}
                      value={checkoutQuantity}
                      onChange={(e) => setCheckoutQuantity(e.target.value)}
                    />
                  </div>
                  <Button onClick={handleCheckout} className="w-full bg-emerald-600">
                    Confirm Request
                  </Button>
                </div>
              )}
            </DialogContent>
          </Dialog>

        </Tabs>
      </main >
    </div >
  );
}
