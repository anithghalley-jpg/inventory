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
import { Edit, Trash, Plus, FileText, Image as ImageIcon, Video, Link as LinkIcon, Users, X, CheckCircle2, UserX, Square, CheckCircle, Award, ThumbsUp, ThumbsDown, ExternalLink, Star, Clock, Calendar, Tag, MapPin } from "lucide-react";
import { getOptimizedImageUrl } from "@/lib/utils";
import { SCRIPT_URL } from "@/config";

interface MyPlansTabProps {
  teamMembers: any[];
}

export default function MyPlansTab({ teamMembers }: MyPlansTabProps) {
  const { user } = useAuth();
  const myPlans = useQuery(api.learningPlans.getMyPlans, { userEmail: user?.email || "" });
  const createPlan = useMutation(api.learningPlans.createPlan);
  const updatePlan = useMutation(api.learningPlans.updatePlan);
  const deletePlan = useMutation(api.learningPlans.deletePlan);
  const removeParticipant = useMutation(api.learningPlans.removeParticipant);
  const toggleAttendance = useMutation(api.learningPlans.toggleAttendance);
  const setPlanStatus = useMutation(api.learningPlans.setPlanStatus);
  const reviewLearningSubmission = useMutation(api.learningPlans.reviewLearningSubmission);
  const completeSessionWithTags = useMutation(api.learningPlans.completeSessionWithTags);

  const [isEditing, setIsEditing] = useState(false);
  const [currentPlan, setCurrentPlan] = useState<any>(null);
  const [showAwardTagModal, setShowAwardTagModal] = useState(false);
  const [awardTagInput, setAwardTagInput] = useState("");

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
                  </div>
                )}
                <div className="p-4 flex flex-col flex-1">
                  <div className="flex items-start justify-between mb-2 gap-2">
                    <div>
                      <h3 className="font-bold text-lg text-slate-900 line-clamp-1">{plan.title}</h3>
                      <span className="text-[10px] font-extrabold text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-full inline-block mt-0.5">
                        Edition {editionNum}
                      </span>
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

      <Dialog open={!!viewPlan} onOpenChange={(open) => !open && setViewPlan(null)}>
        <DialogContent className="max-w-4xl lg:max-w-5xl max-h-[92vh] overflow-y-auto p-6 md:p-8">
          <DialogHeader className="flex flex-row items-center justify-between pr-4">
            <DialogTitle className="text-2xl font-extrabold text-slate-900">{viewPlan?.title}</DialogTitle>
          </DialogHeader>
          {viewPlan && (
            <div className="space-y-6 py-2">
              {viewPlan.imageUrls && viewPlan.imageUrls.filter((u: string) => typeof u === "string" && u.trim().length > 5).length > 0 && (
                <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-100 flex items-center justify-center max-h-64">
                  <img
                    src={getOptimizedImageUrl(viewPlan.imageUrls.find((u: string) => typeof u === "string" && u.trim().length > 5))}
                    alt={viewPlan.title}
                    className="w-full h-auto max-h-64 object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
              )}
              
              <div className="flex items-center justify-between bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-slate-500">Status:</span>
                    <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${viewPlan.status === 'COMPLETED' ? 'bg-purple-100 text-purple-700 border border-purple-200' : viewPlan.status === 'PUBLISHED' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                      {viewPlan.status}
                    </span>
                  </div>
                  {(viewPlan.date || viewPlan.time || viewPlan.location) && (
                    <div className="text-xs text-slate-500 font-medium flex flex-wrap gap-x-3 gap-y-1 pt-1">
                      {viewPlan.date && <span>📅 {viewPlan.date}</span>}
                      {viewPlan.time && <span>⏰ {viewPlan.time}</span>}
                      {viewPlan.location && <span>📍 {viewPlan.location}</span>}
                    </div>
                  )}
                </div>

                {viewPlan.status === "COMPLETED" ? (
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-purple-900 bg-purple-100 border border-purple-300 px-3 py-1 rounded-full flex items-center gap-1.5 shadow-sm">
                      <Award className="w-3.5 h-3.5 text-purple-600" />
                      Completed • Tag: {viewPlan.awardedTag || viewPlan.tags?.[0] || 'Mastery'} 🎉
                    </span>
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
                      className="text-amber-700 border-amber-300 hover:bg-amber-50 font-semibold text-xs rounded-full"
                    >
                      Re-open Session
                    </Button>
                  </div>
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
                          className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-xs rounded-full shadow-md px-4 py-2 flex items-center gap-1.5"
                        >
                          <Award className="w-4 h-4" />
                          Complete & Award Mastery Tag 🎉
                        </Button>
                      );
                    }

                    return (
                      <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl text-xs text-amber-900 font-semibold">
                        <Clock className="w-4 h-4 text-amber-600 shrink-0 animate-pulse" />
                        <span>Awaiting Proof Approvals ({approvedUsers.length}/{attendedUsers.length} Approved)</span>
                      </div>
                    );
                  })()
                )}
              </div>

              <div>
                <h4 className="font-semibold text-slate-900 mb-2 text-sm">Description</h4>
                <p className="text-sm text-slate-600 whitespace-pre-wrap bg-white p-3 rounded-lg border border-slate-100">{viewPlan.description}</p>
              </div>

              <div>
                <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-3">
                  <h4 className="font-semibold text-slate-900 text-sm flex items-center gap-2">
                    <Users className="w-4 h-4 text-emerald-600" />
                    Registered Participants ({viewPlan.registeredUsers?.length || 0})
                  </h4>
                  {viewPlan.registeredUsers?.length > 0 && (
                    <span className="text-xs text-slate-500 font-medium">
                      {viewPlan.registeredUsers.filter((u: any) => u.attended).length} / {viewPlan.registeredUsers.length} Attended
                    </span>
                  )}
                </div>

                {viewPlan.registeredUsers?.length > 0 ? (
                  <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 max-h-72 overflow-y-auto bg-white shadow-sm">
                    {viewPlan.registeredUsers.map((u: any, i: number) => (
                      <div key={i} className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50 transition-colors">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            {u.submissionStatus === "APPROVED" && (
                              <Star className="w-4 h-4 fill-amber-400 text-amber-500 shrink-0" />
                            )}
                            <p className="font-semibold text-sm text-slate-900">{u.name}</p>
                            {u.submissionStatus === "APPROVED" && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1">
                                <Star className="w-3 h-3 fill-amber-500 text-amber-600" />
                                Starred Experience ⭐
                              </span>
                            )}
                            {u.submissionStatus === "REJECTED" && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200">
                                Needs Follow-up ❌
                              </span>
                            )}
                            {u.submissionStatus === "PENDING" && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                                Pending Review ⏳
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500">{u.email}</p>
                          
                          {u.submissionUrl && (
                            <div className="mt-1.5 flex items-center gap-1.5 text-xs text-slate-700 bg-slate-100/80 px-2.5 py-1 rounded-md max-w-md border border-slate-200">
                              <LinkIcon className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              <span className="font-medium shrink-0">Submitted Link:</span>
                              <a
                                href={u.submissionUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-emerald-600 hover:text-emerald-700 underline font-semibold truncate max-w-[200px]"
                              >
                                {u.submissionUrl}
                              </a>
                              <a href={u.submissionUrl} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-slate-600">
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            </div>
                          )}

                          {u.feedbackNote && (
                            <p className="text-[11px] text-rose-600 italic mt-1 font-medium">
                              Note sent: "{u.feedbackNote}"
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {u.submissionUrl && (
                            <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-lg border border-slate-200">
                              <Button
                                size="sm"
                                variant="ghost"
                                title="Approve Completion (Thumbs Up)"
                                onClick={async () => {
                                  try {
                                    const res = await reviewLearningSubmission({
                                      planId: viewPlan._id,
                                      userEmail: u.email,
                                      status: "APPROVED"
                                    });
                                    toast.success(res.message);
                                    setViewPlan((p: any) => ({
                                      ...p,
                                      registeredUsers: p.registeredUsers.map((usr: any) =>
                                        usr.email.toLowerCase() === u.email.toLowerCase() ? { ...usr, submissionStatus: "APPROVED" } : usr
                                      )
                                    }));
                                  } catch (e: any) {
                                    toast.error(e.message || "Failed to approve submission");
                                  }
                                }}
                                className={`h-8 px-2.5 rounded-md font-semibold text-xs transition-all gap-1 ${
                                  u.submissionStatus === "APPROVED"
                                    ? "bg-emerald-600 text-white shadow-sm"
                                    : "text-emerald-600 hover:bg-emerald-100 hover:text-emerald-800"
                                }`}
                              >
                                <ThumbsUp className="w-3.5 h-3.5" />
                                <span>Approve</span>
                              </Button>

                              <Button
                                size="sm"
                                variant="ghost"
                                title="Red Mark / Request Revision (Thumbs Down)"
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
                                    setViewPlan((p: any) => ({
                                      ...p,
                                      registeredUsers: p.registeredUsers.map((usr: any) =>
                                        usr.email.toLowerCase() === u.email.toLowerCase() ? { ...usr, submissionStatus: "REJECTED", feedbackNote } : usr
                                      )
                                    }));
                                  } catch (e: any) {
                                    toast.error(e.message || "Failed to request follow-up");
                                  }
                                }}
                                className={`h-8 px-2.5 rounded-md font-semibold text-xs transition-all gap-1 ${
                                  u.submissionStatus === "REJECTED"
                                    ? "bg-rose-600 text-white shadow-sm"
                                    : "text-rose-600 hover:bg-rose-100 hover:text-rose-800"
                                }`}
                              >
                                <ThumbsDown className="w-3.5 h-3.5" />
                                <span>Red Mark</span>
                              </Button>
                            </div>
                          )}

                          {viewPlan.status === "COMPLETED" ? (
                            <span className="text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
                              {u.attended ? "Attended ✓" : "Absence Noted"}
                            </span>
                          ) : (
                            <>
                              <Button
                                size="sm"
                                variant={u.attended ? "default" : "outline"}
                                onClick={async () => {
                                  try {
                                    const newAttended = !u.attended;
                                    const res = await toggleAttendance({ planId: viewPlan._id, userEmail: u.email, attended: newAttended });
                                    toast.success(res.message);
                                    setViewPlan((p: any) => ({
                                      ...p,
                                      registeredUsers: p.registeredUsers.map((usr: any) =>
                                        usr.email.toLowerCase() === u.email.toLowerCase() ? { ...usr, attended: newAttended } : usr
                                      )
                                    }));
                                  } catch (e: any) {
                                    toast.error(e.message || "Failed to update attendance");
                                  }
                                }}
                                className={`text-xs h-8 px-3 rounded-full font-medium transition-all ${
                                  u.attended
                                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm'
                                    : 'text-slate-600 border-slate-300 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300'
                                }`}
                              >
                                <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                                {u.attended ? "Attended" : "Mark Present"}
                              </Button>

                              <Button
                                size="icon"
                                variant="ghost"
                                title="Remove participant"
                                onClick={async () => {
                                  if (window.confirm(`Are you sure you want to remove ${u.name} from this session?`)) {
                                    try {
                                      const res = await removeParticipant({ planId: viewPlan._id, userEmail: u.email });
                                      toast.success(res.message);
                                      setViewPlan((p: any) => ({
                                        ...p,
                                        registeredUsers: p.registeredUsers.filter((usr: any) => usr.email.toLowerCase() !== u.email.toLowerCase())
                                      }));
                                    } catch (e: any) {
                                      toast.error(e.message || "Failed to remove participant");
                                    }
                                  }
                                }}
                                className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full"
                              >
                                <UserX className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500 italic py-4 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    No participants have registered for this session yet.
                  </p>
                )}

                {viewPlan.registeredUsers?.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between bg-purple-50/50 p-3 rounded-xl border border-purple-100">
                    <div>
                      <p className="text-xs font-semibold text-purple-900">Finish Attendance</p>
                      <p className="text-[11px] text-purple-700">Mark session complete so attended students receive their Learning Experience.</p>
                    </div>
                    <Button
                      size="sm"
                      onClick={async () => {
                        try {
                          const res = await setPlanStatus({ planId: viewPlan._id, status: "COMPLETED" });
                          toast.success("Attendance completed! Session marked as Completed.");
                          setViewPlan((p: any) => ({ ...p, status: "COMPLETED" }));
                        } catch (e: any) {
                          toast.error(e.message || "Failed to complete attendance");
                        }
                      }}
                      className="bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs rounded-full shadow-sm gap-1.5 shrink-0"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Complete Attendance
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
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
                  });
                  toast.success(res.message);
                  setShowAwardTagModal(false);
                  setViewPlan((p: any) => ({
                    ...p,
                    status: "COMPLETED",
                    awardedTag: awardTagInput.trim(),
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
    </div>
  );
}
