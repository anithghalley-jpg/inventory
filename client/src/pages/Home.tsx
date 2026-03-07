import { useState } from "react";
import { motion } from "framer-motion";
import { Link } from "wouter";
import {
  Telescope, Palette, Hammer, Scissors,
  Music, Activity, Scale, Sparkles, Gem, Cpu, ArrowRight
} from "lucide-react";

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
];

export default function Home() {
  const [isSpaceHovered, setIsSpaceHovered] = useState(false);

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans overflow-x-hidden">
      {/* Header with Login */}
      <header className={`absolute top-0 left-0 w-full p-4 md:p-6 z-50 flex justify-between items-center pointer-events-auto transition-colors duration-1000 ${isSpaceHovered ? 'text-white' : 'text-emerald-900'}`}>
        <div className="font-display font-bold text-xl tracking-tight">Aesthetic Centre</div>
        <Link href="/login">
          <button className={`px-5 py-2 text-white text-sm font-semibold rounded-full shadow-md transition-all hover:scale-105 active:scale-95 ${isSpaceHovered ? 'bg-white/20 hover:bg-white/30 backdrop-blur-md' : 'bg-emerald-600 hover:bg-emerald-700'}`}>
            Sign In
          </button>
        </Link>
      </header>

      {/* Hero Section */}
      <section className={`relative w-full h-[600px] md:h-[800px] flex items-center justify-center overflow-hidden border-b transition-colors duration-1000 ${isSpaceHovered ? 'bg-slate-950 border-slate-900' : 'bg-white border-border'}`}>

        {/* Deep Space Background Reveals */}
        <div className={`absolute inset-0 flex items-center justify-center pointer-events-none transition-opacity duration-1000 ${isSpaceHovered ? 'opacity-100' : 'opacity-0'}`}>
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black opacity-80" />

          <motion.div
            animate={{ scale: isSpaceHovered ? 1.05 : 1 }}
            transition={{ duration: 10, repeat: Infinity, repeatType: "reverse", ease: "linear" }}
            className="absolute z-0 text-white/5 font-display font-black text-6xl md:text-[8rem] lg:text-[10rem] text-center leading-none whitespace-nowrap tracking-tighter"
          >
            AESTHETIC<br />CENTRE
          </motion.div>

          {/* Optional little stars */}
          {[...Array(50)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-white rounded-full animate-pulse"
              style={{
                top: `${Math.random() * 100}%`, left: `${Math.random() * 100}%`,
                opacity: Math.random() * 0.5 + 0.2, animationDuration: `${Math.random() * 3 + 2}s`
              }}
            />
          ))}
        </div>

        {/* Global Sun + Orbit Wrapper (incorporates 92% scaling and 20px upward shift) */}
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none z-10"
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
              Hover the sun to reveal deep space.
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
                                  {planet.aspect}
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
      </section>

      {/* Bento Box Grid Section */}
      <section className="py-16 md:py-24 px-4 md:px-8 max-w-7xl mx-auto w-full">
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-display font-bold text-foreground">Explore Our Aspects</h2>
          <p className="text-muted-foreground mt-2">Discover the different clusters of our aesthetic center.</p>
        </div>

        {/* Masonry / Bento Box Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 auto-rows-[200px] gap-4 md:gap-6">
          {/* Card 1: Large Wide */}
          <motion.div
            whileHover={{ y: -5, boxShadow: "0 10px 30px -10px rgba(0,0,0,0.1)" }}
            className="md:col-span-2 md:row-span-2 rounded-2xl border border-border bg-white overflow-hidden p-6 flex flex-col justify-between group cursor-pointer transition-all duration-300 shadow-sm"
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
            whileHover={{ y: -5, boxShadow: "0 10px 30px -10px rgba(0,0,0,0.1)" }}
            className="md:col-span-1 md:row-span-2 rounded-2xl border border-border bg-[#fafafa] overflow-hidden p-6 flex flex-col group cursor-pointer transition-all duration-300 shadow-sm"
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
            whileHover={{ y: -5, boxShadow: "0 10px 30px -10px rgba(0,0,0,0.1)" }}
            className="md:col-span-1 md:row-span-1 rounded-2xl border border-border bg-white overflow-hidden p-6 flex flex-col justify-center group cursor-pointer transition-all duration-300 shadow-sm"
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
            whileHover={{ y: -5, boxShadow: "0 10px 30px -10px rgba(0,0,0,0.1)" }}
            className="md:col-span-1 md:row-span-1 rounded-2xl border border-border bg-white overflow-hidden p-6 flex flex-col justify-center group cursor-pointer transition-all duration-300 shadow-sm"
          >
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-full bg-orange-50 border border-orange-100 flex items-center justify-center flex-shrink-0`}>
                <Hammer className={`w-6 h-6 text-orange-500`} />
              </div>
              <h3 className="text-lg font-bold">Sculpting</h3>
            </div>
          </motion.div>

          {/* Card 5: Wide */}
          <motion.div
            whileHover={{ y: -5, boxShadow: "0 10px 30px -10px rgba(0,0,0,0.1)" }}
            className="md:col-span-2 md:row-span-1 rounded-2xl border border-border bg-[#fafafa] overflow-hidden p-6 flex items-center justify-between group cursor-pointer transition-all duration-300 shadow-sm"
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

          {/* Card 6: Wide */}
          <motion.div
            whileHover={{ y: -5, boxShadow: "0 10px 30px -10px rgba(0,0,0,0.1)" }}
            className="md:col-span-2 md:row-span-1 rounded-2xl border border-border bg-white overflow-hidden p-6 flex items-center justify-between group cursor-pointer transition-all duration-300 shadow-sm"
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
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-white py-12 mt-auto">
        <div className="max-w-7xl mx-auto px-4 md:px-8 text-center text-muted-foreground text-sm">
          <p>© {new Date().getFullYear()} Aesthetic Centre. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
