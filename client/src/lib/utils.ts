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
  let trimmed = url.trim();
  if (!trimmed || trimmed === '#' || trimmed === 'null' || trimmed === 'undefined') return '';

  // Google Drive file ID extraction across all URL formats
  if (trimmed.includes("drive.google.com") || trimmed.includes("docs.google.com")) {
    const fileIdMatch = trimmed.match(/\/d\/([a-zA-Z0-9_-]+)/) ||
      trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/) ||
      trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) ||
      trimmed.match(/usp=sharing.*id=([a-zA-Z0-9_-]+)/);

    if (fileIdMatch && fileIdMatch[1]) {
      const fileId = fileIdMatch[1];
      return `https://lh3.googleusercontent.com/d/${fileId}=w1200`;
    }
  }

  // Handle direct lh3.googleusercontent.com links (ensure high quality thumbnail)
  if (trimmed.includes("lh3.googleusercontent.com/d/")) {
    if (!trimmed.includes("=")) {
      return `${trimmed}=w1200`;
    }
  }

  // Dropbox shared links: force direct raw image stream
  if (trimmed.includes("dropbox.com/s/")) {
    trimmed = trimmed.replace("www.dropbox.com", "dl.dropboxusercontent.com").replace("?dl=0", "").replace("?dl=1", "");
  }

  return trimmed;
}
