import React from 'react';
import { Package, Printer, Scissors, Zap, BookOpen } from 'lucide-react';

export const getTagStyle = (tag: string) => {
  const t = tag.toLowerCase();
  if (t.includes('3d')) return { color: 'bg-orange-100 text-orange-700 border-orange-200', icon: <Printer className="w-3 h-3 mr-1" /> };
  if (t.includes('laser')) return { color: 'bg-red-100 text-red-700 border-red-200', icon: <Scissors className="w-3 h-3 mr-1" /> };
  if (t.includes('electronics')) return { color: 'bg-blue-100 text-blue-700 border-blue-200', icon: <Zap className="w-3 h-3 mr-1" /> };
  if (t.includes('studio')) return { color: 'bg-purple-100 text-purple-700 border-purple-200', icon: <Package className="w-3 h-3 mr-1" /> };
  if (t.includes('safety') || t.includes('training')) return { color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: <BookOpen className="w-3 h-3 mr-1" /> };
  return { color: 'bg-slate-100 text-slate-700 border-slate-200', icon: null };
};
