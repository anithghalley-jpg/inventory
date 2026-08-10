import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  formatDateTime,
  formatDateOnly,
  HISTORY_ACTION_LABELS,
  type ProjectHistoryEntry,
  type ProjectDetailRecord,
  ProjectAvatar,
} from "./projectShared";
import { X, Clock, ChevronRight, History } from "lucide-react";

export default function ProjectHistoryPanel({
  projectId,
  userEmail,
  projectDetail,
}: {
  projectId: string;
  userEmail: string;
  projectDetail: ProjectDetailRecord;
}) {
  const history = useQuery(api.projects.getProjectHistory, { userEmail, projectId });
  const [selectedEntry, setSelectedEntry] = useState<ProjectHistoryEntry | null>(null);

  if (history === undefined) {
    return <div className="p-8 text-center text-slate-500 animate-pulse">Loading history...</div>;
  }

  const isMilestone = (action: string) => [
    "PROJECT_CREATED", "SETUP_APPROVED", "BOX_APPROVED", "PLAN_APPROVED", "MARKED_COMPLETED"
  ].includes(action);

  const isRejection = (action: string) => action.includes("REJECTED");

  return (
    <div className="relative">
      <div className="project-history-timeline py-4">
        {history.length === 0 ? (
          <p className="text-slate-500 text-center py-8">No history recorded yet.</p>
        ) : (
          history.map(entry => {
            const labelConfig = HISTORY_ACTION_LABELS[entry.action] || { label: entry.action, icon: "📋", color: "slate" };
            const milestone = isMilestone(entry.action);
            const rejection = isRejection(entry.action);

            return (
              <div 
                key={entry.historyId} 
                className={`project-history-entry ${milestone ? 'milestone' : ''} ${rejection ? 'rejection' : ''}`}
                onClick={() => setSelectedEntry(entry)}
              >
                <div className={`history-card rounded-xl border border-slate-200 bg-white p-4 transition-all hover:border-slate-300 ${milestone ? 'border-l-4 border-l-emerald-400' : rejection ? 'border-l-4 border-l-rose-400' : ''}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-${labelConfig.color}-100 text-lg`}>
                        {labelConfig.icon}
                      </div>
                      <div>
                        <h4 className="font-semibold text-slate-800">{labelConfig.label}</h4>
                        <p className="text-sm text-slate-500">by {entry.actorName}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-xs font-medium text-slate-400">{formatDateOnly(entry.createdAt)}</span>
                      <span className="text-[10px] text-slate-400">{new Date(entry.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Side Panel Overlay */}
      <div 
        className={`project-history-backdrop ${selectedEntry ? 'open' : ''}`}
        onClick={() => setSelectedEntry(null)}
      />

      {/* Side Panel */}
      <div className={`project-history-panel ${selectedEntry ? 'open' : ''}`}>
        {selectedEntry && (
          <div className="flex h-full flex-col bg-slate-50/50">
            <div className="flex items-center justify-between border-b border-slate-200 bg-white p-4 px-6">
              <h3 className="font-display text-lg font-bold text-slate-800 flex items-center gap-2">
                <History className="h-5 w-5 text-slate-400" />
                History Detail
              </h3>
              <Button variant="ghost" size="icon" onClick={() => setSelectedEntry(null)} className="h-8 w-8 rounded-full">
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <Card className="p-6 border-slate-200 shadow-sm bg-white">
                <div className="flex items-center gap-4 mb-6 pb-6 border-b border-slate-100">
                  <div className="text-4xl bg-slate-100 h-16 w-16 rounded-full flex items-center justify-center">
                    {HISTORY_ACTION_LABELS[selectedEntry.action]?.icon || "📋"}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-800">
                      {HISTORY_ACTION_LABELS[selectedEntry.action]?.label || selectedEntry.action}
                    </h2>
                    <p className="text-sm text-slate-500 flex items-center gap-1 mt-1">
                      <Clock className="h-3 w-3" />
                      {formatDateTime(selectedEntry.createdAt)}
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <p className="text-xs uppercase tracking-wider text-slate-400 font-semibold mb-1">Actor</p>
                    <p className="font-medium text-slate-700">{selectedEntry.actorName}</p>
                    <p className="text-sm text-slate-500">{selectedEntry.actorEmail}</p>
                  </div>

                  {selectedEntry.details && (
                    <div className="mt-6 pt-6 border-t border-slate-100">
                      <p className="text-xs uppercase tracking-wider text-slate-400 font-semibold mb-2">Details</p>
                      {isRejection(selectedEntry.action) ? (
                        <div className="bg-rose-50 border border-rose-200 rounded-lg p-4 text-rose-800 text-sm">
                          {selectedEntry.details}
                        </div>
                      ) : (
                        <div className="bg-slate-900 rounded-lg p-4 overflow-x-auto">
                          <pre className="text-xs text-emerald-400 font-mono whitespace-pre-wrap">
                            {JSON.stringify(JSON.parse(selectedEntry.details), null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
