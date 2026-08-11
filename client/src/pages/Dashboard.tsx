import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation, Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Search, Plus, LogOut, Package, History, Printer, Scissors, Zap, BookOpen, Users as UsersIcon, Monitor, Sparkles, FolderKanban, GraduationCap, CheckCircle2, ExternalLink, Star } from 'lucide-react';
import { toast } from 'sonner';
import { getOptimizedImageUrl } from '@/lib/utils';
import { getTagStyle } from '@/lib/tagUtils';
import DashboardLanding from '@/components/DashboardLanding';
import ProjectAssignmentDialog from '@/components/ProjectAssignmentDialog';
import ProjectsWorkspace from '@/components/ProjectsWorkspace';

/**
 * Design: Modern Minimalist - Dashboard Page
 * - Tabbed Interface: Store (Inventory) & My Items (Usage History)
 * - Real-time data fetching from Google Sheets
 * - Category-based grouping
 */

import { SCRIPT_URL } from '@/config';
import { useQuery, useMutation, usePaginatedQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { MachineCard, MachineData } from '@/components/MachineCard';
import { MachineTurnNotification } from '@/components/MachineTurnNotification';

function getEmbedUrl(url: string) {
  if (!url) return '';
  const trimmed = url.trim();
  if (trimmed.includes("youtube.com/watch?v=")) {
    const videoId = trimmed.split("v=")[1].split("&")[0];
    return `https://www.youtube.com/embed/${videoId}`;
  } else if (trimmed.includes("youtu.be/")) {
    const videoId = trimmed.split("youtu.be/")[1].split("?")[0];
    return `https://www.youtube.com/embed/${videoId}`;
  } else if (trimmed.includes("vimeo.com/")) {
    const videoId = trimmed.split("vimeo.com/")[1].split("?")[0];
    return `https://player.vimeo.com/video/${videoId}`;
  } else if (trimmed.includes("drive.google.com/file/d/")) {
    const fileId = trimmed.split("/d/")[1].split("/")[0];
    return `https://drive.google.com/file/d/${fileId}/preview`;
  }
  return trimmed;
}

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
const getDynamicGlow = (str: string) => {
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
  const [communitySearchQuery, setCommunitySearchQuery] = useState('');
  const [selectedCommunityTag, setSelectedCommunityTag] = useState('all');

  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null); // For Checkout
  const [viewItem, setViewItem] = useState<InventoryItem | null>(null); // For Details Modal
  const [returnItem, setReturnItem] = useState<UsageRecord | null>(null); // For Return Modal
  const [returnTarget, setReturnTarget] = useState(''); // Selected Approver
  const [checkoutQuantity, setCheckoutQuantity] = useState('1');
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [newItemNameRequest, setNewItemNameRequest] = useState('');
  const [newItemRemarksRequest, setNewItemRemarksRequest] = useState('');
  const [activeTab, setActiveTab] = useState('store');

  const [laptopStatus, setLaptopStatus] = useState<'Online' | 'Offline'>(user?.laptopStatus || 'Offline');
  const [totalScreenTime, setTotalScreenTime] = useState(user?.totalTime || 0);

  // Machine Logic
  const convexMachines = useQuery(api.machines.getAll);
  const convexDashboardUpdates = useQuery(api.dashboardUpdates.getForAudience, {
    audience: "user",
    userEmail: user?.email || "",
  });
  const projectWorkspace = useQuery(api.projects.getMemberWorkspace, {
    userEmail: user?.email || "",
  });
  const adminSettings = useQuery(api.settings.getAdmin);
  const projectAssignments = useQuery(api.projects.getAssignmentsOverview);
  const attendedLearnings = useQuery(api.learningPlans.getMyAttendedLearnings, {
    userEmail: user?.email || "",
  }) || [];
  const [selectedExperience, setSelectedExperience] = useState<any>(null);
  const [submissionUrlInput, setSubmissionUrlInput] = useState("");
  const submitLearningProof = useMutation(api.learningPlans.submitLearningProof);
  const startMachineMutation = useMutation(api.machines.startSession);
  const endMachineMutation = useMutation(api.machines.endSession);
  const addItemToProjectMut = useMutation(api.projects.addItemToProject);

  // Sync state with user context updates
  useEffect(() => {
    if (user) {
      setLaptopStatus(user.laptopStatus || 'Offline');
      setTotalScreenTime(user.totalTime || 0);
    }
  }, [user]);

  const [showMachineNoteModal, setShowMachineNoteModal] = useState(false);
  const [machineToEnd, setMachineToEnd] = useState<string | null>(null);
  const [fabricationNote, setFabricationNote] = useState('');
  const [projectAssignmentTarget, setProjectAssignmentTarget] = useState<UsageRecord | null>(null);

  const handleStartMachine = async (id: string) => {
    try {
      await startMachineMutation({
        machineId: id,
        userEmail: user?.email || '',
        userName: user?.name || '',
        scriptUrl: SCRIPT_URL
      });
      toast.success('Session started successfully');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to start session');
    }
  };

  const handleEndMachineClick = (id: string) => {
    setMachineToEnd(id);
    setFabricationNote('');
    setShowMachineNoteModal(true);
  };

  const handleConfirmEndMachine = async () => {
    if (!machineToEnd) return;
    if (!fabricationNote.trim()) {
      toast.error('Please share what you have fabricated');
      return;
    }

    try {
      await endMachineMutation({
        machineId: machineToEnd,
        note: fabricationNote.trim(),
        scriptUrl: SCRIPT_URL
      });
      setShowMachineNoteModal(false);
      setMachineToEnd(null);
      toast.success('Session ended successfully');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to end session');
    }
  };



  // 1. Fetch Data on Mount
  useEffect(() => {
    // Data is now fetched reactively via Convex useQuery
  }, [isAuthenticated]);

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
    let result = allUsers.filter(u => {
      const matchesSearch = !communitySearchQuery ||
        u.name?.toLowerCase().includes(communitySearchQuery.toLowerCase()) ||
        u.email?.toLowerCase().includes(communitySearchQuery.toLowerCase());

      const matchesCategory = selectedCommunityTag === 'all' ||
        (u.tags || []).some((t: string) => t === selectedCommunityTag);

      return matchesSearch && matchesCategory;
    });

    // Randomize order on each refresh/memoization
    return result.sort(() => Math.random() - 0.5);
  }, [allUsers, communitySearchQuery, selectedCommunityTag]);

  // Track if we're using the fallback (Sheets) or Convex
  const [inventorySource, setInventorySource] = React.useState<'convex' | 'sheets' | 'loading'>('loading');

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
      setInventorySource('sheets'); // Still set so loading spinner stops
    }
  }, []);

  // 2. Inventory: Convex is primary. Sheets is the error-only fallback.
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
        tags: Array.isArray(doc.tags) ? doc.tags.join(',') : (doc.tags || '')
      }));
      setInventory(items);
      const uniqueCats = Array.from(new Set(items.map((i) => i.category)));
      setCategories(['all', ...uniqueCats as string[]]);
      if (paginatedStatus === 'LoadingMore') {
        setInventorySource('loading');
      } else {
        setInventorySource('convex');
      }
    }
  }, [paginatedInventory, paginatedStatus]);

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

  const handleAddItemToProject = async (projectId: string) => {
    if (!projectAssignmentTarget || !user?.email) return;

    await addItemToProjectMut({
      projectId,
      userEmail: user.email,
      requestId: projectAssignmentTarget.id,
    });

    toast.success('Item added to the project box.');
    setProjectAssignmentTarget(null);
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
  const activeMachineCount = (convexMachines || []).filter((machine) => machine.status === 'ENGAGED').length;
  const approvedCommunityCount = allUsers.filter((member) => member.status === 'APPROVED').length;
  const memberProjects = projectWorkspace?.projects ?? [];
  const viewerHasProjectMembership = memberProjects.some((project) => project.viewerIsMember);
  const showProjectsTab = memberProjects.length > 0 && (!!adminSettings?.allowPublicProjectAccess || viewerHasProjectMembership);
  const hasLandingContent = (convexDashboardUpdates?.length ?? 0) > 0;
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
    const assignmentMap = new Map<string, { projectId: string; projectName: string; projectStatus: string }>();
    (projectAssignments || []).forEach((assignment) => {
      assignmentMap.set(assignment.requestId, {
        projectId: assignment.projectId,
        projectName: assignment.projectName,
        projectStatus: assignment.projectStatus,
      });
    });
    return assignmentMap;
  }, [projectAssignments]);
  const dashboardStats = [
    {
      label: 'Available Items',
      value: inventory.length,
      hint: 'Inventory you can browse and request now.',
    },
    {
      label: 'My Active Items',
      value: myItems.filter((item) => item.returnRequestStatus !== 'RETURN_PENDING').length,
      hint: 'Open checkouts currently assigned to you.',
    },
    {
      label: 'Live Machines',
      value: activeMachineCount,
      hint: 'Equipment engaged in the lab right now.',
    },
    {
      label: 'Community',
      value: approvedCommunityCount,
      hint: 'Approved makers visible in the directory.',
    },
  ];

  useEffect(() => {
    if (hasLandingContent) {
      if (!activeTab) {
        setActiveTab('landing');
      }
      return;
    }

    if (activeTab === 'landing') {
      setActiveTab(showProjectsTab ? 'projects' : 'store');
    }
  }, [activeTab, hasLandingContent, showProjectsTab]);

  useEffect(() => {
    if (!showProjectsTab && activeTab === 'projects') {
      setActiveTab(hasLandingContent ? 'landing' : 'store');
    }
  }, [activeTab, hasLandingContent, showProjectsTab]);

  const dashboardTabCount =
    (hasLandingContent ? 1 : 0) +
    1 +
    1 +
    (showProjectsTab ? 1 : 0) +
    1 +
    1 +
    1; // +1 for Learnings


  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card border-b border-border shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">

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

          {/* Center: 3D Army Badges */}
          <div className="hidden md:flex flex-1 justify-center">
            {user?.tags && user.tags.length > 0 && (
              <div className="flex items-center gap-3">
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
                              '--dynamic-border': dynamic.border,
                              '--dynamic-hover-glow': dynamic.hoverGlow
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
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6 w-full">
          <TabsList className="flex items-center justify-between gap-1.5 w-full p-1.5 bg-slate-100/90 rounded-2xl border border-slate-200/80 overflow-x-auto scrollbar-none h-auto">
            {hasLandingContent && (
              <TabsTrigger
                value="landing"
                className={`flex-1 flex items-center justify-center gap-2 px-3 sm:px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all shrink-0 data-[state=active]:bg-white data-[state=active]:text-emerald-700 data-[state=active]:shadow-sm border border-transparent data-[state=active]:border-slate-200/80 ${
                  activeTab !== 'landing' ? 'shadow-[0_0_18px_rgba(16,185,129,0.28)] ring-1 ring-emerald-200 animate-pulse' : ''
                }`}
              >
                <Sparkles className="w-4 h-4" />
                <span>Landing</span>
              </TabsTrigger>
            )}
            <TabsTrigger
              value="store"
              className="flex-1 flex items-center justify-center gap-2 px-3 sm:px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all shrink-0 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm border border-transparent data-[state=active]:border-slate-200/80 text-slate-600 hover:text-slate-900"
            >
              <Package className="w-4 h-4" />
              <span>Store</span>
            </TabsTrigger>
            <TabsTrigger
              value="my-items"
              className="flex-1 flex items-center justify-center gap-2 px-3 sm:px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all shrink-0 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm border border-transparent data-[state=active]:border-slate-200/80 text-slate-600 hover:text-slate-900"
            >
              <History className="w-4 h-4" />
              <span>My Items</span>
              {myItems.length > 0 && (
                <span className="ml-1.5 bg-slate-200/80 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  {myItems.length}
                </span>
              )}
            </TabsTrigger>
            {showProjectsTab && (
              <TabsTrigger
                value="projects"
                className="flex-1 flex items-center justify-center gap-2 px-3 sm:px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all shrink-0 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm border border-transparent data-[state=active]:border-slate-200/80 text-slate-600 hover:text-slate-900"
              >
                <FolderKanban className="w-4 h-4" />
                <span>Projects</span>
              </TabsTrigger>
            )}
            <TabsTrigger
              value="users"
              className="flex-1 flex items-center justify-center gap-2 px-3 sm:px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all shrink-0 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm border border-transparent data-[state=active]:border-slate-200/80 text-slate-600 hover:text-slate-900"
            >
              <UsersIcon className="w-4 h-4" />
              <span>Community</span>
            </TabsTrigger>
            <TabsTrigger
              value="machines"
              className="flex-1 flex items-center justify-center gap-2 px-3 sm:px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all shrink-0 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm border border-transparent data-[state=active]:border-slate-200/80 text-slate-600 hover:text-slate-900"
            >
              <Zap className="w-4 h-4" />
              <span>Machines</span>
            </TabsTrigger>
            <TabsTrigger
              value="learnings"
              className="flex-1 flex items-center justify-center gap-2 px-3 sm:px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all shrink-0 data-[state=active]:bg-white data-[state=active]:text-emerald-700 data-[state=active]:shadow-sm border border-transparent data-[state=active]:border-slate-200/80 text-slate-600 hover:text-slate-900"
            >
              <GraduationCap className="w-4 h-4 text-emerald-600" />
              <span>Learnings</span>
              {attendedLearnings.length > 0 && (
                <span className="ml-1.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-200">
                  {attendedLearnings.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          {hasLandingContent && (
            <TabsContent value="landing" className="space-y-6">
              <DashboardLanding
                audience="user"
                userName={user?.name}
                title="Welcome back"
                description="Start here for featured announcements, media-rich updates, and a calmer overview before you jump into inventory, community, or machine workflows."
                stats={dashboardStats}
                updates={convexDashboardUpdates || []}
                machines={convexMachines || []}
              />
            </TabsContent>
          )}

          {showProjectsTab && (
            <TabsContent value="projects" className="space-y-6">
              <ProjectsWorkspace workspace={projectWorkspace} userEmail={user?.email} />
            </TabsContent>
          )}

          {/* TAB: LEARNINGS (LEARNING EXPERIENCES) */}
          <TabsContent value="learnings" className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-blue-500/10 p-6 rounded-2xl border border-emerald-500/20">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <GraduationCap className="w-6 h-6 text-emerald-600" />
                  <h2 className="text-2xl font-bold text-slate-900">Learning Experiences</h2>
                </div>
                <p className="text-sm text-slate-600">
                  Your verified record of attended workshops, activity sessions, and deep dives.
                </p>
              </div>
              <div className="bg-white/80 backdrop-blur px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 flex items-center gap-2 shrink-0">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>{attendedLearnings.length} Verified Experience{attendedLearnings.length === 1 ? '' : 's'}</span>
              </div>
            </div>

            {attendedLearnings.length === 0 ? (
              <Card className="p-12 text-center border-dashed border-2 border-slate-200 bg-slate-50/50">
                <GraduationCap className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                <h3 className="text-lg font-bold text-slate-800 mb-1">No Learning Experiences Yet</h3>
                <p className="text-sm text-slate-500 max-w-md mx-auto mb-4">
                  Join published plans in the Learning Hub and attend sessions. Once session leaders complete attendance, your verified Learning Experiences will appear here!
                </p>
                <Link href="/learning">
                  <Button className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-full">
                    Browse Learning Hub
                  </Button>
                </Link>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {attendedLearnings.map((plan: any) => {
                  const validImages = (plan.imageUrls || []).filter((u: string) => typeof u === "string" && u.trim().length > 5);
                  const validVideos = (plan.videoUrls || []).filter((u: string) => typeof u === "string" && u.trim().length > 5);
                  const myRecord = plan.registeredUsers?.find(
                    (u: any) => u.email.toLowerCase() === user?.email?.toLowerCase()
                  );

                  return (
                    <Card
                      key={plan._id}
                      onClick={() => {
                        setSelectedExperience(plan);
                        setSubmissionUrlInput(myRecord?.submissionUrl || "");
                      }}
                      className="overflow-hidden flex flex-col hover:shadow-lg transition-all border-slate-200 cursor-pointer group bg-white"
                    >
                      {validImages.length > 0 ? (
                        <div className="h-44 bg-slate-100 overflow-hidden relative">
                          <img
                            src={getOptimizedImageUrl(validImages[0])}
                            alt={plan.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            referrerPolicy="no-referrer"
                          />
                          <div className="absolute top-3 right-3 bg-emerald-600/90 text-white text-[10px] font-bold px-2.5 py-1 rounded-full backdrop-blur flex items-center gap-1 shadow">
                            <CheckCircle2 className="w-3 h-3 text-white" />
                            Verified Attendance
                          </div>
                          {myRecord?.submissionStatus === "APPROVED" && (
                            <div className="absolute top-3 left-3 bg-amber-400 text-slate-950 text-[10px] font-extrabold px-3 py-1 rounded-full shadow-lg flex items-center gap-1 border border-amber-300">
                              <Star className="w-3.5 h-3.5 fill-slate-950 text-slate-950" />
                              Mastered Experience ⭐
                            </div>
                          )}
                          {myRecord?.submissionStatus === "REJECTED" && (
                            <div className="absolute top-3 left-3 bg-rose-600 text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow flex items-center gap-1">
                              Follow-up Needed ❌
                            </div>
                          )}
                          {myRecord?.submissionStatus === "PENDING" && (
                            <div className="absolute top-3 left-3 bg-amber-500 text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow flex items-center gap-1">
                              Pending Review ⏳
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="h-44 bg-slate-900 overflow-hidden relative flex items-center justify-center">
                          <div className="absolute top-3 right-3 z-10 bg-emerald-600/90 text-white text-[10px] font-bold px-2.5 py-1 rounded-full backdrop-blur flex items-center gap-1 shadow">
                            <CheckCircle2 className="w-3 h-3 text-white" />
                            Verified Attendance
                          </div>
                          {myRecord?.submissionStatus === "APPROVED" && (
                            <div className="absolute top-3 left-3 z-10 bg-amber-400 text-slate-950 text-[10px] font-extrabold px-3 py-1 rounded-full shadow-lg flex items-center gap-1 border border-amber-300">
                              <Star className="w-3.5 h-3.5 fill-slate-950 text-slate-950" />
                              Mastered Experience ⭐
                            </div>
                          )}
                          {myRecord?.submissionStatus === "REJECTED" && (
                            <div className="absolute top-3 left-3 z-10 bg-rose-600 text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow flex items-center gap-1">
                              Follow-up Needed ❌
                            </div>
                          )}
                          {myRecord?.submissionStatus === "PENDING" && (
                            <div className="absolute top-3 left-3 z-10 bg-amber-500 text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow flex items-center gap-1">
                              Pending Review ⏳
                            </div>
                          )}
                          {validVideos.length > 0 ? (
                            <iframe
                              src={getEmbedUrl(validVideos[0])}
                              className="w-full h-full pointer-events-none opacity-80"
                            />
                          ) : (
                            <GraduationCap className="w-12 h-12 text-slate-700" />
                          )}
                        </div>
                      )}

                      <div className="p-5 flex flex-col flex-1">
                        <div className="flex flex-wrap gap-1.5 mb-3">
                          {plan.tags?.slice(0, 3).map((tag: string) => (
                            <span key={tag} className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-bold uppercase tracking-wider rounded-md">
                              {tag}
                            </span>
                          ))}
                        </div>

                        <h3 className="font-bold text-lg text-slate-900 group-hover:text-emerald-600 transition-colors line-clamp-1 mb-2">
                          {plan.title}
                        </h3>

                        {(plan.date || plan.time || plan.location) && (
                          <div className="text-xs text-slate-500 mb-3 font-medium flex flex-wrap gap-x-3 gap-y-1">
                            {plan.date && <span>📅 {plan.date}</span>}
                            {plan.time && <span>⏰ {plan.time}</span>}
                            {plan.location && <span>📍 {plan.location}</span>}
                          </div>
                        )}

                        <p className="text-xs text-slate-600 line-clamp-2 mb-4 flex-1">
                          {plan.description}
                        </p>

                        <div className="mt-auto pt-4 border-t border-slate-100 flex items-center justify-between">
                          <span className="text-xs text-slate-400">Curated by {plan.authorName}</span>
                          <span className="text-xs font-semibold text-emerald-600 flex items-center group-hover:translate-x-1 transition-transform">
                            View Experience →
                          </span>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

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

            {paginatedStatus === 'CanLoadMore' && (
              <div className="text-center pt-6 pb-2">
                <Button
                  variant="outline"
                  onClick={() => loadMoreInventory(20)}
                  className="px-8 border-emerald-200 text-emerald-700 hover:bg-emerald-50 font-semibold"
                >
                  Load More Inventory
                </Button>
              </div>
            )}
            {paginatedStatus === 'LoadingMore' && (
              <div className="text-center py-4 text-emerald-600 animate-pulse font-semibold">Loading more inventory...</div>
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
                            {projectAssignmentByRequestId.get(record.id) && (
                              <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-bold">
                                Project: {projectAssignmentByRequestId.get(record.id)?.projectName}
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
                        <div className="flex w-full flex-col gap-2 sm:w-auto">
                          {!projectAssignmentByRequestId.get(record.id) && activeProjectOptions.length > 0 && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs w-full sm:w-auto border-slate-200 hover:bg-slate-50"
                              onClick={() => setProjectAssignmentTarget(record)}
                            >
                              Add To Project
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs w-full sm:w-auto hover:bg-red-50 hover:text-red-600 hover:border-red-200"
                            onClick={() => setReturnItem(record)}
                          >
                            Return Item
                          </Button>
                        </div>
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

                <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                  {/* Search Bar */}
                  <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search name or email..."
                      className="pl-9 bg-white/50 backdrop-blur border-slate-200 focus:border-emerald-400 focus:ring-emerald-400"
                      value={communitySearchQuery}
                      onChange={(e) => setCommunitySearchQuery(e.target.value)}
                    />
                  </div>

                  {/* Category Dropdown */}
                  <Select value={selectedCommunityTag} onValueChange={setSelectedCommunityTag}>
                    <SelectTrigger className="w-full sm:w-48 bg-white/50 backdrop-blur border-slate-200">
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

              <div className="space-y-10">
                {filteredCommunityUsers.length > 0 ? (
                  <>
                    {/* FAB SECTION (High Skill / FA Cert) */}
                    {filteredCommunityUsers.filter(isFabUser).length > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 items-start pb-8 border-b border-slate-100">
                        {filteredCommunityUsers.filter(isFabUser).map((u) => {
                          const hasPageLink = Boolean(u.myPageLink && u.myPageLink?.trim() !== "");
                          const dynamic = getDynamicGlow(u.email || u._id || u.email || "");

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
                                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center shrink-0 border border-slate-200">
                                  <UsersIcon className="h-5 w-5" style={{ color: hasPageLink ? 'var(--user-icon)' : '#94a3b8' }} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex justify-between items-start">
                                    <div className="flex items-center gap-2 pr-2 min-w-0 font-display">
                                      <p className="font-bold text-sm truncate" style={{ color: hasPageLink ? 'var(--user-text)' : 'inherit' }}>{u.name}</p>
                                      {(u.role === 'ADMIN' || u.role === 'TEAM') && (
                                        <SaluteIcon className="shrink-0 w-3.5 h-3.5" style={{ color: hasPageLink ? 'var(--user-icon)' : '#059669' }} />
                                      )}
                                    </div>
                                    {/* Circular FAB Tag */}
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
                                  <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wide mt-0.5">{u.role === 'ADMIN' || u.role === 'TEAM' ? 'Faculty / Team' : 'Student'}</p>

                                  {/* Badges - One Horizontal Line */}
                                  {u.tags && u.tags.length > 0 && (
                                    <div className="flex flex-nowrap gap-1.5 mt-3 overflow-x-auto pb-1 scrollbar-hide">
                                      {sortUserTags(u.tags).map((tag: string, idx: number) => {
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

                    {/* STANDARD SECTION */}
                    {filteredCommunityUsers.filter(u => !isFabUser(u)).length > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 items-start">
                        {filteredCommunityUsers.filter(u => !isFabUser(u)).map((u) => {
                          const hasPageLink = Boolean(u.myPageLink && u.myPageLink?.trim() !== "");
                          const dynamic = getDynamicGlow(u.email || u._id || u.email || "");

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
                                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center shrink-0 border border-slate-200">
                                  <UsersIcon className="h-5 w-5" style={{ color: hasPageLink ? 'var(--user-icon)' : '#94a3b8' }} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex justify-between items-start">
                                    <div className="flex items-center gap-2 pr-2 min-w-0 font-display">
                                      <p className="font-bold text-sm truncate" style={{ color: hasPageLink ? 'var(--user-text)' : 'inherit' }}>{u.name}</p>
                                      {(u.role === 'ADMIN' || u.role === 'TEAM') && (
                                        <SaluteIcon className="shrink-0 w-3.5 h-3.5" style={{ color: hasPageLink ? 'var(--user-icon)' : '#059669' }} />
                                      )}
                                    </div>
                                  </div>
                                  <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wide mt-0.5">{u.role === 'ADMIN' || u.role === 'TEAM' ? 'Faculty / Team' : 'Student'}</p>

                                  {/* Badges - One Horizontal Line */}
                                  {u.tags && u.tags.length > 0 && (
                                    <div className="flex flex-nowrap gap-1.5 mt-3 overflow-x-auto pb-1 scrollbar-hide">
                                      {sortUserTags(u.tags).map((tag: string, idx: number) => {
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
                  </>
                ) : (
                  <div className="text-center py-20 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                    <UsersIcon className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-slate-900">No users found</h3>
                    <p className="text-slate-500">Try adjusting your search or category filters.</p>
                    <Button
                      variant="link"
                      className="mt-2 text-emerald-600"
                      onClick={() => { setCommunitySearchQuery(''); setSelectedCommunityTag('all'); }}
                    >
                      Clear all filters
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          </TabsContent>

          {/* TAB 4: MACHINES */}
          <TabsContent value="machines" className="space-y-6">
            <div className="mb-6">
              <h2 className="text-2xl font-black font-display text-slate-900 border-b-2 border-emerald-500 pb-1 w-fit mb-2">MACHINE STATUS</h2>
              <p className="text-muted-foreground text-sm max-w-2xl">
                Monitor machine availability and start your session manually. Please ensure you have been trained to use the machines safely.
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
                  <p className="text-slate-400 font-medium">No machines are currently registered</p>
                </div>
              )}
            </div>
          </TabsContent>

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

          <ProjectAssignmentDialog
            open={!!projectAssignmentTarget}
            onOpenChange={(open) => {
              if (!open) setProjectAssignmentTarget(null);
            }}
            itemName={projectAssignmentTarget?.itemName || ''}
            projects={activeProjectOptions}
            onAssign={handleAddItemToProject}
          />

          <MachineTurnNotification scriptUrl={SCRIPT_URL} />

          {/* Learning Experience Details Modal */}
          <Dialog open={!!selectedExperience} onOpenChange={(open) => !open && setSelectedExperience(null)}>
            <DialogContent className="max-w-4xl lg:max-w-5xl max-h-[92vh] overflow-y-auto p-6 md:p-8">
              <DialogHeader>
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-3 py-1 bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-bold uppercase tracking-wider rounded-full flex items-center gap-1.5 shadow-sm">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    Verified Attendance
                  </span>
                  {selectedExperience?.status === "COMPLETED" && (
                    <span className="px-3 py-1 bg-purple-100 text-purple-800 border border-purple-300 text-xs font-bold uppercase tracking-wider rounded-full flex items-center gap-1.5 shadow-sm">
                      Completed Session
                    </span>
                  )}
                </div>
                <DialogTitle className="text-2xl font-bold text-slate-900 pt-1">{selectedExperience?.title}</DialogTitle>
              </DialogHeader>

              {selectedExperience && (
                <div className="space-y-6 py-2">
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-2">
                    <div className="flex flex-wrap gap-4 text-xs font-medium text-slate-700">
                      {selectedExperience.date && <span>📅 <strong>Date:</strong> {selectedExperience.date}</span>}
                      {selectedExperience.time && <span>⏰ <strong>Time:</strong> {selectedExperience.time}</span>}
                      {selectedExperience.location && <span>📍 <strong>Location:</strong> {selectedExperience.location}</span>}
                    </div>
                    <p className="text-xs text-slate-500">
                      Session Leader / Curator: <strong className="text-slate-800">{selectedExperience.authorName}</strong> ({selectedExperience.authorEmail})
                    </p>
                  </div>

                  {selectedExperience.tags && selectedExperience.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {selectedExperience.tags.map((tag: string) => (
                        <span key={tag} className="px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold uppercase tracking-wider rounded-full">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Student Proof Submission & Review Status Box */}
                  {(() => {
                    const myRecord = selectedExperience.registeredUsers?.find(
                      (u: any) => u.email.toLowerCase() === user?.email?.toLowerCase()
                    );

                    if (!myRecord) return null;

                    const isApproved = myRecord.submissionStatus === "APPROVED";
                    const isRejected = myRecord.submissionStatus === "REJECTED";
                    const isPending = myRecord.submissionStatus === "PENDING";

                    return (
                      <div className="p-4 rounded-xl border space-y-3 bg-gradient-to-br from-slate-50 to-white shadow-sm border-slate-200">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <h4 className="font-semibold text-slate-900 text-sm flex items-center gap-2">
                            <GraduationCap className="w-4 h-4 text-emerald-600" />
                            My Project / Completion Proof Submission
                          </h4>
                          {isApproved && (
                            <span className="text-xs font-extrabold px-3 py-1 rounded-full bg-amber-400 text-slate-950 border border-amber-300 flex items-center gap-1 shadow">
                              <Star className="w-3.5 h-3.5 fill-slate-950 text-slate-950" />
                              Mastered Experience ⭐
                            </span>
                          )}
                          {isRejected && (
                            <span className="text-xs font-bold px-3 py-1 rounded-full bg-rose-100 text-rose-800 border border-rose-300 flex items-center gap-1">
                              Follow-up Needed ❌
                            </span>
                          )}
                          {isPending && (
                            <span className="text-xs font-bold px-3 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1">
                              Pending Review ⏳
                            </span>
                          )}
                        </div>

                        {isApproved && (
                          <div className="text-xs space-y-1.5 bg-emerald-50/80 p-3 rounded-lg border border-emerald-200 text-emerald-900">
                            <p className="font-semibold">Your completion proof has been reviewed & approved by the session leader!</p>
                            {myRecord.submissionUrl && (
                              <p className="flex items-center gap-1">
                                <span>Submitted Link:</span>
                                <a href={myRecord.submissionUrl} target="_blank" rel="noopener noreferrer" className="text-emerald-700 font-bold underline truncate max-w-sm">
                                  {myRecord.submissionUrl}
                                </a>
                              </p>
                            )}
                          </div>
                        )}

                        {isRejected && (
                          <div className="text-xs space-y-2 bg-rose-50/80 p-3 rounded-lg border border-rose-200 text-rose-900">
                            <p className="font-bold text-rose-800 flex items-center gap-1">
                              ⚠️ Follow-up Requested by Publisher
                            </p>
                            {myRecord.feedbackNote && (
                              <p className="italic bg-white/90 p-2.5 rounded-md border border-rose-200 text-rose-800 font-medium">
                                Note from curator: "{myRecord.feedbackNote}"
                              </p>
                            )}
                            <p className="text-slate-600">Please review the notes above and submit a new project link below:</p>
                          </div>
                        )}

                        {isPending && (
                          <div className="text-xs space-y-1.5 bg-amber-50/80 p-3 rounded-lg border border-amber-200 text-amber-900">
                            <p className="font-semibold">Your submission is currently under review by the session publisher & collaborators.</p>
                            {myRecord.submissionUrl && (
                              <p className="flex items-center gap-1">
                                <span>Submitted Link:</span>
                                <a href={myRecord.submissionUrl} target="_blank" rel="noopener noreferrer" className="text-amber-800 font-bold underline truncate max-w-sm">
                                  {myRecord.submissionUrl}
                                </a>
                              </p>
                            )}
                          </div>
                        )}

                        {(!isApproved || isRejected) && (
                          <div className="space-y-2 pt-1">
                            <label className="text-xs font-medium text-slate-700 block">
                              {myRecord.submissionUrl ? "Update / Resubmit Completion Link:" : "Paste link to project / proof of completion (GitHub, Drive, Docs, etc.):"}
                            </label>
                            <div className="flex gap-2">
                              <Input
                                type="url"
                                placeholder="https://github.com/..."
                                value={submissionUrlInput}
                                onChange={(e) => setSubmissionUrlInput(e.target.value)}
                                className="text-xs h-9 flex-1"
                              />
                              <Button
                                size="sm"
                                onClick={async () => {
                                  if (!submissionUrlInput.trim()) {
                                    toast.error("Please enter a valid link");
                                    return;
                                  }
                                  try {
                                    const res = await submitLearningProof({
                                      planId: selectedExperience._id,
                                      userEmail: user?.email || "",
                                      submissionUrl: submissionUrlInput
                                    });
                                    toast.success(res.message);
                                    setSubmissionUrlInput("");
                                    setSelectedExperience((prev: any) => ({
                                      ...prev,
                                      registeredUsers: prev.registeredUsers.map((usr: any) =>
                                        usr.email.toLowerCase() === user?.email?.toLowerCase()
                                          ? { ...usr, submissionUrl: submissionUrlInput, submissionStatus: "PENDING" }
                                          : usr
                                      )
                                    }));
                                  } catch (e: any) {
                                    toast.error(e.message || "Failed to submit link");
                                  }
                                }}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs h-9 rounded-lg shrink-0 px-4"
                              >
                                {myRecord.submissionUrl ? "Resubmit Link" : "Submit for Review"}
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  <div>
                    <h4 className="font-semibold text-slate-900 mb-2 text-sm">Learning Summary & Shared Notes</h4>
                    <div className="bg-white p-4 rounded-xl border border-slate-200 text-slate-700 text-sm leading-relaxed whitespace-pre-wrap">
                      {selectedExperience.description}
                    </div>
                  </div>

                  {selectedExperience.imageUrls && selectedExperience.imageUrls.filter((u: string) => typeof u === "string" && u.trim().length > 5).length > 0 && (
                    <div>
                      <h4 className="font-semibold text-slate-900 mb-2 text-sm">Session Gallery & Visuals</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {selectedExperience.imageUrls.filter((u: string) => typeof u === "string" && u.trim().length > 5).map((url: string, idx: number) => (
                          <div key={idx} className="rounded-xl overflow-hidden border border-slate-200 bg-slate-100 aspect-video flex items-center justify-center">
                            <img
                              src={getOptimizedImageUrl(url)}
                              alt=""
                              className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                              referrerPolicy="no-referrer"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedExperience.videoUrls && selectedExperience.videoUrls.filter((u: string) => typeof u === "string" && u.trim().length > 5).length > 0 && (
                    <div>
                      <h4 className="font-semibold text-slate-900 mb-2 text-sm">Video Presentation / Session Recording</h4>
                      <div className="space-y-3">
                        {selectedExperience.videoUrls.filter((u: string) => typeof u === "string" && u.trim().length > 5).map((url: string, idx: number) => (
                          <div key={idx} className="bg-slate-900 rounded-xl overflow-hidden aspect-video border border-slate-200 shadow-md relative">
                            <iframe
                              src={getEmbedUrl(url)}
                              className="w-full h-full"
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              allowFullScreen
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedExperience.documentationUrl && (
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-xs text-slate-500 font-medium">Session Documentation & Resources</span>
                      <a
                        href={selectedExperience.documentationUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-full shadow transition-all hover:scale-105"
                      >
                        Open External Docs <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  )}
                </div>
              )}
            </DialogContent>
          </Dialog>
        </Tabs>
      </main >
    </div >
  );
}
