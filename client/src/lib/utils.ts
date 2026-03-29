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
  const match = url.match(/^https:\/\/drive\.google\.com\/uc\?export=view&id=(.+)$/);
  if (match && match[1]) {
    return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w1000`;
  }
  return url;
}
