import React, { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Edit, Trash, Plus, FileText, Image as ImageIcon, Video, Link as LinkIcon, Users, X, CheckCircle2, UserX, Square, CheckCircle, Award, ThumbsUp, ThumbsDown, ExternalLink, Star, Clock, Calendar, Tag, MapPin, History, UserPlus, Search, Filter, RotateCcw } from "lucide-react";
import { getOptimizedImageUrl } from "@/lib/utils";
import { SCRIPT_URL } from "@/config";

interface MyPlansTabProps {
  teamMembers: any[];
}

export default function MyPlansTab({ teamMembers }: MyPlansTabProps) {
  const { user } = useAuth();
  const myPlans = useQuery(api.learningPlans.getMyPlans, { userEmail: user?.email || "" });
  const allUsers = useQuery(api.users.getAll);
  const createPlan = useMutation(api.learningPlans.createPlan);
  const updatePlan = useMutation(api.learningPlans.updatePlan);
  const deletePlan = useMutation(api.learningPlans.deletePlan);
  const removeParticipant = useMutation(api.learningPlans.removeParticipant);
  const toggleAttendance = useMutation(api.learningPlans.toggleAttendance);
  const setPlanStatus = useMutation(api.learningPlans.setPlanStatus);
  const reviewLearningSubmission = useMutation(api.learningPlans.reviewLearningSubmission);
  const completeSessionWithTags = useMutation(api.learningPlans.completeSessionWithTags);
  const updateEditionMedia = useMutation(api.learningPlans.updateEditionMedia);
  const addParticipantManual = useMutation(api.learningPlans.addParticipantManual);
  const deletePastEdition = useMutation(api.learningPlans.deletePastEdition);

  const [isEditing, setIsEditing] = useState(false);
  const [currentPlan, setCurrentPlan] = useState<any>(null);
  const [showAwardTagModal, setShowAwardTagModal] = useState(false);
  const [awardTagInput, setAwardTagInput] = useState("");
  const [awardGroupImgInput, setAwardGroupImgInput] = useState("");
  const [awardGroupLinkInput, setAwardGroupLinkInput] = useState("");
  const [awardGroupCaptionInput, setAwardGroupCaptionInput] = useState("");

  const [showEditionMediaModal, setShowEditionMediaModal] = useState(false);
  const [targetEditionNumForMedia, setTargetEditionNumForMedia] = useState<number>(1);
  const [editionGroupImgInput, setEditionGroupImgInput] = useState("");
  const [editionGroupLinkInput, setEditionGroupLinkInput] = useState("");
  const [editionGroupCaptionInput, setEditionGroupCaptionInput] = useState("");
  const [isSavingMedia, setIsSavingMedia] = useState(false);

  // Form State
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [imageUrlInput, setImageUrlInput] = useState("");
  const [videoUrls, setVideoUrls] = useState<string[]>([]);
  const [videoUrlInput, setVideoUrlInput] = useState("");
  const [docLink, setDocLink] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [location, setLocation] = useState("");
  const [maxParticipants, setMaxParticipants] = useState<number>(20);
  const [selectedCollaborators, setSelectedCollaborators] = useState<string[]>([]);

  const [viewPlan, setViewPlan] = useState<any>(null);
  const [viewPlanEditionTab, setViewPlanEditionTab] = useState<string>("current");
  const [participantSubTab, setParticipantSubTab] = useState<"all" | "confirmed" | "standby" | "attended" | "absent" | "approved">("all");
  const [participantSearchQuery, setParticipantSearchQuery] = useState("");

  // Manual Add Participant Modal State
  const [showAddParticipantModal, setShowAddParticipantModal] = useState(false);
  const [manualAddUserEmail, setManualAddUserEmail] = useState("");
  const [manualAddUserName, setManualAddUserName] = useState("");
  const [manualAddAttended, setManualAddAttended] = useState(true);
  const [isSubmittingManualAdd, setIsSubmittingManualAdd] = useState(false);


  const resetForm = () => {
    setTitle("");
    setDescription("");
    setTags([]);
    setTagInput("");
    setImageUrls([]);
    setImageUrlInput("");
    setVideoUrls([]);
    setVideoUrlInput("");
    setDocLink("");
    setDate("");
    setTime("");
    setLocation("");
    setMaxParticipants(20);
    setSelectedCollaborators([]);
    setCurrentPlan(null);
  };

  const handleEdit = (plan: any) => {
    setCurrentPlan(plan);
    setTitle(plan.title);
    setDescription(plan.description);
    setTags(plan.tags || []);
    setTagInput("");
    setImageUrls(plan.imageUrls || []);
    setImageUrlInput("");
    setVideoUrls(plan.videoUrls || []);
    setVideoUrlInput("");
    setDocLink(plan.documentationUrl || "");
    setDate(plan.date || "");
    setTime(plan.time || "");
    setLocation(plan.location || "");
    setMaxParticipants(plan.maxParticipants || 20);
    setSelectedCollaborators(plan.collaboratorEmails || []);
    setIsEditing(true);
  };

  const handleSave = async (status: "DRAFT" | "PUBLISHED") => {
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }

    if (status === "PUBLISHED") {
      if (!date.trim() || !time.trim() || !location.trim()) {
        toast.error("Date, time, and location are required to publish");
        return;
      }
    }

    try {
      if (currentPlan) {
        await updatePlan({
          id: currentPlan._id,
          title,
          description,
          date,
          time,
          location,
          maxParticipants: Number(maxParticipants) || 20,
          tags,
          imageUrls,
          videoUrls,
          documentationUrl: docLink,
          collaboratorEmails: selectedCollaborators,
          status,
        });
        toast.success(`Plan ${status === "PUBLISHED" ? "Published" : "Saved as Draft"}`);
      } else {
        await createPlan({
          planId: `plan_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
          title,
          description,
          date,
          time,
          location,
          maxParticipants: Number(maxParticipants) || 20,
          tags,
          imageUrls,
          videoUrls,
          documentationUrl: docLink,
          authorEmail: user?.email || "",
          authorName: user?.name || "",
          collaboratorEmails: selectedCollaborators,
          status,
        });
        toast.success(`New plan ${status === "PUBLISHED" ? "Published" : "Created as Draft"}`);
      }
      setIsEditing(false);
      resetForm();
    } catch (e: any) {
      toast.error(e.message || "Failed to save plan");
    }
  };

  const handleDelete = async (id: any) => {
    if (window.confirm("Are you sure you want to delete this plan?")) {
      await deletePlan({ id });
      toast.success("Plan deleted");
    }
  };

  const toggleCollaborator = (email: string) => {
    setSelectedCollaborators(prev => 
      prev.includes(email) ? prev.filter(e => e !== email) : [...prev, email]
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">My Session Plans</h2>
          <p className="text-sm text-slate-500">Draft and publish upcoming activity sessions for the Fab Lab.</p>
        </div>
        <Button onClick={() => { resetForm(); setIsEditing(true); }} className="bg-emerald-600 hover:bg-emerald-700 text-white">
          <Plus className="w-4 h-4 mr-2" /> Create New Plan
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {myPlans?.length === 0 ? (
          <div className="col-span-full py-12 text-center text-slate-500 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
            <FileText className="w-12 h-12 mx-auto text-slate-300 mb-3" />
            <p>You haven't created any plans yet.</p>
          </div>
        ) : (
          myPlans?.map((plan: any) => {
            const editionNum = plan.edition || 1;
            const completedEditions = plan.completedEditionsCount || (plan.status === 'COMPLETED' ? 1 : 0);

            const currentRegistered = plan.registeredUsers || [];
            const pastEditions = plan.pastEditions || [];
            const allPastUsers = pastEditions.flatMap((e: any) => e.registeredUsers || []);
            const allUsersCombined = [...currentRegistered, ...allPastUsers];
            const totalApprovedSubmissions = allUsersCombined.filter((u: any) => u.attended && u.submissionStatus === "APPROVED").length;
            const totalAttendedCount = allUsersCombined.filter((u: any) => u.attended).length;

            return (
              <Card key={plan._id} onClick={() => setViewPlan(plan)} className="overflow-hidden flex flex-col hover:shadow-md transition-all border-slate-200 cursor-pointer">
                {plan.imageUrls && plan.imageUrls.filter((u: string) => typeof u === "string" && u.trim().length > 5).length > 0 && (
                  <div className="h-32 bg-slate-100 overflow-hidden relative">
                    <img src={getOptimizedImageUrl(plan.imageUrls.find((u: string) => typeof u === "string" && u.trim().length > 5))} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    {completedEditions > 0 && (
                      <div className="absolute top-2 left-2 bg-amber-400 text-slate-950 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full shadow flex items-center gap-1 border border-amber-300">
                        <Star className="w-3 h-3 fill-slate-950 text-slate-950" />
                        {completedEditions} Star{completedEditions === 1 ? '' : 's'} Completed
                      </div>
                    )}
                    {totalApprovedSubmissions > 0 && (
                      <div className="absolute bottom-2 right-2 bg-emerald-700/90 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full shadow backdrop-blur flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-300" />
                        {totalApprovedSubmissions} Approved
                      </div>
                    )}
                  </div>
                )}
                <div className="p-4 flex flex-col flex-1">
                  <div className="flex items-start justify-between mb-2 gap-2">
                    <div>
                      <h3 className="font-bold text-lg text-slate-900 line-clamp-1">{plan.title}</h3>
                      <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                        <span className="text-[10px] font-extrabold text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-full inline-block">
                          Edition {editionNum}
                        </span>
                        {totalApprovedSubmissions > 0 && (
                          <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                            <Star className="w-3 h-3 fill-amber-500 text-amber-600" />
                            {totalApprovedSubmissions} Approved
                          </span>
                        )}
                        {totalAttendedCount > 0 && (
                          <span className="text-[10px] font-bold text-slate-700 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                            <Users className="w-3 h-3 text-slate-500" />
                            {totalAttendedCount} Attended
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${plan.status === 'COMPLETED' ? 'bg-purple-100 text-purple-700 border border-purple-200' : plan.status === 'PUBLISHED' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                        {plan.status}
                      </span>
                    </div>
                  </div>
                  {(plan.date || plan.time || plan.location) && (
                    <div className="text-xs text-slate-500 mb-2 font-medium flex flex-wrap gap-x-3 gap-y-1">
                      {plan.date && <span>📅 {plan.date}</span>}
                      {plan.time && <span>⏰ {plan.time}</span>}
                      {plan.location && <span>📍 {plan.location}</span>}
                      <span>👥 Max: {plan.maxParticipants || 20}</span>
                    </div>
                  )}
                  <p className="text-sm text-slate-500 line-clamp-2 mb-4">{plan.description}</p>
                  <div className="mt-auto pt-4 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-xs text-slate-400">By {plan.authorName}</span>
                    <div className="flex gap-2">
                      <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); handleEdit(plan); }} className="h-8 w-8 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50">
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); handleDelete(plan._id); }} className="h-8 w-8 text-slate-500 hover:text-red-600 hover:bg-red-50">
                        <Trash className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>

      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-6 md:p-8">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <FileText className="w-5 h-5 text-emerald-600" />
              {currentPlan ? `Edit Plan (Edition ${currentPlan.edition || 1})` : "Create New Session Plan"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-2">
            {/* Section 1: Title & Description */}
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="font-semibold text-slate-900">Session Title <span className="text-rose-500">*</span></Label>
                <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g., Intro to 3D Printing & Parametric Modeling" className="h-10 text-base" />
              </div>
              <div className="space-y-1.5">
                <Label className="font-semibold text-slate-900">Session Description</Label>
                <Textarea 
                  value={description} 
                  onChange={e => setDescription(e.target.value)} 
                  placeholder="Write a detailed overview of what students will learn and accomplish..." 
                  className="h-28 text-sm"
                />
              </div>
            </div>

            {/* Section 2: Logistics, Schedule & Capacity (Grouped Card) */}
            <div className="bg-slate-50/80 p-5 rounded-2xl border border-slate-200/80 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200/60 pb-2.5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-emerald-600" /> Schedule, Location & Capacity
                </h4>
                <span className="text-[11px] text-slate-400 font-medium">* Required to publish to Learning Hub</span>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">Session Date</Label>
                  <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="bg-white border-slate-200" />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">Session Time</Label>
                  <Input type="time" value={time} onChange={e => setTime(e.target.value)} className="bg-white border-slate-200" />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">Location / Venue</Label>
                  <Input value={location} onChange={e => setLocation(e.target.value)} placeholder="e.g., Fab Lab Room 1" className="bg-white border-slate-200" />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                    <span>Max Capacity (Participants)</span>
                    <span className="text-[10px] text-emerald-700 font-extrabold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">Default: 20</span>
                  </Label>
                  <Input type="number" min={1} value={maxParticipants} onChange={e => setMaxParticipants(parseInt(e.target.value) || 20)} placeholder="20" className="bg-white border-slate-200" />
                </div>
              </div>
            </div>

            {/* Section 3: Tags */}
            <div className="space-y-2">
              <Label className="font-semibold text-slate-900 flex items-center gap-1.5">
                <Tag className="w-4 h-4 text-emerald-600" /> Tags & Categories
              </Label>
              <div className="flex flex-wrap gap-2 mb-2">
                {tags.map(tag => (
                  <span key={tag} className="flex items-center gap-1 bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full text-xs font-bold">
                    {tag}
                    <button type="button" onClick={() => setTags(tags.filter(t => t !== tag))} className="text-emerald-600 hover:text-emerald-900 focus:outline-none cursor-pointer">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
              <Input 
                value={tagInput} 
                onChange={e => setTagInput(e.target.value)} 
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    const newTag = tagInput.trim();
                    if (newTag && !tags.includes(newTag)) {
                      setTags([...tags, newTag]);
                    }
                    setTagInput("");
                  }
                }}
                placeholder="Type a tag (e.g. 3D Printing, Laser Cutting) and press Enter" 
              />
            </div>

            {/* Section 4: Media & Resources */}
            <div className="space-y-4 pt-2 border-t border-slate-100">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-purple-600" /> Media & Documentation Links
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5"><ImageIcon className="w-3.5 h-3.5" /> Image URLs</Label>
                  <div className="flex flex-col gap-2">
                    {imageUrls.map((url, i) => (
                      <div key={i} className="flex items-center gap-2 bg-slate-50 p-2 rounded-lg text-xs border border-slate-200">
                        <span className="truncate flex-1 font-mono text-[11px]" title={url}>{url}</span>
                        <button type="button" onClick={() => setImageUrls(imageUrls.filter((_, idx) => idx !== i))} className="text-slate-400 hover:text-red-500">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    <Input 
                      value={imageUrlInput} 
                      onChange={e => setImageUrlInput(e.target.value)} 
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          const newUrl = imageUrlInput.trim();
                          if (newUrl && !imageUrls.includes(newUrl)) setImageUrls([...imageUrls, newUrl]);
                          setImageUrlInput("");
                        }
                      }}
                      placeholder="Paste image URL and press Enter" 
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5"><Video className="w-3.5 h-3.5" /> Video URLs</Label>
                  <div className="flex flex-col gap-2">
                    {videoUrls.map((url, i) => (
                      <div key={i} className="flex items-center gap-2 bg-slate-50 p-2 rounded-lg text-xs border border-slate-200">
                        <span className="truncate flex-1 font-mono text-[11px]" title={url}>{url}</span>
                        <button type="button" onClick={() => setVideoUrls(videoUrls.filter((_, idx) => idx !== i))} className="text-slate-400 hover:text-red-500">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    <Input 
                      value={videoUrlInput} 
                      onChange={e => setVideoUrlInput(e.target.value)} 
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          const newUrl = videoUrlInput.trim();
                          if (newUrl && !videoUrls.includes(newUrl)) setVideoUrls([...videoUrls, newUrl]);
                          setVideoUrlInput("");
                        }
                      }}
                      placeholder="Paste video URL (YouTube, Drive) and press Enter" 
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5"><LinkIcon className="w-3.5 h-3.5" /> Documentation / Presentation Link</Label>
                <Input value={docLink} onChange={e => setDocLink(e.target.value)} placeholder="https://docs.google.com/presentation/..." />
              </div>
            </div>

            {/* Section 5: Collaborators */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <Label className="font-semibold text-slate-900 flex items-center gap-1.5"><Users className="w-4 h-4 text-emerald-600" /> Team Collaborators</Label>
              <p className="text-xs text-slate-500">Select additional team members authorized to edit this session plan.</p>
              <div className="border border-slate-200 rounded-xl p-3 max-h-36 overflow-y-auto space-y-1.5 bg-slate-50/50">
                {teamMembers.filter(m => m.email !== user?.email).map((member) => (
                  <label key={member.email} className="flex items-center gap-3 cursor-pointer p-2 hover:bg-white rounded-lg transition-colors border border-transparent hover:border-slate-200">
                    <input 
                      type="checkbox" 
                      className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                      checked={selectedCollaborators.includes(member.email)}
                      onChange={() => toggleCollaborator(member.email)}
                    />
                    <span className="text-xs font-bold text-slate-800">{member.name}</span>
                    <span className="text-[11px] text-slate-400 font-mono ml-auto">{member.email}</span>
                  </label>
                ))}
                {teamMembers.filter(m => m.email !== user?.email).length === 0 && (
                  <div className="text-xs text-slate-500 italic p-2 text-center">No other team members found.</div>
                )}
              </div>
            </div>
          </div>

          <DialogFooter className="flex items-center gap-3 sm:justify-between pt-4 border-t border-slate-200">
            <Button variant="ghost" onClick={() => setIsEditing(false)} className="rounded-full px-6">Cancel</Button>
            <div className="flex items-center gap-3">
              <Button variant="outline" onClick={() => handleSave("DRAFT")} className="rounded-full px-6 border-slate-300 font-semibold">Save Draft</Button>
              <Button onClick={() => handleSave("PUBLISHED")} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-full px-8 shadow-md transition-all hover:scale-105">Publish to Learning Hub</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Expanded Plan Details & Management Dialog (Mild Neumorphism) ── */}
      <Dialog open={!!viewPlan} onOpenChange={(open) => !open && setViewPlan(null)}>
        <DialogContent className="max-w-4xl lg:max-w-5xl max-h-[92vh] overflow-y-auto p-5 md:p-8 bg-slate-50/70 border-slate-200/90 rounded-[2rem] shadow-2xl">
          {viewPlan && (
            <div className="space-y-6">
              {/* ── Top Header with Plan Title & Close ── */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-slate-200/80">
                <div className="space-y-2 min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wider ${
                      viewPlan.status === 'COMPLETED'
                        ? 'bg-purple-100 text-purple-800 border border-purple-200'
                        : viewPlan.status === 'PUBLISHED'
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        : 'bg-amber-100 text-amber-800 border border-amber-200'
                    }`}>
                      {viewPlan.status}
                    </span>
                    <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                      Edition {viewPlan.edition || 1}
                    </span>
                    {viewPlan.completedEditionsCount > 0 && (
                      <span className="text-[11px] font-semibold text-purple-700 bg-purple-50 px-2.5 py-1 rounded-full border border-purple-200">
                        {viewPlan.completedEditionsCount} {viewPlan.completedEditionsCount === 1 ? "Edition" : "Editions"} Total
                      </span>
                    )}
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">{viewPlan.title}</h2>
                  {(viewPlan.date || viewPlan.time || viewPlan.location) && (
                    <div className="text-xs text-slate-600 font-medium flex flex-wrap gap-x-4 gap-y-1.5 pt-1">
                      {viewPlan.date && (
                        <span className="flex items-center gap-1.5 text-slate-700 font-semibold">
                          <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                          {viewPlan.date}
                        </span>
                      )}
                      {viewPlan.time && (
                        <span className="flex items-center gap-1.5 text-slate-700 font-semibold">
                          <Clock className="w-3.5 h-3.5 text-blue-600" />
                          {viewPlan.time}
                        </span>
                      )}
                      {viewPlan.location && (
                        <span className="flex items-center gap-1.5 text-slate-700 font-semibold">
                          <MapPin className="w-3.5 h-3.5 text-rose-600" />
                          {viewPlan.location}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Top Action Controls */}
                <div className="flex items-center gap-2 shrink-0 flex-wrap">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEdit(viewPlan)}
                    className="neumorph-btn h-9 text-xs font-semibold text-slate-700 rounded-xl gap-1.5"
                  >
                    <Edit className="w-3.5 h-3.5 text-slate-500" />
                    Edit Plan Details
                  </Button>

                  {viewPlan.status === "COMPLETED" ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={async () => {
                        try {
                          const res = await setPlanStatus({ planId: viewPlan._id, status: "PUBLISHED" });
                          toast.success(res.message);
                          setViewPlan((p: any) => ({ ...p, status: "PUBLISHED" }));
                        } catch (e: any) {
                          toast.error(e.message || "Failed to update status");
                        }
                      }}
                      className="h-9 text-amber-800 bg-amber-50 border-amber-300 hover:bg-amber-100 font-bold text-xs rounded-xl"
                    >
                      <RotateCcw className="w-3.5 h-3.5 mr-1" />
                      Re-open Session
                    </Button>
                  ) : (
                    (() => {
                      const attendedUsers = viewPlan.registeredUsers?.filter((u: any) => u.attended) || [];
                      const approvedUsers = attendedUsers.filter((u: any) => u.submissionStatus === "APPROVED");
                      const allApproved = (viewPlan.registeredUsers?.length || 0) === 0 || (attendedUsers.length > 0 && approvedUsers.length === attendedUsers.length);

                      if (allApproved) {
                        return (
                          <Button
                            size="sm"
                            onClick={() => {
                              setAwardTagInput(viewPlan.tags?.[0] || "3D");
                              setShowAwardTagModal(true);
                            }}
                            className="bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs rounded-xl shadow-sm px-4 h-9 flex items-center gap-1.5"
                          >
                            <Award className="w-3.5 h-3.5" />
                            Complete & Award Tag 🎉
                          </Button>
                        );
                      }

                      return (
                        <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl text-xs text-amber-900 font-semibold h-9">
                          <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0 animate-pulse" />
                          <span>Awaiting Approvals ({approvedUsers.length}/{attendedUsers.length})</span>
                        </div>
                      );
                    })()
                  )}
                </div>
              </div>

              {/* ── Cover Image & Plan Description ── */}
              {viewPlan.imageUrls && viewPlan.imageUrls.filter((u: string) => typeof u === "string" && u.trim().length > 5).length > 0 && (
                <div className="neumorph-card rounded-2xl overflow-hidden max-h-56 bg-slate-100 flex items-center justify-center">
                  <img
                    src={getOptimizedImageUrl(viewPlan.imageUrls.find((u: string) => typeof u === "string" && u.trim().length > 5))}
                    alt={viewPlan.title}
                    className="w-full h-full max-h-56 object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
              )}

              {/* Description & Tags Inset Well */}
              <div className="neumorph-inset p-4 sm:p-5 rounded-2xl bg-white space-y-3">
                <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-slate-500" />
                  Plan Overview & Objectives
                </h4>
                <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{viewPlan.description}</p>

                {viewPlan.tags && viewPlan.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-2 border-t border-slate-100">
                    {viewPlan.tags.map((tag: string) => (
                      <span key={tag} className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg">
                        <Tag className="w-3 h-3 text-slate-400" />
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* ── Scalable Editions Navigation System ── */}
              <div className="neumorph-card p-4 sm:p-5 bg-white space-y-4">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-xs">
                      <History className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">
                        Session Editions ({(viewPlan.pastEditions?.length || 0) + 1} Total)
                      </h3>
                      <p className="text-[11px] text-slate-400">
                        Select an edition below to manage attendance, waiting list, and project proof reviews
                      </p>
                    </div>
                  </div>
                </div>

                {/* Scalable Edition Tabs Group */}
                <div className="flex gap-2 overflow-x-auto pb-1.5 hide-scrollbar">
                  {/* Current Session Tab */}
                  <button
                    type="button"
                    onClick={() => {
                      setViewPlanEditionTab("current");
                      setParticipantSubTab("all");
                      setParticipantSearchQuery("");
                    }}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-2 ${
                      viewPlanEditionTab === "current"
                        ? "bg-slate-900 text-white shadow-sm"
                        : "neumorph-btn text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span>Edition {viewPlan.edition || 1} (Current)</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold ${
                      viewPlanEditionTab === "current" ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
                    }`}>
                      {viewPlan.registeredUsers?.length || 0} Registered
                    </span>
                  </button>

                  {/* Past Edition Tabs */}
                  {(viewPlan.pastEditions || []).length > 0 &&
                    [...viewPlan.pastEditions].reverse().map((ed: any) => {
                      const isSelected = viewPlanEditionTab === `past-${ed.editionNumber}`;
                      const attendedCount = (ed.registeredUsers || []).filter((u: any) => u.attended).length;
                      return (
                        <button
                          key={ed.editionNumber}
                          type="button"
                          onClick={() => {
                            setViewPlanEditionTab(`past-${ed.editionNumber}`);
                            setParticipantSubTab("all");
                            setParticipantSearchQuery("");
                          }}
                          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-2 ${
                            isSelected
                              ? "bg-purple-700 text-white shadow-sm"
                              : "neumorph-btn text-slate-700 hover:bg-slate-100"
                          }`}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-purple-300" />
                          <span>Edition {ed.editionNumber} {ed.date ? `(${ed.date})` : "(Past)"}</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold ${
                            isSelected ? "bg-white/20 text-white" : "bg-purple-50 text-purple-800 border border-purple-200"
                          }`}>
                            {attendedCount} Attended
                          </span>
                        </button>
                      );
                    })}
                </div>

                {/* ── Active Edition Participant Roster & Controls ── */}
                {(() => {
                  const isViewingPast = viewPlanEditionTab.startsWith("past-");
                  const pastNum = isViewingPast ? parseInt(viewPlanEditionTab.replace("past-", ""), 10) : null;
                  const activePast = pastNum ? (viewPlan.pastEditions || []).find((p: any) => p.editionNumber === pastNum) : null;
                  const activeEditionNumber = isViewingPast ? pastNum! : (viewPlan.edition || 1);
                  const maxCap = viewPlan.maxParticipants || 20;

                  const rawUsers = isViewingPast ? (activePast?.registeredUsers || []) : (viewPlan.registeredUsers || []);
                  const sortedActiveUsers = [...rawUsers].sort((a: any, b: any) => (a.registeredAt || 0) - (b.registeredAt || 0));

                  const confirmedUsers = sortedActiveUsers.slice(0, maxCap);
                  const standbyUsers = sortedActiveUsers.slice(maxCap);
                  const attendedUsers = sortedActiveUsers.filter((u: any) => u.attended === true);
                  const absentUsers = sortedActiveUsers.filter((u: any) => !u.attended);
                  const attendedWithSubmissions = attendedUsers.filter((u: any) => u.submissionUrl);
                  const approvedUsers = attendedUsers.filter((u: any) => u.submissionStatus === "APPROVED");

                  let displayUsers =
                    participantSubTab === "all"
                      ? sortedActiveUsers
                      : participantSubTab === "confirmed"
                      ? confirmedUsers
                      : participantSubTab === "standby"
                      ? standbyUsers
                      : participantSubTab === "attended"
                      ? attendedUsers
                      : participantSubTab === "approved"
                      ? approvedUsers
                      : absentUsers;

                  if (participantSearchQuery.trim()) {
                    const q = participantSearchQuery.toLowerCase().trim();
                    displayUsers = displayUsers.filter(
                      (u: any) => u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q)
                    );
                  }

                  return (
                    <div className="space-y-4 pt-2">
                      {/* Edition Metrics Summary Row */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                        <div className="neumorph-inset p-3 rounded-xl bg-slate-50/60 flex flex-col justify-center">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Confirmed Spots</span>
                          <span className="text-base font-black text-emerald-800">
                            {confirmedUsers.length} <span className="text-xs font-semibold text-slate-400">/ {maxCap}</span>
                          </span>
                        </div>
                        <div className="neumorph-inset p-3 rounded-xl bg-slate-50/60 flex flex-col justify-center">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Attended</span>
                          <span className="text-base font-black text-purple-800">{attendedUsers.length}</span>
                        </div>
                        <div className="neumorph-inset p-3 rounded-xl bg-slate-50/60 flex flex-col justify-center">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Waiting List</span>
                          <span className="text-base font-black text-amber-800">{standbyUsers.length}</span>
                        </div>
                        <div 
                          onClick={() => setParticipantSubTab("approved")}
                          className={`neumorph-inset p-3 rounded-xl flex flex-col justify-center cursor-pointer transition-all ${
                            participantSubTab === "approved" ? "bg-amber-100/80 ring-2 ring-amber-400" : "bg-slate-50/60 hover:bg-amber-50/50"
                          }`}
                        >
                          <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider flex items-center gap-1">
                            <Star className="w-3 h-3 fill-amber-500 text-amber-600" />
                            Approved Submissions
                          </span>
                          <span className="text-base font-black text-amber-950">
                            {approvedUsers.length} <span className="text-xs font-semibold text-slate-500">/ {attendedWithSubmissions.length}</span>
                          </span>
                        </div>
                      </div>

                      {/* ── Edition Group Photo & Showcase Card (Curator Memories) ── */}
                      {(() => {
                        const currentEditionGroupImg = isViewingPast ? (activePast?.groupImageUrl || "") : (viewPlan.groupImageUrl || "");
                        const currentEditionGroupLink = isViewingPast ? (activePast?.groupImageLink || "") : (viewPlan.groupImageLink || "");
                        const currentEditionGroupCaption = isViewingPast ? (activePast?.groupImageCaption || "") : (viewPlan.groupImageCaption || "");

                        return (
                          <div className="p-3.5 bg-gradient-to-r from-purple-50/80 via-indigo-50/70 to-blue-50/80 rounded-2xl border border-purple-200/80 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3.5">
                            <div className="flex items-center gap-3 min-w-0">
                              {currentEditionGroupImg ? (
                                <div className="w-16 h-12 rounded-xl overflow-hidden bg-slate-100 border border-purple-300 shadow-xs shrink-0 relative group">
                                  <img
                                    src={getOptimizedImageUrl(currentEditionGroupImg)}
                                    alt="Group"
                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                                    referrerPolicy="no-referrer"
                                  />
                                </div>
                              ) : (
                                <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0 border border-purple-200">
                                  <ImageIcon className="w-5 h-5 text-purple-600" />
                                </div>
                              )}
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-xs font-bold text-slate-900 flex items-center gap-1">
                                    📸 Edition {activeEditionNumber} Group Photo & Recap
                                  </span>
                                  {currentEditionGroupImg ? (
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                                      Photo Attached ✓
                                    </span>
                                  ) : (
                                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                                      No group photo yet
                                    </span>
                                  )}
                                </div>
                                <p className="text-[11px] text-slate-600 truncate mt-0.5">
                                  {currentEditionGroupCaption || (currentEditionGroupImg ? "Official group photo added" : "Add official group photo, album or recap link to show on participant dashboards")}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
                              {currentEditionGroupLink && (
                                <a
                                  href={currentEditionGroupLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-white/80 hover:bg-white text-purple-700 border border-purple-200 shadow-2xs flex items-center gap-1 cursor-pointer transition-colors"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                  <span className="hidden xs:inline">Showcase Link</span>
                                </a>
                              )}
                              <Button
                                size="sm"
                                type="button"
                                onClick={() => {
                                  setTargetEditionNumForMedia(activeEditionNumber);
                                  setEditionGroupImgInput(currentEditionGroupImg);
                                  setEditionGroupLinkInput(currentEditionGroupLink);
                                  setEditionGroupCaptionInput(currentEditionGroupCaption);
                                  setShowEditionMediaModal(true);
                                }}
                                className="bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs h-8 px-3 rounded-xl shadow-xs gap-1.5 cursor-pointer"
                              >
                                <Edit className="w-3.5 h-3.5" />
                                <span>{currentEditionGroupImg ? "Edit Group Photo" : "+ Add Group Photo & Link"}</span>
                              </Button>
                            </div>
                          </div>
                        );
                      })()}

                      {/* Approved Students Showcase Banner (When approved students exist) */}
                      {approvedUsers.length > 0 && participantSubTab !== "approved" && (
                        <div className="p-3 bg-gradient-to-r from-amber-50 via-emerald-50 to-teal-50 rounded-2xl border border-amber-200/80 flex items-center justify-between gap-3 shadow-xs">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-8 h-8 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center shrink-0 shadow-xs">
                              <Star className="w-4 h-4 fill-slate-950" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-black text-slate-900 truncate">
                                {approvedUsers.length} Participant{approvedUsers.length === 1 ? '' : 's'} with Approved Submissions
                              </p>
                              <p className="text-[11px] text-slate-600 truncate">
                                {approvedUsers.map((u: any) => u.name).join(", ")}
                              </p>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            type="button"
                            onClick={() => setParticipantSubTab("approved")}
                            className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold text-xs h-7 px-3 rounded-xl shrink-0 shadow-xs"
                          >
                            View Approved ({approvedUsers.length})
                          </Button>
                        </div>
                      )}

                      {/* Toolbar Row: Action Buttons & Subtabs */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                        {/* Subtabs for Filtering */}
                        <div className="flex gap-1.5 overflow-x-auto pb-1 hide-scrollbar">
                          <button
                            type="button"
                            onClick={() => setParticipantSubTab("all")}
                            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 cursor-pointer ${
                              participantSubTab === "all"
                                ? "bg-slate-900 text-white shadow-xs font-bold"
                                : "neumorph-btn text-slate-600"
                            }`}
                          >
                            All ({sortedActiveUsers.length})
                          </button>
                          <button
                            type="button"
                            onClick={() => setParticipantSubTab("approved")}
                            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 cursor-pointer flex items-center gap-1 ${
                              participantSubTab === "approved"
                                ? "bg-amber-500 text-slate-950 shadow-xs font-black ring-1 ring-amber-400"
                                : "bg-amber-50 text-amber-900 hover:bg-amber-100 border border-amber-300"
                            }`}
                          >
                            <Star className="w-3 h-3 fill-amber-500 text-amber-600" />
                            <span>Approved</span>
                            <span className="font-extrabold text-[10px]">({approvedUsers.length})</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setParticipantSubTab("confirmed")}
                            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 cursor-pointer flex items-center gap-1 ${
                              participantSubTab === "confirmed"
                                ? "bg-emerald-700 text-white shadow-xs font-bold"
                                : "bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200"
                            }`}
                          >
                            <span>Confirmed</span>
                            <span className="font-extrabold text-[10px]">({confirmedUsers.length}/{maxCap})</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setParticipantSubTab("attended")}
                            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 cursor-pointer flex items-center gap-1 ${
                              participantSubTab === "attended"
                                ? "bg-purple-700 text-white shadow-xs font-bold"
                                : "bg-purple-50 text-purple-800 hover:bg-purple-100 border border-purple-200"
                            }`}
                          >
                            <span>Attended</span>
                            <span className="font-extrabold text-[10px]">({attendedUsers.length})</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setParticipantSubTab("standby")}
                            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 cursor-pointer flex items-center gap-1 ${
                              participantSubTab === "standby"
                                ? "bg-amber-700 text-white shadow-xs font-bold"
                                : "bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200"
                            }`}
                          >
                            <span>Waiting</span>
                            <span className="font-extrabold text-[10px]">({standbyUsers.length})</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setParticipantSubTab("absent")}
                            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 cursor-pointer flex items-center gap-1 ${
                              participantSubTab === "absent"
                                ? "bg-rose-700 text-white shadow-xs font-bold"
                                : "bg-rose-50 text-rose-800 hover:bg-rose-100 border border-rose-200"
                            }`}
                          >
                            <span>Unattended</span>
                            <span className="font-extrabold text-[10px]">({absentUsers.length})</span>
                          </button>
                        </div>

                        {/* Search & Add Controls */}
                        <div className="flex items-center gap-2 shrink-0">
                          <div className="relative w-full sm:w-44">
                            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                            <Input
                              placeholder="Search participant..."
                              value={participantSearchQuery}
                              onChange={(e) => setParticipantSearchQuery(e.target.value)}
                              className="h-8 text-xs pl-8 pr-2.5 rounded-xl border-slate-200 bg-white"
                            />
                          </div>

                          <Button
                            size="sm"
                            type="button"
                            onClick={() => {
                              setManualAddUserEmail("");
                              setManualAddUserName("");
                              setManualAddAttended(isViewingPast || viewPlan.status === "COMPLETED");
                              setShowAddParticipantModal(true);
                            }}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 h-8 px-3"
                          >
                            <UserPlus className="w-3.5 h-3.5" />
                            <span>Add</span>
                          </Button>

                          {isViewingPast && (
                            <Button
                              size="sm"
                              type="button"
                              variant="outline"
                              onClick={async () => {
                                if (window.confirm(`Are you sure you want to permanently delete Edition ${pastNum} from past records? All participant and attendance history for this edition will be removed.`)) {
                                  try {
                                    const res = await deletePastEdition({
                                      planId: viewPlan._id,
                                      editionNumber: pastNum!,
                                      actorEmail: user?.email || "",
                                    });
                                    toast.success(res.message);
                                    const updatedPast = (viewPlan.pastEditions || []).filter((p: any) => p.editionNumber !== pastNum);
                                    setViewPlan((prev: any) => ({
                                      ...prev,
                                      pastEditions: updatedPast,
                                      completedEditionsCount: Math.max(0, updatedPast.length + (prev.status === "COMPLETED" ? 1 : 0))
                                    }));
                                    setViewPlanEditionTab("current");
                                  } catch (e: any) {
                                    toast.error(e.message || "Failed to delete edition");
                                  }
                                }
                              }}
                              className="text-rose-600 border-rose-200 hover:bg-rose-50 font-semibold text-xs rounded-xl h-8 px-2.5 flex items-center gap-1"
                              title="Delete this historical edition"
                            >
                              <Trash className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* ── Participant List Cards (Mild Neumorphism) ── */}
                      {displayUsers.length > 0 ? (
                        <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                          {displayUsers.map((u: any, i: number) => {
                            const originalIndex = sortedActiveUsers.findIndex(
                              (usr: any) => usr.email.toLowerCase() === u.email.toLowerCase()
                            );
                            const isConfirmedSpot = originalIndex >= 0 && originalIndex < maxCap;
                            const isStandbySpot = originalIndex >= maxCap;

                            const isApprovedStudent = u.attended && u.submissionStatus === "APPROVED";

                            return (
                              <div
                                key={i}
                                className={`neumorph-inset p-3.5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-3 border transition-all ${
                                  isApprovedStudent
                                    ? "bg-amber-50/50 border-amber-300/90 shadow-xs ring-1 ring-amber-200/70"
                                    : "bg-white border-slate-200/80 hover:bg-slate-50/70"
                                }`}
                              >
                                {/* Left: User Info & Submission Link */}
                                <div className="min-w-0 flex-1 space-y-1.5">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    {isConfirmedSpot && (
                                      <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                                        #{originalIndex + 1} Confirmed
                                      </span>
                                    )}
                                    {isStandbySpot && (
                                      <span className="text-[10px] font-extrabold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                                        #{originalIndex + 1} Waiting List
                                      </span>
                                    )}

                                    <p className="font-bold text-sm text-slate-900 truncate">{u.name}</p>

                                    {u.attended ? (
                                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                        Attended ✓
                                      </span>
                                    ) : (
                                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                                        Unattended / Absent
                                      </span>
                                    )}

                                    {isApprovedStudent && (
                                      <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950 border border-amber-300 flex items-center gap-1 shadow-xs">
                                        <Star className="w-3 h-3 fill-slate-950 text-slate-950" />
                                        Submission Approved ⭐
                                      </span>
                                    )}
                                    {u.attended && u.submissionStatus === "REJECTED" && (
                                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200">
                                        Needs Revision ❌
                                      </span>
                                    )}
                                    {u.attended && u.submissionStatus === "PENDING" && (
                                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                                        Pending Review ⏳
                                      </span>
                                    )}
                                  </div>

                                  <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
                                    <span className="font-medium">{u.email}</span>
                                    {u.registeredAt && (
                                      <span className="text-[11px] text-slate-400">
                                        • Registered {new Date(u.registeredAt).toLocaleDateString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                                      </span>
                                    )}
                                  </div>

                                  {/* Submission Link Gating: Only for Attended participants */}
                                  {u.attended ? (
                                    u.submissionUrl ? (
                                      <div className="pt-1">
                                        <div className="inline-flex items-center gap-2 text-xs bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200 max-w-full">
                                          <LinkIcon className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                          <span className="font-bold text-slate-700 shrink-0">Submitted Link:</span>
                                          <a
                                            href={u.submissionUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-emerald-700 hover:text-emerald-800 underline font-semibold truncate max-w-xs"
                                          >
                                            {u.submissionUrl}
                                          </a>
                                          <a href={u.submissionUrl} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-slate-600">
                                            <ExternalLink className="w-3 h-3" />
                                          </a>
                                        </div>
                                        {u.feedbackNote && (
                                          <p className="text-[11px] text-rose-600 italic mt-1 font-medium pl-1">
                                            Feedback note: "{u.feedbackNote}"
                                          </p>
                                        )}
                                      </div>
                                    ) : (
                                      <p className="text-[11px] text-slate-400 italic pt-0.5">
                                        Awaiting project completion link submission from participant
                                      </p>
                                    )
                                  ) : (
                                    <p className="text-[11px] text-slate-400 italic pt-0.5">
                                      Unattended participant — no project link submission active
                                    </p>
                                  )}
                                </div>

                                {/* Right: Action Buttons */}
                                <div className="flex items-center gap-2 shrink-0 flex-wrap self-end md:self-center">
                                  {/* Approval actions for Attended participants with links */}
                                  {u.attended && u.submissionUrl && (
                                    <div className="flex items-center gap-1 bg-slate-100/90 p-1 rounded-xl border border-slate-200">
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        title="Approve Completion"
                                        onClick={async () => {
                                          try {
                                            const res = await reviewLearningSubmission({
                                              planId: viewPlan._id,
                                              userEmail: u.email,
                                              status: "APPROVED"
                                            });
                                            toast.success(res.message);
                                            if (isViewingPast) {
                                              setViewPlan((p: any) => ({
                                                ...p,
                                                pastEditions: (p.pastEditions || []).map((ed: any) =>
                                                  ed.editionNumber === pastNum
                                                    ? {
                                                        ...ed,
                                                        registeredUsers: (ed.registeredUsers || []).map((usr: any) =>
                                                          usr.email.toLowerCase() === u.email.toLowerCase()
                                                            ? { ...usr, submissionStatus: "APPROVED" }
                                                            : usr
                                                        ),
                                                      }
                                                    : ed
                                                ),
                                              }));
                                            } else {
                                              setViewPlan((p: any) => ({
                                                ...p,
                                                registeredUsers: p.registeredUsers.map((usr: any) =>
                                                  usr.email.toLowerCase() === u.email.toLowerCase() ? { ...usr, submissionStatus: "APPROVED" } : usr
                                                )
                                              }));
                                            }
                                          } catch (e: any) {
                                            toast.error(e.message || "Failed to approve submission");
                                          }
                                        }}
                                        className={`h-8 px-2.5 rounded-lg font-bold text-xs transition-all gap-1 ${
                                          u.submissionStatus === "APPROVED"
                                            ? "bg-emerald-600 text-white shadow-xs"
                                            : "text-emerald-700 hover:bg-emerald-100"
                                        }`}
                                      >
                                        <ThumbsUp className="w-3.5 h-3.5" />
                                        <span>Approve</span>
                                      </Button>

                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        title="Request Revision / Follow-up"
                                        onClick={async () => {
                                          const feedbackNote = window.prompt(`Enter follow-up note / instructions for ${u.name}:`) || "";
                                          try {
                                            const res = await reviewLearningSubmission({
                                              planId: viewPlan._id,
                                              userEmail: u.email,
                                              status: "REJECTED",
                                              feedbackNote
                                            });
                                            toast.success(res.message);
                                            if (isViewingPast) {
                                              setViewPlan((p: any) => ({
                                                ...p,
                                                pastEditions: (p.pastEditions || []).map((ed: any) =>
                                                  ed.editionNumber === pastNum
                                                    ? {
                                                        ...ed,
                                                        registeredUsers: (ed.registeredUsers || []).map((usr: any) =>
                                                          usr.email.toLowerCase() === u.email.toLowerCase()
                                                            ? { ...usr, submissionStatus: "REJECTED", feedbackNote }
                                                            : usr
                                                        ),
                                                      }
                                                    : ed
                                                ),
                                              }));
                                            } else {
                                              setViewPlan((p: any) => ({
                                                ...p,
                                                registeredUsers: p.registeredUsers.map((usr: any) =>
                                                  usr.email.toLowerCase() === u.email.toLowerCase() ? { ...usr, submissionStatus: "REJECTED", feedbackNote } : usr
                                                )
                                              }));
                                            }
                                          } catch (e: any) {
                                            toast.error(e.message || "Failed to request follow-up");
                                          }
                                        }}
                                        className={`h-8 px-2.5 rounded-lg font-bold text-xs transition-all gap-1 ${
                                          u.submissionStatus === "REJECTED"
                                            ? "bg-rose-600 text-white shadow-xs"
                                            : "text-rose-700 hover:bg-rose-100"
                                        }`}
                                      >
                                        <ThumbsDown className="w-3.5 h-3.5" />
                                        <span>Revision</span>
                                      </Button>
                                    </div>
                                  )}

                                  {/* Attendance Toggle Button */}
                                  <Button
                                    size="sm"
                                    variant={u.attended ? "default" : "outline"}
                                    onClick={async () => {
                                      try {
                                        const newAttended = !u.attended;
                                        const res = await toggleAttendance({
                                          planId: viewPlan._id,
                                          userEmail: u.email,
                                          attended: newAttended,
                                          editionNumber: activeEditionNumber,
                                        });
                                        toast.success(res.message);
                                        if (isViewingPast) {
                                          setViewPlan((p: any) => ({
                                            ...p,
                                            pastEditions: (p.pastEditions || []).map((ed: any) =>
                                              ed.editionNumber === pastNum
                                                ? {
                                                    ...ed,
                                                    registeredUsers: (ed.registeredUsers || []).map((usr: any) =>
                                                      usr.email.toLowerCase() === u.email.toLowerCase()
                                                        ? { ...usr, attended: newAttended }
                                                        : usr
                                                    ),
                                                  }
                                                : ed
                                            ),
                                          }));
                                        } else {
                                          setViewPlan((p: any) => ({
                                            ...p,
                                            registeredUsers: p.registeredUsers.map((usr: any) =>
                                              usr.email.toLowerCase() === u.email.toLowerCase() ? { ...usr, attended: newAttended } : usr
                                            )
                                          }));
                                        }
                                      } catch (e: any) {
                                        toast.error(e.message || "Failed to update attendance");
                                      }
                                    }}
                                    className={`text-xs h-8 px-3 rounded-xl font-semibold transition-all ${
                                      u.attended
                                        ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                                        : "neumorph-btn text-slate-700 hover:bg-emerald-50 hover:text-emerald-700"
                                    }`}
                                  >
                                    <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                                    {u.attended ? "Attended" : "Mark Present"}
                                  </Button>

                                  {/* Remove Participant */}
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    title={`Remove ${u.name} from this edition`}
                                    onClick={async () => {
                                      if (window.confirm(`Are you sure you want to remove ${u.name} from Edition ${activeEditionNumber}?`)) {
                                        try {
                                          const res = await removeParticipant({
                                            planId: viewPlan._id,
                                            userEmail: u.email,
                                            editionNumber: activeEditionNumber,
                                          });
                                          toast.success(res.message);
                                          if (isViewingPast) {
                                            setViewPlan((p: any) => ({
                                              ...p,
                                              pastEditions: (p.pastEditions || []).map((ed: any) =>
                                                ed.editionNumber === pastNum
                                                  ? {
                                                      ...ed,
                                                      registeredUsers: (ed.registeredUsers || []).filter(
                                                        (usr: any) => usr.email.toLowerCase() !== u.email.toLowerCase()
                                                      ),
                                                    }
                                                  : ed
                                              ),
                                            }));
                                          } else {
                                            setViewPlan((p: any) => ({
                                              ...p,
                                              registeredUsers: p.registeredUsers.filter((usr: any) => usr.email.toLowerCase() !== u.email.toLowerCase())
                                            }));
                                          }
                                        } catch (e: any) {
                                          toast.error(e.message || "Failed to remove participant");
                                        }
                                      }
                                    }}
                                    className="h-8 w-8 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl"
                                  >
                                    <UserX className="w-4 h-4" />
                                  </Button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-sm text-slate-400 italic py-8 text-center bg-slate-50/60 rounded-2xl border border-dashed border-slate-200">
                          {participantSearchQuery ? "No participants match your search query." : "No participants registered in this category."}
                        </p>
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Manual Add Participant Modal */}
      <Dialog open={showAddParticipantModal} onOpenChange={setShowAddParticipantModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <UserPlus className="w-6 h-6 text-emerald-600" />
              Add Participant Manually
            </DialogTitle>
          </DialogHeader>

          {viewPlan && (() => {
            const isViewingPast = viewPlanEditionTab.startsWith("past-");
            const pastNum = isViewingPast ? parseInt(viewPlanEditionTab.replace("past-", ""), 10) : null;
            const targetEditionNum = isViewingPast ? pastNum! : (viewPlan.edition || 1);

            return (
              <div className="space-y-4 py-2">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-700">Target Session:</span>
                  <span className="font-extrabold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-300">
                    Edition {targetEditionNum} {isViewingPast ? "(Archived Session)" : "(Current Session)"}
                  </span>
                </div>

                {/* Quick Select from Registered Users */}
                {allUsers && allUsers.length > 0 && (
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700">Quick select approved user:</Label>
                    <select
                      className="w-full h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      onChange={(e) => {
                        const selected = (allUsers || []).find((u: any) => u.email === e.target.value);
                        if (selected) {
                          setManualAddUserName(selected.name);
                          setManualAddUserEmail(selected.email);
                        }
                      }}
                      defaultValue=""
                    >
                      <option value="" disabled>Choose existing user or enter below...</option>
                      {allUsers.map((usr: any) => (
                        <option key={usr._id} value={usr.email}>
                          {usr.name} ({usr.email})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700">Participant Full Name</Label>
                    <Input
                      placeholder="e.g. Anith Ghalley"
                      value={manualAddUserName}
                      onChange={(e) => setManualAddUserName(e.target.value)}
                      className="text-xs h-9"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700">Participant Email</Label>
                    <Input
                      type="email"
                      placeholder="e.g. anith@example.com"
                      value={manualAddUserEmail}
                      onChange={(e) => setManualAddUserEmail(e.target.value)}
                      className="text-xs h-9"
                    />
                  </div>

                  <div className="flex items-center gap-2 pt-2 bg-emerald-50/70 p-3 rounded-xl border border-emerald-200">
                    <input
                      type="checkbox"
                      id="manual-attended-check"
                      checked={manualAddAttended}
                      onChange={(e) => setManualAddAttended(e.target.checked)}
                      className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                    />
                    <label htmlFor="manual-attended-check" className="text-xs font-semibold text-slate-800 cursor-pointer">
                      Mark as Attended immediately (Verified Participant)
                    </label>
                  </div>
                </div>

                <DialogFooter className="flex gap-2 pt-2">
                  <Button variant="ghost" type="button" onClick={() => setShowAddParticipantModal(false)} className="flex-1">
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    disabled={isSubmittingManualAdd || !manualAddUserName.trim() || !manualAddUserEmail.trim()}
                    onClick={async () => {
                      if (!manualAddUserName.trim() || !manualAddUserEmail.trim()) {
                        toast.error("Please enter participant name and email");
                        return;
                      }
                      setIsSubmittingManualAdd(true);
                      try {
                        const res = await addParticipantManual({
                          planId: viewPlan._id,
                          name: manualAddUserName.trim(),
                          email: manualAddUserEmail.trim(),
                          editionNumber: targetEditionNum,
                          attended: manualAddAttended,
                        });
                        toast.success(res.message);

                        const newUserObj = {
                          name: manualAddUserName.trim(),
                          email: manualAddUserEmail.trim().toLowerCase(),
                          registeredAt: Date.now(),
                          attended: manualAddAttended,
                        };

                        if (isViewingPast) {
                          setViewPlan((prev: any) => ({
                            ...prev,
                            pastEditions: (prev.pastEditions || []).map((ed: any) =>
                              ed.editionNumber === targetEditionNum
                                ? { ...ed, registeredUsers: [...(ed.registeredUsers || []), newUserObj] }
                                : ed
                            ),
                          }));
                        } else {
                          setViewPlan((prev: any) => ({
                            ...prev,
                            registeredUsers: [...(prev.registeredUsers || []), newUserObj],
                          }));
                        }

                        setShowAddParticipantModal(false);
                      } catch (e: any) {
                        toast.error(e.message || "Failed to add participant");
                      } finally {
                        setIsSubmittingManualAdd(false);
                      }
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex-1"
                  >
                    {isSubmittingManualAdd ? "Adding..." : "Add to Session"}
                  </Button>
                </DialogFooter>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>


      {/* Award Mastery Tag Modal */}
      <Dialog open={showAwardTagModal} onOpenChange={setShowAwardTagModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Award className="w-6 h-6 text-purple-600" />
              Award Mastery Tag & Complete Session
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <p className="text-xs text-slate-600">
              Select or type the mastery tag to award to all approved participants and curator. This tag will appear as a 3D badge on their dashboard header (e.g., 3D, Laser, CNC, CAD)!
            </p>

            <div className="space-y-2">
              <Label className="text-xs font-semibold">Mastery Tag Name</Label>
              <Input
                value={awardTagInput}
                onChange={(e) => setAwardTagInput(e.target.value)}
                placeholder="e.g. 3D, Laser, CNC, Electronics..."
                className="text-sm font-semibold"
              />
            </div>

            {viewPlan?.tags && viewPlan.tags.length > 0 && (
              <div className="space-y-1.5">
                <Label className="text-[11px] text-slate-500 font-medium">Quick select from plan tags:</Label>
                <div className="flex flex-wrap gap-1.5">
                  {viewPlan.tags.map((t: string) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setAwardTagInput(t)}
                      className={`px-3 py-1 rounded-full text-xs font-bold transition-all border ${
                        awardTagInput.toLowerCase() === t.toLowerCase()
                          ? "bg-purple-600 text-white border-purple-600 shadow"
                          : "bg-slate-100 text-slate-700 border-slate-200 hover:bg-purple-50 hover:text-purple-700"
                      }`}
                    >
                      + {t}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-2 border-t border-slate-100 space-y-3">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5 text-purple-600" />
                Optional: Add Edition Group Photo & Showcase Link
              </span>

              <div className="space-y-1">
                <Label className="text-[11px] font-semibold text-slate-600">Group Photo URL or Google Drive Link</Label>
                <Input
                  placeholder="https://drive.google.com/file/d/... or image URL"
                  value={awardGroupImgInput}
                  onChange={(e) => setAwardGroupImgInput(e.target.value)}
                  className="text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] font-semibold text-slate-600">Showcase / Album / Project Link</Label>
                <Input
                  placeholder="https://photos.google.com/... or blog/recap link"
                  value={awardGroupLinkInput}
                  onChange={(e) => setAwardGroupLinkInput(e.target.value)}
                  className="text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] font-semibold text-slate-600">Photo Caption / Memory Quote</Label>
                <Input
                  placeholder="e.g. Edition 1 Cohort Completion!"
                  value={awardGroupCaptionInput}
                  onChange={(e) => setAwardGroupCaptionInput(e.target.value)}
                  className="text-xs"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="flex gap-2">
            <Button variant="ghost" onClick={() => setShowAwardTagModal(false)} className="flex-1">
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (!awardTagInput.trim()) {
                  toast.error("Please enter or select a tag name");
                  return;
                }
                try {
                  const res = await completeSessionWithTags({
                    planId: viewPlan._id,
                    awardTag: awardTagInput.trim(),
                    scriptUrl: SCRIPT_URL,
                    groupImageUrl: awardGroupImgInput.trim() || undefined,
                    groupImageLink: awardGroupLinkInput.trim() || undefined,
                    groupImageCaption: awardGroupCaptionInput.trim() || undefined,
                  });
                  toast.success(res.message);
                  setShowAwardTagModal(false);
                  setViewPlan((p: any) => ({
                    ...p,
                    status: "COMPLETED",
                    awardedTag: awardTagInput.trim(),
                    groupImageUrl: awardGroupImgInput.trim() || p.groupImageUrl,
                    groupImageLink: awardGroupLinkInput.trim() || p.groupImageLink,
                    groupImageCaption: awardGroupCaptionInput.trim() || p.groupImageCaption,
                  }));
                } catch (e: any) {
                  toast.error(e.message || "Failed to complete session with tag");
                }
              }}
              className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold flex-1"
            >
              Award Tag & Finalize 🎉
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edition Group Photo & Link Modal */}
      <Dialog open={showEditionMediaModal} onOpenChange={setShowEditionMediaModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2 text-slate-900">
              <ImageIcon className="w-5 h-5 text-purple-600" />
              Edition {targetEditionNumForMedia} Group Photo & Showcase
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <p className="text-xs text-slate-600">
              Attach the group photo taken during or after this edition and an optional showcase link (e.g. Google Drive folder, Google Photos album, project recap). This will be displayed on all participant learning cards under <strong>Session Gallery & Visuals</strong>.
            </p>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">Group Photo URL or Google Drive Link</Label>
              <Input
                placeholder="https://drive.google.com/file/d/... or image URL"
                value={editionGroupImgInput}
                onChange={(e) => setEditionGroupImgInput(e.target.value)}
                className="text-xs font-mono"
              />
            </div>

            {editionGroupImgInput.trim().length > 5 && (
              <div className="p-2 bg-slate-100 rounded-xl border border-slate-200 overflow-hidden flex flex-col items-center justify-center max-h-48">
                <img
                  src={getOptimizedImageUrl(editionGroupImgInput.trim())}
                  alt="Preview"
                  className="max-h-40 object-contain rounded-lg shadow-2xs"
                  referrerPolicy="no-referrer"
                />
                <span className="text-[10px] text-slate-500 mt-1 font-medium">Group Photo Preview</span>
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">Photo Caption / Memory Note (Optional)</Label>
              <Input
                placeholder="e.g. Edition 1 Graduating Cohort - 12 makers completed!"
                value={editionGroupCaptionInput}
                onChange={(e) => setEditionGroupCaptionInput(e.target.value)}
                className="text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">Showcase / Album / Recap Link (Optional)</Label>
              <Input
                placeholder="https://photos.google.com/... or https://github.com/... or blog"
                value={editionGroupLinkInput}
                onChange={(e) => setEditionGroupLinkInput(e.target.value)}
                className="text-xs"
              />
            </div>
          </div>

          <DialogFooter className="flex gap-2">
            <Button variant="ghost" onClick={() => setShowEditionMediaModal(false)} className="flex-1 text-xs">
              Cancel
            </Button>
            <Button
              disabled={isSavingMedia}
              onClick={async () => {
                setIsSavingMedia(true);
                try {
                  const res = await updateEditionMedia({
                    planId: viewPlan._id,
                    editionNumber: targetEditionNumForMedia,
                    groupImageUrl: editionGroupImgInput.trim() || undefined,
                    groupImageLink: editionGroupLinkInput.trim() || undefined,
                    groupImageCaption: editionGroupCaptionInput.trim() || undefined,
                  });

                  const cleanImg = editionGroupImgInput.trim() || undefined;
                  const cleanLink = editionGroupLinkInput.trim() || undefined;
                  const cleanCap = editionGroupCaptionInput.trim() || undefined;

                  setViewPlan((prev: any) => {
                    if (!prev) return prev;
                    const curEd = prev.edition || 1;
                    if (targetEditionNumForMedia === curEd) {
                      return {
                        ...prev,
                        groupImageUrl: cleanImg,
                        groupImageLink: cleanLink,
                        groupImageCaption: cleanCap,
                      };
                    } else {
                      return {
                        ...prev,
                        pastEditions: (prev.pastEditions || []).map((pe: any) =>
                          pe.editionNumber === targetEditionNumForMedia
                            ? { ...pe, groupImageUrl: cleanImg, groupImageLink: cleanLink, groupImageCaption: cleanCap }
                            : pe
                        ),
                      };
                    }
                  });

                  toast.success(res.message || "Group media updated!");
                  setShowEditionMediaModal(false);
                } catch (err: any) {
                  toast.error(err.message || "Failed to update group media");
                } finally {
                  setIsSavingMedia(false);
                }
              }}
              className="bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs flex-1 shadow-sm"
            >
              {isSavingMedia ? "Saving..." : "Save Group Media ✓"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
