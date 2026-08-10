import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Google Drive blocks new images ending in 'uc?export=view' from embedding in html <img> tags securely via cookie constraints.
 * Generating thumbnail alternative links dynamically forces the google servers to yield an embeddable image.
 */
export function getOptimizedImageUrl(url: string | undefined): string {
  if (!url) return '';
  const trimmed = url.trim();
  if (trimmed.includes("drive.google.com/file/d/")) {
    const match = trimmed.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (match && match[1]) {
      return `https://lh3.googleusercontent.com/d/${match[1]}=w1200`;
    }
  }
  if (trimmed.includes("drive.google.com/open?id=") || trimmed.includes("drive.google.com/uc?")) {
    const match = trimmed.match(/id=([a-zA-Z0-9_-]+)/);
    if (match && match[1]) {
      return `https://lh3.googleusercontent.com/d/${match[1]}=w1200`;
    }
  }
  return trimmed;
}
