import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ProjectOption {
  projectId: string;
  name: string;
}

interface ProjectAssignmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemName: string;
  projects: ProjectOption[];
  onAssign: (projectId: string) => Promise<void>;
}

export default function ProjectAssignmentDialog({
  open,
  onOpenChange,
  itemName,
  projects,
  onAssign,
}: ProjectAssignmentDialogProps) {
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      setSelectedProjectId("");
      setIsSubmitting(false);
      return;
    }

    if (projects.length > 0) {
      setSelectedProjectId(projects[0].projectId);
    }
  }, [open, projects]);

  const handleAssign = async () => {
    if (!selectedProjectId) return;
    setIsSubmitting(true);
    try {
      await onAssign(selectedProjectId);
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add To Project</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="rounded-xl border bg-slate-50 p-4 text-sm text-slate-600">
            <p>
              Choose which active project should track <strong>{itemName}</strong> in its project box.
            </p>
          </div>

          <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
            <SelectTrigger>
              <SelectValue placeholder="Select project" />
            </SelectTrigger>
            <SelectContent>
              {projects.map((project) => (
                <SelectItem key={project.projectId} value={project.projectId}>
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleAssign}
            disabled={!selectedProjectId || isSubmitting || projects.length === 0}
            className="bg-slate-900 hover:bg-slate-800"
          >
            {isSubmitting ? "Adding..." : "Add To Project"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
