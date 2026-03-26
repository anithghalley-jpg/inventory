import { useState, useEffect, useCallback } from "react";
import { Link } from "wouter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion } from "framer-motion";
import { PlayCircle, Users } from "lucide-react";
import { SCRIPT_URL } from "@/config";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";

interface HomeContent {
  id: string;
  type: string;
  heading: string;
  description: string;
  contentUrl: string;
  lastUpdated?: string;
}

export default function Community() {
  const [homeData, setHomeData] = useState<HomeContent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dataSource, setDataSource] = useState<'convex' | 'sheets' | 'loading'>('loading');

  const convexHomeData = useQuery(api.home.getAll);

  // Home content: Firebase is primary. Sheets is the error-only fallback.
  const fetchFromSheets = useCallback(async () => {
    try {
      const res = await fetch(SCRIPT_URL, {
        method: 'POST',
        body: JSON.stringify({ action: 'getHomeContent' }),
      });
      const result = await res.json();
      if (result.success && result.items) {
        setHomeData(result.items);
        setDataSource('sheets');
      }
    } catch (err) {
      console.error('Sheets home content fetch failed:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (convexHomeData !== undefined) {
      const data: HomeContent[] = convexHomeData.map(doc => ({
        ...doc,
        id: doc.docId || doc._id,
        contentUrl: doc.content || '',
        heading: doc.title || '',
      })) as unknown as HomeContent[];
      setHomeData(data);
      setDataSource('convex');
      setIsLoading(false);
    }
  }, [convexHomeData]);

  // TRA Students Videos only
  const traVideos = homeData.filter(item => item.type && item.type.toLowerCase() === 'video');

  // Convert Google Drive share link to embeddable iframe link
  const getEmbedUrl = (url: string) => {
    if (!url) return '';
    if (url.includes('/preview')) return url;
    return url.replace(/\/view(\?.*)?$/, '/preview');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">

      {/* Navigation Bar — matches Home page */}
      <header className="bg-white border-b border-border sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between">

          {/* Left: Logo */}
          <Link href="/">
            <div className="flex flex-col cursor-pointer group">
              <span className="font-display font-black text-xl leading-none tracking-tight group-hover:text-emerald-500 transition-colors">AESTHETIC</span>
              <span className="font-sans font-medium text-[0.65rem] leading-none tracking-[0.3em] text-emerald-600 group-hover:text-emerald-400 transition-colors mt-0.5 uppercase">Centre</span>
            </div>
          </Link>

          {/* Center: Nav Links */}
          <div className="hidden md:flex items-center gap-12 absolute left-1/2 -translate-x-1/2">
            <Link href="/community">
              <button className="text-sm font-semibold text-slate-900 tracking-wide">Community</button>
            </Link>
            <Link href="/">
              <button className="text-sm font-medium text-slate-500 hover:text-slate-900 tracking-wide transition-colors">Aesthetic Centre</button>
            </Link>
            <Link href="/learning">
              <button className="text-sm font-medium text-slate-500 hover:text-slate-900 tracking-wide transition-colors">Learning</button>
            </Link>
          </div>

          {/* Right: Sign In */}
          <Link href="/login">
            <button className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-full shadow-md transition-all hover:scale-105 active:scale-95">
              Sign In
            </button>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-12 md:py-16 pb-24">

        <div className="mb-10 text-center max-w-2xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-display font-bold text-slate-900 mb-4 tracking-tight">Our Community</h1>
          <p className="text-slate-500 text-lg">Connect, learn, and grow alongside fellow creators, engineers, and researchers.</p>
        </div>

        {/* Data source banner */}
        {dataSource === 'sheets' && homeData.length > 0 && (
          <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700 mb-6 max-w-xl mx-auto justify-center">
            <span className="text-base">📋</span>
            <span><strong>Showing data from Google Sheets</strong> — Firebase quota may be exceeded.</span>
          </div>
        )}

        <Tabs defaultValue="tra-students" className="w-full">
          <div className="flex justify-center mb-12">
            <TabsList className="grid w-full max-w-md grid-cols-2 p-1 bg-slate-200/50">
              <TabsTrigger value="fab-academy" className="rounded-md font-medium">Fab Academy</TabsTrigger>
              <TabsTrigger value="tra-students" className="rounded-md font-medium">TRA Students</TabsTrigger>
            </TabsList>
          </div>

          {/* FAB ACADEMY TAB */}
          <TabsContent value="fab-academy" className="outline-none focus:ring-0">
            <div className="bg-white border border-border shadow-sm rounded-2xl p-12 text-center flex flex-col items-center justify-center min-h-[400px]">
               <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                  <Users className="w-8 h-8 text-slate-400" />
               </div>
               <h3 className="text-2xl font-bold font-display text-slate-900 mb-2">Fab Academy Coming Soon</h3>
               <p className="text-slate-500 max-w-md">Stay tuned for projects, documentation, and showcases from our Fab Academy scholars.</p>
            </div>
          </TabsContent>

          {/* TRA STUDENTS TAB */}
          <TabsContent value="tra-students" className="outline-none focus:ring-0 space-y-24">
            {isLoading ? (
               <div className="flex flex-col items-center py-20">
                 <div className="w-8 h-8 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mb-4" />
                 <p className="text-muted-foreground animate-pulse">Loading content...</p>
               </div>
            ) : traVideos.length === 0 ? (
               <div className="bg-white border border-border shadow-sm rounded-2xl p-12 text-center flex flex-col items-center justify-center min-h-[400px]">
                 <PlayCircle className="w-12 h-12 text-slate-300 mb-4" />
                 <h3 className="text-xl font-bold text-slate-900 mb-2">No Videos Available</h3>
                 <p className="text-slate-500">Video features will appear here once added by the admin.</p>
               </div>
            ) : (
              <div className="space-y-20 md:space-y-32 mt-8">
                {traVideos.map((video, idx) => {
                  const isEven = idx % 2 === 0;
                  const embedLink = getEmbedUrl(video.contentUrl);

                  return (
                    <motion.div
                      key={video.id}
                      initial={{ opacity: 0, y: 30 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, margin: "-100px" }}
                      transition={{ duration: 0.6, ease: "easeOut" }}
                      className={`flex flex-col gap-8 md:gap-16 items-center ${isEven ? 'md:flex-row' : 'md:flex-row-reverse'}`}
                    >
                      {/* Video Embed Side */}
                      <div className="w-full md:w-1/2 rounded-2xl overflow-hidden shadow-2xl bg-black aspect-video relative group">
                        {embedLink ? (
                          <iframe
                            src={embedLink}
                            allow="autoplay; encrypted-media"
                            allowFullScreen
                            className="absolute top-0 left-0 w-full h-full border-0"
                          />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center text-white/50 bg-slate-900">
                             <p>Invalid URL</p>
                          </div>
                        )}
                      </div>

                      {/* Text Content Side */}
                      <div className={`w-full md:w-1/2 flex flex-col justify-center space-y-4 ${isEven ? 'md:pr-8' : 'md:pl-8'}`}>
                        <div className="inline-flex">
                          <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold uppercase tracking-wider rounded-full">
                            {video.type}
                          </span>
                        </div>
                        <h2 className="text-3xl md:text-4xl font-display font-bold text-slate-900 leading-tight">
                          {video.heading}
                        </h2>
                        <div className="w-12 h-1 bg-emerald-500 rounded-full" />
                        <p className="text-lg text-slate-600 leading-relaxed mt-4">
                          {video.description}
                        </p>
                      </div>

                    </motion.div>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
