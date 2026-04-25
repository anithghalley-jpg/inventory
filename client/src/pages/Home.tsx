import { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion";
import { Link } from "wouter";
import {
  Telescope, Palette, Hammer, Scissors,
  Music, Activity, Scale, Sparkles, Gem, Cpu, Code2, ArrowRight, ArrowLeft, Menu, X
} from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";

const PLANETS = [
  { name: "FabLab", aspect: "Digital Fabrication", icon: Cpu, planetBg: "radial-gradient(circle at 30% 30%, #60a5fa, #2563eb, #1e3a8a)", shadow: "rgba(37,99,235,0.5)", size: "w-8 h-8 md:w-12 md:h-12" },
  { name: "Astronomy", aspect: "Cosmic Observation", icon: Telescope, planetBg: "radial-gradient(circle at 30% 30%, #a78bfa, #7c3aed, #4c1d95)", shadow: "rgba(124,58,237,0.5)", size: "w-10 h-10 md:w-14 md:h-14", hasRing: true },
  { name: "Painting", aspect: "Visual Artistry", icon: Palette, planetBg: "radial-gradient(circle at 30% 30%, #f472b6, #db2777, #831843)", shadow: "rgba(219,39,119,0.5)", size: "w-6 h-6 md:w-10 md:h-10" },
  { name: "Sculpting", aspect: "Tangible Form", icon: Hammer, planetBg: "radial-gradient(circle at 30% 30%, #fdba74, #ea580c, #7c2d12)", shadow: "rgba(234,88,12,0.5)", size: "w-9 h-9 md:w-14 md:h-14" },
  { name: "Weaving", aspect: "Textile Crafts", icon: Scissors, planetBg: "radial-gradient(circle at 30% 30%, #5eead4, #0d9488, #134e4a)", shadow: "rgba(13,148,136,0.5)", size: "w-7 h-7 md:w-11 md:h-11" },
  { name: "Music", aspect: "Sonic Harmony", icon: Music, planetBg: "radial-gradient(circle at 30% 30%, #d8b4fe, #9333ea, #581c87)", shadow: "rgba(147,51,234,0.5)", size: "w-11 h-11 md:w-16 md:h-16" },
  { name: "Dance", aspect: "Kinetic Movement", icon: Activity, planetBg: "radial-gradient(circle at 30% 30%, #fda4af, #e11d48, #881337)", shadow: "rgba(225,29,72,0.5)", size: "w-8 h-8 md:w-12 md:h-12" },
  { name: "Truth", aspect: "Objective Logic", icon: Scale, planetBg: "radial-gradient(circle at 30% 30%, #cbd5e1, #64748b, #0f172a)", shadow: "rgba(100,116,139,0.5)", size: "w-6 h-6 md:w-9 md:h-9" },
  { name: "Beauty", aspect: "Divine Aesthetics", icon: Sparkles, planetBg: "radial-gradient(circle at 30% 30%, #fde047, #eab308, #713f12)", shadow: "rgba(234,179,8,0.5)", size: "w-10 h-10 md:w-14 md:h-14" },
  { name: "Value", aspect: "Intrinsic Worth", icon: Gem, planetBg: "radial-gradient(circle at 30% 30%, #6ee7b7, #059669, #064e3b)", shadow: "rgba(5,150,105,0.5)", size: "w-7 h-7 md:w-10 md:h-10" },
  { name: "Computer Science", aspect: "Computational Thinking", icon: Code2, planetBg: "radial-gradient(circle at 30% 30%, #67e8f9, #0891b2, #164e63)", shadow: "rgba(8,145,178,0.5)", size: "w-8 h-8 md:w-12 md:h-12" },
];

function transformDriveLink(url: string): string {
  if (url.includes("drive.google.com/file/d/")) {
    const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (match && match[1]) {
      // Use lh3.googleusercontent directly to bypass Safari/Chrome 3rd party cookie redirect blocks
      return `https://lh3.googleusercontent.com/d/${match[1]}=w1200`;
    }
  }
  return url;
}

function ImageSlideshow({ images }: { images: string[] }) {
  const validImages = images.filter(img => img.trim().length > 5).map(transformDriveLink);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (validImages.length === 0) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % validImages.length);
    }, 4500); // 4.5 seconds per image ensures comfortably > 2s un-animated display
    return () => clearInterval(interval);
  }, [validImages.length]); // only depends on length so the array ref doesn't trigger re-renders

  if (validImages.length === 0) return null;

  return (
    <div className="absolute inset-0 w-full h-full flex items-center justify-center p-4">
      {/* Blurred background for a more polished aesthetic */}
      <div
        className="absolute inset-0 bg-cover bg-center blur-xl opacity-40 scale-110"
        style={{ backgroundImage: `url(${validImages[currentIndex]})`, transition: 'background-image 1s ease-in-out' }}
      />
      <AnimatePresence mode="popLayout">
        <motion.img
          key={currentIndex}
          src={validImages[currentIndex]}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.05 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="relative max-w-full max-h-full object-contain rounded-2xl shadow-2xl ring-1 ring-white/20 z-10"
          alt="Aspect Showcase"
          referrerPolicy="no-referrer"
        />
      </AnimatePresence>
    </div>
  );
}

