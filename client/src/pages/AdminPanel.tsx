import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, LogOut, Users, Package, CheckCircle, XCircle, Camera } from 'lucide-react';
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

  const handleAddCategory = () => {
    if (!newCategory) {
      toast.error('Please enter a category name');
      return;
    }
    setCategories([...categories, newCategory]);
    setNewCategory('');
    toast.success('Category added');
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
      } else {
        // SERVER REJECTED (e.g. Duplicate name)
        throw new Error(completeResult.message);
      }

    } catch (error) {
      console.error("CRITICAL SYNC ERROR:", error);
      toast.error(`Sync failed for ${itemToSync.name}. Skipping to prevent loop.`);

      // FIX: Remove the failing item from the queue so it doesn't loop
      const updatedQueue = queue.slice(1);
      localStorage.setItem('syncQueue', JSON.stringify(updatedQueue));
      setSyncQueue(updatedQueue);

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
          <TabsList className="grid w-full max-w-md grid-cols-4 bg-muted">
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
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
          </TabsList>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-4">
            <div>
              <h2 className="text-2xl font-display font-bold text-foreground mb-4">User Approvals</h2>
              <p className="text-muted-foreground mb-6">Review and approve pending user registrations</p>
            </div>

            <div className="space-y-3">
              {pendingUsers.map((user) => (
                <Card key={user.id} className="card-soft p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground">{user.name}</h3>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Registered: {new Date(user.createdDate).toLocaleDateString()}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {user.status === 'PENDING' ? (
                        <>
                          <Button
                            onClick={() => handleApproveUser(user.id)}
                            size="sm"
                            className="bg-emerald-600 hover:bg-emerald-700 text-white"
                          >
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Approve
                          </Button>
                          <Button
                            onClick={() => handleRejectUser(user.id)}
                            size="sm"
                            variant="outline"
                            className="text-red-600 border-red-200 hover:bg-red-50"
                          >
                            <XCircle className="w-4 h-4 mr-2" />
                            Reject
                          </Button>
                        </>
                      ) : (
                        <div className="flex items-center gap-2">
                          {user.status === 'APPROVED' ? (
                            <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">
                              Approved
                            </span>
                          ) : (
                            <span className="text-xs font-medium text-red-600 bg-red-50 px-3 py-1 rounded-full">
                              Rejected
                            </span>
                          )}
                        </div>
                      )}
                    </div>
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
                  <Card key={item.id} className="p-4 hover:shadow-md transition-shadow">
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
        </Tabs>
      </main>
    </div>
  );
}
