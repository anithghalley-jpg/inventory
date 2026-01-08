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
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwXHLzLob0rScK6t0AaxZeKyi7HxG5NG8HEWNm0_Vs2Hkt4yd_pg81AqCPucjwpJ7o6/exec'; // Copy this from your GAS deployment [3]
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

  const [syncQueue, setSyncQueue] = useState<any[]>([]);
  const [totalToUpload, setTotalToUpload] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [categories, setCategories] = useState(['Electronics', 'Furniture', 'Office Supplies']);
  const [usageHistory, setUsageHistory] = useState<UsageRecord[]>([]);
  const [newCategory, setNewCategory] = useState('');
  const [newItemName, setNewItemName] = useState('');
  const [newItemQuantity, setNewItemQuantity] = useState('');
  const [newItemCompany, setNewItemCompany] = useState('');
  const [newItemCategory, setNewItemCategory] = useState('');
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [activeLoans, setActiveLoans] = useState<any[]>([]); // New State for Loans
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);

  if (user?.role !== 'ADMIN') {
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
    try {
      const response = await fetch(SCRIPT_URL, {
        method: 'POST',
        body: JSON.stringify({
          action: 'addCategory',
          categoryName: newCategory
        }),
      });

      const result = await response.json();

      if (result.success) {
        // Update local state for immediate UI feedback
        setCategories([...categories, newCategory]);
        setNewCategory('');
        toast.success('Category saved to Google Sheets');
      } else {
        toast.error('Failed to save category');
      }
    } catch (error) {
      toast.error('Connection error while adding category');
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
            r.status === 'APPROVED' && (r.returnStatus || '').toLowerCase() !== 'yes'
          );
          setActiveLoans(validLoans);
        }

      } else {
        toast.error('Failed to fetch users');
      }
    } catch (error) {
      toast.error('Failed to load users');
    }
  };

  // 2. Replace the old handleAddItem with this version
  const handleAddItem = async () => {
    // Validation (Existing logic) [1]
    if (!newItemName || !newItemQuantity || !newItemCompany || !newItemCategory) {
      toast.error('Please fill all required fields');
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
      isPending: true
    };

    // Add to local UI state for instant feedback [9]
    setInventory([pendingItem, ...inventory]);

    // Push to local storage queue [11]
    const currentQueue = JSON.parse(localStorage.getItem('syncQueue') || '[]');
    localStorage.setItem('syncQueue', JSON.stringify([...currentQueue, pendingItem]));

    // Reset inputs immediately [11]
    setNewItemName('');
    setNewItemQuantity('');
    setNewItemCompany('');
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
          links: itemToSync.links || ''
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
              <h1 className="text-lg font-display font-bold text-foreground">Inventory Manager</h1>
              <p className="text-xs text-muted-foreground">Admin Panel</p>
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
        <Tabs defaultValue="users" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-5 bg-muted">
            <TabsTrigger value="users" className="flex items-center gap-2">
              <UsersIcon className="w-4 h-4" />
              <span className="hidden sm:inline">Users</span>
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

            <div className="grid gap-4">
              {allUsers
                .filter((u) => u.status !== 'REJECTED') // ❌ hide rejected users
                .map((u) => (
                  <Card
                    key={u.id || u.email}
                    className="p-4 hover:shadow-lg transition-all cursor-pointer transform hover:scale-[1.02]"
                  >
                    {/* Left: User Info */}
                    <div className="flex items-center space-x-4">
                      <div className="h-10 w-10 rounded-full bg-sage-100 flex items-center justify-center">
                        <UsersIcon className="h-5 w-5 text-sage-600" />
                      </div>

                      <div>
                        <h3 className="font-semibold leading-none">
                          {u.name || 'Unknown Name'}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {u.email || 'No Email'}
                        </p>

                        {/* Role badge */}
                        <span className="inline-block mt-1 px-2 py-0.5 text-xs rounded-full bg-muted border">
                          {u.role || 'USER'}
                        </span>
                      </div>
                    </div>

                    {/* Active Loans Display */}
                    <div className="flex-1 px-4">
                      {(() => {
                        const userLoans = activeLoans.filter(l => l.userEmail === u.email);
                        if (userLoans.length > 0) {
                          return (
                            <div className="flex flex-wrap gap-2">
                              {userLoans.map((loan, idx) => (
                                <span key={idx} className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-blue-50 text-blue-700 text-xs border border-blue-100">
                                  <Package className="w-3 h-3" />
                                  {loan.itemName} <span className="font-bold">x{loan.quantity}</span>
                                </span>
                              ))}
                            </div>
                          );
                        }
                        return <span className="text-xs text-muted-foreground italic">No active items</span>;
                      })()}
                    </div>

                    <div className="flex items-center">
                      {u.status === 'APPROVED' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle className="h-3.5 w-3.5" />
                          Approved
                        </span>
                      )}

                      {u.status === 'PENDING' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-yellow-50 text-yellow-700 border border-yellow-200">
                          <Clock className="h-3.5 w-3.5" />
                          Pending
                        </span>
                      )}
                    </div>

                  </Card>
                ))}
            </div>

          </TabsContent>

          {/* Inventory Tab */}
          <TabsContent value="inventory" className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-2xl font-display font-bold text-foreground">Inventory Management</h2>
                <p className="text-muted-foreground">Add and manage inventory items</p>
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
              {inventory.map((item) => {
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
                    <h3 className="font-bold text-lg mb-2 text-emerald-900">{item.name}</h3>
                    <div className="relative aspect-video mb-4 overflow-hidden rounded-lg bg-muted">
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <p className="text-muted-foreground">Company:</p>
                      <p className="font-medium">{item.company}</p>
                      <p className="text-muted-foreground">Category:</p>
                      <p className="font-medium">{item.category}</p>
                      <p className="text-muted-foreground">Stock:</p>
                      <p className="font-bold text-emerald-700">{item.quantity}</p>
                    </div>
                  </Card>
                );
              })}
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

          {/* History Tab */}
          <TabsContent value="history" className="space-y-4">
            <div>
              <h2 className="text-2xl font-display font-bold text-foreground">Usage History</h2>
              <p className="text-muted-foreground">Track all inventory checkouts and returns</p>
            </div>

            {usageHistory.length === 0 ? (
              <Card className="card-soft p-8 text-center">
                <p className="text-muted-foreground">No usage history yet</p>
              </Card>
            ) : (
              <div className="space-y-3">
                {usageHistory.map((record) => (
                  <Card key={record.id} className="card-soft p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-foreground">{record.itemName}</p>
                        <p className="text-sm text-muted-foreground">{record.userEmail}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-foreground">
                          {record.action === 'CHECKOUT' ? 'Checked Out' : 'Returned'}: {record.quantity}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(record.timestamp).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
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
