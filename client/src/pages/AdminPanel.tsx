import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Plus, Filter, Trash2, Edit2, CheckCircle, XCircle, Package, Download, BarChart2, Monitor, LogOut, Users as UsersIcon, Camera, Clock } from 'lucide-react';
import { toast } from 'sonner';

/**
 * Design: Modern Minimalist - Admin Panel
 * - Tabbed interface for different admin functions
 * - User approval management
 * - Inventory management
 * - Category management
 * - Usage history tracking
 * - Warm sage green accents with admin-specific styling
 */
// 1. Add your Google Apps Script Deployment URL at the top of your component
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyXcj74jsDteyR0SFs9Mon0FC8ojVDkJnSm4m47r_FGKHTInP1ih78I7Na42Hyb2Oeu/exec'; // Copy this from your GAS deployment [3]
const DRIVE_FOLDER_ID = '1i_fpnnNDIjOfK5Z8D3GP6yHp00KZ0bsg';

interface PendingUser {
  id: string;
  email: string;
  name: string;
  createdDate: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
}

interface User {
  id: string;
  name: string;
  email: string;
  status: string;
  role: string;
  createdDate: string;
}

interface InventoryItem {
  id: string;
  name: string;
  quantity: number;
  category: string;
  company: string;
  imageUrl: string;
  remarks?: string;
  links?: string;
  isPending?: boolean;
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
}

