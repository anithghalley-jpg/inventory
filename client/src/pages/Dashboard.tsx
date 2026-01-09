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
import { Search, Plus, LogOut, Package, History } from 'lucide-react';
import { toast } from 'sonner';

/**
 * Design: Modern Minimalist - Dashboard Page
 * - Tabbed Interface: Store (Inventory) & My Items (Usage History)
 * - Real-time data fetching from Google Sheets
 * - Category-based grouping
 */

const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyh31R3tc8neHROJrhtojKppa83o_BpBSCYsC1_1w3f_JZ52aMNCwOJNnUXGgT7ERFo/exec';

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
  action: 'CHECKOUT' | 'RETURN';
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
  const [categories, setCategories] = useState<string[]>([]);
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
    if (isAuthenticated) {
      fetchData();
    }
  }, [isAuthenticated]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch Inventory
      const invResponse = await fetch(SCRIPT_URL, {
        method: 'POST',
        body: JSON.stringify({ action: 'getInventory' }),
      });
      const invResult = await invResponse.json();

      if (invResult.success) {
        setInventory(invResult.inventory);
        // Extract unique categories
        const uniqueCats = Array.from(new Set(invResult.inventory.map((i: InventoryItem) => i.category)));
        setCategories(['all', ...uniqueCats as string[]]);
      }

      // Fetch Requests (New Logic for My Items)
      const reqResponse = await fetch(SCRIPT_URL, {
        method: 'POST',
        body: JSON.stringify({ action: 'getRequests' }),
      });
      const reqResult = await reqResponse.json();

      // Fetch Users for Approver List (Admin + Team)
      const usersResponse = await fetch(SCRIPT_URL, {
        method: 'POST',
        body: JSON.stringify({ action: 'getAllUsers' })
      });
      const usersResult = await usersResponse.json();
      if (usersResult.success) {
        const qualifiedApprovers = usersResult.users.filter((u: any) =>
          (u.role === 'ADMIN' || u.role === 'TEAM') && u.status === 'APPROVED'
        );
        setApprovers(qualifiedApprovers);
      }

      if (reqResult.success && invResult.success) {
        /*
         * Filter Logic:
         * 1. Must match current user email
         * 2. Must be APPROVED by admin
         * 3. Return Status must NOT be 'YES' (case-insensitive)
         */
        const myActiveItems = reqResult.requests.filter((r: any) =>
          r.userEmail === user?.email &&
          r.status === 'APPROVED' &&
          (r.returnStatus || '').toLowerCase() !== 'yes'
        );

        // Map request data to UsageRecord format for compatibility
        const formattedItems = myActiveItems.map((r: any) => {
          // Find image from inventory
          const invItem = invResult.inventory.find((i: any) => i.id === r.itemId);
          return {
            id: r.date, // Using date as ID since row ID isn't explicit
            itemId: r.itemId,
            itemName: r.itemName,
            quantity: r.quantity,
            timestamp: r.date,
            actionBy: r.actionBy, // New: Who approved it
            imageUrl: invItem?.imageUrl || '',
            returnRequestStatus: r.returnRequestStatus
          };
        });

        setMyItems(formattedItems);
      }

    } catch (error) {
      console.error("Failed to fetch data", error);
      toast.error("Failed to load dashboard data");
    } finally {
      setIsLoading(false);
    }
  };

  const handleReturnSubmit = async () => {
    if (!returnItem || !returnTarget) return;

    try {
      const response = await fetch(SCRIPT_URL, {
        method: 'POST',
        body: JSON.stringify({
          action: 'initiateReturn',
          date: returnItem.id, // ID
          returnTarget: returnTarget
        })
      });
      const result = await response.json();
      if (result.success) {
        toast.success(`Return request submitted to ${returnTarget}`);
        setReturnItem(null);
        setReturnTarget('');
        fetchData(); // Refresh to show pending status
      } else {
        toast.error("Failed: " + result.message);
      }
    } catch (e) {
      toast.error("Network error");
    }
  };

  const handleCheckout = async () => {
    if (!selectedItem || !checkoutQuantity) return;

    setIsLoading(true);
    try {
      const response = await fetch(SCRIPT_URL, {
        method: 'POST',
        body: JSON.stringify({
          action: 'checkoutRequest',
          userEmail: user?.email,
          userName: user?.name,
          itemId: selectedItem.id,
          itemName: selectedItem.name,
          quantity: parseInt(checkoutQuantity),
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success(`Request for ${checkoutQuantity} ${selectedItem.name}(s) sent to Admin`);
        setSelectedItem(null);
        setCheckoutQuantity('1');
        // Refresh history to show the new pending request (logic to be added to backend to show pending methods if needed, or just let users wait)
        fetchData();
      } else {
        toast.error("Failed to submit request: " + result.message);
      }
    } catch (error) {
      toast.error("Network error submitting request");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRequestNewItem = () => {
    toast.success('New item request submitted successfully');
  };

  const handleLaptopToggle = async (checked: boolean) => {
    const newStatus = checked ? 'Online' : 'Offline';
    // Optimistic Update
    setLaptopStatus(newStatus);

    try {
      const response = await fetch(SCRIPT_URL, {
        method: 'POST',
        body: JSON.stringify({
          action: 'toggleLaptop',
          email: user?.email,
          status: newStatus
        }),
      });
      const result = await response.json();

      if (result.success) {
        if (newStatus === 'Offline' && result.totalTime) {
          setTotalScreenTime(result.totalTime);
          toast.success(`Session Ended. Total time: ${formatTime(result.totalTime)}`);
        } else {
          toast.success('Lab Session Started');
        }
      }
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
        <div className="container flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-600 flex items-center justify-center">
              <Package className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground">Aesthetic Centre</h1>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">User Dashboard</span>
                {isLoading && <span className="text-xs text-emerald-600 animate-pulse">• Syncing...</span>}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-foreground">{user?.name}</p>
              <p className="text-xs text-muted-foreground">{user?.email}</p>
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
              <Switch
                checked={laptopStatus === 'Online'}
                onCheckedChange={handleLaptopToggle}
                className="data-[state=checked]:bg-emerald-500"
              />
            </div>

            <Button
              onClick={() => { logout(); navigate('/'); }}
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-8">
        <Tabs defaultValue="store" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-2 bg-muted">
            <TabsTrigger value="store" className="flex items-center gap-2">
              <Package className="w-4 h-4" />
              Store
            </TabsTrigger>
            <TabsTrigger value="my-items" className="flex items-center gap-2">
              <History className="w-4 h-4" />
              My Items
              {myItems.length > 0 && <span className="ml-2 bg-slate-100 text-slate-600 text-[10px] font-bold px-1.5 rounded-full">{myItems.length}</span>}
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

              <Dialog>
                <DialogTrigger asChild>
                  <Button className="bg-emerald-600 hover:bg-emerald-700 text-white">
                    <Plus className="w-4 h-4 mr-2" /> Request New Item
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Request New Inventory Item</DialogTitle></DialogHeader>
                  <div className="space-y-4 pt-4">
                    <Input placeholder="Item Name (e.g. Ergonomic Mouse)" />
                    <Input placeholder="Reason / Remarks" />
                    <Button onClick={handleRequestNewItem} className="w-full bg-emerald-600">Submit Request</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

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
                              src={item.imageUrl}
                              alt={item.name}
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
                            <img src={record.imageUrl} className="w-full h-full object-cover" /> :
                            <div className="flex items-center justify-center h-full text-xs text-muted-foreground">No Img</div>
                          }
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-foreground text-lg">{record.itemName}</h4>
                            <span className="text-xs bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">
                              x{record.quantity}
                            </span>
                          </div>

                          <p className="text-xs text-muted-foreground mt-1">
                            Approved by <span className="font-medium text-foreground">{record.actionBy || 'Admin'}</span>
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {new Date(record.timestamp).toLocaleDateString()}
                          </p>
                        </div>
                      </div>

                      {record.returnRequestStatus === 'PENDING' ? (
                        <div className="px-3 py-1 bg-yellow-100 text-yellow-800 text-xs font-bold rounded-md border border-yellow-200">
                          Return Pending...
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
                      src={viewItem.imageUrl}
                      alt={viewItem.name}
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
                      <img src={selectedItem.imageUrl} className="w-full h-full object-cover" />
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
      </main>
    </div>
  );
}
