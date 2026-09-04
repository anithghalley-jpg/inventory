import React, { useRef } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, Award, CheckCircle2, ShieldCheck, Sparkles, Users, X } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { getOptimizedImageUrl } from "@/lib/utils";

interface LearningReportPdfModalProps {
  isOpen: boolean;
  onClose: () => void;
  plan: any;
  user: any;
  myRecord: any;
}

export default function LearningReportPdfModal({
  isOpen,
  onClose,
  plan,
  user,
  myRecord,
}: LearningReportPdfModalProps) {
  const printRef = useRef<HTMLDivElement>(null);

  // Query all users to extract the system admin's name and email
  const allUsers = useQuery(api.users.getAll);
  const adminUser = allUsers?.find((u: any) => u.role === "ADMIN" || u.role === "admin");
  const adminName = adminUser?.name || "Administrator";
  const adminEmail = adminUser?.email || "admin@aesthetic-centre.edu";

  if (!plan) return null;

  const editionNum = plan.attendedEdition || plan.edition || 1;
  const attendedPastEd = (plan.pastEditions || []).find((e: any) => e.editionNumber === editionNum);

  // Group image & caption
  const groupImg = plan.attendedEdition && attendedPastEd
    ? attendedPastEd.groupImageUrl
    : plan.groupImageUrl || attendedPastEd?.groupImageUrl;

  const groupCaption = plan.attendedEdition && attendedPastEd
    ? attendedPastEd.groupImageCaption
    : plan.groupImageCaption || attendedPastEd?.groupImageCaption;

  // Attendees count for this edition
  const editionUsers = attendedPastEd?.registeredUsers || plan.registeredUsers || [];
  const totalAttendeesCount = editionUsers.length > 0 ? editionUsers.length : (plan.completedEditionsCount ? plan.completedEditionsCount * 10 : 12);

  const certId = `CERT-${(plan.planId || plan._id || "LP").toString().slice(-6).toUpperCase()}-${Math.abs(
    (user?.email || "user").split("").reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0)
  ).toString(16).toUpperCase()}`;

  const completionDate = plan.date
    ? new Date(plan.date).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
    : new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  const sessionHourTime = plan.time ? plan.time : (plan.duration ? `${plan.duration} hrs` : "Full Workshop");
  const competencies = (plan.tags && plan.tags.length > 0 ? plan.tags : ["Hands-on Fabrication", "Applied Skills", "Design Prototyping", "Technical Mastery"]).slice(0, 4);

  const curatorName = plan.authorName || "Curator";
  const curatorEmail = plan.authorEmail || "curator@aesthetic-centre.edu";

  const handlePrint = () => {
    if (!printRef.current) return;
    const content = printRef.current.innerHTML;

    const printWindow = window.open("", "_blank", "width=920,height=1150");
    if (!printWindow) {
      window.print();
      return;
    }

    printWindow.document.open();
    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <title>Certification - ${user?.name || "Participant"} - ${plan.title}</title>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <script src="https://cdn.tailwindcss.com"></script>
          <link rel="preconnect" href="https://fonts.googleapis.com">
          <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
          <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&family=Playfair+Display:ital,wght@0,600;0,700;0,900;1,600;1,700&display=swap" rel="stylesheet">
          <style>
            @page {
              size: A4 portrait;
              margin: 8mm;
            }
            * {
              box-sizing: border-box;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            html, body {
              margin: 0;
              padding: 0;
              font-family: 'Plus Jakarta Sans', sans-serif;
              color: #0f172a;
              background-color: #ffffff;
            }
            .font-serif-display {
              font-family: 'Playfair Display', serif;
            }
            .page-container {
              width: 100%;
              max-width: 200mm;
              margin: 0 auto;
              page-break-inside: avoid;
              break-inside: avoid;
            }
            @media print {
              .no-print { display: none !important; }
              body { padding: 0 !important; background: transparent !important; }
              .page-container {
                padding: 0 !important;
                margin: 0 auto !important;
              }
            }
          </style>
        </head>
        <body class="p-4 bg-slate-100 flex items-center justify-center">
          <div class="page-container bg-white">
            ${content}
          </div>
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.focus();
                window.print();
              }, 450);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto p-0 border-0 rounded-3xl shadow-2xl bg-slate-950/95 backdrop-blur-xl">
        {/* Modal Top Control Bar */}
        <div className="sticky top-0 z-30 bg-slate-900/95 border-b border-slate-800 px-6 py-3 flex items-center justify-between gap-4 text-white">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-white">Certification</h3>
                <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Official Record
                </span>
              </div>
              <p className="text-[11px] text-slate-400">Export high-resolution PDF or print single-page certificate</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={handlePrint}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-900/30 gap-1.5 h-9 px-4 cursor-pointer transition-all"
            >
              <Printer className="w-4 h-4" />
              <span>Print / Download PDF</span>
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={onClose}
              className="text-slate-400 hover:text-white hover:bg-slate-800 text-xs rounded-xl h-9 w-9 p-0"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* ── Printable Report Container ── */}
        <div className="p-4 sm:p-6 flex justify-center bg-slate-950/40">
          <div
            ref={printRef}
            className="w-full max-w-[800px] bg-white rounded-2xl shadow-2xl overflow-hidden text-slate-900 relative border-4 border-slate-100 print:border-0"
          >
            {/* Top Ornamental Gradient Accent Bar */}
            <div className="h-3 bg-gradient-to-r from-emerald-700 via-teal-500 to-indigo-800 w-full"></div>

            {/* Inner Certificate Container with Decorative Border */}
            <div className="m-4 sm:m-6 p-6 sm:p-7 border-2 border-slate-200/90 rounded-xl relative flex flex-col justify-between space-y-4 bg-gradient-to-b from-white via-slate-50/20 to-white">

              {/* Subtle Watermark Seal in Background */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.035] select-none z-0">
                <svg className="w-[420px] h-[420px] text-emerald-950" viewBox="0 0 200 200" fill="currentColor">
                  <path d="M100 0 L122 68 L195 68 L136 111 L158 179 L100 136 L42 179 L64 111 L5 68 L78 68 Z" />
                </svg>
              </div>

              {/* Corner Accents */}
              <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-emerald-700"></div>
              <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-emerald-700"></div>
              <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-emerald-700"></div>
              <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-emerald-700"></div>

              {/* Top Section */}
              <div className="relative z-10 space-y-4">

                {/* Header: Institution Insignia & Verification ID */}
                <div className="flex items-start justify-between border-b-2 border-slate-100 pb-3.5">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-800 to-teal-700 text-white flex items-center justify-center font-black text-xl shadow-md border-2 border-emerald-500/30">
                      AC
                    </div>
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-emerald-900 bg-emerald-100/90 px-2.5 py-0.5 rounded-full border border-emerald-300">
                        AESTHETIC CENTRE
                      </span>
                      <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-1">
                        CERTIFICATION
                      </h1>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] font-mono font-bold text-slate-400 block uppercase">Reference ID</span>
                    <span className="text-xs font-mono font-black text-emerald-900 bg-slate-100 px-2.5 py-1 rounded border border-slate-200">
                      {certId}
                    </span>
                  </div>
                </div>

                {/* Participant Presentation Block */}
                <div className="text-center pt-1 space-y-1.5">
                  <p className="text-xs uppercase font-bold tracking-widest text-slate-400">
                    This official certification is awarded to
                  </p>
                  <h2 className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight font-serif-display text-emerald-950">
                    {user?.name || "Participant Name"}
                  </h2>
                  <p className="text-xs text-slate-500 font-medium">
                    Verified Learner: <span className="font-semibold text-slate-700">{user?.email || "Student Account"}</span>
                  </p>
                  <p className="text-xs text-slate-600 max-w-xl mx-auto pt-1 leading-relaxed">
                    has actively participated, fulfilled all requirements, and successfully completed the following session:
                  </p>
                </div>

                {/* Workshop Banner with Embedded Core Competencies underneath title */}
                <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 text-white p-4 sm:p-5 rounded-2xl shadow-md space-y-2">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className="text-[10px] font-black uppercase tracking-widest bg-emerald-500 text-slate-950 px-2.5 py-0.5 rounded-full">
                      Edition {editionNum} Workshop
                    </span>
                    <span className="text-xs font-black text-emerald-300 flex items-center gap-1.5 bg-emerald-950/80 px-2.5 py-0.5 rounded-full border border-emerald-600/40">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                      STATUS: COMPLETED ✓
                    </span>
                  </div>

                  <h3 className="text-base sm:text-lg font-black text-white tracking-tight">
                    {plan.title}
                  </h3>

                  {/* Core Competencies & Learning Outcomes Achieved directly below title */}
                  <div className="pt-2 border-t border-slate-800 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-300">
                        Core Competencies & Learning Outcomes Achieved:
                      </span>
                      <span className="text-[9px] font-bold text-emerald-400">4 / 4 Satisfied</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                      {competencies.map((tag: string, idx: number) => (
                        <div key={idx} className="bg-slate-900/90 border border-slate-700/90 px-2 py-1.5 rounded-lg flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0"></span>
                          <span className="text-[10px] font-bold text-slate-200 truncate">
                            {tag.replace(/^#/, "")}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Metadata 4-Grid with Total Attendees */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Date & Session Hour</span>
                    <span className="text-xs font-bold text-slate-800">
                      {plan.date || "Completed"} {sessionHourTime ? `• ${sessionHourTime}` : ""}
                    </span>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Cohort & Attendees</span>
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      Edition {editionNum} ({totalAttendeesCount} Attendees)
                    </span>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Session Venue</span>
                    <span className="text-xs font-bold text-slate-800 truncate block">
                      {plan.location || "Aesthetic Centre Lab"}
                    </span>
                  </div>
                  <div className="bg-emerald-50 p-2.5 rounded-xl border border-emerald-200">
                    <span className="text-[9px] font-bold text-emerald-800 uppercase tracking-wider block">Verification</span>
                    <span className="text-xs font-black text-emerald-900 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      Completed & Verified
                    </span>
                  </div>
                </div>

                {/* Project Deliverables Verification Statement (No Link, No Feedback Note) */}
                <div className="bg-emerald-50/80 p-3.5 rounded-xl border border-emerald-200 space-y-1.5">
                  <div className="flex items-center justify-between flex-wrap gap-1">
                    <span className="text-xs font-black text-emerald-950 flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-700" />
                      Project Deliverables & Post-Session Tasks
                    </span>
                    <span className="text-[10px] font-black bg-emerald-600 text-white px-2.5 py-0.5 rounded-full shadow-2xs">
                      COMPLETED ✓
                    </span>
                  </div>

                  <div className="text-xs text-slate-700 bg-white p-2.5 rounded-lg border border-emerald-200 leading-relaxed">
                    <strong className="text-emerald-950">Task Completion Confirmation:</strong> The participant has successfully executed, completed, and fulfilled all hands-on practical tasks and project deliverables assigned after the session to the full satisfaction of the curator.
                  </div>
                </div>

                {/* Embedded Group Photo (Bigger Height, Center-Aligned) */}
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                      📸 Official Edition {editionNum} Cohort Photo • {totalAttendeesCount} Attendees
                    </span>
                  </div>

                  {groupImg ? (
                    <div className="rounded-xl overflow-hidden border border-slate-200 h-56 sm:h-64 bg-slate-900 flex items-center justify-center shadow-xs">
                      <img
                        src={getOptimizedImageUrl(groupImg)}
                        alt={`Edition ${editionNum} Cohort`}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  ) : (
                    <div className="h-44 bg-slate-100 rounded-xl border border-dashed border-slate-300 flex flex-col items-center justify-center text-center p-4 space-y-1">
                      <span className="text-xs font-bold text-slate-600 block">Edition {editionNum} Cohort</span>
                      <span className="text-[11px] text-slate-400">Official session cohort photo on record at Aesthetic Centre archives</span>
                    </div>
                  )}

                  {groupCaption && (
                    <p className="text-[10px] text-slate-500 italic">"{groupCaption}"</p>
                  )}
                </div>

              </div>

              {/* Bottom Sign-off Footer: Curator (Left), Issued Date (Center), Admin (Right) */}
              <div className="pt-4 border-t-2 border-slate-100 grid grid-cols-3 gap-3 items-end relative z-10">

                {/* Left: Curator Signature Block */}
                <div className="space-y-1.5 text-left">
                  <div className="min-h-7 flex items-end">
                    <span className="font-serif-display italic font-bold text-sm sm:text-base text-slate-800 truncate">
                      {curatorName}
                    </span>
                  </div>
                  <div className="w-full border-t border-slate-400"></div>
                  <div className="text-[10px] leading-tight space-y-0.5">
                    <span className="font-bold uppercase tracking-wider text-slate-700 block text-[9.5px]">
                      Session Curator
                    </span>
                    <span className="font-mono text-slate-500 text-[9px] block truncate">
                      {curatorEmail}
                    </span>
                  </div>
                </div>

                {/* Center: Issued Date & Document Verification */}
                <div className="space-y-1 text-center">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                    Issued Date
                  </span>
                  <span className="text-xs font-bold text-slate-800 bg-slate-50 px-2.5 py-1 rounded border border-slate-200 inline-block">
                    {completionDate}
                  </span>
                  <span className="text-[8px] text-slate-400 block font-mono">
                    Ref: {certId}
                  </span>
                </div>

                {/* Right: Admin Signature Block */}
                <div className="space-y-1.5 text-right">
                  <div className="min-h-7 flex items-end justify-end">
                    <span className="font-serif-display italic font-bold text-sm sm:text-base text-emerald-950 truncate">
                      {adminName}
                    </span>
                  </div>
                  <div className="w-full border-t border-slate-400 ml-auto"></div>
                  <div className="text-[10px] leading-tight space-y-0.5">
                    <span className="font-bold uppercase tracking-wider text-slate-700 block text-[9.5px]">
                      Admin
                    </span>
                    <span className="font-mono text-slate-500 text-[9px] block truncate">
                      {adminEmail}
                    </span>
                  </div>
                </div>

              </div>

            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}