export default function AdminPanel() {
  const { user, logout } = useAuth();
  const [, navigate] = useLocation();
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([
    {
      id: '1',
      email: 'john@company.com',
      name: 'John Doe',
      createdDate: new Date().toISOString(),
      status: 'PENDING',
    },
  ]);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const [hasMore, setHasMore] = useState(false);
  const [syncQueue, setSyncQueue] = useState<any[]>([]);
  const [totalToUpload, setTotalToUpload] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [usageHistory, setUsageHistory] = useState<UsageRecord[]>([]);
  const [newCategory, setNewCategory] = useState('');
  const [newItemName, setNewItemName] = useState('');
  const [newItemQuantity, setNewItemQuantity] = useState('');
  const [newItemCompany, setNewItemCompany] = useState('');
  const [newItemTags, setNewItemTags] = useState<string[]>([]);
  const [currentTagInput, setCurrentTagInput] = useState('');
  const [newItemCategory, setNewItemCategory] = useState('');
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [activeLoans, setActiveLoans] = useState<any[]>([]); // New State for Loans
  const [activeRequests, setActiveRequests] = useState<any[]>([]); // All active holdings
  const [pendingReturns, setPendingReturns] = useState<any[]>([]); // Returns waiting for approval
  const [pendingCheckouts, setPendingCheckouts] = useState<any[]>([]); // New: Checkouts waiting for approval
  const [selectedReturn, setSelectedReturn] = useState<any | null>(null); // For Receive Modal
  const [returnRemarks, setReturnRemarks] = useState('');
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  if (user?.role !== 'ADMIN' && user?.role !== 'TEAM') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="card-soft p-8 max-w-md text-center">
          <h2 className="text-xl font-semibold mb-4 text-foreground">Access Denied</h2>
          <p className="text-muted-foreground mb-6">
            Only administrators can access this panel.
          </p>
          <Button
            onClick={() => {
              logout();
              navigate('/');
            }}
            className="w-full"
          >
            Return to Login
          </Button>
        </Card>
      </div>
    );
  }

  const approveUser = async (userId: string) => {
    try {
      const response = await fetch(SCRIPT_URL, {
        method: 'POST',
        body: JSON.stringify({ action: 'approveUser', userId }),
      });
      const result = await response.json();

      if (result.success) {
        toast.success("User approved!");

        // OPTIMIZATION: Update the local state so the UI changes instantly
        setAllUsers(prevUsers =>
          prevUsers.map((u) =>
            u.id === userId ? { ...u, status: 'APPROVED' } : u
          )
        );
      }
      toast.success("User approved!");
    } catch (error) {
      toast.error("Approval failed");
    }
  };

  const handleApproveUser = (userId: string) => {
    setPendingUsers(
      pendingUsers.map((u) =>
        u.id === userId ? { ...u, status: 'APPROVED' } : u
      )
    );
    toast.success('User approved');
  };

  const handleRejectUser = (userId: string) => {
    setPendingUsers(
      pendingUsers.map((u) =>
        u.id === userId ? { ...u, status: 'REJECTED' } : u
      )
    );
    toast.success('User rejected');
  };

  const handleAddCategory = async () => {
    if (!newCategory) {
      toast.error('Please enter a category name');
      return;
    }

    // 1. Optimistic Update: Update UI immediately
    const previousCategories = [...categories]; // Backup for rollback
    setCategories([...categories, newCategory]);
    setNewCategory(''); // Reset input immediately for next entry
    toast.success('Category saved to background queue');

    try {
      // 2. Send to backend in background
      const response = await fetch(SCRIPT_URL, {
        method: 'POST',
        body: JSON.stringify({
          action: 'addCategory',
          categoryName: newCategory
        }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || 'Failed to save');
      }
      // Success: Do nothing, UI is already correct
    } catch (error) {
      // 3. Rollback on failure
      console.error("Add category failed:", error);
      setCategories(previousCategories); // Revert state
      toast.error('Failed to save category. Rolled back.');
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await fetch(SCRIPT_URL, {
        method: 'POST',
        body: JSON.stringify({ action: 'getAllUsers' }),
      });
      const result = await response.json();
      console.log("Data from Google:", result.users); // <--- ADD THIS LINE

      if (result.success) {
        // Priority: 1 for Pending (Needs attention), 2 for Approved, 3 for Rejected
        const priority = { 'PENDING': 1, 'APPROVED': 2, 'REJECTED': 3 };

        const sorted = result.users.sort((a: User, b: User) => {
          // We cast the status to "keyof typeof priority"
          const aStatus = a.status as keyof typeof priority;
          const bStatus = b.status as keyof typeof priority;

          return (priority[aStatus] || 99) - (priority[bStatus] || 99);
        });

        // Normalize data to ensure case-insensitive rendering
        const normalizedUsers = result.users.map((u: User) => ({
          ...u,
          status: u.status?.toUpperCase() || 'PENDING',
          role: u.role?.toUpperCase() || 'USER'
        }));

        setAllUsers(normalizedUsers);

        // Fetch Requests for Active Loans
        const reqResponse = await fetch(SCRIPT_URL, {
          method: 'POST',
          body: JSON.stringify({ action: 'getRequests' }),
        });
        const reqResult = await reqResponse.json();

        if (reqResult.success) {
          // Filter for active approved loans (Return Status != YES)
          const validLoans = reqResult.requests.filter((r: any) =>
            r.status === 'APPROVED' &&
            r.returnRequestStatus !== 'RETURN_APPROVED' &&
            (r.returnStatus || '').toLowerCase() !== 'yes'
          );
          setActiveLoans(validLoans);
          setActiveRequests(validLoans); // Use for Current Holdings

          // Filter for Pending Returns
          // If TEAM, only show returns targeted to them. If ADMIN, show all.
          const returns = reqResult.requests.filter((r: any) =>
            r.status === 'APPROVED' &&
            r.returnRequestStatus === 'RETURN_PENDING' &&
            (user?.role === 'ADMIN' || r.returnTarget === user?.name)
          );
          setPendingReturns(returns);

          // Filter for Pending Checkouts (New)
          setPendingCheckouts(reqResult.requests.filter((r: any) =>
            r.status === 'PENDING'
          ));
        }

      } else {
        toast.error('Failed to fetch users');
      }
    } catch (error) {
      toast.error('Failed to load users');
    }
  };

  const handleProcessReturn = async () => {
    if (!selectedReturn) return;

    const returnData = { ...selectedReturn };
    const remarks = returnRemarks;

    // 1. Close modal immediately
    setSelectedReturn(null);
    setReturnRemarks('');

    // 2. Optimistic Update (Optional) - Removed for Admin as list refresh is fast enough, but promise gives feedback

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
        fetchInventory();
        return result;
      }),
      {
        loading: 'Receiving item...',
        success: 'Return processed successfully! (Synced to Sheets)',
        error: (err) => `Failed: ${err.message}`
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
      fetchUsers(); // Refresh full state
      fetchInventory(); // Refresh stock
    } catch (e) {
      toast.error("Approval failed");
      fetchUsers(); // Rollback
    }
  };

  // 2. Replace the old handleAddItem with this version
  const handleAddItem = async () => {
    // Validation (Checks required fields - tags are optional)
    if (!newItemName || !newItemQuantity || !newItemCompany || !newItemCategory) {
      toast.error('Please fill required fields (Name, Qty, Company, Category)');
      return;
    }

    // Create the object exactly as the 'completeInventoryItem' backend expects [7]
    const pendingItem = {
      id: Math.random().toString(36).substr(2, 9), // Temporary ID for UI
      name: newItemName,
      quantity: parseInt(newItemQuantity),
      category: newItemCategory,
      company: newItemCompany,
      imageUrl: capturedImage || '',
      remarks: '',
      links: '',
      tags: newItemTags.join(','), // Store as comma-separated for local pending state
      tagsArray: newItemTags, // Keep array for backend
      isPending: true
    };

    // Add to local UI state for instant feedback [9]
    setInventory([pendingItem as any, ...inventory]);

    // Push to local storage queue [11]
    const currentQueue = JSON.parse(localStorage.getItem('syncQueue') || '[]');
    localStorage.setItem('syncQueue', JSON.stringify([...currentQueue, pendingItem]));

    // Reset inputs immediately [11]
    setNewItemName('');
    setNewItemQuantity('');
    setNewItemCompany('');
    setNewItemTags([]);
    setCurrentTagInput('');
    setCapturedImage(null);

    processSyncQueue(); // Trigger the background worker [11]

  };

  const fetchCategories = async () => {
    try {
      const response = await fetch(SCRIPT_URL, {
        method: 'POST',
        body: JSON.stringify({ action: 'getCategories' }),
      });
      const result = await response.json();
      if (result.success) {
        // Update state with categories from the sheet
        setCategories(result.categories);
      }
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  };

  // Inside AdminPanel function, before the return statement:
  const [isLoading, setIsLoading] = useState(true);

  // 1. Create the function to fetch data from the script
  const fetchInventory = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(SCRIPT_URL, {
        method: 'POST',
        body: JSON.stringify({ action: 'getInventory' }), // Matches backend action [4]
      });

      const result = await response.json();

      if (result.success) {
        // 2. Update the inventory state with real data from Google Sheets [3]
        setInventory(result.inventory);
      } else {
        toast.error('Failed to load inventory');
      }
    } catch (error) {
      console.error('Fetch error:', error);
      toast.error('Connection error while loading inventory');
    } finally {
      setIsLoading(false);
    }
  };

  const processSyncQueue = async () => {
    // 1. Get latest queue from storage
    const queue = JSON.parse(localStorage.getItem('syncQueue') || '[]');
    if (queue.length === 0) return;

    const itemToSync = queue[0]; // FIX: Get the first item object
    setIsSyncing(true);
    let syncedItemId = '';

    try {
      // STEP 1: Upload Image
      if (itemToSync.imageUrl && itemToSync.imageUrl.startsWith('data:')) {
        const base64Content = itemToSync.imageUrl.split(',')[1];
        const uploadResponse = await fetch(SCRIPT_URL, {
          method: 'POST',
          // mode: 'no-cors' REMOVED to allow reading the JSON response
          body: JSON.stringify({
            action: 'uploadImage',
            fileName: `${itemToSync.name.replace(/\s+/g, '_')}_${Date.now()}.png`,
            mimeType: 'image/png',
            content: base64Content,
            folderId: DRIVE_FOLDER_ID
          }),
        });

        const uploadResult = await uploadResponse.json();
        if (uploadResult.success) {
          syncedItemId = uploadResult.itemId; // Real UUID from backend
        } else {
          throw new Error("Image upload failed: " + uploadResult.message);
        }
      }

      // ONLY PROCEED if we have a valid ID to update
      if (!syncedItemId) throw new Error("No Item ID received from server");
      // Inside processSyncQueue Step 2
      const completeResponse = await fetch(SCRIPT_URL, {
        method: 'POST',
        body: JSON.stringify({
          action: 'completeInventoryItem',
          itemId: syncedItemId,
          name: itemToSync.name,
          quantity: itemToSync.quantity,
          category: itemToSync.category,
          company: itemToSync.company,
          remarks: itemToSync.remarks || '',
          links: itemToSync.links || '',
          tags: itemToSync.tagsArray || (itemToSync.tags ? itemToSync.tags.split(',') : [])
        }),
      });

      const completeResult = await completeResponse.json();

      if (completeResult.success) {
        // SUCCESS: Move to next
        const updatedQueue = queue.slice(1);
        localStorage.setItem('syncQueue', JSON.stringify(updatedQueue));
        setSyncQueue(updatedQueue);
        toast.success(`${itemToSync.name} synced!`);
        // 2. UPDATE THE UI: Find the item in 'inventory' and mark it finished
        setInventory(prevInventory =>
          prevInventory.map(invItem =>
            // We match by name or temporary ID
            invItem.name === itemToSync.name ?
              { ...invItem, isPending: false, imageUrl: itemToSync.imageUrl } :
              invItem
          )
        );
        if (updatedQueue.length === 0) {
          // Optional: Only fetch if you want a total refresh
          // fetchInventory(); 
          toast.success(`All items synced!`);
        } else {
          processSyncQueue();
        }
      } else {
        // SERVER REJECTED (e.g. Duplicate name)
        throw new Error(completeResult.message);
      }

      // AdminPanel.tsx approx line 261
    } catch (error) {
      console.error("CRITICAL SYNC ERROR:", error);
      // Remove the problematic item from the queue so the loop STOPS
      setSyncQueue(prev => prev.slice(1));
      toast.error("Sync failed due to data error. Check Google Sheet for empty rows.");

    } finally {
      setIsSyncing(false);
    }
  };

  const startCamera = async () => {
    setIsCameraActive(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      toast.error("Camera access denied");
      setIsCameraActive(false);
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      canvasRef.current.width = videoRef.current.videoWidth;
      canvasRef.current.height = videoRef.current.videoHeight;
      context?.drawImage(videoRef.current, 0, 0);

      // Store as Base64 string (Browser storage)
      const imageData = canvasRef.current.toDataURL('image/png');
      setCapturedImage(imageData);

      // Stop camera stream
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      setIsCameraActive(false);
    }
  };

  // 3. Trigger the fetch automatically when the page loads
  React.useEffect(() => {
    fetchInventory();
    fetchCategories();
    fetchUsers();

  }, []);

  // Filter & Sort Logic
  const filteredInventory = inventory.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.tags && item.tags.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  }).sort((a, b) => {
    // Sort by Category then Name
    if (a.category !== b.category) return a.category.localeCompare(b.category);
    return a.name.localeCompare(b.name);
  });

  // Add this function after fetchInventory [4]
  const loadMoreInventory = () => {
    // Currently, this can be a placeholder or call fetchInventory with pagination parameters
    console.log("Load more triggered");
    toast.info("All items are already loaded.");
    setHasMore(false);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card border-b border-border shadow-sm">
        <div className="container flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-600 flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m0 0l8 4m-8-4v10l8 4m0-10l8 4m-8-4v10l8-4M7 7l8 4" />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-display font-bold text-foreground">Aesthetic Centre</h1>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Admin Panel</span>
                {isLoading && <span className="text-xs text-emerald-600 animate-pulse">• Syncing...</span>}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-foreground">{user?.name}</p>
              <p className="text-xs text-emerald-600 font-semibold">Administrator</p>
            </div>
            <Button
              onClick={() => {
                logout();
                navigate('/');
              }}
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
        <Tabs defaultValue="users" className="space-y-20">
          <TabsList className="grid w-full max-w-2xl grid-cols-5 bg-muted">
            <TabsTrigger value="users" className="flex items-center gap-2">
              <UsersIcon className="w-4 h-4" />
              <span className="hidden sm:inline">Users</span>
              {allUsers.filter((u) => u.status === 'PENDING').length > 0 && (
                <span className="ml-1 bg-yellow-100 text-yellow-700 text-[10px] font-bold px-1.5 rounded-full">
                  {allUsers.filter((u) => u.status === 'PENDING').length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="inventory" className="flex items-center gap-2">
              <Package className="w-4 h-4" />
              <span className="hidden sm:inline">Inventory</span>
            </TabsTrigger>
            <TabsTrigger value="categories" className="flex items-center gap-2">
              <Package className="w-4 h-4" />
              <span className="hidden sm:inline">Categories</span>
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <Package className="w-4 h-4" />
              <span className="hidden sm:inline">History</span>
              {pendingReturns.length + pendingCheckouts.length > 0 && (
                <span className="ml-1 bg-yellow-100 text-yellow-700 text-[10px] font-bold px-1.5 rounded-full">
                  {pendingReturns.length + pendingCheckouts.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="monitor" className="flex items-center gap-2">
              <Monitor className="w-4 h-4" />
              <span className="hidden sm:inline">Monitor</span>
            </TabsTrigger>
          </TabsList>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-4">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="text-2xl font-bold">User Approvals</h2>
                <p className="text-muted-foreground">
                  Review and approve pending registrations
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {allUsers
                .filter((u) => u.status !== 'REJECTED') // ❌ hide rejected users
                .map((u) => (
                  <Card
                    key={u.id || u.email}
                    className="p-5 hover:shadow-xl transition-all cursor-pointer transform hover:-translate-y-1 flex flex-col gap-4 relative overflow-hidden group"
                  >
                    {/* Top: Status Badge (Absolute) */}
                    <div className="absolute top-3 right-3">
                      {u.status === 'APPROVED' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          Approved
                        </span>
                      )}
                      {u.status === 'PENDING' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-yellow-100 text-yellow-800 animate-pulse">
                          Pending
                        </span>
                      )}
                    </div>

                    {/* Header: Avatar + Info */}
                    <div className="flex flex-col items-center text-center pt-2">
                      <div className="h-16 w-16 rounded-full bg-sage-50 flex items-center justify-center mb-3 border border-sage-100 shadow-sm group-hover:scale-110 transition-transform">
                        <UsersIcon className="h-7 w-7 text-sage-600" />
                      </div>
                      <h3 className="font-bold text-lg text-foreground leading-tight truncate w-full px-2">
                        {u.name || 'Unknown'}
                      </h3>
                      <p className="text-xs text-muted-foreground truncate w-full px-4 mb-2">
                        {u.email}
                      </p>
                      <span className="inline-block px-2 py-0.5 text-[10px] uppercase font-bold tracking-wider rounded bg-slate-100 text-slate-500">
                        {u.role || 'USER'}
                      </span>
                    </div>

                    {/* Divider */}
                    <div className="w-full h-px bg-border/50"></div>

                    {/* Footer: Loans */}
                    <div className="flex-1 w-full">
                      <p className="text-[10px] uppercase font-bold text-muted-foreground mb-2 text-center">Active Loans</p>
                      {(() => {
                        const userLoans = activeLoans.filter(l => l.userEmail === u.email);
                        if (userLoans.length > 0) {
                          return (
                            <div className="flex flex-wrap gap-1.5 justify-center">
                              {userLoans.slice(0, 3).map((loan, idx) => (
                                <span key={idx} className="inline-flex items-center gap-1 px-2 py-1 rounded bg-blue-50 text-blue-600 text-[10px] border border-blue-100 font-medium">
                                  {loan.itemName.split(' ')[0]}... <span className="text-blue-800">x{loan.quantity}</span>
                                </span>
                              ))}
                              {userLoans.length > 3 && (
                                <span className="text-[10px] text-muted-foreground flex items-center">+{userLoans.length - 3} more</span>
                              )}
                            </div>
                          );
                        }
                        return <p className="text-xs text-muted-foreground italic text-center py-2">No active items</p>;
                      })()}
                    </div>
                  </Card>
                ))}
            </div>

          </TabsContent>

          {/* Inventory Tab */}
          <TabsContent value="inventory" className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex flex-col sm:flex-row gap-4 flex-1">
                <div>
                  <h2 className="text-2xl font-display font-bold text-foreground">Aesthetic Centre</h2>
                  <p className="text-muted-foreground">Ease of Access</p>
                </div>

                {/* Search & Filter Controls */}
                <div className="flex gap-2 flex-1 sm:max-w-md items-center">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                    <Input
                      placeholder="Search by name or tag..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 bg-background"
                    />
                  </div>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  >
                    <option value="all">All Categories</option>
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>
              <Dialog>
                <DialogTrigger asChild>
                  <Button className="bg-emerald-600 hover:bg-emerald-700 text-white">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Item
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add New Inventory Item</DialogTitle>
                  </DialogHeader>
                  {/* Inside the "Add New Inventory Item" Dialog */}
                  <div className="space-y-4 py-4">
                    {/* Existing inputs: Name, Company, etc. */}

                    <div className="flex flex-col items-center gap-4">
                      {isCameraActive ? (
                        <>
                          <video ref={videoRef} autoPlay className="w-full rounded-lg bg-black h-48" />
                          <Button onClick={capturePhoto} className="w-full bg-blue-600">Snap Photo</Button>
                        </>
                      ) : capturedImage ? (
                        <div className="relative w-full">
                          <img src={capturedImage} alt="Preview" className="w-full h-48 object-cover rounded-lg" />
                          <Button
                            variant="outline"
                            size="sm"
                            className="absolute top-2 right-2"
                            onClick={() => setCapturedImage(null)}
                          >Change</Button>
                        </div>
                      ) : (
                        <Button variant="outline" onClick={startCamera} className="w-full">
                          <Camera className="mr-2 h-4 w-4" /> Open Camera
                        </Button>
                      )}
                    </div>

                    {/* Hidden canvas for processing */}
                    <canvas ref={canvasRef} className="hidden" />
                  </div>
                  <div className="space-y-4">
                    <Input
                      placeholder="Item name"
                      value={newItemName}
                      onChange={(e) => setNewItemName(e.target.value)}
                    />
                    <Input
                      placeholder="Company"
                      value={newItemCompany}
                      onChange={(e) => setNewItemCompany(e.target.value)}
                    />
                    <Input
                      placeholder="Quantity"
                      type="number"
                      value={newItemQuantity}
                      onChange={(e) => setNewItemQuantity(e.target.value)}
                    />
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Tags</label>
                      <div className="min-h-[2.5rem] p-2 border border-border rounded-lg flex flex-wrap gap-2 focus-within:ring-2 focus-within:ring-ring focus-within:border-primary bg-background">
                        {newItemTags.map((tag, index) => (
                          <span key={index} className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-100 text-emerald-800 text-xs rounded-full font-medium animate-in fade-in zoom-in duration-200">
                            {tag}
                            <button
                              onClick={() => setNewItemTags(newItemTags.filter((_, i) => i !== index))}
                              className="hover:bg-emerald-200 rounded-full p-0.5"
                            >
                              <XCircle className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                        <input
                          placeholder={newItemTags.length === 0 ? "Type tag & replace Enter..." : ""}
                          value={currentTagInput}
                          onChange={(e) => setCurrentTagInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              if (currentTagInput.trim()) {
                                setNewItemTags([...newItemTags, currentTagInput.trim()]);
                                setCurrentTagInput('');
                              }
                            }
                            if (e.key === 'Backspace' && !currentTagInput && newItemTags.length > 0) {
                              setNewItemTags(newItemTags.slice(0, -1));
                            }
                          }}
                          className="flex-1 bg-transparent border-none outline-none text-sm min-w-[120px]"
                        />
                      </div>
                      <p className="text-[10px] text-muted-foreground">Press Enter to add a tag. Backspace to delete.</p>
                    </div>
                    <select
                      value={newItemCategory}
                      onChange={(e) => setNewItemCategory(e.target.value)}
                      className="w-full px-3 py-2 border border-border rounded-lg"
                    >
                      <option value="">Select category</option>
                      {categories.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                    <Button
                      onClick={handleAddItem}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      Add Item
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>


            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredInventory.map((item) => {
                // Check if the item is locally syncing or marked as [PENDING] by the backend
                const isSyncing = item.isPending || item.name === '[PENDING]';

                if (isSyncing) {
                  return (
                    <Card key={item.id} className="p-4 border-dashed bg-muted/20 opacity-70">
                      <div className="flex flex-col items-center justify-center h-48 space-y-4 text-muted-foreground">
                        {/* Using a Lucide icon as a spinner (ensure Loader2 is imported) */}
                        <div className="animate-spin text-emerald-600">
                          <Package size={32} />
                        </div>
                        <div className="text-center">
                          <p className="font-medium">Syncing Item...</p>
                          <p className="text-xs italic">Uploading to Drive & Sheets</p>
                        </div>
                      </div>
                    </Card>
                  );
                }

                // Normal rendering for completed items
                return (
                  <Card
                    key={item.id}
                    className="p-4 hover:shadow-lg transition-all cursor-pointer transform hover:scale-[1.02]"
                    onClick={() => setSelectedItem(item)}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-bold text-lg text-emerald-900 leading-tight">{item.name}</h3>
                      <span className="text-[10px] px-2 py-0.5 bg-muted rounded-full text-muted-foreground whitespace-nowrap">
                        {item.category}
                      </span>
                    </div>

                    <div className="relative aspect-video mb-4 overflow-hidden rounded-lg bg-muted">
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    {/* Tags Display */}
                    {(item as any).tags && (
                      <div className="flex flex-wrap gap-1 mb-2">
                        {(item as any).tags.split(',').map((tag: string, i: number) => (
                          tag.trim() && (
                            <span key={i} className="px-2 py-0.5 text-[10px] uppercase font-bold tracking-wider rounded-sm bg-gray-100 text-gray-600 border border-gray-200">
                              {tag.trim()}
                            </span>
                          )
                        ))}
                      </div>
                    )}

                    {/* Remarks Display */}
                    {item.remarks && (
                      <p className="text-xs text-muted-foreground bg-muted/50 p-2 rounded mb-3 line-clamp-2">
                        {item.remarks}
                      </p>
                    )}

                    <div className="grid grid-cols-2 gap-2 text-sm border-t pt-2">
                      <div>
                        <p className="text-muted-foreground text-xs">Company</p>
                        <p className="font-medium truncate">{item.company}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-muted-foreground text-xs">Stock</p>
                        <p className="font-bold text-emerald-700">{item.quantity}</p>
                      </div>
                    </div>
                  </Card>
                );
              })}

              {/* Load More Button */}
              {hasMore && !isLoading && (
                <div className="col-span-full flex justify-center mt-6">
                  <Button
                    onClick={loadMoreInventory}
                    variant="outline"
                    className="w-full max-w-xs border-slate-300 hover:bg-slate-50"
                  >
                    Load More Items
                  </Button>
                </div>
              )}

              {filteredInventory.length === 0 && !isLoading && (
                <div className="col-span-full text-center py-12 text-muted-foreground border-2 border-dashed rounded-xl">
                  <p>No items found matching "{searchQuery}"</p>
                </div>
              )}
            </div>

            {/* Selected Item Modal */}
            <Dialog open={!!selectedItem} onOpenChange={(open) => !open && setSelectedItem(null)}>
              <DialogContent className="max-w-4xl p-0 overflow-hidden">
                {/* Header */}
                <DialogHeader className="px-6 pt-6">
                  <DialogTitle className="text-2xl font-display font-bold text-emerald-900 text-center">
                    {selectedItem?.name}
                  </DialogTitle>
                </DialogHeader>

                {/* Main Content */}
                <div className="px-6 pb-6 space-y-6">
                  {/* Image – Center Focus */}
                  <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-muted border">
                    {selectedItem?.imageUrl ? (
                      <img
                        src={selectedItem.imageUrl}
                        alt={selectedItem.name}
                        className="w-full h-full object-contain"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full text-muted-foreground">
                        No image available
                      </div>
                    )}
                  </div>

                  {/* Item Details */}
                  <div className="grid md:grid-cols-3 gap-4">
                    {/* Stock */}
                    <div className="rounded-xl border bg-emerald-50 p-4 text-center">
                      <p className="text-sm font-medium text-emerald-600">Stock Level</p>
                      <p className="text-3xl font-bold text-emerald-900">
                        {selectedItem?.quantity}
                      </p>
                    </div>

                    {/* Category */}
                    <div className="rounded-xl border bg-blue-50 p-4 text-center">
                      <p className="text-sm font-medium text-blue-600">Category</p>
                      <p className="text-lg font-semibold text-blue-900">
                        {selectedItem?.category}
                      </p>
                    </div>

                    {/* Company */}
                    <div className="rounded-xl border bg-purple-50 p-4 text-center">
                      <p className="text-sm font-medium text-purple-600">Company / Brand</p>
                      <p className="text-lg font-semibold text-purple-900">
                        {selectedItem?.company}
                      </p>
                    </div>
                  </div>

                  {/* Additional Info */}
                  <div className="space-y-4">
                    {selectedItem?.remarks && (
                      <div className="rounded-xl border bg-muted p-4">
                        <h4 className="font-medium text-foreground mb-1">Remarks</h4>
                        <p className="text-sm text-muted-foreground">
                          {selectedItem.remarks}
                        </p>
                      </div>
                    )}

                    {selectedItem?.links && (
                      <div className="rounded-xl border p-4">
                        <h4 className="font-medium text-foreground mb-1">Important Link</h4>
                        <a
                          href={selectedItem.links}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:underline break-all"
                        >
                          {selectedItem.links}
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3 pt-4">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => setSelectedItem(null)}
                    >
                      Close
                    </Button>
                    <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700">
                      Edit Details
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

          </TabsContent>

          {/* Categories Tab */}
          <TabsContent value="categories" className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-2xl font-display font-bold text-foreground">Manage Categories</h2>
                <p className="text-muted-foreground">Add new inventory categories</p>
              </div>
            </div>

            <Card className="card-soft p-6">
              <div className="flex gap-2">
                <Input
                  placeholder="New category name"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                />
                <Button
                  onClick={handleAddCategory}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  Add
                </Button>
              </div>
            </Card>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {categories.map((cat) => (
                <Card key={cat} className="card-soft p-4 text-center">
                  <p className="font-medium text-foreground">{cat}</p>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Usage History / Requests Tab */}
          <TabsContent value="history" className="space-y-8">

            {/* SECTION 0: Pending Checkout Requests */}
            <div className="space-y-4">
              <h2 className="text-xl font-bold font-display flex items-center gap-2">
                <Clock className="text-orange-500" />
                Pending Checkout Requests
              </h2>
              {pendingCheckouts.length > 0 ? (
                <div className="grid gap-4">
                  {pendingCheckouts.map((req, idx) => (
                    <Card key={idx} className="p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-l-4 border-l-orange-400">
                      <div>
                        <h3 className="font-bold text-lg">{req.itemName}</h3>
                        <p className="text-sm text-muted-foreground">
                          Requested by: <span className="font-medium text-foreground">{req.userName}</span> ({req.userEmail})
                        </p>
                        <div className="flex gap-2 mt-2">
                          <span className="px-2 py-0.5 bg-orange-100 text-orange-800 text-xs rounded-full font-bold">
                            Qty: {req.quantity}
                          </span>
                          <span className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded-full font-bold">
                            {new Date(req.date).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <Button
                        className="bg-emerald-600 hover:bg-emerald-700"
                        onClick={() => handleApproveRequest(req)}
                      >
                        Approve Checkout
                      </Button>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center border-2 border-dashed rounded-xl text-muted-foreground">
                  No pending checkout requests.
                </div>
              )}
            </div>

            <div className="border-t border-border my-8"></div>

            {/* SECTION 1: Pending Returns */}
            <div className="space-y-4">
              <h2 className="text-xl font-bold font-display flex items-center gap-2">
                <CheckCircle className="text-emerald-600" />
                Incoming Returns
              </h2>
              {pendingReturns.length > 0 ? (
                <div className="grid gap-4">
                  {pendingReturns.map((req, idx) => (
                    <Card key={idx} className="p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-l-4 border-l-yellow-400">
                      <div>
                        <h3 className="font-bold text-lg">{req.itemName}</h3>
                        <p className="text-sm text-muted-foreground">
                          Returing from: <span className="font-medium text-foreground">{req.userName}</span> ({req.userEmail})
                        </p>
                        <div className="flex gap-2 mt-2">
                          <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 text-xs rounded-full font-bold">
                            Qty: {req.quantity}
                          </span>
                          <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-full font-bold">
                            Target: {req.returnTarget}
                          </span>
                        </div>
                      </div>
                      <Button
                        className="bg-emerald-600 hover:bg-emerald-700"
                        onClick={() => setSelectedReturn(req)}
                      >
                        Receive Item
                      </Button>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center border-2 border-dashed rounded-xl text-muted-foreground">
                  No pending returns assigned to you.
                </div>
              )}
            </div>

            <div className="border-t border-border my-8"></div>

            {/* SECTION 2: Current Holdings by User */}
            <div className="space-y-4">
              <h2 className="text-xl font-bold font-display flex items-center gap-2">
                <UsersIcon className="text-blue-600" />
                Current User Holdings
              </h2>

              {(() => {
                const grouped = activeRequests.reduce((acc: any, req) => {
                  const email = req.userEmail;
                  if (!acc[email]) acc[email] = { name: req.userName, email: email, items: [] };
                  acc[email].items.push(req);
                  return acc;
                }, {});

                const users = Object.values(grouped);

                if (users.length === 0) return (
                  <div className="p-8 text-center border-2 border-dashed rounded-xl text-muted-foreground">
                    No active items checked out.
                  </div>
                );

                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {users.map((u: any, i) => (
                      <Card key={i} className="p-5 hover:shadow-md transition-all">
                        <div className="flex items-center gap-3 mb-4 border-b pb-3">
                          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                            {u.name.charAt(0)}
                          </div>
                          <div>
                            <h4 className="font-bold leading-tight">{u.name}</h4>
                            <p className="text-xs text-muted-foreground">{u.email}</p>
                          </div>
                        </div>

                        <div className="space-y-2">
                          {u.items.map((item: any, j: number) => (
                            <div key={j} className="flex justify-between items-center text-sm bg-muted/40 p-2 rounded">
                              <span>{item.itemName}</span>
                              <span className="font-bold bg-background px-2 rounded border border-border">x{item.quantity}</span>
                            </div>
                          ))}
                        </div>
                        <div className="mt-4 pt-2 border-t text-xs text-center text-muted-foreground">
                          Total Items: {u.items.reduce((sum: number, x: any) => sum + Number(x.quantity), 0)}
                        </div>
                      </Card>
                    ))}
                  </div>
                );
              })()}
            </div>

            {/* Receive Item Modal */}
            <Dialog open={!!selectedReturn} onOpenChange={(open) => !open && setSelectedReturn(null)}>
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

          </TabsContent>

          {/* TAB 4: LAPTOP MONITOR */}
          <TabsContent value="monitor" className="space-y-6">
            {/* Section 1: Online Students */}
            <div>
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></span>
                Online Students
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {allUsers.filter((u: any) => u.laptopStatus === 'Online').length > 0 ? (
                  allUsers.filter((u: any) => u.laptopStatus === 'Online').map(u => (
                    <Card key={u.id} className="p-4 border-l-4 border-l-emerald-500 flex flex-col gap-1 shadow-sm">
                      <p className="font-bold text-sm truncate" title={u.name}>{u.name}</p>
                      <p className="text-xs text-muted-foreground truncate" title={u.email}>{u.email}</p>
                      <span className="text-[10px] text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full w-fit mt-1">
                        Online
                      </span>
                    </Card>
                  ))
                ) : (
                  <div className="col-span-full text-center py-8 bg-muted/30 rounded-lg text-muted-foreground">
                    No students currently online
                  </div>
                )}
              </div>
            </div>

            {/* Section 2: Top 10 Leaderboard */}
            <div>
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                <BarChart2 className="w-5 h-5" />
                Top 10 Usage Leaderboard
              </h3>
              <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-muted text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      <tr>
                        <th className="px-6 py-3 text-left">Rank</th>
                        <th className="px-6 py-3 text-left">Student</th>
                        <th className="px-6 py-3 text-left">Total Screen Time</th>
                        <th className="px-6 py-3 text-left">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {allUsers
                        .filter((u: any) => (u.totalTime || 0) > 0)
                        .sort((a: any, b: any) => (b.totalTime || 0) - (a.totalTime || 0))
                        .slice(0, 10)
                        .map((user: any, index) => {
                          const hrs = Math.floor((user.totalTime || 0) / 60);
                          const mins = (user.totalTime || 0) % 60;
                          return (
                            <tr key={user.id} className="hover:bg-muted/50">
                              <td className="px-6 py-4">
                                <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${index === 0 ? 'bg-yellow-100 text-yellow-700' :
                                  index === 1 ? 'bg-gray-100 text-gray-700' :
                                    index === 2 ? 'bg-orange-100 text-orange-700' : 'text-muted-foreground'
                                  }`}>
                                  {index + 1}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                <p className="font-medium text-sm">{user.name}</p>
                                <p className="text-xs text-muted-foreground">{user.email}</p>
                              </td>
                              <td className="px-6 py-4 text-sm font-mono">
                                {hrs}h {mins}m
                              </td>
                              <td className="px-6 py-4">
                                <span className={`text-xs px-2 py-1 rounded-full ${user.laptopStatus === 'Online'
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : 'bg-muted text-muted-foreground'
                                  }`}>
                                  {user.laptopStatus || 'Offline'}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      {allUsers.filter((u: any) => (u.totalTime || 0) > 0).length === 0 && (
                        <tr>
                          <td colSpan={4} className="px-6 py-8 text-center text-muted-foreground">
                            No usage data recorded yet
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