function BackgroundSlideshow({ images }: { images: string[] }) {
  const validImages = images.map(transformDriveLink);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (validImages.length === 0) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % validImages.length);
    }, 4500);
    return () => clearInterval(interval);
  }, [validImages.length]);

  if (validImages.length === 0) return null;

  return (
    <div className="absolute inset-0 w-full h-full z-0 pointer-events-none">
      <AnimatePresence mode="popLayout">
        <motion.img
          key={currentIndex}
          src={validImages[currentIndex]}
          initial={{ opacity: 0, scale: 1.05 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 3, ease: "easeInOut" }}
          className="absolute inset-0 w-full h-full object-cover"
          alt=""
        />
      </AnimatePresence>
      <div className="absolute inset-0 bg-slate-900/10 mix-blend-multiply" />
      <div className="absolute inset-0 bg-white/20 backdrop-blur-sm" />
    </div>
  );
}

export default function Home() {
  const [isSpaceHovered, setIsSpaceHovered] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [selectedAspect, setSelectedAspect] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const aspectsSectionRef = useRef<HTMLElement>(null);
  const aspects = (useQuery(api.aspects.getAll) || []) as any[];

  const allAspectImages = useMemo(() => {
    return aspects.flatMap((a: any) => a.images || []).filter((i: string) => i.trim().length > 5);
  }, [aspects]);

  const { scrollY } = useScroll();
  const heroOpacity = useTransform(scrollY, [0, 400], [1, 0]);
  const exploreOpacity = useTransform(scrollY, [200, 600], [0, 1]);

  const handleGlobeClick = (aspectName: string) => {
    setSelectedAspect(aspectName);
    aspectsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // MED-1 Fix: Cache star positions so they don't randomise on every render
  const starElements = useMemo(() =>
    [...Array(50)].map((_, i) => (
      <div
        key={i}
        className="absolute w-1 h-1 bg-white rounded-full animate-pulse"
        style={{
          top: `${Math.random() * 100}%`, left: `${Math.random() * 100}%`,
          opacity: Math.random() * 0.5 + 0.2, animationDuration: `${Math.random() * 3 + 2}s`
        }}
      />
    )), []
  );

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans overflow-x-hidden">
      {/* Navigation Bar */}
      <header className={`fixed top-0 left-0 w-full z-50 pointer-events-auto transition-all duration-500 ${isScrolled ? 'bg-white/60 backdrop-blur-xl border-b border-white/50 shadow-sm' : ''}`}>

        {/* ── Top bar ───────────────────────────────────────────────── */}
        <div className={`px-4 md:px-8 py-4 md:py-6 flex items-center justify-between transition-all duration-500 ${isScrolled ? 'py-3 md:py-4' : ''} ${isScrolled ? 'text-slate-900' : isSpaceHovered ? 'text-white' : 'text-slate-900'}`}>

          {/* Left: Logo */}
          <Link href="/">
            <div className="flex flex-col cursor-pointer group">
              <span className="font-display font-black text-xl leading-none tracking-tight group-hover:text-emerald-500 transition-colors">AESTHETIC</span>
              <span className="font-sans font-medium text-[0.65rem] leading-none tracking-[0.3em] text-emerald-600 group-hover:text-emerald-400 transition-colors mt-0.5 uppercase">Centre</span>
            </div>
          </Link>

          {/* Center: Navigation Links — desktop only */}
          <div className="hidden md:flex items-center gap-12 absolute left-1/2 -translate-x-1/2">
            <Link href="/community">
              <button className={`text-sm font-medium tracking-wide transition-colors duration-200 ${isSpaceHovered ? 'text-white/70 hover:text-white' : 'text-slate-500 hover:text-slate-900'}`}>
                Community
              </button>
            </Link>
            <Link href="/">
              <button className={`text-sm font-semibold tracking-wide transition-colors duration-200 ${isSpaceHovered ? 'text-white' : 'text-slate-900'}`}>
                Aesthetic Centre
              </button>
            </Link>
            <Link href="/learning">
              <button className={`text-sm font-medium tracking-wide transition-colors duration-200 ${isSpaceHovered ? 'text-white/70 hover:text-white' : 'text-slate-500 hover:text-slate-900'}`}>
                Learning
              </button>
            </Link>
          </div>

          {/* Right: Sign In (desktop) + hamburger (mobile) */}
          <div className="flex items-center gap-3">
            <Link href="/login">
              <button className={`hidden md:inline-flex px-6 py-2.5 text-white text-sm font-semibold rounded-full shadow-md transition-all hover:scale-105 active:scale-95 ${isSpaceHovered ? 'bg-white/20 hover:bg-white/30 backdrop-blur-md' : 'bg-slate-900 hover:bg-slate-800'}`}>
                Sign In
              </button>
            </Link>
            {/* Hamburger — mobile only */}
            <button
              type="button"
              aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
              onClick={() => setMobileMenuOpen((o) => !o)}
              className={`flex h-9 w-9 items-center justify-center rounded-full border shadow-sm transition-colors md:hidden ${isSpaceHovered
                  ? "border-white/30 bg-white/10 text-white backdrop-blur active:bg-white/20"
                  : "border-slate-200 bg-white/80 text-slate-700 active:bg-slate-100"
                }`}
            >
              {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* ── Mobile drawer ─────────────────────────────────────────── */}
        <motion.div
          initial={false}
          animate={mobileMenuOpen ? { height: "auto", opacity: 1 } : { height: 0, opacity: 0 }}
          transition={{ duration: 0.28, ease: "easeInOut" }}
          className="overflow-hidden border-t border-white/60 bg-white/95 backdrop-blur-xl md:hidden"
        >
          <nav className="flex flex-col gap-1 px-4 py-4">
            <Link href="/community">
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="w-full rounded-2xl px-4 py-3 text-left text-sm font-medium tracking-wide text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
              >
                Community
              </button>
            </Link>
            <Link href="/">
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="w-full rounded-2xl px-4 py-3 text-left text-sm font-semibold tracking-wide text-slate-900 transition-colors hover:bg-emerald-50 hover:text-emerald-700"
              >
                Aesthetic Centre
              </button>
            </Link>
            <Link href="/learning">
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="w-full rounded-2xl px-4 py-3 text-left text-sm font-medium tracking-wide text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
              >
                Learning
              </button>
            </Link>
            <div className="mt-2 border-t border-slate-100 pt-3">
              <Link href="/login">
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full rounded-full bg-slate-900 py-3 text-sm font-semibold text-white shadow-sm transition-colors active:bg-slate-800"
                >
                  Sign In
                </button>
              </Link>
            </div>
          </nav>
        </motion.div>
      </header>

      {/* Hero Section */}
      <section className={`relative w-full h-screen flex items-center justify-center overflow-hidden transition-colors duration-1000 ${isSpaceHovered ? 'bg-slate-950' : 'bg-white'}`}>

        {/* Deep Space Background Reveals */}
        <div className={`absolute inset-0 flex items-center justify-center pointer-events-none transition-opacity duration-1000 ${isSpaceHovered ? 'opacity-100' : 'opacity-0'}`}>
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black opacity-80" />

          <motion.div
            animate={{ scale: isSpaceHovered ? 1.05 : 1 }}
            transition={{ duration: 10, repeat: Infinity, repeatType: "reverse", ease: "linear" }}
            className="absolute z-0 text-white/5 font-display font-black text-6xl md:text-[8rem] lg:text-[10rem] text-center leading-none whitespace-nowrap tracking-tighter"
          >
            AESTHETIC<br /> <br /> <br />CENTRE
          </motion.div>

          {/* Optional little stars */}
          {starElements}
        </div>

        {/* Global Sun + Orbit Wrapper (incorporates 92% scaling and 20px upward shift) */}
        <motion.div style={{ opacity: heroOpacity }} className="absolute inset-0 w-full h-full z-10">
          <div
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
            style={{ transform: "scale(0.92) translateY(-20px)", perspective: "1200px" }}
          >
            {/* Central Burning Sun */}
            <div className="absolute z-20 flex flex-col items-center justify-center text-center pointer-events-auto relative">
              <motion.div
                onHoverStart={() => setIsSpaceHovered(true)}
                onHoverEnd={() => setIsSpaceHovered(false)}
                animate={{
                  boxShadow: isSpaceHovered
                    ? ["0 0 80px 30px rgba(251,146,60,0.6)", "0 0 120px 50px rgba(234,88,12,0.8)", "0 0 80px 30px rgba(251,146,60,0.6)"]
                    : ["0 0 30px 10px rgba(251,146,60,0.3)", "0 0 50px 15px rgba(251,146,60,0.5)", "0 0 30px 10px rgba(251,146,60,0.3)"]
                }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="w-32 h-32 md:w-48 md:h-48 rounded-full flex items-center justify-center cursor-pointer pointer-events-auto relative z-20"
                style={{ background: "radial-gradient(circle at 30% 30%, #fef08a, #f97316, #ea580c, #9a3412)" }}
              >
                <div className="w-full h-full rounded-full bg-white/30 blur-md absolute inset-0" />
              </motion.div>

              <motion.p
                animate={{ opacity: isSpaceHovered ? 0 : 1, y: isSpaceHovered ? 20 : 0 }}
                className="mt-8 text-muted-foreground font-medium text-sm md:text-lg max-w-[320px] text-center z-20 bg-white/80 px-4 py-1 rounded-full border border-border backdrop-blur-md pointer-events-none transition-all"
              >
                .Hover the sun to reveal deep space.
              </motion.p>
            </div>

            {/* 3D Isometric Orbit System */}
            <div
              className="absolute w-full h-full flex items-center justify-center pointer-events-none z-10"
              style={{ transform: "rotateX(70deg)", transformStyle: "preserve-3d" }}
            >
              <div className="relative flex items-center justify-center w-full h-full" style={{ transformStyle: "preserve-3d" }}>
                {/* Orbit Rings (Tilted) */}
                <div className={`absolute w-[400px] h-[400px] md:w-[800px] md:h-[800px] border-2 border-dashed rounded-full transition-colors duration-1000 ${isSpaceHovered ? 'border-white/20' : 'border-border opacity-40'}`} />
                <div className={`absolute w-[600px] h-[600px] md:w-[1200px] md:h-[1200px] border rounded-full transition-colors duration-1000 ${isSpaceHovered ? 'border-white/10' : 'border-border opacity-20'}`} />

                {/* Text Bodies */}
                <div className="absolute w-full h-full flex items-center justify-center" style={{ transformStyle: "preserve-3d" }}>
                  {PLANETS.map((planet, index) => {
                    const isInner = index % 2 === 0;
                    const radius = isInner
                      ? (typeof window !== 'undefined' && window.innerWidth < 768 ? 200 : 400)
                      : (typeof window !== 'undefined' && window.innerWidth < 768 ? 300 : 600);
                    const orbitDuration = isInner ? 60 : 100;
                    const startAngle = (index / PLANETS.length) * 360;

                    return (
                      <motion.div
                        key={planet.name}
                        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none"
                        initial={{ rotateZ: startAngle }}
                        animate={{ rotateZ: startAngle + 360 }}
                        transition={{ duration: orbitDuration, repeat: Infinity, ease: "linear" }}
                        style={{ width: `${radius * 2}px`, height: `${radius * 2}px`, transformStyle: "preserve-3d" }}
                      >
                        <div
                          className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-auto"
                          style={{ transformOrigin: "center center", transformStyle: "preserve-3d" }}
                        >
                          {/* 1. Un-twist rotation so gimbal stays pointing consistently outwards */}
                          <motion.div
                            initial={{ rotateZ: -startAngle }}
                            animate={{ rotateZ: -(startAngle + 360) }}
                            transition={{ duration: orbitDuration, repeat: Infinity, ease: "linear" }}
                            style={{ transformStyle: "preserve-3d" }}
                          >
                            {/* 2. Un-tilt the 70deg board rotation so the text stands perfectly upright facing the camera */}
                            <div
                              onClick={() => handleGlobeClick(planet.name)}
                              className="flex flex-col items-center justify-center group cursor-pointer relative z-30 transition-all duration-500"
                              style={{ transform: "rotateX(-70deg)", transformStyle: "preserve-3d" }}
                            >
                              {/* Floating Text Element (2D in 3D Space) */}
                              <div
                                className="px-4 py-2 rounded-full bg-slate-900/40 border border-slate-700/50 backdrop-blur-md whitespace-nowrap transition-transform duration-300 group-hover:scale-150 group-hover:bg-slate-900/80 group-hover:border-slate-500 shadow-lg relative flex flex-col items-center justify-center"
                              >
                                <p className="text-white font-display font-bold text-sm md:text-base tracking-wide flex items-center gap-2">
                                  <planet.icon className="w-4 h-4 text-emerald-400 opacity-70 group-hover:opacity-100 transition-opacity" />
                                  {planet.name}
                                </p>

                                {/* Hover Subtitle */}
                                <div className="absolute top-[110%] w-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                                  <span className="text-emerald-300/80 text-[10px] uppercase tracking-widest whitespace-nowrap bg-black/50 px-2 py-0.5 rounded-full">
                                    {aspects?.find((a: any) => a.aspect === planet.name)?.shortNote || planet.aspect}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        </div>
                      </motion.div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Aspects Section */}
      <section ref={aspectsSectionRef} className="relative w-full min-h-[800px] py-16 md:py-32 overflow-hidden scroll-mt-20">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, amount: 0.15 }}
          transition={{ duration: 3, ease: "easeOut" }}
          className="absolute inset-0 pointer-events-none"
        >
          <BackgroundSlideshow images={allAspectImages} />
        </motion.div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 md:px-8">
          {selectedAspect ? (
            <div className="w-full bg-white/70 backdrop-blur-xl rounded-[2.5rem] p-6 md:p-12 shadow-2xl border border-white/60 relative z-10">
              {/* Aspect Detail View */}

              {/* Sub Navigation */}
              <div className="flex items-center gap-3 overflow-x-auto pb-4 mb-10 border-b border-border/50 scrollbar-hide no-scrollbar">
                <button
                  onClick={() => setSelectedAspect(null)}
                  className="shrink-0 flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900 border border-border rounded-full px-4 py-2 mr-2 hover:bg-slate-50 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" /> Back to Grid
                </button>

                {PLANETS.map(p => (
                  <button
                    key={p.name}
                    onClick={() => setSelectedAspect(p.name)}
                    className={`shrink-0 flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-full transition-all duration-300 ${selectedAspect === p.name ? 'bg-emerald-100 text-emerald-800 shadow-sm' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'}`}
                  >
                    <p.icon className={`w-4 h-4 ${selectedAspect === p.name ? 'text-emerald-600' : ''}`} /> {p.name}
                  </button>
                ))}
              </div>

              {/* Content Area */}
              {(() => {
                const aspectData = PLANETS.find(p => p.name === selectedAspect);
                if (!aspectData) return null;

                const convexAspectData = aspects.find((a: any) => a.aspect === selectedAspect);

                return (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    key={aspectData.name}
                    className="flex flex-col md:flex-row gap-12 lg:gap-16"
                  >
                    <div className="flex-1 space-y-8">
                      <div className="flex items-center gap-5">
                        <div className="w-20 h-20 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center shadow-sm">
                          <aspectData.icon className="w-10 h-10 text-emerald-600" />
                        </div>
                        <div>
                          <h2 className="text-4xl md:text-5xl font-display font-bold text-slate-900 tracking-tight">{aspectData.name}</h2>
                          {convexAspectData?.shortNote ? (
                            <p className="text-emerald-600 font-semibold text-sm mt-2">{convexAspectData.shortNote}</p>
                          ) : (
                            <p className="text-emerald-600 font-semibold uppercase tracking-widest text-sm mt-2">{aspectData.aspect}</p>
                          )}
                        </div>
                      </div>

                      <div className="prose prose-slate max-w-none text-muted-foreground text-lg leading-relaxed">
                        {convexAspectData?.writeUp ? (
                          <p className="whitespace-pre-wrap">{convexAspectData.writeUp}</p>
                        ) : (
                          <>
                            <p>
                              Dive deeper into <strong>{aspectData.name}</strong>, our dedicated space for {aspectData.aspect.toLowerCase()}.
                              This cluster provides members with specialized tools, immersive environments, and the collaborative
                              energy needed to explore and refine their craft.
                            </p>
                            <p>
                              Whether you are a seasoned expert or a curious beginner, the {aspectData.name} area offers
                              resources designed to inspire and elevate your practice. Connect with like-minded individuals,
                              participate in hands-on workshops, and unlock new dimensions of creativity and understanding
                              in the aesthetic centre.
                            </p>
                          </>
                        )}
                      </div>

                      <div className="pt-6 border-t border-border/50">
                        <button className="px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-full font-medium transition-colors shadow-sm inline-flex items-center gap-2">
                          Join {aspectData.name} Sessions <ArrowRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Visual representation */}
                    <div className="w-full md:w-[400px] lg:w-[500px] aspect-square rounded-[2rem] relative overflow-hidden flex items-center justify-center shadow-xl group bg-slate-900 border border-slate-800">
                      {convexAspectData?.images && convexAspectData.images.filter((i: string) => i.trim().length > 5).length > 0 ? (
                        <>
                          <ImageSlideshow images={convexAspectData.images} />
                        </>
                      ) : (
                        <>
                          <div className="absolute inset-0 transition-transform duration-700 group-hover:scale-105" style={{ background: aspectData.planetBg }} />
                          <div className="absolute inset-0 bg-black/20 mix-blend-multiply" />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                          <aspectData.icon className="w-40 h-40 text-white/90 drop-shadow-2xl z-10 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6" />
                        </>
                      )}
                    </div>
                  </motion.div>
                );
              })()}
            </div>
          ) : (
            <div className="relative w-full z-10">
              <motion.div style={{ opacity: exploreOpacity }} className="flex justify-center mb-8">
                <div className="text-center bg-white/60 backdrop-blur-xl px-8 py-5 rounded-[2rem] border border-white/60 shadow-2xl">
                  <h2 className="text-2xl md:text-4xl font-display font-bold text-slate-900 tracking-tight">Explore Our Aspects</h2>
                  <p className="text-slate-800 font-medium mt-2 max-w-xl mx-auto text-base lg:text-lg">Discover the different clusters of our aesthetic center.</p>
                </div>
              </motion.div>

              {/* Masonry / Bento Box Grid */}
              <motion.div style={{ opacity: exploreOpacity }} className="grid grid-cols-1 md:grid-cols-4 auto-rows-[160px] gap-4 md:gap-6 relative z-10">
                {/* Card 1: Large Wide */}
                <motion.div
                  onClick={() => setSelectedAspect('FabLab')}
                  whileHover={{ y: -5, boxShadow: "0 10px 30px -10px rgba(0,0,0,0.1)" }}
                  className="md:col-span-2 md:row-span-2 rounded-2xl border border-white/60 bg-white/70 backdrop-blur-md overflow-hidden p-6 flex flex-col justify-between group cursor-pointer transition-all duration-300 shadow-sm"
                >
                  <div className={`w-14 h-14 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center mb-4`}>
                    <Cpu className={`w-7 h-7 text-blue-500`} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold mb-2">FabLab</h3>
                    <p className="text-muted-foreground line-clamp-3">
                      Our digital fabrication laboratory, equipped with 3D printers, laser cutters, and electronics workstations. A space to rapid-prototype and bring your designs to physical reality.
                    </p>
                    <div className="mt-6 flex items-center text-blue-600 font-medium group-hover:gap-2 transition-all">
                      Learn More <ArrowRight className="w-4 h-4 ml-1" />
                    </div>
                  </div>
                </motion.div>

                {/* Card 2: Tall */}
                <motion.div
                  onClick={() => setSelectedAspect('Astronomy')}
                  whileHover={{ y: -5, boxShadow: "0 10px 30px -10px rgba(0,0,0,0.1)" }}
                  className="md:col-span-1 md:row-span-2 rounded-2xl border border-white/50 bg-white/50 backdrop-blur-md overflow-hidden p-6 flex flex-col group cursor-pointer transition-all duration-300 shadow-sm"
                >
                  <div className={`w-12 h-12 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center mb-6`}>
                    <Telescope className={`w-6 h-6 text-indigo-500`} />
                  </div>
                  <h3 className="text-xl font-bold mb-2">Astronomy</h3>
                  <p className="text-sm text-muted-foreground flex-grow">
                    Explore the cosmos with our telescopes and observational equipment.
                  </p>
                  <div className="mt-4 flex items-center text-indigo-600 text-sm font-medium group-hover:gap-2 transition-all">
                    Details <ArrowRight className="w-4 h-4 ml-1" />
                  </div>
                </motion.div>

                {/* Card 3: Standard */}
                <motion.div
                  onClick={() => setSelectedAspect('Painting')}
                  whileHover={{ y: -5, boxShadow: "0 10px 30px -10px rgba(0,0,0,0.1)" }}
                  className="md:col-span-1 md:row-span-1 rounded-2xl border border-white/60 bg-white/70 backdrop-blur-md overflow-hidden p-6 flex flex-col justify-center group cursor-pointer transition-all duration-300 shadow-sm"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-full bg-pink-50 border border-pink-100 flex items-center justify-center flex-shrink-0`}>
                      <Palette className={`w-6 h-6 text-pink-500`} />
                    </div>
                    <h3 className="text-lg font-bold">Painting</h3>
                  </div>
                </motion.div>

                {/* Card 4: Standard */}
                <motion.div
                  onClick={() => handleGlobeClick('Sculpting')}
                  whileHover={{ y: -5, boxShadow: "0 10px 30px -10px rgba(0,0,0,0.1)" }}
                  className="md:col-span-1 md:row-span-1 rounded-2xl border border-white/60 bg-white/70 backdrop-blur-md overflow-hidden p-6 flex flex-col justify-center group cursor-pointer transition-all duration-300 shadow-sm"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-full bg-orange-50 border border-orange-100 flex items-center justify-center flex-shrink-0`}>
                      <Hammer className={`w-6 h-6 text-orange-500`} />
                    </div>
                    <h3 className="text-lg font-bold">Sculpting</h3>
                  </div>
                </motion.div>

                {/* Card 5: Standard */}
                <motion.div
                  onClick={() => handleGlobeClick('Weaving')}
                  whileHover={{ y: -5, boxShadow: "0 10px 30px -10px rgba(0,0,0,0.1)" }}
                  className="md:col-span-1 md:row-span-1 rounded-2xl border border-white/60 bg-white/70 backdrop-blur-md overflow-hidden p-6 flex flex-col justify-center group cursor-pointer transition-all duration-300 shadow-sm"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-full bg-teal-50 border border-teal-100 flex items-center justify-center flex-shrink-0`}>
                      <Scissors className={`w-6 h-6 text-teal-500`} />
                    </div>
                    <h3 className="text-lg font-bold">Weaving</h3>
                  </div>
                </motion.div>

                {/* Card 6: Wide */}
                <motion.div
                  onClick={() => handleGlobeClick('Music')}
                  whileHover={{ y: -5, boxShadow: "0 10px 30px -10px rgba(0,0,0,0.1)" }}
                  className="md:col-span-2 md:row-span-1 rounded-2xl border border-white/50 bg-white/50 backdrop-blur-md overflow-hidden p-6 flex items-center justify-between group cursor-pointer transition-all duration-300 shadow-sm"
                >
                  <div>
                    <h3 className="text-xl font-bold mb-1">Music & Dance</h3>
                    <p className="text-sm text-muted-foreground">Soundscapes and movement studios.</p>
                  </div>
                  <div className="flex -space-x-4">
                    <div className="w-12 h-12 rounded-full bg-purple-50 border border-purple-200 flex items-center justify-center shadow-sm">
                      <Music className="w-5 h-5 text-purple-500" />
                    </div>
                    <div className="w-12 h-12 rounded-full bg-rose-50 border border-rose-200 flex items-center justify-center shadow-sm">
                      <Activity className="w-5 h-5 text-rose-500" />
                    </div>
                  </div>
                </motion.div>
                {/* Card 8: Computer Science — fills bottom-right gap (row-span-2) */}
                <motion.div
                  onClick={() => handleGlobeClick('Computer Science')}
                  whileHover={{ y: -5, boxShadow: "0 10px 30px -10px rgba(0,0,0,0.1)" }}
                  className="md:col-span-1 md:row-span-2 rounded-2xl border border-white/60 bg-white/70 backdrop-blur-md overflow-hidden p-6 flex flex-col justify-between group cursor-pointer transition-all duration-300 shadow-sm"
                >
                  <div className="w-12 h-12 rounded-full bg-cyan-50 border border-cyan-100 flex items-center justify-center mb-4">
                    <Code2 className="w-6 h-6 text-cyan-500" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold mb-2">Computer Science</h3>
                    <p className="text-sm text-muted-foreground">
                      Algorithms, logic, and computational thinking to build, automate, and innovate.
                    </p>
                    <div className="mt-4 flex items-center text-cyan-600 text-sm font-medium group-hover:gap-2 transition-all">
                      Details <ArrowRight className="w-4 h-4 ml-1" />
                    </div>
                  </div>
                </motion.div>

                {/* Card 7: Wide */}
                <motion.div
                  onClick={() => handleGlobeClick('Truth')}
                  whileHover={{ y: -5, boxShadow: "0 10px 30px -10px rgba(0,0,0,0.1)" }}
                  className="md:col-span-3 md:row-span-1 rounded-2xl border border-white/60 bg-white/70 backdrop-blur-md overflow-hidden p-6 flex items-center justify-between group cursor-pointer transition-all duration-300 shadow-sm"
                >
                  <div className="flex -space-x-4">
                    <div className="w-12 h-12 rounded-full bg-slate-100 border border-slate-300 flex items-center justify-center shadow-sm z-20">
                      <Scale className="w-5 h-5 text-slate-700" />
                    </div>
                    <div className="w-12 h-12 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center shadow-sm z-10">
                      <Sparkles className="w-5 h-5 text-amber-500" />
                    </div>
                    <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center shadow-sm z-0">
                      <Gem className="w-5 h-5 text-emerald-500" />
                    </div>
                  </div>
                  <div className="text-right">
                    <h3 className="text-xl font-bold mb-1">Truth, Beauty & Value</h3>
                    <p className="text-sm text-muted-foreground">The philosophical cores.</p>
                  </div>
                </motion.div>
              </motion.div>
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-white py-12 mt-auto">
        <div className="max-w-7xl mx-auto px-4 md:px-8 text-center text-muted-foreground text-sm">
          <p>© {new Date().getFullYear()} thetic Centre. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
