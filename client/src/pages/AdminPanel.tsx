import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Plus, Filter, Trash2, Edit2, CheckCircle, XCircle, Package, Download, BarChart2, Monitor, LogOut, Users as UsersIcon, Camera, Clock, Printer, Scissors, Zap, BookOpen, History } from 'lucide-react';
import { toast } from 'sonner';
import { MachineCard, MachineData } from '@/components/MachineCard';

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
import { SCRIPT_URL, DRIVE_FOLDER_ID } from '@/config';
import { getTagStyle } from '@/lib/tagUtils';
import { getOptimizedImageUrl } from '@/lib/utils';
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";

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
  tags?: string[]; // New: User tags (permissions)
  totalTime?: number;
  laptopStatus?: string;
  note?: string;
  rfid?: string;
  myPageLink?: string;
  sessionStart?: string;
  sessionEnd?: string;
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

interface FabAcademyEntry {
  id: string;
  studentName: string;
  imageUrl: string;
  fabYear: string;
  videoUrl: string;
  documentationUrl: string;
  remarks: string;
}

interface FabInternEntry {
  id: string;
  studentName: string;
  imageUrl: string;
  internshipYear: string;
  videoUrl: string;
  documentationUrl: string;
  remarks: string;
}

export default function AdminPanel() {
  const { user, logout } = useAuth();
  const [, navigate] = useLocation();
  const toggleLaptopMut = useMutation(api.users.toggleLaptop);
  const updateUserStatusMut = useMutation(api.users.updateStatus);
  const updateUserProfileMut = useMutation(api.users.updateProfile);
  const addInventoryItemMut = useMutation(api.inventory.addItem);
  const updateInventoryItemMut = useMutation(api.inventory.updateItem);
  const deleteInventoryItemMut = useMutation(api.inventory.deleteItem);
  const approveCheckoutMut = useMutation(api.requests.approveCheckoutRequest);
  const processReturnMut = useMutation(api.requests.processReturn);
  const cancelReturnMut = useMutation(api.requests.cancelReturn);
  const cancelCheckoutRequestMut = useMutation(api.requests.cancelCheckoutRequest);
  const upsertHomeMut = useMutation(api.home.upsert);
  const deleteHomeMut = useMutation(api.home.remove);
  const upsertFabAcademyMut = useMutation(api.fabAcademy.upsert);
  const deleteFabAcademyMut = useMutation(api.fabAcademy.remove);
  const upsertFabInternMut = useMutation(api.fabInterns.upsert);
  const deleteFabInternMut = useMutation(api.fabInterns.remove);
  const updateAdminSettingsMut = useMutation(api.settings.updateAdmin);
  const convexInventory = useQuery(api.inventory.getAll);
  const convexUsers = useQuery(api.users.getAll);
  const convexRequests = useQuery(api.requests.getAll);
  const convexHome = useQuery(api.home.getAll);
  const convexAspects = useQuery(api.aspects.getAll);
  const addAspectMut = useMutation(api.aspects.add);
  const updateAspectMut = useMutation(api.aspects.update);
  const removeAspectMut = useMutation(api.aspects.remove);
  const convexFabAcademy = useQuery(api.fabAcademy.getAll);
  const convexFabInterns = useQuery(api.fabInterns.getAll);
  const convexSettings = useQuery(api.settings.getAdmin);
  const convexMachines = useQuery(api.machines.getAll);
  const registerMachineMut = useMutation(api.machines.register);
  const unregisterMachineMut = useMutation(api.machines.unregister);
  const deleteMachineLog = useMutation(api.machines.deleteLog);
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
  const [machineLogs, setMachineLogs] = useState<MachineData[]>([]); // New: Machine Logs State
  const [showAddMachine, setShowAddMachine] = useState(false);
  const [newMachineForm, setNewMachineForm] = useState({ name: '', id: '' });
  // Removed localMachines state - now using backend dynamic list
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null); // Item currently in edit mode
  const [editItemForm, setEditItemForm] = useState<Partial<InventoryItem & { tagsInput: string }>>({});
  const [editingUserEmail, setEditingUserEmail] = useState<string | null>(null); // Email key for user edit
  const [editUserForm, setEditUserForm] = useState<{
    name: string; role: string; note: string;
    myPageLink: string; tags: string[];
    // read-only display fields
    email: string; status: string; laptopStatus: string; totalTime: number; rfid: string; sessionStart: string; sessionEnd: string;
  }>({ name: '', role: 'USER', note: '', myPageLink: '', tags: [], email: '', status: '', laptopStatus: '', totalTime: 0, rfid: '', sessionStart: '', sessionEnd: '' });
  const [editUserTagInput, setEditUserTagInput] = useState('');
  const [homeItems, setHomeItems] = useState<any[]>([]);
  const [homeForm, setHomeForm] = useState({ id: '', type: 'text_block', heading: '', description: '', contentUrl: '' });
  const [showAddHome, setShowAddHome] = useState(false);
  const [guestContentTab, setGuestContentTab] = useState<'tra-students' | 'fab-academy' | 'fab-interns' | 'home'>('tra-students');
  const [aspects, setAspects] = useState<any[]>([]);
  const [aspectForm, setAspectForm] = useState({ id: '', entryId: '', aspect: '', writeUp: '', shortNote: '', images: [''] as string[] });
  const [showAddAspect, setShowAddAspect] = useState(false);
  const [fabAcademyItems, setFabAcademyItems] = useState<FabAcademyEntry[]>([]);
  const [fabAcademyForm, setFabAcademyForm] = useState({
    id: '',
    studentName: '',
    imageUrl: '',
    fabYear: '',
    videoUrl: '',
    documentationUrl: '',
    remarks: '',
  });
  const [showAddFabAcademy, setShowAddFabAcademy] = useState(false);
  const [fabInternItems, setFabInternItems] = useState<FabInternEntry[]>([]);
  const [fabInternForm, setFabInternForm] = useState({
    id: '',
    studentName: '',
    imageUrl: '',
    internshipYear: '',
    videoUrl: '',
    documentationUrl: '',
    remarks: '',
  });
  const [showAddFabIntern, setShowAddFabIntern] = useState(false);
  const [allowTeamInventoryEdit, setAllowTeamInventoryEdit] = useState(false);
  const [syncStatus, setSyncStatus] = useState<{
    users: { sheetRows: number; unsyncedRows: number; canCheck: boolean };
    requests: { sheetRows: number; unsyncedRows: number; canCheck: boolean };
    convexAvailable: boolean;
    loading: boolean;
    credentialError?: string;
  }>({
    users: { sheetRows: 0, unsyncedRows: 0, canCheck: true },
    requests: { sheetRows: 0, unsyncedRows: 0, canCheck: true },
    convexAvailable: true,
    loading: false,
  });

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isLoading, setIsLoading] = useState(true);

  React.useEffect(() => {
    if (convexInventory === undefined) return;
    const normalizedInventory = convexInventory.map((item) => ({
      id: item.itemId,
      name: item.name,
      quantity: item.quantity,
      category: item.category,
      company: item.company,
      imageUrl: item.imageUrl,
      remarks: item.remarks,
      links: item.links,
      tags: item.tags.join(','),
    }));
    setInventory(normalizedInventory);
    setIsLoading(false);
  }, [convexInventory]);

  React.useEffect(() => {
    if (convexHome === undefined) return;
    setHomeItems(convexHome.map((item) => ({
      id: item.docId,
      type: item.type,
      heading: item.title,
      description: item.description,
      contentUrl: item.content,
    })));
  }, [convexHome]);

  React.useEffect(() => {
    if (convexAspects === undefined) return;
    setAspects(convexAspects.map((item) => ({
      id: item._id,
      entryId: item.entryId,
      aspect: item.aspect,
      writeUp: item.writeUp,
      shortNote: item.shortNote,
      images: item.images,
    })));
  }, [convexAspects]);

  React.useEffect(() => {
    if (!convexSettings) return;
    setAllowTeamInventoryEdit(!!convexSettings.allowTeamInventory);
  }, [convexSettings]);

  React.useEffect(() => {
    if (convexFabAcademy === undefined) return;
    setFabAcademyItems(
      convexFabAcademy.map((item) => ({
        id: item.entryId,
        studentName: item.studentName,
        imageUrl: item.imageUrl,
        fabYear: item.fabYear,
        videoUrl: item.videoUrl,
        documentationUrl: item.documentationUrl,
        remarks: item.remarks,
      }))
    );
  }, [convexFabAcademy]);

  React.useEffect(() => {
    if (convexFabInterns === undefined) return;
    setFabInternItems(
      convexFabInterns.map((item) => ({
        id: item.entryId,
        studentName: item.studentName,
        imageUrl: item.imageUrl,
        internshipYear: item.internshipYear,
        videoUrl: item.videoUrl,
        documentationUrl: item.documentationUrl,
        remarks: item.remarks,
      }))
    );
  }, [convexFabInterns]);

  React.useEffect(() => {
    if (!convexUsers || !convexRequests) return;

    const normalizedUsers = convexUsers
      .map((u: any) => ({
        ...u,
        id: u.email,
        status: u.status?.toUpperCase() || 'PENDING',
        role: u.role?.toUpperCase() || 'USER',
        note: u.note || '',
      }))
      .sort((a: User, b: User) => {
        const priority = { PENDING: 1, APPROVED: 2, REJECTED: 3 } as const;
        const aStatus = a.status as keyof typeof priority;
        const bStatus = b.status as keyof typeof priority;
        return (priority[aStatus] || 99) - (priority[bStatus] || 99);
      });

    setAllUsers(normalizedUsers);
    setPendingUsers(
      normalizedUsers
        .filter((u) => u.status === 'PENDING')
        .map((u) => ({
          id: u.email,
          email: u.email,
          name: u.name,
          createdDate: u.createdDate,
          status: u.status as PendingUser['status'],
        }))
    );

    const validLoans = convexRequests.filter((r: any) =>
      r.status === 'APPROVED' &&
      r.returnRequestStatus !== 'RETURN_APPROVED' &&
      (r.returnStatus || '').toLowerCase() !== 'yes'
    );
    setActiveLoans(validLoans);
    setActiveRequests(validLoans);
    setPendingReturns(
      convexRequests.filter((r: any) =>
        r.status === 'APPROVED' &&
        r.returnRequestStatus === 'RETURN_PENDING' &&
        (user?.role === 'ADMIN' || r.returnTarget === user?.name)
      )
    );
    setPendingCheckouts(convexRequests.filter((r: any) => r.status === 'PENDING'));
  }, [convexRequests, convexUsers, user]);

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
      await updateUserStatusMut({
        email: userId,
        status: 'APPROVED',
        scriptUrl: SCRIPT_URL,
      });
      toast.success("User approved!");
    } catch (error) {
      toast.error("Approval failed");
    }
  };

  const handleForceTurnOff = async (email: string) => {
    const targetUser = allUsers.find(u => u.email === email);
    
    // Optimistic UI update
    setAllUsers(prevUsers => prevUsers.map(u => 
      u.email === email ? { ...u, laptopStatus: 'Offline' } : u
    ));

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
        error: (err) => {
          // Revert on error
          setAllUsers(prevUsers => prevUsers.map(u => 
            u.email === email ? { ...u, laptopStatus: 'Online' } : u
          ));
          return `Failed: ${err.message}`;
        }
      }
    );
  };

  const handleUpdateUserNote = async (email: string, note: string) => {
    if (!email) return;
    toast.promise(
      updateUserProfileMut({
        email,
        note,
        scriptUrl: SCRIPT_URL,
      }).then(async (result) => {
        setAllUsers(prevUsers => prevUsers.map(u => 
          u.email === email ? { ...u, note: note } as User : u
        ));
        return result;
      }),
      {
        loading: 'Saving admin note...',
        success: 'Note saved successfully.',
        error: (err) => `Failed to save: ${err.message}`
      }
    );
  };

  const [activeNoteEditId, setActiveNoteEditId] = useState<string | null>(null); // uses email as key
  const [tempNoteText, setTempNoteText] = useState('');

  // ======== INVENTORY EDIT HANDLERS ========
  const handleOpenEditItem = (item: InventoryItem) => {
    setEditingItem(item);
    const tagsStr = (item as any).tags || '';
    setEditItemForm({ ...item, tagsInput: tagsStr });
  };

  const handleUpdateInventoryItem = async () => {
    if (!editingItem) return;
    const { tagsInput, ...rest } = editItemForm as any;
    const tagsArray = (tagsInput || '').split(',').map((t: string) => t.trim()).filter(Boolean);
    const payload = { ...rest, tags: tagsArray };
    toast.promise(
      updateInventoryItemMut({
        itemId: editingItem.id,
        name: payload.name,
        quantity: payload.quantity,
        category: payload.category,
        company: payload.company,
        imageUrl: payload.imageUrl,
        remarks: payload.remarks || '',
        links: payload.links || '',
        tags: tagsArray,
        scriptUrl: SCRIPT_URL,
      }).then(async (result) => {
        // Optimistic local update
        setInventory(prev => prev.map(i =>
          i.id === editingItem.id ? { ...i, ...payload, tags: tagsArray.join(',') } : i
        ));
        setSelectedItem(null);
        setEditingItem(null);
        return result;
      }),
      { loading: 'Saving changes...', success: 'Item updated & synced!', error: (e) => `Failed: ${e.message}` }
    );
  };

  const handleDeleteInventoryItem = async (item: InventoryItem) => {
    if (!window.confirm(`Delete "${item.name}"? This cannot be undone.`)) return;
    toast.promise(
      deleteInventoryItemMut({
        itemId: item.id,
        scriptUrl: SCRIPT_URL,
      }).then(async (result) => {
        setInventory(prev => prev.filter(i => i.id !== item.id));
        setSelectedItem(null);
        return result;
      }),
      { loading: 'Deleting item...', success: 'Item deleted.', error: (e) => `Failed: ${e.message}` }
    );
  };

  // ======== USER EDIT HANDLERS ========
  const handleOpenEditUser = (u: any) => {
    setEditingUserEmail(u.email);
    setEditUserTagInput('');
    setEditUserForm({
      name: u.name || '',
      role: u.role || 'USER',
      note: u.note || '',
      myPageLink: u.myPageLink || '',
      tags: Array.isArray(u.tags) ? [...u.tags] : [],
      // read-only
      email: u.email || '',
      status: u.status || '',
      laptopStatus: u.laptopStatus || 'Offline',
      totalTime: u.totalTime || 0,
      rfid: u.rfid || '',
      sessionStart: u.sessionStart || '',
      sessionEnd: u.sessionEnd || '',
    });
  };

  const handleUpdateUser = async () => {
    if (!editingUserEmail) return;
    toast.promise(
      updateUserProfileMut({
        email: editingUserEmail,
        role: editUserForm.role as 'ADMIN' | 'USER' | 'TEAM',
        note: editUserForm.note,
        myPageLink: editUserForm.myPageLink,
        tags: editUserForm.tags,
        scriptUrl: SCRIPT_URL,
      }).then(async (result) => {
        setAllUsers(prev => prev.map(u =>
          u.email === editingUserEmail
            ? { ...u, role: editUserForm.role, note: editUserForm.note, myPageLink: editUserForm.myPageLink, tags: editUserForm.tags } as any
            : u
        ));
        setEditingUserEmail(null);
        return result;
      }),
      { loading: 'Updating user...', success: 'User updated & synced!', error: (e) => `Failed: ${e.message}` }
    );
  };

  // ======== FIREBASE SYNC BUTTONS ========
  const fetchSyncStatus = async () => {
    setSyncStatus(s => ({ ...s, loading: true }));
    try {
      const res = await fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify({ action: 'checkSyncStatus' }) });
      const data = await res.json();
      if (data.success) {
        setSyncStatus({ ...data, loading: false });
      } else {
        setSyncStatus(s => ({ ...s, loading: false, convexAvailable: false, credentialError: data.message }));
      }
    } catch (e) {
      setSyncStatus(s => ({ ...s, loading: false, convexAvailable: false }));
    }
  };

  const handleSyncUsersToConvex = async () => {
    setSyncStatus(s => ({ ...s, loading: true }));
    toast.promise(
      fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify({ action: 'syncUsersToConvex' }) })
        .then(async r => {
          const d = await r.json();
          if (!d.success) throw new Error(d.message);
          return d;
        })
        .finally(() => fetchSyncStatus()), // Re-check after sync
      {
        loading: 'Syncing users to Convex… this may take up to 60s',
        success: (d: any) => d.message || 'Users synced!',
        error: (e: any) => `Sync failed: ${e.message}`
      }
    );
  };

  const handleSyncRequestsToConvex = async () => {
    setSyncStatus(s => ({ ...s, loading: true }));
    toast.promise(
      fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify({ action: 'syncRequestsToConvex' }) })
        .then(async r => {
          const d = await r.json();
          if (!d.success) throw new Error(d.message);
          return d;
        })
        .finally(() => fetchSyncStatus()),
      {
        loading: 'Syncing requests to Convex… this may take up to 60s',
        success: (d: any) => d.message || 'Requests synced!',
        error: (e: any) => `Sync failed: ${e.message}`
      }
    );
  };

  // ======== HOME CONTENT ========
  const fetchHomeContent = async () => {
    return;
  };

  const handleSaveHomeContent = async () => {
    toast.promise(
      upsertHomeMut({
        docId: homeForm.id || undefined,
        type: homeForm.type,
        title: homeForm.heading,
        description: homeForm.description,
        content: homeForm.contentUrl,
        scriptUrl: SCRIPT_URL,
      }).then(async (result) => {
        setShowAddHome(false);
        setHomeForm({ id: '', type: 'text_block', heading: '', description: '', contentUrl: '' });
        return result;
      }),
      { loading: 'Saving content block...', success: 'Homepage updated & synced!', error: (e) => `Failed: ${e.message}` }
    );
  };

  const handleDeleteHomeContent = async (id: string) => {
    if (!window.confirm('Delete this content block?')) return;
    toast.promise(
      deleteHomeMut({
        docId: id,
        scriptUrl: SCRIPT_URL,
      }).then(async (result) => {
        setHomeItems(prev => prev.filter(h => h.id !== id));
        return result;
      }),
      { loading: 'Deleting...', success: 'Content block deleted.', error: (e) => `Failed: ${e.message}` }
    );
  };

  const resetAspectForm = () => {
    setAspectForm({ id: '', entryId: '', aspect: '', writeUp: '', shortNote: '', images: [''] });
  };

  const handleSaveAspectContent = async () => {
    if (!aspectForm.aspect.trim()) {
      toast.error('Aspect name is required.');
      return;
    }

    const filteredImages = aspectForm.images.filter(img => img.trim() !== '');

    const prom = aspectForm.id
      ? updateAspectMut({
          id: aspectForm.id as any,
          aspect: aspectForm.aspect.trim(),
          writeUp: aspectForm.writeUp.trim(),
          shortNote: aspectForm.shortNote.trim(),
          images: filteredImages,
        })
      : addAspectMut({
          entryId: Date.now().toString(),
          aspect: aspectForm.aspect.trim(),
          writeUp: aspectForm.writeUp.trim(),
          shortNote: aspectForm.shortNote.trim(),
          images: filteredImages,
        });

    toast.promise(
      prom.then(async (result) => {
        setShowAddAspect(false);
        resetAspectForm();
        return result;
      }),
      { loading: 'Saving Aspect...', success: 'Aspect saved!', error: (e) => `Failed: ${e.message}` }
    );
  };

  const handleDeleteAspectContent = async (id: string) => {
    if (!window.confirm('Delete this aspect?')) return;
    toast.promise(
      removeAspectMut({ id: id as any }).then(async (result) => {
        return result;
      }),
      { loading: 'Deleting...', success: 'Aspect deleted.', error: (e) => `Failed: ${e.message}` }
    );
  };

  const resetFabAcademyForm = () => {
    setFabAcademyForm({
      id: '',
      studentName: '',
      imageUrl: '',
      fabYear: '',
      videoUrl: '',
      documentationUrl: '',
      remarks: '',
    });
  };

  const handleSaveFabAcademyContent = async () => {
    if (!fabAcademyForm.studentName.trim()) {
      toast.error('Student name is required.');
      return;
    }

    toast.promise(
      upsertFabAcademyMut({
        entryId: fabAcademyForm.id || undefined,
        studentName: fabAcademyForm.studentName.trim(),
        imageUrl: fabAcademyForm.imageUrl.trim(),
        fabYear: fabAcademyForm.fabYear.trim(),
        videoUrl: fabAcademyForm.videoUrl.trim(),
        documentationUrl: fabAcademyForm.documentationUrl.trim(),
        remarks: fabAcademyForm.remarks.trim(),
        scriptUrl: SCRIPT_URL,
      }).then(async (result) => {
        setShowAddFabAcademy(false);
        resetFabAcademyForm();
        return result;
      }),
      { loading: 'Saving Fab Academy profile...', success: 'Fab Academy entry synced!', error: (e) => `Failed: ${e.message}` }
    );
  };

  const handleDeleteFabAcademyContent = async (entryId: string) => {
    if (!window.confirm('Delete this Fab Academy entry?')) return;
    toast.promise(
      deleteFabAcademyMut({
        entryId,
        scriptUrl: SCRIPT_URL,
      }).then(async (result) => {
        return result;
      }),
      { loading: 'Deleting Fab Academy entry...', success: 'Fab Academy entry deleted.', error: (e) => `Failed: ${e.message}` }
    );
  };

  const resetFabInternForm = () => {
    setFabInternForm({
      id: '',
      studentName: '',
      imageUrl: '',
      internshipYear: '',
      videoUrl: '',
      documentationUrl: '',
      remarks: '',
    });
  };

  const handleSaveFabInternContent = async () => {
    if (!fabInternForm.studentName.trim()) {
      toast.error('Student name is required.');
      return;
    }

    toast.promise(
      upsertFabInternMut({
        entryId: fabInternForm.id || undefined,
        studentName: fabInternForm.studentName.trim(),
        imageUrl: fabInternForm.imageUrl.trim(),
        internshipYear: fabInternForm.internshipYear.trim(),
        videoUrl: fabInternForm.videoUrl.trim(),
        documentationUrl: fabInternForm.documentationUrl.trim(),
        remarks: fabInternForm.remarks.trim(),
        scriptUrl: SCRIPT_URL,
      }).then(async (result) => {
        setShowAddFabIntern(false);
        resetFabInternForm();
        return result;
      }),
      { loading: 'Saving Fab Intern profile...', success: 'Fab Intern entry synced!', error: (e) => `Failed: ${e.message}` }
    );
  };

  const handleDeleteFabInternContent = async (entryId: string) => {
    if (!window.confirm('Delete this Fab Intern entry?')) return;
    toast.promise(
      deleteFabInternMut({
        entryId,
        scriptUrl: SCRIPT_URL,
      }).then(async (result) => {
        return result;
      }),
      { loading: 'Deleting Fab Intern entry...', success: 'Fab Intern entry deleted.', error: (e) => `Failed: ${e.message}` }
    );
  };

  const handleSaveMachine = async () => {
    if (!newMachineForm.name || !newMachineForm.id) {
      toast.error('Please fill in both name and ID');
      return;
    }

    const machineId = newMachineForm.id.trim();
    const machineName = newMachineForm.name.trim();

    toast.promise(
      registerMachineMut({
        machineId,
        name: machineName,
        scriptUrl: SCRIPT_URL
      }).then((result) => {
        setNewMachineForm({ name: '', id: '' });
        setShowAddMachine(false);
        return result;
      }),
      {
        loading: 'Registering machine...',
        success: 'Machine registered! (Syncing to Sheets...)',
        error: (err) => `Failed: ${err.message}`
      }
    );
  };

  const handleDeleteMachine = async (machineId: string) => {
    if (!window.confirm('Delete this machine? This only removes it from the list, log sheets are preserved.')) return;
    toast.promise(
      unregisterMachineMut({ 
        machineId,
        scriptUrl: SCRIPT_URL
      }).then((result) => {
        return result;
      }),
      {
        loading: 'Unregistering machine...',
        success: 'Machine removed. (Syncing to Sheets...)',
        error: (err) => `Failed: ${err.message}`
      }
    );
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
    return;
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
      processReturnMut({
        requestId: returnData.date,
        approverName: user?.name || '',
        remarks,
        scriptUrl: SCRIPT_URL,
      }).then(async (result) => {
        return result;
      }),
      {
        loading: 'Receiving item...',
        success: 'Return processed successfully! (Synced to Sheets)',
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
        success: 'Return cancelled — item remains with user.',
        error: (err) => `Failed: ${err.message}`,
      }
    );
  };

  const handleApproveRequest = async (req: any) => {
    // 1. Optimistic Update
    const prevCheckouts = [...pendingCheckouts];
    setPendingCheckouts(prev => prev.filter(r => r.date !== req.date));

    toast.promise(
      approveCheckoutMut({
        requestId: req.date,
        approverName: user?.name || '',
        scriptUrl: SCRIPT_URL,
      }).then(async (result) => {
        return result;
      }),
      {
        loading: 'Approving request...',
        success: 'Request Approved!',
        error: (err) => {
          // Rollback on failure
          setPendingCheckouts(prevCheckouts);
          return `Approval failed: ${err.message}`;
        }
      }
    );
  };

  const handleCancelCheckout = async (req: any) => {
    // 1. Optimistic Update
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

  const fetchInventory = async () => {
    return;
  };

  const isCanonicalDriveImageUrl = (value: string) =>
    /^https:\/\/drive\.google\.com\/(uc\?export=view&id=|thumbnail\?id=)/.test(value);

  const processSyncQueue = async () => {
    // 1. Get latest queue from storage
    const queue = JSON.parse(localStorage.getItem('syncQueue') || '[]');
    if (queue.length === 0) return;

    const itemToSync = queue[0]; // FIX: Get the first item object
    setIsSyncing(true);
    let syncedItemId = '';

    try {
      let syncedItemId = '';

      // STEP 1: Upload Image (if present)
      if (itemToSync.imageUrl && itemToSync.imageUrl.startsWith('data:')) {
        const base64Content = itemToSync.imageUrl.split(',')[1];
        const uploadResponse = await fetch(SCRIPT_URL, {
          method: 'POST',
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
          if (!isCanonicalDriveImageUrl(uploadResult.imageUrl || '')) {
            throw new Error('Image upload returned an invalid Google Drive URL');
          }
          itemToSync.imageUrl = uploadResult.imageUrl;
        } else {
          throw new Error("Image upload failed: " + uploadResult.message);
        }
      } else if (itemToSync.imageUrl && !itemToSync.imageUrl.startsWith('http')) {
        itemToSync.imageUrl = ''; // Clear invalid non-data URLs
      } else if (itemToSync.imageUrl && !isCanonicalDriveImageUrl(itemToSync.imageUrl)) {
        throw new Error('Inventory images must use the configured Google Drive folder link');
      }

      // STEP 2: Add Inventory Item
      const addResult = await addInventoryItemMut({
        name: itemToSync.name,
        quantity: itemToSync.quantity,
        category: itemToSync.category,
        company: itemToSync.company,
        imageUrl: itemToSync.imageUrl || '',
        remarks: itemToSync.remarks || '',
        links: itemToSync.links || '',
        tags: itemToSync.tagsArray || (itemToSync.tags ? itemToSync.tags.split(',') : []),
        scriptUrl: SCRIPT_URL,
      });

      if (addResult.success) {
        syncedItemId = addResult.itemId;
        // SUCCESS: Move to next
        const updatedQueue = queue.slice(1);
        localStorage.setItem('syncQueue', JSON.stringify(updatedQueue));
        setSyncQueue(updatedQueue);
        toast.success(`${itemToSync.name} synced!`);
        // 2. UPDATE THE UI: Find the item in 'inventory' and mark it finished
        setInventory(prevInventory =>
          prevInventory.map(invItem =>
            // We match by the local temporary ID stored during creation
            invItem.id === itemToSync.id ?
              { ...invItem, id: syncedItemId, isPending: false, imageUrl: itemToSync.imageUrl } :
              invItem
          )
        );
        if (updatedQueue.length === 0) {
          toast.success(`All items synced!`);
        } else {
          processSyncQueue();
        }
      } else {
        throw new Error('Failed to add inventory item');
      }

      // AdminPanel.tsx approx line 261
    } catch (error) {
      console.error("CRITICAL SYNC ERROR:", error);
      // Remove the problematic item from the queue so the loop STOPS
      setSyncQueue(prev => prev.slice(1));
      toast.error(`Sync failed: ${error instanceof Error ? error.message : String(error)}`);

    } finally {
      setIsSyncing(false);
    }
  };

  const streamRef = React.useRef<MediaStream | null>(null);

  React.useEffect(() => {
    // Cleanup video tracks when component unmounts
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const startCamera = async () => {
    setIsCameraActive(true);
    try {
      // Request environment (rear) camera on mobile
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      streamRef.current = stream;
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
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      } else {
        const stream = videoRef.current.srcObject as MediaStream;
        if (stream) stream.getTracks().forEach(track => track.stop());
      }
      setIsCameraActive(false);
    }
  };

  // 3. Trigger initial fetches
  React.useEffect(() => {
    fetchInventory();
    fetchCategories();
    fetchUsers();
    fetchHomeContent();
  }, []);

  // Sync Convex Machines with local state for instant status updates
  React.useEffect(() => {
    if (convexMachines) {
      setMachineLogs(convexMachines.map(cm => ({
        id: cm.machineId,
        name: cm.name,
        isOnline: cm.status === "ENGAGED",
        currentUser: cm.currentUser || ""
      })));
    }
  }, [convexMachines]);

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
        <Tabs defaultValue="users" className="space-y-20" onValueChange={(tab) => { if (tab === 'settings') fetchSyncStatus(); }}>
          <TabsList className={`grid w-full ${user?.role === 'ADMIN' ? 'max-w-4xl grid-cols-7' : 'max-w-3xl grid-cols-6'} bg-muted`}>
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
            <TabsTrigger value="machines" className="flex items-center gap-2">
              <Zap className="w-4 h-4" />
              <span className="hidden sm:inline">Machines</span>
            </TabsTrigger>
            {user?.role === 'ADMIN' && (
              <TabsTrigger value="settings" className="flex items-center gap-2">
                <Filter className="w-4 h-4" />
                <span className="hidden sm:inline">Settings</span>
              </TabsTrigger>
            )}
          </TabsList>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-4">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
              <div>
                <h2 className="text-2xl font-bold">User Management</h2>
                <p className="text-muted-foreground">
                  Manage approvals, roles, and profiles
                </p>
              </div>
              <div className="relative w-full md:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search name or email..."
                  className="pl-9 bg-white/50 backdrop-blur border-sage-200 focus:border-sage-400 focus:ring-sage-400"
                  value={userSearchQuery}
                  onChange={(e) => setUserSearchQuery(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {allUsers
                .filter((u) => u.status !== 'REJECTED')
                .filter((u) => {
                  if (!userSearchQuery) return true;
                  const query = userSearchQuery.toLowerCase();
                  return (
                    u.name?.toLowerCase().includes(query) ||
                    u.email?.toLowerCase().includes(query)
                  );
                })
                .map((u) => (
                  <Card
                    key={u.id || u.email}
                    onClick={() => handleOpenEditUser(u)}
                    className="p-4 hover:shadow-lg transition-all cursor-pointer flex flex-col gap-3 relative overflow-hidden group border-sage-100 hover:border-sage-300"
                  >
                    {/* Header: Name + Status */}
                    <div className="flex justify-between items-start gap-2">
                      <h3 className="font-bold text-sm text-foreground leading-tight truncate flex-1" title={u.name}>
                        {u.name || 'Unknown'}
                      </h3>
                      <div className="shrink-0">
                        {u.status === 'APPROVED' && (
                          <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-emerald-100 text-emerald-800 uppercase">
                            Approved
                          </span>
                        )}
                        {u.status === 'PENDING' && (
                          <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-yellow-100 text-yellow-800 uppercase animate-pulse">
                            Pending
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Meta: Email + Role */}
                    <div className="space-y-1">
                      <p className="text-[11px] text-muted-foreground truncate w-full" title={u.email}>
                        {u.email}
                      </p>
                      <span className="inline-block px-1.5 py-0.5 text-[9px] uppercase font-bold tracking-wider rounded bg-slate-100 text-slate-500">
                        {u.role || 'USER'}
                      </span>
                    </div>

                    {/* Tags (Compact) */}
                    {u.tags && u.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {u.tags.map((tag, idx) => {
                          const style = getTagStyle(tag);
                          return (
                            <span
                              key={idx}
                              className={`inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-tight border shadow-sm ${style.color}`}
                            >
                              {tag}
                            </span>
                          );
                        })}
                      </div>
                    )}

                    {/* Loans (Expanded) */}
                    <div className="mt-auto pt-2 border-t border-border/40">
                      {(() => {
                        const userLoans = activeLoans.filter(l => l.userEmail === u.email);
                        if (userLoans.length > 0) {
                          return (
                            <div className="space-y-1">
                              {userLoans.map((loan, idx) => (
                                <div key={idx} className="flex items-center gap-1.5 min-w-0">
                                  <Package className="w-3 h-3 text-blue-500 shrink-0" />
                                  <p className="text-[10px] text-blue-700 font-medium truncate flex-1" title={loan.itemName}>
                                    {loan.itemName} <span className="text-[9px] text-blue-500 opacity-80">x{loan.quantity}</span>
                                  </p>
                                </div>
                              ))}
                            </div>
                          );
                        }
                        return <p className="text-[10px] text-muted-foreground italic truncate">No active items</p>;
                      })()}
                    </div>
                  </Card>
                ))}
            </div>

            {/* Edit User Profile Dialog */}
            <Dialog open={!!editingUserEmail} onOpenChange={(open) => !open && setEditingUserEmail(null)}>
              <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-lg">
                    <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                      <UsersIcon className="w-4 h-4 text-emerald-700" />
                    </div>
                    Edit User Profile
                  </DialogTitle>
                </DialogHeader>

                <div className="space-y-5 py-2">
                  {/* ── Read-only info strip ─────────────────────────────── */}
                  <div className="rounded-xl border border-border bg-muted/40 p-4 space-y-3">
                    <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground mb-3">Account Info (Read Only)</p>

                    <div className="grid grid-cols-2 gap-3">
                      {/* Email */}
                      <div className="col-span-2">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Email</p>
                        <p className="text-sm font-medium text-foreground bg-background rounded-md px-3 py-2 border border-border truncate">{editUserForm.email}</p>
                      </div>

                      {/* Name */}
                      <div className="col-span-2">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Name</p>
                        <p className="text-sm font-medium text-foreground bg-background rounded-md px-3 py-2 border border-border">{editUserForm.name || '—'}</p>
                      </div>

                      {/* Status */}
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Status</p>
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${
                          editUserForm.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' :
                          editUserForm.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>{editUserForm.status || '—'}</span>
                      </div>

                      {/* Laptop */}
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Laptop</p>
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${
                          editUserForm.laptopStatus === 'Online' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                        }`}>{editUserForm.laptopStatus || 'Offline'}</span>
                      </div>

                      {/* Screentime */}
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Screentime</p>
                        <p className="text-sm font-medium text-foreground bg-background rounded-md px-3 py-2 border border-border">
                          {Math.floor((editUserForm.totalTime || 0) / 60)}h {(editUserForm.totalTime || 0) % 60}m
                        </p>
                      </div>

                      {/* RFID */}
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">RFID</p>
                        <p className="text-sm font-medium text-foreground bg-background rounded-md px-3 py-2 border border-border font-mono">
                          {editUserForm.rfid || '—'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* ── Editable fields ──────────────────────────────────── */}
                  <div className="space-y-4">
                    <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Editable Fields</p>

                    {/* Role dropdown */}
                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold text-foreground">Role</label>
                      <select
                        value={editUserForm.role}
                        onChange={(e) => setEditUserForm(f => ({ ...f, role: e.target.value }))}
                        className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:ring-2 focus:ring-emerald-500 outline-none"
                      >
                        <option value="USER">USER</option>
                        <option value="TEAM">TEAM</option>
                        <option value="ADMIN">ADMIN</option>
                      </select>
                    </div>

                    {/* Page Link */}
                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold text-foreground">Page Link</label>
                      <Input
                        value={editUserForm.myPageLink}
                        onChange={(e) => setEditUserForm(f => ({ ...f, myPageLink: e.target.value }))}
                        placeholder="https://..."
                        className="text-sm"
                      />
                      <p className="text-[10px] text-muted-foreground">User's personal / portfolio page URL</p>
                    </div>

                    {/* Note */}
                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold text-foreground">Admin Note</label>
                      <textarea
                        className="w-full text-sm p-2.5 border border-border rounded-lg bg-background focus:ring-2 focus:ring-emerald-500 outline-none resize-none"
                        rows={3}
                        value={editUserForm.note}
                        onChange={(e) => setEditUserForm(f => ({ ...f, note: e.target.value }))}
                        placeholder="Private admin note…"
                      />
                    </div>

                    {/* Tags */}
                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold text-foreground">Tags</label>
                      <div className="min-h-[2.5rem] p-2 border border-border rounded-lg flex flex-wrap gap-1.5 focus-within:ring-2 focus-within:ring-emerald-500 bg-background">
                        {editUserForm.tags.map((tag, idx) => {
                          const style = getTagStyle(tag);
                          return (
                            <span
                              key={idx}
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold border ${style.color}`}
                            >
                              {tag}
                              <button
                                type="button"
                                onClick={() => setEditUserForm(f => ({ ...f, tags: f.tags.filter((_, i) => i !== idx) }))}
                                className="ml-0.5 hover:opacity-60 transition-opacity"
                              >
                                <XCircle className="w-3 h-3" />
                              </button>
                            </span>
                          );
                        })}
                        <input
                          placeholder={editUserForm.tags.length === 0 ? 'Type tag & press Enter…' : ''}
                          value={editUserTagInput}
                          onChange={(e) => setEditUserTagInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              const val = editUserTagInput.trim();
                              if (val && !editUserForm.tags.includes(val)) {
                                setEditUserForm(f => ({ ...f, tags: [...f.tags, val] }));
                              }
                              setEditUserTagInput('');
                            }
                            if (e.key === 'Backspace' && !editUserTagInput && editUserForm.tags.length > 0) {
                              setEditUserForm(f => ({ ...f, tags: f.tags.slice(0, -1) }));
                            }
                          }}
                          className="flex-1 bg-transparent border-none outline-none text-sm min-w-[120px]"
                        />
                      </div>
                      <p className="text-[10px] text-muted-foreground">Press Enter to add · Backspace to remove last.</p>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex gap-2 pt-1">
                    <Button variant="outline" className="flex-1" onClick={() => setEditingUserEmail(null)}>Cancel</Button>
                    <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleUpdateUser}>Save Changes</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

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
                        src={getOptimizedImageUrl(item.imageUrl)}
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
                  {/* Image */}
                  <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-muted border">
                    {selectedItem?.imageUrl ? (
                      <img
                        src={getOptimizedImageUrl(selectedItem.imageUrl)}
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

                  {editingItem?.id === selectedItem?.id ? (
                    /* ======= EDIT MODE ======= */
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs font-medium text-muted-foreground">Name</label>
                          <Input
                            value={editItemForm.name || ''}
                            onChange={e => setEditItemForm(f => ({ ...f, name: e.target.value }))}
                          />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-muted-foreground">Quantity</label>
                          <Input
                            type="number"
                            value={editItemForm.quantity ?? ''}
                            onChange={e => setEditItemForm(f => ({ ...f, quantity: Number(e.target.value) }))}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs font-medium text-muted-foreground">Company / Brand</label>
                          <Input
                            value={editItemForm.company || ''}
                            onChange={e => setEditItemForm(f => ({ ...f, company: e.target.value }))}
                          />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-muted-foreground">Category</label>
                          <select
                            value={editItemForm.category || ''}
                            onChange={e => setEditItemForm(f => ({ ...f, category: e.target.value }))}
                            className="w-full h-10 px-3 py-2 border border-border rounded-md text-sm bg-background"
                          >
                            <option value="">Select category</option>
                            {categories.map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground">Tags (comma-separated)</label>
                        <Input
                          value={(editItemForm as any).tagsInput || ''}
                          onChange={e => setEditItemForm(f => ({ ...f, tagsInput: e.target.value }))}
                          placeholder="e.g. electronics, power-tool"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground">Remarks</label>
                        <textarea
                          className="w-full text-sm p-2 border rounded-md bg-background outline-none focus:ring-1 focus:ring-emerald-500 resize-none"
                          rows={2}
                          value={editItemForm.remarks || ''}
                          onChange={e => setEditItemForm(f => ({ ...f, remarks: e.target.value }))}
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground">Link / URL</label>
                        <Input
                          value={editItemForm.links || ''}
                          onChange={e => setEditItemForm(f => ({ ...f, links: e.target.value }))}
                          placeholder="https://..."
                        />
                      </div>
                      <div className="flex gap-2 pt-2">
                        <Button variant="outline" className="flex-1" onClick={() => setEditingItem(null)}>Cancel</Button>
                        <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700" onClick={handleUpdateInventoryItem}>
                          Save Changes
                        </Button>
                      </div>
                    </div>
                  ) : (
                    /* ======= VIEW MODE ======= */
                    <>
                      <div className="grid md:grid-cols-3 gap-4">
                        <div className="rounded-xl border bg-emerald-50 p-4 text-center">
                          <p className="text-sm font-medium text-emerald-600">Stock Level</p>
                          <p className="text-3xl font-bold text-emerald-900">{selectedItem?.quantity}</p>
                        </div>
                        <div className="rounded-xl border bg-blue-50 p-4 text-center">
                          <p className="text-sm font-medium text-blue-600">Category</p>
                          <p className="text-lg font-semibold text-blue-900">{selectedItem?.category}</p>
                        </div>
                        <div className="rounded-xl border bg-purple-50 p-4 text-center">
                          <p className="text-sm font-medium text-purple-600">Company / Brand</p>
                          <p className="text-lg font-semibold text-purple-900">{selectedItem?.company}</p>
                        </div>
                      </div>

                      <div className="space-y-3">
                        {selectedItem?.remarks && (
                          <div className="rounded-xl border bg-muted p-4">
                            <h4 className="font-medium text-foreground mb-1">Remarks</h4>
                            <p className="text-sm text-muted-foreground">{selectedItem.remarks}</p>
                          </div>
                        )}
                        {selectedItem?.links && (
                          <div className="rounded-xl border p-4">
                            <h4 className="font-medium text-foreground mb-1">Important Link</h4>
                            <a href={selectedItem.links} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline break-all">
                              {selectedItem.links}
                            </a>
                          </div>
                        )}
                      </div>

                      <div className="flex gap-3 pt-2">
                        <Button variant="outline" className="flex-1" onClick={() => setSelectedItem(null)}>
                          Close
                        </Button>
                        <Button
                          className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                          onClick={() => selectedItem && handleOpenEditItem(selectedItem)}
                        >
                          <Edit2 className="w-4 h-4 mr-2" /> Edit Details
                        </Button>
                        {user?.role === 'ADMIN' && (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => selectedItem && handleDeleteInventoryItem(selectedItem)}
                            title="Delete item"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </>
                  )}
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
                      <div className="flex flex-col sm:flex-row gap-2">
                        <Button
                          className="bg-emerald-600 hover:bg-emerald-700"
                          onClick={() => handleApproveRequest(req)}
                        >
                          Approve Checkout
                        </Button>
                        <Button
                          variant="outline"
                          className="border-red-200 text-red-600 hover:bg-red-50 hover:border-red-400"
                          onClick={() => handleCancelCheckout(req)}
                        >
                          Cancel Request
                        </Button>
                      </div>
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
                      <div className="flex flex-col sm:flex-row gap-2">
                        <Button
                          className="bg-emerald-600 hover:bg-emerald-700"
                          onClick={() => setSelectedReturn(req)}
                        >
                          Receive Item
                        </Button>
                        <Button
                          variant="outline"
                          className="border-red-200 text-red-600 hover:bg-red-50 hover:border-red-400"
                          onClick={() => handleCancelReturn(req)}
                        >
                          Cancel Return
                        </Button>
                      </div>
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
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* LEFT COLUMN: MACHINE LOGS (Span 7 = ~58%) */}
              <div className="lg:col-span-7 space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold font-display flex items-center gap-2">
                    <Monitor className="w-5 h-5" /> Machine Status
                  </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {convexMachines && convexMachines.length > 0 ? (
                    convexMachines.map((m) => {
                      const machine = {
                        id: m.machineId,
                        name: m.name,
                        isOnline: m.status === "ENGAGED",
                        currentUser: m.currentUser || "",
                        waitingList: m.waitingList || [],
                      };
                      return (
                        <div key={machine.id}>
                          <MachineCard machine={machine} />
                        </div>
                      );
                    })
                  ) : (
                    <div className="col-span-full p-8 text-center text-muted-foreground border-2 border-dashed rounded-xl bg-card">
                      <Zap className="w-8 h-8 text-slate-200 mx-auto mb-2 opacity-20" />
                      <p>No machines registered in Convex.</p>
                      <p className="text-xs mt-1">Add a machine from the register section.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* RIGHT COLUMN: EXISTING STATS (Span 5 = ~42%) */}
              <div className="lg:col-span-5 space-y-6">
                {/* Section 1: Online Students */}
                <div>
                  <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></span>
                    Online Students
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {allUsers.filter((u: any) => u.laptopStatus === 'Online').length > 0 ? (
                      allUsers.filter((u: any) => u.laptopStatus === 'Online').map(u => (
                        <Card key={u.id} className="p-4 border-l-4 border-l-emerald-500 flex flex-col gap-1 shadow-sm relative group">
                          <p className="font-bold text-sm truncate pr-6" title={u.name}>{u.name}</p>
                          <p className="text-xs text-muted-foreground truncate pr-6" title={u.email}>{u.email}</p>
                          <span className="text-[10px] text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full w-fit mt-1">
                            Online
                          </span>
                          <Button 
                            variant="destructive" 
                            size="icon" 
                            className="absolute top-2 right-2 w-6 h-6 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => handleForceTurnOff(u.email)}
                            title="Force Turn Off"
                          >
                            <span className="text-[10px] font-bold">X</span>
                          </Button>
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
                            <th className="px-6 py-3 text-left">Total Hours</th>
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
              </div>
            </div>
          </TabsContent>

          {/* TAB 5: MACHINE MANAGEMENT */}
          <TabsContent value="machines" className="space-y-4">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
              <div>
                <h2 className="text-2xl font-bold">Machine Management</h2>
                <p className="text-muted-foreground">
                  Add and manage workshop machines
                </p>
              </div>

              <Dialog open={showAddMachine} onOpenChange={setShowAddMachine}>
                <DialogTrigger asChild>
                  <Button className="gap-2 bg-slate-800 hover:bg-slate-900">
                    <Plus className="w-4 h-4" /> Add Machine
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Add New Machine</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Machine Name</label>
                      <Input
                        placeholder="e.g. Laser Cutter 1"
                        value={newMachineForm.name}
                        onChange={(e) => setNewMachineForm({ ...newMachineForm, name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Machine ID (Optional)</label>
                      <Input
                        placeholder="e.g. laser_01"
                        value={newMachineForm.id}
                        onChange={(e) => setNewMachineForm({ ...newMachineForm, id: e.target.value })}
                      />
                    </div>
                    <Button onClick={handleSaveMachine} className="w-full bg-slate-800 hover:bg-slate-900 mt-2">
                      Create Machine
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {machineLogs.map((machine) => (
                <div key={machine.id} className="relative group">
                  <MachineCard machine={machine} />
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute -top-2 -right-2 w-6 h-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10"
                    onClick={() => handleDeleteMachine(machine.id)}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              ))}
              {machineLogs.length === 0 && (
                <div className="col-span-full py-20 text-center border-2 border-dashed rounded-xl bg-muted/20">
                  <Zap className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-20" />
                  <p className="text-muted-foreground">No machines registered</p>
                  <Button
                    variant="link"
                    onClick={() => setShowAddMachine(true)}
                    className="mt-2 text-slate-600"
                  >
                    Click here to add your first machine
                  </Button>
                </div>
              )}
            </div>
          </TabsContent>

          {/* HOME CMS TAB (ADMIN ONLY) */}
          {user?.role === 'ADMIN' && (
            <TabsContent value="settings" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                {/* SETTINGS CARD */}
                <div className="space-y-6">
                  <Card className="p-6">
                    <h2 className="text-xl font-bold font-display mb-4 border-b pb-2">Global System Settings</h2>
                    <div className="space-y-6 pt-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-semibold text-foreground">Allow Team Inventory Management</h4>
                          <p className="text-sm text-muted-foreground max-w-sm">
                            If enabled, TEAM members can add, edit, and delete inventory items.
                          </p>
                        </div>
                        <div className="relative inline-block w-12 mr-2 align-middle select-none transition duration-200 ease-in">
                          <input
                            type="checkbox"
                            name="toggle"
                            id="toggle"
                            className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer"
                            checked={allowTeamInventoryEdit}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setAllowTeamInventoryEdit(checked);
                              toast.promise(
                                updateAdminSettingsMut({
                                  allowTeamInventory: checked,
                                  scriptUrl: SCRIPT_URL,
                                }),
                                { loading: 'Saving...', success: 'Settings updated!', error: 'Failed to update' }
                              );
                            }}
                          />
                          <label htmlFor="toggle" className="toggle-label block overflow-hidden h-6 rounded-full bg-gray-300 cursor-pointer"></label>
                          <style>{`
                            .toggle-checkbox:checked { right: 0; border-color: #10b981; }
                            .toggle-checkbox:checked + .toggle-label { background-color: #10b981; }
                            .toggle-checkbox { right: 24px; transition: all 0.2s ease; border-color: #d1d5db; z-index: 10; }
                          `}</style>
                        </div>
                      </div>
                    </div>
                  </Card>

                  {/* DATA SYNC CARD */}
                  <Card className="p-6">
                    <h2 className="text-xl font-bold font-display mb-1 border-b pb-2 flex items-center gap-2">
                      Convex Data Sync
                      {syncStatus.loading && (
                        <span className="inline-block w-3 h-3 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
                      )}
                    </h2>
                    <p className="text-sm text-muted-foreground mb-3">
                      Manually push changed rows from Google Sheets → Convex. Only rows that differ from the last sync are written (hash-checked).
                    </p>

                    {/* Convex credential error banner */}
                    {!syncStatus.convexAvailable && (
                      <div className="mb-3 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
                        ⚠️ <strong>Convex not reachable.</strong> Check that <code>client_email</code>, <code>private_key</code>, and <code>project_id</code> are set in your Apps Script → Project Settings → Script Properties.
                        {syncStatus.credentialError && <div className="mt-1 font-mono break-all">{syncStatus.credentialError}</div>}
                      </div>
                    )}

                    <div className="space-y-3">
                      <div>
                        {/* Users sync button */}
                        <Button
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
                          onClick={handleSyncUsersToConvex}
                          disabled={syncStatus.loading || !syncStatus.convexAvailable || syncStatus.users.unsyncedRows === 0}
                        >
                          <UsersIcon className="w-4 h-4 mr-2" />
                          Sync Users → Convex
                          {syncStatus.users.unsyncedRows > 0 && (
                            <span className="ml-2 bg-white/20 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                              {syncStatus.users.unsyncedRows} unsynced
                            </span>
                          )}
                          {syncStatus.users.unsyncedRows === 0 && syncStatus.convexAvailable && !syncStatus.loading && (
                            <span className="ml-2 text-[10px] opacity-70">✓ Up to date</span>
                          )}
                        </Button>
                        <p className="text-[10px] text-muted-foreground mt-1 text-center">
                          {syncStatus.users.sheetRows} total users in sheet
                        </p>
                      </div>

                      <div>
                        {/* Requests sync button */}
                        <Button
                          className="w-full bg-purple-600 hover:bg-purple-700 text-white disabled:opacity-50"
                          onClick={handleSyncRequestsToConvex}
                          disabled={syncStatus.loading || !syncStatus.convexAvailable || syncStatus.requests.unsyncedRows === 0}
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Sync Requests → Convex
                          {syncStatus.requests.unsyncedRows > 0 && (
                            <span className="ml-2 bg-white/20 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                              {syncStatus.requests.unsyncedRows} unsynced
                            </span>
                          )}
                          {syncStatus.requests.unsyncedRows === 0 && syncStatus.convexAvailable && !syncStatus.loading && (
                            <span className="ml-2 text-[10px] opacity-70">✓ Up to date</span>
                          )}
                        </Button>
                        <p className="text-[10px] text-muted-foreground mt-1 text-center">
                          {syncStatus.requests.sheetRows} total requests in sheet
                        </p>
                      </div>

                      <div className="flex items-center gap-2 mt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs"
                          onClick={fetchSyncStatus}
                          disabled={syncStatus.loading}
                        >
                          {syncStatus.loading ? 'Checking…' : '↻ Refresh Status'}
                        </Button>
                        <p className="text-[10px] text-muted-foreground italic">
                          Inventory syncs automatically on every edit. Only Users & Requests need manual sync.
                        </p>
                      </div>
                    </div>
                  </Card>
                </div>

                {/* HOME CONTENT CMS CARD */}
                <Card className="p-6">
                  <div className="flex items-center justify-between mb-4 border-b pb-2">
                    <h2 className="text-xl font-bold font-display">Guest Page Content</h2>
                    <Button
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-700"
                      onClick={() => {
                        if (guestContentTab === 'fab-academy') {
                          resetFabAcademyForm();
                          setShowAddFabAcademy(true);
                        } else if (guestContentTab === 'fab-interns') {
                          resetFabInternForm();
                          setShowAddFabIntern(true);
                        } else if (guestContentTab === 'home') {
                          resetAspectForm();
                          setShowAddAspect(true);
                        } else {
                          setHomeForm({ id: '', type: 'text_block', heading: '', description: '', contentUrl: '' });
                          setShowAddHome(true);
                        }
                      }}
                    >
                      <Plus className="w-4 h-4 mr-1" /> 
                      {guestContentTab === 'fab-academy' ? 'Add Fab Academy Entry' : 
                       guestContentTab === 'fab-interns' ? 'Add Fab Intern Entry' : 
                       guestContentTab === 'home' ? 'Add Aspect' :
                       'Add Block'}
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">
                    Manage public community content for Home Aspects, TRA Students, Fab Academy, and Fab Intern showcases.
                  </p>

                  <Tabs value={guestContentTab} onValueChange={(value) => setGuestContentTab(value as 'tra-students' | 'fab-academy' | 'fab-interns' | 'home')}>
                    <TabsList className="grid w-full max-w-2xl grid-cols-4 p-1 bg-slate-200/50 mb-4">
                      <TabsTrigger value="home" className="rounded-md font-medium">Home</TabsTrigger>
                      <TabsTrigger value="tra-students" className="rounded-md font-medium">TRA Students</TabsTrigger>
                      <TabsTrigger value="fab-academy" className="rounded-md font-medium">Fab Academy</TabsTrigger>
                      <TabsTrigger value="fab-interns" className="rounded-md font-medium">Fab Interns</TabsTrigger>
                    </TabsList>

                    <TabsContent value="home" className="space-y-4">
                      {showAddAspect && (
                        <div className="mb-4 p-4 border rounded-xl bg-muted/20 space-y-3">
                          <h3 className="font-semibold text-sm">{aspectForm.id ? 'Edit Aspect' : 'New Aspect'}</h3>
                          <div>
                            <label className="text-xs font-medium text-muted-foreground">Aspect Title</label>
                            <Input className="mt-1" value={aspectForm.aspect} onChange={e => setAspectForm(f => ({ ...f, aspect: e.target.value }))} placeholder="e.g. Community" />
                          </div>
                          <div>
                            <label className="text-xs font-medium text-muted-foreground">Write Up</label>
                            <textarea
                              className="w-full mt-1 text-sm p-2 border rounded-md bg-background outline-none focus:ring-1 focus:ring-emerald-500 resize-none"
                              rows={4}
                              value={aspectForm.writeUp}
                              onChange={e => setAspectForm(f => ({ ...f, writeUp: e.target.value }))}
                              placeholder="Detailed description..."
                            />
                          </div>
                          <div>
                            <label className="text-xs font-medium text-muted-foreground">Short Note (Hover effect)</label>
                            <Input className="mt-1" value={aspectForm.shortNote} onChange={e => setAspectForm(f => ({ ...f, shortNote: e.target.value }))} placeholder="Brief hovering text..." />
                          </div>
                          <div>
                            <label className="text-xs font-medium text-muted-foreground flex justify-between items-center">
                              <span>Image URLs</span>
                              <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={() => setAspectForm(f => ({ ...f, images: [...f.images, ''] }))}>
                                <Plus className="w-3 h-3 mr-1" /> Add Image
                              </Button>
                            </label>
                            <div className="space-y-2 mt-2">
                              {aspectForm.images.map((img, idx) => (
                                <div key={idx} className="flex gap-2">
                                  <Input 
                                    value={img} 
                                    onChange={e => {
                                      const newImgs = [...aspectForm.images];
                                      newImgs[idx] = e.target.value;
                                      setAspectForm(f => ({ ...f, images: newImgs }));
                                    }} 
                                    placeholder="https://..." 
                                  />
                                  {aspectForm.images.length > 1 && (
                                    <Button variant="outline" size="sm" className="px-2 shrink-0" onClick={() => {
                                      const newImgs = aspectForm.images.filter((_, i) => i !== idx);
                                      setAspectForm(f => ({ ...f, images: newImgs }));
                                    }}>
                                      <Trash2 className="w-4 h-4 text-red-500" />
                                    </Button>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                          <div className="flex gap-2 pt-2">
                            <Button variant="outline" className="flex-1" onClick={() => setShowAddAspect(false)}>Cancel</Button>
                            <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700" onClick={handleSaveAspectContent}>Save Aspect</Button>
                          </div>
                        </div>
                      )}

                      <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                        {aspects.length === 0 ? (
                          <div className="p-6 border-2 border-dashed rounded-lg text-center text-muted-foreground text-sm">
                            No aspects configured yet.
                          </div>
                        ) : aspects.map(item => (
                          <div key={item.id} className="p-3 border rounded-lg bg-muted/20 flex justify-between items-start gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium text-sm truncate">{item.aspect}</span>
                              </div>
                              {item.shortNote && <p className="text-[10px] text-emerald-600 mt-1">Hover: {item.shortNote}</p>}
                              {item.writeUp && <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{item.writeUp}</p>}
                              {item.images && item.images.length > 0 && <p className="text-[10px] text-blue-500 truncate mt-1">{item.images.length} Image(s)</p>}
                            </div>
                            <div className="flex gap-1 shrink-0">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 w-7 p-0"
                                onClick={() => { 
                                  setAspectForm({ ...item, images: item.images?.length ? item.images : [''] }); 
                                  setShowAddAspect(true); 
                                }}
                              >
                                <Edit2 className="w-3 h-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 w-7 p-0 text-red-500"
                                onClick={() => handleDeleteAspectContent(item.id)}
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </TabsContent>

                    <TabsContent value="tra-students" className="space-y-4">
                      {showAddHome && (
                        <div className="mb-4 p-4 border rounded-xl bg-muted/20 space-y-3">
                          <h3 className="font-semibold text-sm">{homeForm.id ? 'Edit Block' : 'New Content Block'}</h3>
                          <div>
                            <label className="text-xs font-medium text-muted-foreground">Type</label>
                            <select
                              value={homeForm.type}
                              onChange={e => setHomeForm(f => ({ ...f, type: e.target.value }))}
                              className="w-full px-3 py-2 border border-border rounded-md text-sm bg-background mt-1"
                            >
                              <option value="text_block">Text Block</option>
                              <option value="banner">Banner</option>
                              <option value="link">Link</option>
                              <option value="gallery">Gallery</option>
                              <option value="video">Video</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-xs font-medium text-muted-foreground">Heading</label>
                            <Input className="mt-1" value={homeForm.heading} onChange={e => setHomeForm(f => ({ ...f, heading: e.target.value }))} placeholder="Main title" />
                          </div>
                          <div>
                            <label className="text-xs font-medium text-muted-foreground">Description</label>
                            <textarea
                              className="w-full mt-1 text-sm p-2 border rounded-md bg-background outline-none focus:ring-1 focus:ring-emerald-500 resize-none"
                              rows={3}
                              value={homeForm.description}
                              onChange={e => setHomeForm(f => ({ ...f, description: e.target.value }))}
                              placeholder="Body text..."
                            />
                          </div>
                          <div>
                            <label className="text-xs font-medium text-muted-foreground">Content URL (image/link)</label>
                            <Input className="mt-1" value={homeForm.contentUrl} onChange={e => setHomeForm(f => ({ ...f, contentUrl: e.target.value }))} placeholder="https://..." />
                          </div>
                          <div className="flex gap-2">
                            <Button variant="outline" className="flex-1" onClick={() => setShowAddHome(false)}>Cancel</Button>
                            <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700" onClick={handleSaveHomeContent}>Save & Sync</Button>
                          </div>
                        </div>
                      )}

                      <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                        {homeItems.length === 0 ? (
                          <div className="p-6 border-2 border-dashed rounded-lg text-center text-muted-foreground text-sm">
                            No content blocks yet. Click "Add Block" to create one.
                          </div>
                        ) : homeItems.map(item => (
                          <div key={item.id} className="p-3 border rounded-lg bg-muted/20 flex justify-between items-start gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700">{item.type}</span>
                                <span className="font-medium text-sm truncate">{item.heading}</span>
                              </div>
                              {item.description && <p className="text-xs text-muted-foreground line-clamp-2">{item.description}</p>}
                              {item.contentUrl && <p className="text-[10px] text-blue-500 truncate mt-1">{item.contentUrl}</p>}
                            </div>
                            <div className="flex gap-1 shrink-0">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 w-7 p-0"
                                onClick={() => { setHomeForm({ ...item }); setShowAddHome(true); }}
                              >
                                <Edit2 className="w-3 h-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 w-7 p-0 text-red-500 hover:text-red-700"
                                onClick={() => handleDeleteHomeContent(item.id)}
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </TabsContent>

                    <TabsContent value="fab-academy" className="space-y-4">
                      {showAddFabAcademy && (
                        <div className="mb-4 p-4 border rounded-xl bg-muted/20 space-y-3">
                          <h3 className="font-semibold text-sm">{fabAcademyForm.id ? 'Edit Fab Academy Entry' : 'New Fab Academy Entry'}</h3>
                          <div>
                            <label className="text-xs font-medium text-muted-foreground">Student Name</label>
                            <Input className="mt-1" value={fabAcademyForm.studentName} onChange={e => setFabAcademyForm(f => ({ ...f, studentName: e.target.value }))} placeholder="Student full name" />
                          </div>
                          <div>
                            <label className="text-xs font-medium text-muted-foreground">Google Drive Image Link</label>
                            <Input className="mt-1" value={fabAcademyForm.imageUrl} onChange={e => setFabAcademyForm(f => ({ ...f, imageUrl: e.target.value }))} placeholder="https://drive.google.com/..." />
                          </div>
                          <div>
                            <label className="text-xs font-medium text-muted-foreground">Fab Academy Year</label>
                            <Input className="mt-1" value={fabAcademyForm.fabYear} onChange={e => setFabAcademyForm(f => ({ ...f, fabYear: e.target.value }))} placeholder="2026" />
                          </div>
                          <div>
                            <label className="text-xs font-medium text-muted-foreground">Project Video Link</label>
                            <Input className="mt-1" value={fabAcademyForm.videoUrl} onChange={e => setFabAcademyForm(f => ({ ...f, videoUrl: e.target.value }))} placeholder="https://drive.google.com/..." />
                          </div>
                          <div>
                            <label className="text-xs font-medium text-muted-foreground">Project Documentation Link</label>
                            <Input className="mt-1" value={fabAcademyForm.documentationUrl} onChange={e => setFabAcademyForm(f => ({ ...f, documentationUrl: e.target.value }))} placeholder="https://..." />
                          </div>
                          <div>
                            <label className="text-xs font-medium text-muted-foreground">Remarks</label>
                            <textarea
                              className="w-full mt-1 text-sm p-2 border rounded-md bg-background outline-none focus:ring-1 focus:ring-emerald-500 resize-none"
                              rows={4}
                              value={fabAcademyForm.remarks}
                              onChange={e => setFabAcademyForm(f => ({ ...f, remarks: e.target.value }))}
                              placeholder="Short profile, project summary, fabrication highlights..."
                            />
                          </div>
                          <div className="flex gap-2">
                            <Button variant="outline" className="flex-1" onClick={() => setShowAddFabAcademy(false)}>Cancel</Button>
                            <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700" onClick={handleSaveFabAcademyContent}>Save & Sync</Button>
                          </div>
                        </div>
                      )}

                      <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                        {fabAcademyItems.length === 0 ? (
                          <div className="p-6 border-2 border-dashed rounded-lg text-center text-muted-foreground text-sm">
                            No Fab Academy entries yet. Click "Add Fab Academy Entry" to create one.
                          </div>
                        ) : fabAcademyItems.map((item) => (
                          <div key={item.id} className="p-3 border rounded-lg bg-muted/20 flex justify-between items-start gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">{item.fabYear || 'Fab Academy'}</span>
                                <span className="font-medium text-sm truncate">{item.studentName}</span>
                              </div>
                              {item.remarks && <p className="text-xs text-muted-foreground line-clamp-2">{item.remarks}</p>}
                              {item.documentationUrl && <p className="text-[10px] text-blue-500 truncate mt-1">{item.documentationUrl}</p>}
                            </div>
                            <div className="flex gap-1 shrink-0">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 w-7 p-0"
                                onClick={() => {
                                  setFabAcademyForm({
                                    id: item.id,
                                    studentName: item.studentName,
                                    imageUrl: item.imageUrl,
                                    fabYear: item.fabYear,
                                    videoUrl: item.videoUrl,
                                    documentationUrl: item.documentationUrl,
                                    remarks: item.remarks,
                                  });
                                  setShowAddFabAcademy(true);
                                }}
                              >
                                <Edit2 className="w-3 h-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 w-7 p-0 text-red-500 hover:text-red-700"
                                onClick={() => handleDeleteFabAcademyContent(item.id)}
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </TabsContent>

                    <TabsContent value="fab-interns" className="space-y-4">
                      {showAddFabIntern && (
                        <div className="mb-4 p-4 border rounded-xl bg-muted/20 space-y-3">
                          <h3 className="font-semibold text-sm">{fabInternForm.id ? 'Edit Fab Intern Entry' : 'New Fab Intern Entry'}</h3>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-xs font-medium text-muted-foreground">Student Name</label>
                              <Input className="mt-1" value={fabInternForm.studentName} onChange={e => setFabInternForm(f => ({ ...f, studentName: e.target.value }))} placeholder="Full Name" />
                            </div>
                            <div>
                              <label className="text-xs font-medium text-muted-foreground">Internship Year</label>
                              <Input className="mt-1" value={fabInternForm.internshipYear} onChange={e => setFabInternForm(f => ({ ...f, internshipYear: e.target.value }))} placeholder="e.g. Summer 2024" />
                            </div>
                          </div>
                          <div>
                            <label className="text-xs font-medium text-muted-foreground">Image URL (Profile)</label>
                            <Input className="mt-1" value={fabInternForm.imageUrl} onChange={e => setFabInternForm(f => ({ ...f, imageUrl: e.target.value }))} placeholder="https://..." />
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-xs font-medium text-muted-foreground">Video URL (Presentation)</label>
                              <Input className="mt-1" value={fabInternForm.videoUrl} onChange={e => setFabInternForm(f => ({ ...f, videoUrl: e.target.value }))} placeholder="https://drive.google.com/..." />
                            </div>
                            <div>
                              <label className="text-xs font-medium text-muted-foreground">Documentation URL</label>
                              <Input className="mt-1" value={fabInternForm.documentationUrl} onChange={e => setFabInternForm(f => ({ ...f, documentationUrl: e.target.value }))} placeholder="https://..." />
                            </div>
                          </div>
                          <div>
                            <label className="text-xs font-medium text-muted-foreground">Remarks</label>
                            <textarea
                              className="w-full mt-1 text-sm p-2 border rounded-md bg-background outline-none focus:ring-1 focus:ring-emerald-500 resize-none"
                              rows={4}
                              value={fabInternForm.remarks}
                              onChange={e => setFabInternForm(f => ({ ...f, remarks: e.target.value }))}
                              placeholder="Brief internship summary, key projects, and achievements..."
                            />
                          </div>
                          <div className="flex gap-2">
                            <Button variant="outline" className="flex-1" onClick={() => setShowAddFabIntern(false)}>Cancel</Button>
                            <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700" onClick={handleSaveFabInternContent}>Save & Sync</Button>
                          </div>
                        </div>
                      )}

                      <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                        {fabInternItems.length === 0 ? (
                          <div className="p-6 border-2 border-dashed rounded-lg text-center text-muted-foreground text-sm">
                            No internship entries yet. Click "Add Fab Intern Entry" to create one.
                          </div>
                        ) : fabInternItems.map((item) => (
                          <div key={item.id} className="p-3 border rounded-lg bg-muted/20 flex justify-between items-start gap-2">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <div className="h-10 w-10 rounded-full overflow-hidden bg-slate-100 flex-shrink-0">
                                {item.imageUrl ? (
                                  <img src={getOptimizedImageUrl(item.imageUrl)} alt={item.studentName} className="h-full w-full object-cover" />
                                ) : (
                                  <div className="h-full w-full flex items-center justify-center text-slate-400 font-bold">{item.studentName.charAt(0)}</div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-0.5">
                                  <span className="font-bold text-sm truncate">{item.studentName}</span>
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700 font-bold uppercase">{item.internshipYear}</span>
                                </div>
                                <p className="text-[10px] text-muted-foreground truncate">{item.remarks || 'No remarks provided'}</p>
                              </div>
                            </div>
                            <div className="flex gap-1 shrink-0">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 w-7 p-0"
                                onClick={() => {
                                  setFabInternForm({
                                    id: item.id,
                                    studentName: item.studentName,
                                    imageUrl: item.imageUrl,
                                    internshipYear: item.internshipYear,
                                    videoUrl: item.videoUrl,
                                    documentationUrl: item.documentationUrl,
                                    remarks: item.remarks,
                                  });
                                  setShowAddFabIntern(true);
                                }}
                              >
                                <Edit2 className="w-3 h-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 w-7 p-0 text-red-500 hover:text-red-700"
                                onClick={() => handleDeleteFabInternContent(item.id)}
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </TabsContent>
                  </Tabs>
                </Card>

              </div>
            </TabsContent>
          )}

        </Tabs>
      </main>
    </div>
  );
}

// Helper component for Admin Machine Logs
function AdminMachineLogs({ machineId, onDelete }: { machineId: string, onDelete: any }) {
  const logs = useQuery(api.machines.getLogsByMachine, { machineId });

  if (logs === undefined) return <div className="p-4 text-center text-xs text-muted-foreground">Loading logs...</div>;
  if (!logs || logs.length === 0) return <div className="p-4 text-center text-xs text-muted-foreground italic">No usage history found in Convex.</div>;

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

  const handleDelete = async (logId: any) => {
    if (!window.confirm('Are you sure you want to delete this log entry?')) return;
    try {
      await onDelete({ logId });
      toast.success('Log entry deleted');
    } catch (err) {
      toast.error('Failed to delete log');
    }
  };

  return (
    <div className="max-h-[350px] overflow-y-auto divide-y">
      {logs.map((log) => {
        const duration = calculateDuration(log.startTime, log.endTime || '');
        return (
          <div key={log._id} className="p-3 hover:bg-muted/30 transition-colors flex justify-between items-start group">
            <div className="space-y-1.5 flex-1 pr-4">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm">{log.userName}</span>
                <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                  {new Date(log.startTime).toLocaleDateString([], { month: 'short', day: 'numeric' })} • {new Date(log.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
                {log.endTime && (
                  <span className="text-[10px] font-mono text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">
                    {formatDuration(duration)}
                  </span>
                )}
              </div>
              
              {log.note && (
                <div className="bg-amber-50/50 p-2 rounded border border-amber-100/50">
                  <p className="text-[11px] text-amber-900 leading-relaxed italic">
                    "{log.note}"
                  </p>
                </div>
              )}

              {!log.endTime && (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] rounded-full font-bold uppercase tracking-wider">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  Active Now
                </span>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
              onClick={() => handleDelete(log._id)}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        );
      })}
    </div>
  );
}
