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
import { Edit, Trash, Plus, FileText, Image as ImageIcon, Video, Link as LinkIcon, Users, X } from "lucide-react";
import { getOptimizedImageUrl } from "@/lib/utils";

interface MyPlansTabProps {
  teamMembers: any[];
}

export default function MyPlansTab({ teamMembers }: MyPlansTabProps) {
  const { user } = useAuth();
  const myPlans = useQuery(api.learningPlans.getMyPlans, { userEmail: user?.email || "" });
  const createPlan = useMutation(api.learningPlans.createPlan);
  const updatePlan = useMutation(api.learningPlans.updatePlan);
  const deletePlan = useMutation(api.learningPlans.deletePlan);

  const [isEditing, setIsEditing] = useState(false);
  const [currentPlan, setCurrentPlan] = useState<any>(null);

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
          myPlans?.map((plan: any) => (
            <Card key={plan._id} onClick={() => setViewPlan(plan)} className="overflow-hidden flex flex-col hover:shadow-md transition-all border-slate-200 cursor-pointer">
              {plan.imageUrls && plan.imageUrls.filter((u: string) => typeof u === "string" && u.trim().length > 5).length > 0 && (
                <div className="h-32 bg-slate-100 overflow-hidden">
                  <img src={getOptimizedImageUrl(plan.imageUrls.find((u: string) => typeof u === "string" && u.trim().length > 5))} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                </div>
              )}
              <div className="p-4 flex flex-col flex-1">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-bold text-lg text-slate-900 line-clamp-1">{plan.title}</h3>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${plan.status === 'PUBLISHED' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                    {plan.status}
                  </span>
                </div>
                {(plan.date || plan.time || plan.location) && (
                  <div className="text-xs text-slate-500 mb-2 font-medium flex flex-wrap gap-x-3 gap-y-1">
                    {plan.date && <span>📅 {plan.date}</span>}
                    {plan.time && <span>⏰ {plan.time}</span>}
                    {plan.location && <span>📍 {plan.location}</span>}
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
          ))
        )}
      </div>

      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{currentPlan ? "Edit Plan" : "Create New Session Plan"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label>Session Title</Label>
              <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g., Intro to 3D Printing" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Date <span className="text-xs text-muted-foreground">(Required for publish)</span></Label>
                <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Time <span className="text-xs text-muted-foreground">(Required for publish)</span></Label>
                <Input type="time" value={time} onChange={e => setTime(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Location <span className="text-xs text-muted-foreground">(Required for publish)</span></Label>
                <Input value={location} onChange={e => setLocation(e.target.value)} placeholder="e.g., Fab Lab Room 1" />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Tags</Label>
              <div className="flex flex-wrap gap-2 mb-2">
                {tags.map(tag => (
                  <span key={tag} className="flex items-center gap-1 bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-full text-sm font-medium">
                    {tag}
                    <button type="button" onClick={() => setTags(tags.filter(t => t !== tag))} className="text-emerald-500 hover:text-emerald-800 focus:outline-none">
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
                placeholder="Type a tag and press Enter" 
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2"><ImageIcon className="w-4 h-4" /> Image URLs</Label>
                <div className="flex flex-col gap-2">
                  {imageUrls.map((url, i) => (
                    <div key={i} className="flex items-center gap-2 bg-slate-50 p-2 rounded-md text-xs border border-slate-200">
                      <span className="truncate flex-1" title={url}>{url}</span>
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
                    placeholder="Paste URL and press Enter" 
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2"><Video className="w-4 h-4" /> Video URLs</Label>
                <div className="flex flex-col gap-2">
                  {videoUrls.map((url, i) => (
                    <div key={i} className="flex items-center gap-2 bg-slate-50 p-2 rounded-md text-xs border border-slate-200">
                      <span className="truncate flex-1" title={url}>{url}</span>
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
                    placeholder="Paste URL and press Enter" 
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2"><LinkIcon className="w-4 h-4" /> Documentation / Form Link</Label>
              <Input value={docLink} onChange={e => setDocLink(e.target.value)} placeholder="https://docs.google.com/forms/..." />
            </div>

            <div className="space-y-2">
              <Label>Session Description</Label>
              <Textarea 
                value={description} 
                onChange={e => setDescription(e.target.value)} 
                placeholder="Write a detailed description about the session..." 
                className="h-32"
              />
            </div>

            <div className="space-y-3">
              <Label className="flex items-center gap-2"><Users className="w-4 h-4" /> Add Collaborators</Label>
              <p className="text-xs text-muted-foreground">Select team members who can also edit this plan.</p>
              <div className="border border-slate-200 rounded-md p-3 max-h-40 overflow-y-auto space-y-2">
                {teamMembers.filter(m => m.email !== user?.email).map((member) => (
                  <label key={member.email} className="flex items-center gap-3 cursor-pointer p-1.5 hover:bg-slate-50 rounded">
                    <input 
                      type="checkbox" 
                      className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                      checked={selectedCollaborators.includes(member.email)}
                      onChange={() => toggleCollaborator(member.email)}
                    />
                    <span className="text-sm font-medium">{member.name}</span>
                  </label>
                ))}
                {teamMembers.filter(m => m.email !== user?.email).length === 0 && (
                  <div className="text-xs text-slate-500 italic">No other team members found.</div>
                )}
              </div>
            </div>
          </div>

          <DialogFooter className="flex gap-2 sm:justify-between">
            <Button variant="ghost" onClick={() => setIsEditing(false)}>Cancel</Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => handleSave("DRAFT")}>Save Draft</Button>
              <Button onClick={() => handleSave("PUBLISHED")} className="bg-emerald-600 hover:bg-emerald-700 text-white">Publish to Learning Hub</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewPlan} onOpenChange={(open) => !open && setViewPlan(null)}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{viewPlan?.title}</DialogTitle>
          </DialogHeader>
          {viewPlan && (
            <div className="space-y-6 py-4">
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
              <div className="text-sm text-slate-600 bg-slate-50 p-4 rounded-lg space-y-2">
                <p><strong>Status:</strong> <span className={`font-semibold ${viewPlan.status === 'PUBLISHED' ? 'text-emerald-600' : 'text-amber-600'}`}>{viewPlan.status}</span></p>
                {viewPlan.date && <p><strong>Date:</strong> {viewPlan.date}</p>}
                {viewPlan.time && <p><strong>Time:</strong> {viewPlan.time}</p>}
                {viewPlan.location && <p><strong>Location:</strong> {viewPlan.location}</p>}
              </div>
              <div>
                <h4 className="font-semibold text-slate-900 mb-2">Description</h4>
                <p className="text-sm text-slate-600 whitespace-pre-wrap">{viewPlan.description}</p>
              </div>
              <div>
                <h4 className="font-semibold text-slate-900 mb-2 border-b border-slate-200 pb-2">Registered Students ({viewPlan.registeredUsers?.length || 0})</h4>
                {viewPlan.registeredUsers?.length > 0 ? (
                  <div className="border border-slate-200 rounded-md divide-y divide-slate-100 max-h-48 overflow-y-auto mt-2">
                    {viewPlan.registeredUsers.map((u: any, i: number) => (
                      <div key={i} className="p-3 flex items-center justify-between">
                        <span className="font-medium text-sm text-slate-900">{u.name}</span>
                        <span className="text-xs text-slate-500">{u.email}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500 italic mt-2">No one has registered yet.</p>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
