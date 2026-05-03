import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { motion } from "framer-motion";
import { Menu, X, LayoutGrid, List, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

function getEmbedUrl(url: string) {
  if (!url) return '';
  let embedUrl = url;
  if (url.includes("youtube.com/watch?v=")) {
    const videoId = url.split("v=")[1].split("&")[0];
    embedUrl = `https://www.youtube.com/embed/${videoId}`;
  } else if (url.includes("youtu.be/")) {
    const videoId = url.split("youtu.be/")[1].split("?")[0];
    embedUrl = `https://www.youtube.com/embed/${videoId}`;
  } else if (url.includes("vimeo.com/")) {
    const videoId = url.split("vimeo.com/")[1].split("?")[0];
    embedUrl = `https://player.vimeo.com/video/${videoId}`;
  } else if (url.includes("drive.google.com/file/d/")) {
    const fileId = url.split("/d/")[1].split("/")[0];
    embedUrl = `https://drive.google.com/file/d/${fileId}/preview`;
  }
  return embedUrl;
}

function getImageUrl(url: string) {
  if (!url) return '';
  if (url.includes("drive.google.com/file/d/")) {
    const fileId = url.split("/d/")[1].split("/")[0];
    return `https://drive.google.com/uc?export=view&id=${fileId}`;
  }
  return url;
}

export default function Learning() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"alternating" | "grid">("alternating");

  const { user } = useAuth();
  const [, navigate] = useLocation();
  const registerForPlan = useMutation(api.learningPlans.registerForPlan);

  const publishedPlans = useQuery(api.learningPlans.getPublishedPlans) || [];

  useEffect(() => {
    const pendingPlanId = sessionStorage.getItem('pendingSessionJoin');
    if (pendingPlanId && user?.email) {
      sessionStorage.removeItem('pendingSessionJoin');
      registerForPlan({ planId: pendingPlanId as any, name: user.name, email: user.email })
        .then((res) => {
          if (res.success) {
            toast.success(res.message);
          } else {
            toast.error(res.message);
          }
        })
        .catch(() => toast.error("Failed to register"));
    }
  }, [user, registerForPlan]);

  const handleJoin = async (planId: string) => {
    if (!user?.email) {
      sessionStorage.setItem('pendingSessionJoin', planId);
      sessionStorage.setItem('returnTo', '/learning');
      navigate('/login');
      return;
    }

    try {
      const res = await registerForPlan({ planId: planId as any, name: user.name, email: user.email });
      if (res.success) {
        toast.success(res.message);
      } else {
        toast.error(res.message);
      }
    } catch (err) {
      toast.error("Failed to register");
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans overflow-x-hidden">
      {/* Navigation Bar */}
      <header className={`fixed top-0 left-0 w-full z-50 pointer-events-auto transition-all duration-500 ${isScrolled ? 'bg-white/90 backdrop-blur-xl border-b border-slate-200 shadow-sm' : 'bg-white/80 backdrop-blur-md border-b border-slate-200'}`}>
        <div className={`px-4 md:px-8 py-4 md:py-6 flex items-center justify-between transition-all duration-500 ${isScrolled ? 'py-3 md:py-4' : ''}`}>
          {/* Left: Logo */}
          <Link href="/">
            <div className="flex flex-col cursor-pointer group">
              <span className="font-display font-black text-xl leading-none tracking-tight group-hover:text-emerald-500 transition-colors text-slate-900">AESTHETIC</span>
              <span className="font-sans font-medium text-[0.65rem] leading-none tracking-[0.3em] text-emerald-600 group-hover:text-emerald-400 transition-colors mt-0.5 uppercase">Centre</span>
            </div>
          </Link>

          {/* Center: Navigation Links — desktop only */}
          <div className="hidden md:flex items-center gap-12 absolute left-1/2 -translate-x-1/2">
            <Link href="/community">
              <button className="text-sm font-medium tracking-wide transition-colors duration-200 text-slate-500 hover:text-slate-900">
                Community
              </button>
            </Link>
            <Link href="/">
              <button className="text-sm font-medium tracking-wide transition-colors duration-200 text-slate-500 hover:text-slate-900">
                Aesthetic Centre
              </button>
            </Link>
            <Link href="/learning">
              <button className="text-sm font-semibold tracking-wide transition-colors duration-200 text-slate-900">
                Learning
              </button>
            </Link>
          </div>

          {/* Right: Sign In (desktop) + hamburger (mobile) */}
          <div className="flex items-center gap-3">
            <Link href="/login">
              <button className="hidden md:inline-flex px-6 py-2.5 text-white text-sm font-semibold rounded-full shadow-md transition-all hover:scale-105 active:scale-95 bg-slate-900 hover:bg-slate-800">
                Sign In
              </button>
            </Link>
            {/* Hamburger — mobile only */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen((o) => !o)}
              className="flex h-9 w-9 items-center justify-center rounded-full border shadow-sm transition-colors md:hidden border-slate-200 bg-white/80 text-slate-700 active:bg-slate-100"
            >
              {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Mobile drawer */}
        <motion.div
          initial={false}
          animate={mobileMenuOpen ? { height: "auto", opacity: 1 } : { height: 0, opacity: 0 }}
          transition={{ duration: 0.28, ease: "easeInOut" }}
          className="overflow-hidden border-t border-slate-200 bg-white/95 backdrop-blur-xl md:hidden"
        >
          <nav className="flex flex-col gap-1 px-4 py-4">
            <Link href="/community">
              <button onClick={() => setMobileMenuOpen(false)} className="w-full rounded-2xl px-4 py-3 text-left text-sm font-medium tracking-wide text-slate-600 hover:bg-slate-50">
                Community
              </button>
            </Link>
            <Link href="/">
              <button onClick={() => setMobileMenuOpen(false)} className="w-full rounded-2xl px-4 py-3 text-left text-sm font-medium tracking-wide text-slate-600 hover:bg-slate-50">
                Aesthetic Centre
              </button>
            </Link>
            <Link href="/learning">
              <button onClick={() => setMobileMenuOpen(false)} className="w-full rounded-2xl px-4 py-3 text-left text-sm font-semibold tracking-wide text-slate-900 bg-emerald-50 text-emerald-700">
                Learning
              </button>
            </Link>
            <div className="mt-2 border-t border-slate-100 pt-3">
              <Link href="/login">
                <button onClick={() => setMobileMenuOpen(false)} className="w-full rounded-full bg-slate-900 py-3 text-sm font-semibold text-white shadow-sm">
                  Sign In
                </button>
              </Link>
            </div>
          </nav>
        </motion.div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 md:px-8 pt-32 pb-24">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div>
            <p className="mt-4 text-lg text-slate-600 max-w-2xl">
              Explore upcoming activity sessions, workshops, and deep dives curated by our team members.
            </p>
          </div>
          <div className="flex items-center gap-2 bg-white p-1 rounded-lg border border-slate-200 shadow-sm shrink-0">
            <button
              onClick={() => setViewMode("alternating")}
              className={`p-2 rounded-md flex items-center justify-center transition-colors ${viewMode === 'alternating' ? 'bg-emerald-100 text-emerald-700' : 'text-slate-500 hover:bg-slate-50'}`}
              title="Alternating View"
            >
              <List className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode("grid")}
              className={`p-2 rounded-md flex items-center justify-center transition-colors ${viewMode === 'grid' ? 'bg-emerald-100 text-emerald-700' : 'text-slate-500 hover:bg-slate-50'}`}
              title="Grid View"
            >
              <LayoutGrid className="w-5 h-5" />
            </button>
          </div>
        </div>

        {publishedPlans.length === 0 ? (
          <div className="text-center py-24 bg-white rounded-3xl border border-slate-200 shadow-sm">
            <h3 className="text-2xl font-bold text-slate-800 mb-2">Check back soon!</h3>
            <p className="text-slate-500">No session plans have been published yet.</p>
          </div>
        ) : (
          <div className={viewMode === "alternating" ? "space-y-24" : "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"}>
            {publishedPlans.map((plan: any, index: number) => {
              const hasVideo = plan.videoUrls && plan.videoUrls.length > 0;
              const hasImage = plan.imageUrls && plan.imageUrls.length > 0;

              // Media rendering logic
              const MediaElement = () => {
                const roundedClass = viewMode === 'grid' ? 'rounded-2xl' : 'rounded-[2rem]';

                if (hasVideo) {
                  return (
                    <div className={`bg-slate-900 overflow-hidden shadow-xl border border-slate-200 relative group w-full aspect-video ${roundedClass}`}>
                      <iframe
                        src={getEmbedUrl(plan.videoUrls[0])}
                        className="absolute inset-0 w-full h-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      ></iframe>
                    </div>
                  );
                } else if (hasImage) {
                  return (
                    <div className={`bg-slate-100 overflow-hidden shadow-xl border border-slate-200 relative group w-full flex items-center justify-center ${roundedClass}`}>
                      <img
                        src={getImageUrl(plan.imageUrls[0])}
                        alt={plan.title}
                        className={`w-full group-hover:scale-105 transition-transform duration-700 ${viewMode === 'grid' ? 'aspect-video object-cover' : 'h-auto object-contain max-h-[75vh]'}`}
                      />
                    </div>
                  );
                } else {
                  return (
                    <div className={`bg-slate-100 overflow-hidden shadow-xl border border-slate-200 relative group w-full aspect-video flex items-center justify-center text-slate-500 ${roundedClass}`}>
                      No media provided
                    </div>
                  );
                }
              };

              if (viewMode === "alternating") {
                const isEven = index % 2 === 0;
                return (
                  <div key={plan._id} className={`flex flex-col ${isEven ? 'md:flex-row' : 'md:flex-row-reverse'} gap-12 items-center`}>
                    <div className="w-full md:w-1/2">
                      <MediaElement />
                    </div>
                    <div className="w-full md:w-1/2 space-y-6">
                      <div className="flex flex-wrap gap-2">
                        {plan.tags?.map((tag: string) => (
                          <span key={tag} className="px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold uppercase tracking-wider rounded-full">
                            {tag}
                          </span>
                        ))}
                      </div>
                      <h2 className="text-3xl md:text-4xl font-display font-bold text-slate-900 leading-tight">
                        {plan.title}
                      </h2>
                      {(plan.date || plan.time || plan.location) && (
                        <div className="flex flex-wrap gap-4 text-sm font-medium text-slate-600">
                          {plan.date && <span>📅 {plan.date}</span>}
                          {plan.time && <span>⏰ {plan.time}</span>}
                          {plan.location && <span>📍 {plan.location}</span>}
                        </div>
                      )}
                      <p className="text-lg text-slate-600 leading-relaxed whitespace-pre-wrap">
                        {plan.description}
                      </p>

                      <div className="flex flex-col sm:flex-row sm:items-center gap-4 pt-6">
                        {plan.documentationUrl && (
                          <a href={plan.documentationUrl} target="_blank" rel="noopener noreferrer">
                            <Button variant="outline" className="rounded-full px-6 py-6 h-auto text-lg w-full sm:w-auto border-slate-300 text-slate-700 hover:bg-slate-50">
                              Documentation
                            </Button>
                          </a>
                        )}
                        <Button onClick={() => handleJoin(plan._id)} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-full px-8 py-6 h-auto text-lg w-full sm:w-auto shadow-md transition-all hover:scale-105">
                          Join <ArrowRight className="ml-2 w-5 h-5" />
                        </Button>
                        <div className="text-sm text-slate-500 font-medium sm:ml-auto">
                          Curated by <span className="text-slate-900 font-bold">{plan.authorName}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              } else {
                // Grid view
                return (
                  <div key={plan._id} className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm hover:shadow-lg transition-all flex flex-col h-full group">
                    <MediaElement />
                    <div className="pt-6 flex flex-col flex-1">
                      <div className="flex flex-wrap gap-2 mb-4">
                        {plan.tags?.slice(0, 3).map((tag: string) => (
                          <span key={tag} className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-bold uppercase tracking-wider rounded-sm">
                            {tag}
                          </span>
                        ))}
                        {plan.tags && plan.tags.length > 3 && (
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-bold rounded-sm">+{plan.tags.length - 3}</span>
                        )}
                      </div>
                      <h3 className="text-xl font-bold text-slate-900 mb-3 group-hover:text-emerald-600 transition-colors">{plan.title}</h3>
                      {(plan.date || plan.time || plan.location) && (
                        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs font-medium text-slate-500 mb-3">
                          {plan.date && <span>📅 {plan.date}</span>}
                          {plan.time && <span>⏰ {plan.time}</span>}
                          {plan.location && <span>📍 {plan.location}</span>}
                        </div>
                      )}
                      <p className="text-slate-600 text-sm line-clamp-3 mb-6 flex-1">
                        {plan.description}
                      </p>
                      <div className="flex items-center justify-between pt-4 border-t border-slate-100 mt-auto">
                        <span className="text-xs font-medium text-slate-500">By {plan.authorName}</span>
                        <div className="flex items-center gap-3">
                          {plan.documentationUrl && (
                            <a href={plan.documentationUrl} target="_blank" rel="noopener noreferrer" className="text-slate-500 font-semibold text-sm hover:text-slate-900 transition-colors">
                              Docs
                            </a>
                          )}
                          <button onClick={(e) => { e.preventDefault(); handleJoin(plan._id); }} className="text-emerald-600 font-semibold text-sm flex items-center hover:underline bg-emerald-50 px-3 py-1.5 rounded-full">
                            Join <ArrowRight className="w-3 h-3 ml-1" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }
            })}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-12 mt-auto">
        <div className="max-w-7xl mx-auto px-4 md:px-8 text-center text-slate-500 text-sm">
          <p>© {new Date().getFullYear()} Aesthetic Centre. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
