const DEFAULT_APPS_SCRIPT_URL =
  'https://script.google.com/macros/s/AKfycbyXcj74jsDteyR0SFs9Mon0FC8ojVDkJnSm4m47r_FGKHTInP1ih78I7Na42Hyb2Oeu/exec';
const DEFAULT_DRIVE_FOLDER_ID = '1i_fpnnNDIjOfK5Z8D3GP6yHp00KZ0bsg';

function readEnv(key: string): string {
  const value = import.meta.env[key];
  return typeof value === 'string' ? value.trim() : '';
}

export function requireConvexUrl(): string {
  const convexUrl = readEnv('VITE_CONVEX_URL');
  if (!convexUrl) {
    throw new Error(
      'Missing VITE_CONVEX_URL. Set the deployed Convex URL before running the Firebase Hosting production build.'
    );
  }
  return convexUrl;
}

export const GOOGLE_CLIENT_ID = readEnv('VITE_GOOGLE_CLIENT_ID');
export const SCRIPT_URL = readEnv('VITE_APPS_SCRIPT_URL') || DEFAULT_APPS_SCRIPT_URL;
export const DRIVE_FOLDER_ID = readEnv('VITE_GOOGLE_DRIVE_FOLDER_ID') || DEFAULT_DRIVE_FOLDER_ID;
