import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Calendar,
  Clock,
  MapPin,
  Sparkles,
  Users,
  CheckSquare,
  Square,
  Plus,
  Crown,
  FileEdit,
  Timer,
  HelpCircle,
  Cpu,
  Compass,
  Telescope,
  X,
  CheckCircle2,
} from 'lucide-react';
import { toast } from 'sonner';

interface ScheduleForumModalProps {
  isOpen: boolean;
  onClose: () => void;
  userEmail: string;
}

export default function ScheduleForumModal({
  isOpen,
  onClose,
  userEmail,
}: ScheduleForumModalProps) {
  // Query next edition number and unresolved action items
  const nextEdition = useQuery(api.forums.getNextEditionNumber) ?? 1;
  const unresolvedActionItems = useQuery(api.forums.getUnresolvedActionItems) ?? [];
  const registeredUsers = useQuery(api.users.getAll) ?? [];

  const scheduleForumMut = useMutation(api.forums.scheduleForum);
  const createActionItemMut = useMutation(api.forums.createActionItem);

  // Form State
  const [title, setTitle] = useState('');
  const [edition, setEdition] = useState<number>(1);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('14:30');
  const [location, setLocation] = useState('FabLab Main Collaborative Hub');
  const [agenda, setAgenda] = useState('');
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>([
    'Technology',
    'FabLab',
    'Astronomy',
  ]);

  // Student Roles
  const [chairperson, setChairperson] = useState({ name: '', email: '', department: 'Technology' });
  const [noteTaker, setNoteTaker] = useState({ name: '', email: '', department: 'FabLab' });
  const [timeKeeper, setTimeKeeper] = useState({ name: '', email: '', department: 'Astronomy' });
  const [questionMaster, setQuestionMaster] = useState({ name: '', email: '', department: 'Technology' });

  // Carry-over Action Items selection
  const [selectedActionItemIds, setSelectedActionItemIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Inline action item creation
  const [isAddingQuickItem, setIsAddingQuickItem] = useState(false);
  const [quickItemTitle, setQuickItemTitle] = useState('');
  const [quickItemDept, setQuickItemDept] = useState('Technology');

  // Initialize edition and default date on open
  useEffect(() => {
    if (isOpen) {
      setEdition(nextEdition);
      // Default to today or tomorrow
      const today = new Date().toISOString().slice(0, 10);
      setDate(today);
      setTitle(`Multi-Disciplinary Forum (Edition #${nextEdition})`);
    }
  }, [isOpen, nextEdition]);

  const toggleDepartment = (dept: string) => {
    if (selectedDepartments.includes(dept)) {
      if (selectedDepartments.length > 1) {
        setSelectedDepartments(selectedDepartments.filter((d) => d !== dept));
      }
    } else {
      setSelectedDepartments([...selectedDepartments, dept]);
    }
  };

  const toggleActionItemSelection = (itemId: string) => {
    if (selectedActionItemIds.includes(itemId)) {
      setSelectedActionItemIds(selectedActionItemIds.filter((id) => id !== itemId));
    } else {
      setSelectedActionItemIds([...selectedActionItemIds, itemId]);
    }
  };

  const handleCreateQuickItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickItemTitle.trim()) return;

    try {
      const res = await createActionItemMut({
        title: quickItemTitle.trim(),
        department: quickItemDept,
        userEmail,
      });

      if (res.itemId) {
        setSelectedActionItemIds((prev) => [...prev, res.itemId]);
      }
      toast.success('Action item added and selected for carry-over!');
      setQuickItemTitle('');
      setIsAddingQuickItem(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to add item');
    }
  };

  // Helper for student role auto-select
  const handleSelectUserForRole = (
    roleSetter: (val: { name: string; email: string; department: string }) => void,
    selectedEmail: string,
    currentDept: string,
  ) => {
    if (!selectedEmail) {
      roleSetter({ name: '', email: '', department: currentDept });
      return;
    }
    const found = registeredUsers.find((u: any) => u.email === selectedEmail);
    if (found) {
      let dept = currentDept;
      if (found.tags && Array.isArray(found.tags)) {
        if (found.tags.some((t: string) => t.toLowerCase().includes('astro'))) dept = 'Astronomy';
        else if (found.tags.some((t: string) => t.toLowerCase().includes('fab') || t.toLowerCase().includes('3d'))) dept = 'FabLab';
        else if (found.tags.some((t: string) => t.toLowerCase().includes('tech') || t.toLowerCase().includes('electr'))) dept = 'Technology';
      }
      roleSetter({ name: found.name, email: found.email, department: dept });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error('Please enter a forum title');
      return;
    }
    if (!date) {
      toast.error('Please select an event date');
      return;
    }
    if (!chairperson.name.trim()) {
      toast.error('Please assign a Chairperson (moderator)');
      return;
    }

    setIsSubmitting(true);
    try {
      await scheduleForumMut({
        title: title.trim(),
        edition: Number(edition) || 1,
        editionLabel: `Edition #${edition}`,
        date,
        time,
        location: location.trim(),
        agenda: agenda.trim(),
        departments: selectedDepartments,
        roles: {
          chairperson: {
            name: chairperson.name.trim(),
            email: chairperson.email?.trim() || undefined,
            department: chairperson.department,
          },
          noteTaker: {
            name: noteTaker.name.trim() || 'TBD',
            email: noteTaker.email?.trim() || undefined,
            department: noteTaker.department,
          },
          timeKeeper: {
            name: timeKeeper.name.trim() || 'TBD',
            email: timeKeeper.email?.trim() || undefined,
            department: timeKeeper.department,
          },
          questionMaster: {
            name: questionMaster.name.trim() || 'TBD',
            email: questionMaster.email?.trim() || undefined,
            department: questionMaster.department,
          },
        },
        carriedOverActionItemIds: selectedActionItemIds,
        userEmail,
      });

      toast.success(`Forum Edition #${edition} scheduled successfully!`);
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Failed to schedule forum');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[92vh] flex flex-col p-0 overflow-hidden bg-background border border-border shadow-2xl rounded-2xl">
        {/* Header */}
        <DialogHeader className="p-6 pb-4 border-b border-border bg-gradient-to-r from-emerald-500/10 via-cyan-500/10 to-indigo-500/10">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-600 text-white shadow-md">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold">
                Schedule New Collaborative Forum
              </DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Connecting students from Technology, FabLab, and Astronomy for interactive presentations & Q&A.
              </p>
            </div>
          </div>
        </DialogHeader>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Section 1: Title, Edition & Basic Details */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              <Calendar className="w-4 h-4" />
              1. Forum Session Overview
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-3 space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Forum Title <span className="text-red-500">*</span>
                </label>
                <Input
                  placeholder="e.g. Cross-Disciplinary IoT & Optical Fabrication"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="bg-card font-medium"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Edition Number <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">
                    #
                  </span>
                  <Input
                    type="number"
                    min="1"
                    value={edition}
                    onChange={(e) => setEdition(parseInt(e.target.value) || 1)}
                    className="pl-7 bg-card font-bold"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Date, Time, Location */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                  Event Date <span className="text-red-500">*</span>
                </label>
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="bg-card text-xs"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                  Time
                </label>
                <Input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="bg-card text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                  Location / Hall
                </label>
                <Input
                  placeholder="Seminar Hall or Room"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="bg-card text-xs"
                />
              </div>
            </div>

            {/* Participating Disciplines */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground block">
                Disciplines Involved
              </label>
              <div className="flex flex-wrap gap-2.5">
                {[
                  { key: 'Technology', label: 'Technology', icon: <Cpu className="w-3.5 h-3.5" />, color: 'cyan' },
                  { key: 'FabLab', label: 'FabLab & Making', icon: <Compass className="w-3.5 h-3.5" />, color: 'amber' },
                  { key: 'Astronomy', label: 'Astronomy & Optics', icon: <Telescope className="w-3.5 h-3.5" />, color: 'indigo' },
                ].map((dept) => {
                  const isSelected = selectedDepartments.includes(dept.key);
                  return (
                    <button
                      type="button"
                      key={dept.key}
                      onClick={() => toggleDepartment(dept.key)}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
                        isSelected
                          ? 'bg-emerald-600/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/40 shadow-sm'
                          : 'bg-muted/40 text-muted-foreground border-border hover:border-muted-foreground/30'
                      }`}
                    >
                      {dept.icon}
                      {dept.label}
                      {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Agenda / Topics */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Presentation Agenda & Discussion Outline (Optional)
              </label>
              <Textarea
                placeholder="List topics to be presented across disciplines, demonstration items, and key questions..."
                value={agenda}
                onChange={(e) => setAgenda(e.target.value)}
                rows={3}
                className="bg-card text-xs leading-relaxed"
              />
            </div>
          </div>

          <hr className="border-border" />

          {/* Section 2: Student Roles Assignment */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                <Users className="w-4 h-4" />
                2. Assign Student Roles
              </div>
              <span className="text-[11px] text-muted-foreground">
                Select registered student or type name
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Chairperson */}
              <div className="p-3.5 rounded-xl border border-border bg-card/60 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                    <span className="p-1 rounded-md bg-amber-500/15 text-amber-600">
                      <Crown className="w-3.5 h-3.5" />
                    </span>
                    Chairperson (Moderator) <span className="text-red-500">*</span>
                  </div>
                  <select
                    value={chairperson.department}
                    onChange={(e) => setChairperson({ ...chairperson, department: e.target.value })}
                    className="text-[11px] px-2 py-0.5 rounded border border-border bg-background text-foreground"
                  >
                    <option value="Technology">Technology</option>
                    <option value="FabLab">FabLab</option>
                    <option value="Astronomy">Astronomy</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Input
                    placeholder="Enter student name..."
                    value={chairperson.name}
                    onChange={(e) => setChairperson({ ...chairperson, name: e.target.value })}
                    className="h-8 text-xs bg-background"
                    required
                  />
                  <select
                    value={chairperson.email}
                    onChange={(e) => handleSelectUserForRole(setChairperson, e.target.value, chairperson.department)}
                    className="w-full h-7 px-2 rounded border border-border bg-muted/30 text-[11px] text-muted-foreground"
                  >
                    <option value="">-- Quick select from student directory --</option>
                    {registeredUsers.map((u: any) => (
                      <option key={u.email} value={u.email}>
                        {u.name} ({u.email})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Note Taker */}
              <div className="p-3.5 rounded-xl border border-border bg-card/60 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                    <span className="p-1 rounded-md bg-sky-500/15 text-sky-600">
                      <FileEdit className="w-3.5 h-3.5" />
                    </span>
                    Note Taker
                  </div>
                  <select
                    value={noteTaker.department}
                    onChange={(e) => setNoteTaker({ ...noteTaker, department: e.target.value })}
                    className="text-[11px] px-2 py-0.5 rounded border border-border bg-background text-foreground"
                  >
                    <option value="Technology">Technology</option>
                    <option value="FabLab">FabLab</option>
                    <option value="Astronomy">Astronomy</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Input
                    placeholder="Enter student name..."
                    value={noteTaker.name}
                    onChange={(e) => setNoteTaker({ ...noteTaker, name: e.target.value })}
                    className="h-8 text-xs bg-background"
                  />
                  <select
                    value={noteTaker.email}
                    onChange={(e) => handleSelectUserForRole(setNoteTaker, e.target.value, noteTaker.department)}
                    className="w-full h-7 px-2 rounded border border-border bg-muted/30 text-[11px] text-muted-foreground"
                  >
                    <option value="">-- Quick select from student directory --</option>
                    {registeredUsers.map((u: any) => (
                      <option key={u.email} value={u.email}>
                        {u.name} ({u.email})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Time Keeper */}
              <div className="p-3.5 rounded-xl border border-border bg-card/60 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                    <span className="p-1 rounded-md bg-indigo-500/15 text-indigo-600">
                      <Timer className="w-3.5 h-3.5" />
                    </span>
                    Time Keeper
                  </div>
                  <select
                    value={timeKeeper.department}
                    onChange={(e) => setTimeKeeper({ ...timeKeeper, department: e.target.value })}
                    className="text-[11px] px-2 py-0.5 rounded border border-border bg-background text-foreground"
                  >
                    <option value="Technology">Technology</option>
                    <option value="FabLab">FabLab</option>
                    <option value="Astronomy">Astronomy</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Input
                    placeholder="Enter student name..."
                    value={timeKeeper.name}
                    onChange={(e) => setTimeKeeper({ ...timeKeeper, name: e.target.value })}
                    className="h-8 text-xs bg-background"
                  />
                  <select
                    value={timeKeeper.email}
                    onChange={(e) => handleSelectUserForRole(setTimeKeeper, e.target.value, timeKeeper.department)}
                    className="w-full h-7 px-2 rounded border border-border bg-muted/30 text-[11px] text-muted-foreground"
                  >
                    <option value="">-- Quick select from student directory --</option>
                    {registeredUsers.map((u: any) => (
                      <option key={u.email} value={u.email}>
                        {u.name} ({u.email})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Question Master */}
              <div className="p-3.5 rounded-xl border border-border bg-card/60 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                    <span className="p-1 rounded-md bg-rose-500/15 text-rose-600">
                      <HelpCircle className="w-3.5 h-3.5" />
                    </span>
                    Question Master
                  </div>
                  <select
                    value={questionMaster.department}
                    onChange={(e) => setQuestionMaster({ ...questionMaster, department: e.target.value })}
                    className="text-[11px] px-2 py-0.5 rounded border border-border bg-background text-foreground"
                  >
                    <option value="Technology">Technology</option>
                    <option value="FabLab">FabLab</option>
                    <option value="Astronomy">Astronomy</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Input
                    placeholder="Enter student name..."
                    value={questionMaster.name}
                    onChange={(e) => setQuestionMaster({ ...questionMaster, name: e.target.value })}
                    className="h-8 text-xs bg-background"
                  />
                  <select
                    value={questionMaster.email}
                    onChange={(e) => handleSelectUserForRole(setQuestionMaster, e.target.value, questionMaster.department)}
                    className="w-full h-7 px-2 rounded border border-border bg-muted/30 text-[11px] text-muted-foreground"
                  >
                    <option value="">-- Quick select from student directory --</option>
                    {registeredUsers.map((u: any) => (
                      <option key={u.email} value={u.email}>
                        {u.name} ({u.email})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          <hr className="border-border" />

          {/* Section 3: Carry-Over Follow-Up Items */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                  <CheckSquare className="w-4 h-4" />
                  3. Select Carry-Over Follow-Ups & Action Items
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Check unresolved action items or open questions from previous forums to address in this session.
                </p>
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsAddingQuickItem(!isAddingQuickItem)}
                className="text-xs h-7 gap-1 border-dashed"
              >
                <Plus className="w-3.5 h-3.5" />
                {isAddingQuickItem ? 'Cancel' : 'Add Item'}
              </Button>
            </div>

            {/* Inline Add Quick Item */}
            {isAddingQuickItem && (
              <div className="p-3 rounded-xl border border-emerald-500/40 bg-emerald-500/5 space-y-2">
                <Input
                  placeholder="New follow-up / open question to carry over..."
                  value={quickItemTitle}
                  onChange={(e) => setQuickItemTitle(e.target.value)}
                  className="h-8 text-xs bg-background"
                />
                <div className="flex items-center justify-between gap-2">
                  <select
                    value={quickItemDept}
                    onChange={(e) => setQuickItemDept(e.target.value)}
                    className="h-7 px-2 rounded border border-border bg-background text-[11px]"
                  >
                    <option value="Technology">Technology 💻</option>
                    <option value="FabLab">FabLab 🛠️</option>
                    <option value="Astronomy">Astronomy 🔭</option>
                    <option value="General">General 🌐</option>
                  </select>

                  <Button
                    type="button"
                    size="sm"
                    onClick={handleCreateQuickItem}
                    className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    Add & Select
                  </Button>
                </div>
              </div>
            )}

            {/* Checklist */}
            <div className="max-h-52 overflow-y-auto space-y-2 p-2 rounded-xl border border-border bg-muted/20">
              {unresolvedActionItems.length === 0 ? (
                <p className="text-center py-6 text-xs text-muted-foreground">
                  No open action items from previous forums. You can add one above!
                </p>
              ) : (
                unresolvedActionItems.map((item: any) => {
                  const isChecked = selectedActionItemIds.includes(item.itemId);
                  return (
                    <div
                      key={item.itemId}
                      onClick={() => toggleActionItemSelection(item.itemId)}
                      className={`flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-all ${
                        isChecked
                          ? 'bg-emerald-500/10 border-emerald-500/40'
                          : 'bg-background border-border/70 hover:border-border'
                      }`}
                    >
                      <div className="mt-0.5">
                        {isChecked ? (
                          <CheckSquare className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <Square className="w-4 h-4 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex-1 space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-foreground">
                            {item.title}
                          </span>
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-medium bg-muted text-muted-foreground border">
                            {item.department || 'General'}
                          </span>
                          {item.forumEdition && (
                            <span className="text-[10px] text-muted-foreground">
                              (from Edition #{item.forumEdition})
                            </span>
                          )}
                        </div>
                        {item.description && (
                          <p className="text-[11px] text-muted-foreground line-clamp-1">
                            {item.description}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Footer Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow"
            >
              {isSubmitting ? (
                <>Scheduling Forum...</>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Schedule Forum Edition #{edition}
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
