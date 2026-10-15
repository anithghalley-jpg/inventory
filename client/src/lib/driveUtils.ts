// Google Drive & Video URL utilities

export function extractDriveId(url: string): string {
  if (!url) return '';
  let id = '';
  if (url.includes('/file/d/')) {
    id = url.split('/file/d/')[1].split('/')[0].split('?')[0];
  } else if (url.includes('/d/')) {
    id = url.split('/d/')[1].split('/')[0].split('?')[0];
  } else if (url.includes('id=')) {
    id = url.split('id=')[1].split('&')[0];
  }
  return id;
}

export function getGoogleDriveEmbedUrl(url: string): string {
  if (!url) return '';
  let embedUrl = url;
  if (url.includes('drive.google.com/file/d/')) {
    const fileId = url.split('/d/')[1].split('/')[0].split('?')[0];
    embedUrl = `https://drive.google.com/file/d/${fileId}/preview`;
  } else if (url.includes('drive.google.com/open?id=')) {
    const fileId = url.split('id=')[1].split('&')[0];
    embedUrl = `https://drive.google.com/file/d/${fileId}/preview`;
  } else if (url.includes('drive.google.com/uc?id=')) {
    const fileId = url.split('id=')[1].split('&')[0];
    embedUrl = `https://drive.google.com/file/d/${fileId}/preview`;
  } else if (url.includes('youtube.com/watch?v=')) {
    const videoId = url.split('v=')[1].split('&')[0];
    embedUrl = `https://www.youtube.com/embed/${videoId}`;
  } else if (url.includes('youtu.be/')) {
    const videoId = url.split('youtu.be/')[1].split('?')[0];
    embedUrl = `https://www.youtube.com/embed/${videoId}`;
  }
  return embedUrl;
}

/**
 * Returns reliable Google Drive thumbnail URL.
 * Google's official thumbnail generator handles workspace links and sessions properly.
 */
export function getThumbnailUrl(coverImageUrl?: string, videoUrl?: string): string {
  if (coverImageUrl && coverImageUrl.trim()) {
    const trimmed = coverImageUrl.trim();
    if (trimmed.includes('drive.google.com') || trimmed.includes('googleusercontent.com')) {
      const fileId = extractDriveId(trimmed);
      if (fileId) {
        return `https://drive.google.com/thumbnail?id=${fileId}&sz=w1200`;
      }
    }
    return trimmed;
  }
  if (videoUrl) {
    const fileId = extractDriveId(videoUrl);
    if (fileId) {
      return `https://drive.google.com/thumbnail?id=${fileId}&sz=w1200`;
    }
  }
  return '';
}

/**
 * Fallback to direct edge URL if standard thumbnail has an error
 */
export function getThumbnailFallback(coverImageUrl?: string, videoUrl?: string): string {
  const fileId = extractDriveId(coverImageUrl || '') || extractDriveId(videoUrl || '');
  if (fileId) {
    return `https://lh3.googleusercontent.com/d/${fileId}=w1000`;
  }
  return '';
}
