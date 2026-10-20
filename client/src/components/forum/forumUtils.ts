/**
 * Forum Media & Image Utility Functions
 */

export function extractGoogleDriveId(url?: string | null): string | null {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  const match =
    trimmed.match(/drive\.google\.com\/file\/(?:u\/\d+\/)?d\/([a-zA-Z0-9_-]+)/i) ||
    trimmed.match(/drive\.google\.com\/(?:uc|open)\?(?:.*&)?id=([a-zA-Z0-9_-]+)/i) ||
    trimmed.match(/drive\.google\.com\/thumbnail\?(?:.*&)?id=([a-zA-Z0-9_-]+)/i) ||
    trimmed.match(/docs\.google\.com\/(?:uc|open|file)\?(?:.*&)?id=([a-zA-Z0-9_-]+)/i) ||
    trimmed.match(/docs\.google\.com\/file\/(?:u\/\d+\/)?d\/([a-zA-Z0-9_-]+)/i) ||
    trimmed.match(/lh3\.googleusercontent\.com\/d\/([a-zA-Z0-9_-]+)/i);

  return match && match[1] ? match[1] : null;
}

/**
 * Normalizes any image URL, converting Google Drive sharing/file links into direct
 * high-speed image streams with proper CDN caching.
 */
export function normalizeForumImageUrl(url?: string | null): string {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();
  if (!trimmed) return '';

  const driveId = extractGoogleDriveId(trimmed);
  if (driveId) {
    return `https://lh3.googleusercontent.com/d/${driveId}`;
  }

  return trimmed;
}

/**
 * Fallback URL using Google Drive thumbnail endpoint if direct CDN hits an edge condition
 */
export function getDriveThumbnailFallbackUrl(url?: string | null): string | null {
  const driveId = extractGoogleDriveId(url);
  if (driveId) {
    return `https://drive.google.com/thumbnail?id=${driveId}&sz=w1200`;
  }
  return null;
}
