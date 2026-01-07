import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Plus, LogOut, Shield } from 'lucide-react';
import { toast } from 'sonner';

/**
 * Design: Modern Minimalist - Dashboard Page
 * - Sidebar navigation with role-based access
 * - Card-based inventory display with images
 * - Search and filter functionality
 * - Checkout/Return workflows
 * - Warm sage green accents
 */

interface InventoryItem {
  id: string;
  name: string;
  quantity: number;
  category: string;
  company: string;
  imageUrl: string;
  remarks?: string;
  links?: string;
}

interface CheckoutRecord {
  itemId: string;
  quantity: number;
  timestamp: string;
}

export default function Dashboard() {
  const { user, isAuthenticated, logout } = useAuth();
  const [, navigate] = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [checkoutRecords, setCheckoutRecords] = useState<CheckoutRecord[]>([]);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [checkoutQuantity, setCheckoutQuantity] = useState('1');

  // Mock inventory data
  const mockInventory: InventoryItem[] = [
    {
      id: '1',
      name: 'Laptop',
      quantity: 5,
      category: 'Electronics',
      company: 'Dell',
      imageUrl: '/images/inventory-card-bg.jpg',
      remarks: 'Business grade laptops',
    },
    {
      id: '2',
      name: 'Office Chair',
      quantity: 12,
      category: 'Furniture',
      company: 'Herman Miller',
      imageUrl: '/images/inventory-card-bg.jpg',
      remarks: 'Ergonomic chairs',
    },
    {
      id: '3',
      name: 'Monitor',
      quantity: 8,
      category: 'Electronics',
      company: 'LG',
      imageUrl: '/images/inventory-card-bg.jpg',
    },
  ];

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="card-soft p-8 max-w-md text-center">
          <h2 className="text-xl font-semibold mb-4 text-foreground">Access Denied</h2>
          <p className="text-muted-foreground mb-6">
            {user?.status === 'PENDING'
              ? 'Your account is pending admin approval.'
              : 'You do not have permission to access this page.'}
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

  const categories = ['all', ...Array.from(new Set(mockInventory.map((item) => item.category)))];
  const filteredItems = mockInventory.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  }).sort((a, b) => a.name.localeCompare(b.name));

  const handleCheckout = () => {
    if (!selectedItem || !checkoutQuantity) {
      toast.error('Please select quantity');
      return;
    }

    const qty = parseInt(checkoutQuantity);
    if (qty > selectedItem.quantity) {
      toast.error('Insufficient quantity available');
      return;
    }

    const record: CheckoutRecord = {
      itemId: selectedItem.id,
      quantity: qty,
      timestamp: new Date().toISOString(),
    };

    setCheckoutRecords([...checkoutRecords, record]);
    toast.success(`Checked out ${qty} ${selectedItem.name}(s)`);
    setIsCheckoutOpen(false);
    setCheckoutQuantity('1');
    setSelectedItem(null);
  };

  const handleRequestItem = () => {
    toast.success('Item request submitted for admin review');
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
              <h1 className="text-lg font-display font-bold text-foreground">Inventory Manager</h1>
              <p className="text-xs text-muted-foreground">User Dashboard</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-foreground">{user?.name}</p>
              <p className="text-xs text-muted-foreground">{user?.email}</p>
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
        {/* Search and Filter Section */}
        <div className="mb-8 space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search inventory items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                {Array.isArray(categories) && categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat === 'all' ? 'All Categories' : cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Dialog open={isCheckoutOpen} onOpenChange={setIsCheckoutOpen}>
              <DialogTrigger asChild>
                <Button className="bg-emerald-600 hover:bg-emerald-700 text-white">
                  <Plus className="w-4 h-4 mr-2" />
                  Request New Item
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Request New Item</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <Input placeholder="Item name" />
                  <Input placeholder="Remarks (optional)" />
                  <Button onClick={handleRequestItem} className="w-full bg-emerald-600 hover:bg-emerald-700">
                    Submit Request
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Inventory Items Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map((item) => (
            <Card key={item.id} className="card-soft overflow-hidden hover:shadow-md transition-smooth group">
              {/* Item Image */}
              <div className="relative h-48 bg-gradient-to-br from-emerald-50 to-amber-50 overflow-hidden">
                <img
                  src={item.imageUrl}
                  alt={item.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-smooth"
                />
                <div className="absolute top-3 right-3 bg-emerald-600 text-white px-3 py-1 rounded-full text-xs font-medium">
                  {item.quantity} in stock
                </div>
              </div>

              {/* Item Details */}
              <div className="p-4 space-y-3">
                <div>
                  <h3 className="font-semibold text-foreground text-lg">{item.name}</h3>
                  <p className="text-sm text-muted-foreground">{item.company}</p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="inline-block px-2 py-1 bg-emerald-100 text-emerald-700 text-xs font-medium rounded">
                    {item.category}
                  </span>
                </div>

                {item.remarks && (
                  <p className="text-sm text-muted-foreground italic">{item.remarks}</p>
                )}

                {/* Checkout Button */}
                <Dialog>
                  <DialogTrigger asChild>
                    <Button
                      onClick={() => setSelectedItem(item)}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      Checkout Item
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Checkout: {item.name}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium">Quantity</label>
                        <Input
                          type="number"
                          min="1"
                          max={item.quantity}
                          value={checkoutQuantity}
                          onChange={(e) => setCheckoutQuantity(e.target.value)}
                        />
                      </div>
                      <Button
                        onClick={handleCheckout}
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                      >
                        Confirm Checkout
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </Card>
          ))}
        </div>

        {/* Empty State */}
        {filteredItems.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-full bg-muted mx-auto mb-4 flex items-center justify-center">
              <Search className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">No items found</h3>
            <p className="text-muted-foreground">Try adjusting your search or filter criteria</p>
          </div>
        )}
      </main>
    </div>
  );
}
