import React, { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  CheckCircle2,
  Circle,
  Plus,
  Search,
  Filter,
  Trash2,
  Sparkles,
  Layers,
  User,
  Clock,
  Check,
  Tag,
  Laptop,
  Cpu,
  Telescope,
  Compass,
} from 'lucide-react';
import { toast } from 'sonner';

interface ActionItemsPoolModalProps {
  isOpen: boolean;
  onClose: () => void;
  userEmail: string;
}

export default function ActionItemsPoolModal({
  isOpen,
  onClose,
  userEmail,
}: ActionItemsPoolModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'OPEN' | 'RESOLVED'>('OPEN');
  const [departmentFilter, setDepartmentFilter] = useState<string>('ALL');
  const [isAddingNew, setIsAddingNew] = useState(false);

  // New action item form state
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newAssignee, setNewAssignee] = useState('');
  const [newDepartment, setNewDepartment] = useState('Technology');

  const actionItems = useQuery(api.forums.getAllActionItems, {}) || [];
  const createActionItemMut = useMutation(api.forums.createActionItem);
  const toggleResolvedMut = useMutation(api.forums.toggleActionItemResolved);
  const deleteActionItemMut = useMutation(api.forums.deleteActionItem);

  const handleToggle = async (itemId: string, currentStatus: boolean) => {
    try {
      await toggleResolvedMut({
        itemId,
        isResolved: !currentStatus,
      });
      toast.success(!currentStatus ? 'Action item marked as resolved!' : 'Action item reopened in pool');
    } catch (err: any) {
      toast.error(err.message || 'Failed to update action item');
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      toast.error('Please enter an action item title');
      return;
    }

    try {
      await createActionItemMut({
        title: newTitle.trim(),
        description: newDescription.trim(),
        assignee: newAssignee.trim(),
        department: newDepartment,
        userEmail,
      });

      toast.success('Action item added to the pool!');
      setNewTitle('');
      setNewDescription('');
      setNewAssignee('');
      setIsAddingNew(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to create action item');
    }
  };

  const handleDelete = async (itemId: string) => {
    try {
      await deleteActionItemMut({ itemId });
      toast.success('Action item removed');
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete action item');
    }
  };

  const getDepartmentBadge = (dept?: string) => {
    switch (dept) {
      case 'Technology':
        return {
          bg: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20',
          icon: <Cpu className="w-3 h-3" />,
        };
      case 'FabLab':
        return {
          bg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
          icon: <Compass className="w-3 h-3" />,
        };
      case 'Astronomy':
        return {
          bg: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20',
          icon: <Telescope className="w-3 h-3" />,
        };
      default:
        return {
          bg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
          icon: <Sparkles className="w-3 h-3" />,
        };
    }
  };

  const filteredItems = actionItems.filter((item: any) => {
    if (statusFilter === 'OPEN' && item.isResolved) return false;
    if (statusFilter === 'RESOLVED' && !item.isResolved) return false;
    if (departmentFilter !== 'ALL' && item.department !== departmentFilter) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const inTitle = item.title?.toLowerCase().includes(q);
      const inDesc = item.description?.toLowerCase().includes(q);
      const inAssignee = item.assignee?.toLowerCase().includes(q);
      const inDept = item.department?.toLowerCase().includes(q);
      return inTitle || inDesc || inAssignee || inDept;
    }

    return true;
  });

  const openCount = actionItems.filter((i: any) => !i.isResolved).length;
  const resolvedCount = actionItems.filter((i: any) => i.isResolved).length;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-0 overflow-hidden bg-background border border-border shadow-2xl rounded-2xl">
        {/* Header */}
        <DialogHeader className="p-6 pb-4 border-b border-border bg-gradient-to-r from-cyan-500/10 via-emerald-500/10 to-indigo-500/10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pr-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="p-1 rounded-md bg-emerald-600/10 text-emerald-600">
                  <CheckCircle2 className="w-5 h-5" />
                </span>
                <DialogTitle className="text-xl font-bold">
                  Forum Follow-Up & Action Items Pool
                </DialogTitle>
              </div>
              <p className="text-xs text-muted-foreground">
                Unresolved items remain open and can be carried over when scheduling future forum editions.
              </p>
            </div>

            <Button
              onClick={() => setIsAddingNew(!isAddingNew)}
              size="sm"
              className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow"
            >
              <Plus className="w-4 h-4" />
              {isAddingNew ? 'Close Form' : 'New Action Item'}
            </Button>
          </div>
        </DialogHeader>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Add New Form */}
          {isAddingNew && (
            <form
              onSubmit={handleCreate}
              className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-950/20 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200"
            >
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  Add Follow-Up Item / Open Question
                </h4>
              </div>

              <div className="space-y-3">
                <Input
                  placeholder="Action item title or question to address (e.g. Build prototype 3D telescope mount)..."
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="bg-background"
                  required
                />

                <Textarea
                  placeholder="Additional context, notes, or next steps (optional)..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  rows={2}
                  className="bg-background text-xs"
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground font-medium mb-1 block">
                      Department / Domain
                    </label>
                    <select
                      value={newDepartment}
                      onChange={(e) => setNewDepartment(e.target.value)}
                      className="w-full h-9 px-3 rounded-md border border-input bg-background text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value="Technology">Technology 💻</option>
                      <option value="FabLab">FabLab 🛠️</option>
                      <option value="Astronomy">Astronomy 🔭</option>
                      <option value="General">Cross-Discipline / General 🌐</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs text-muted-foreground font-medium mb-1 block">
                      Assignee / Lead Student (Optional)
                    </label>
                    <Input
                      placeholder="Student name or email"
                      value={newAssignee}
                      onChange={(e) => setNewAssignee(e.target.value)}
                      className="bg-background h-9 text-xs"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsAddingNew(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    Save Action Item
                  </Button>
                </div>
              </div>
            </form>
          )}

          {/* Controls: Filter & Search Bar */}
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                placeholder="Search action items, assignees, keywords..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-xs bg-muted/40"
              />
            </div>

            <div className="flex items-center gap-2">
              {/* Status Filter Buttons */}
              <div className="inline-flex rounded-lg border border-border p-0.5 bg-muted/40 text-xs">
                <button
                  type="button"
                  onClick={() => setStatusFilter('OPEN')}
                  className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                    statusFilter === 'OPEN'
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Open ({openCount})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('RESOLVED')}
                  className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                    statusFilter === 'RESOLVED'
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Resolved ({resolvedCount})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('ALL')}
                  className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                    statusFilter === 'ALL'
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  All ({actionItems.length})
                </button>
              </div>

              {/* Department Select */}
              <select
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                className="h-9 px-2.5 rounded-lg border border-border bg-background text-xs text-foreground focus:outline-none"
              >
                <option value="ALL">All Disciplines</option>
                <option value="Technology">Technology</option>
                <option value="FabLab">FabLab</option>
                <option value="Astronomy">Astronomy</option>
                <option value="General">General</option>
              </select>
            </div>
          </div>

          {/* Action Items List */}
          <div className="space-y-2.5">
            {filteredItems.length === 0 ? (
              <div className="py-12 text-center border-2 border-dashed border-border rounded-xl">
                <CheckCircle2 className="w-10 h-10 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-sm font-medium text-muted-foreground">
                  {statusFilter === 'OPEN'
                    ? 'No open action items in the pool!'
                    : 'No action items found matching your filters.'}
                </p>
                <p className="text-xs text-muted-foreground/70 mt-1">
                  Add new items or schedule a forum to generate collaborative takeaways.
                </p>
              </div>
            ) : (
              filteredItems.map((item: any) => {
                const badge = getDepartmentBadge(item.department);
                return (
                  <div
                    key={item.itemId}
                    className={`group flex items-start justify-between gap-3 p-3.5 rounded-xl border transition-all ${
                      item.isResolved
                        ? 'bg-muted/30 border-border/60 opacity-80'
                        : 'bg-card border-border hover:border-emerald-500/40 hover:shadow-sm'
                    }`}
                  >
                    <div className="flex items-start gap-3 flex-1">
                      {/* Checkbox */}
                      <button
                        type="button"
                        onClick={() => handleToggle(item.itemId, item.isResolved)}
                        className={`mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${
                          item.isResolved
                            ? 'bg-emerald-600 border-emerald-600 text-white'
                            : 'border-muted-foreground/40 hover:border-emerald-500 bg-background'
                        }`}
                        title={item.isResolved ? 'Click to re-open' : 'Click to mark resolved'}
                      >
                        {item.isResolved && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </button>

                      {/* Content */}
                      <div className="space-y-1 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`text-sm font-medium leading-snug ${
                              item.isResolved
                                ? 'line-through text-muted-foreground'
                                : 'text-foreground'
                            }`}
                          >
                            {item.title}
                          </span>

                          {/* Department Badge */}
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${badge.bg}`}
                          >
                            {badge.icon}
                            {item.department || 'General'}
                          </span>

                          {/* Edition source badge */}
                          {item.forumEdition && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-muted text-muted-foreground">
                              Edition #{item.forumEdition}
                            </span>
                          )}
                        </div>

                        {item.description && (
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            {item.description}
                          </p>
                        )}

                        <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground pt-0.5">
                          {item.assignee && (
                            <span className="flex items-center gap-1 text-foreground/80">
                              <User className="w-3 h-3 text-muted-foreground" />
                              Lead: {item.assignee}
                            </span>
                          )}
                          {item.isResolved && item.resolvedAt && (
                            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                              <CheckCircle2 className="w-3 h-3" />
                              Resolved {new Date(item.resolvedAt).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Delete button */}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(item.itemId)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      title="Delete action item"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
