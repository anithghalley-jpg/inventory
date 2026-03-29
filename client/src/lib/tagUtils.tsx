import React from 'react';
import { Package, Printer, Scissors, Zap, BookOpen } from 'lucide-react';

export const getTagStyle = (tag: string) => {
  const t = tag.toLowerCase();
  
  // Olive Green: Safety & Training
  if (t.includes('safety') || t.includes('training')) {
    return { color: 'bg-[#4d5d3d] text-white border-black border-[1.5px] shadow-inner font-bold uppercase tracking-wider' };
  }
  
  // Tan/Khaki: 3D Printing
  if (t.includes('3d')) {
    return { color: 'bg-[#b08d57] text-white border-black border-[1.5px] shadow-inner font-bold uppercase tracking-wider' };
  }
  
  // Maroon/Dark Red: Laser Cutting
  if (t.includes('laser')) {
    return { color: 'bg-[#7b1818] text-white border-black border-[1.5px] shadow-inner font-bold uppercase tracking-wider' };
  }
  
  // Navy Blue: Electronics
  if (t.includes('electronics')) {
    return { color: 'bg-[#1a2a5c] text-white border-black border-[1.5px] shadow-inner font-bold uppercase tracking-wider' };
  }
  
  // Charcoal/Black: Fab Academy & Default
  if (t.includes('fa 20')) {
    return { color: 'bg-[#1a1a1a] text-white border-black border-[1.5px] shadow-sm font-black uppercase tracking-[0.1em]' };
  }
  
  // Default Badge
  return { color: 'bg-[#333333] text-white border-black border-[1.5px] shadow-inner font-bold uppercase tracking-wider' };
};
