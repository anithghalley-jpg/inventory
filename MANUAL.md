# Aesthetic Centre Setup & Deployment Manual

Welcome to the **Aesthetic Centre Inventory Management System**. This guide provides step-by-step instructions on deploying the application side, setting up the Google Sheets backend, securing your Firebase sync rate limits, and customizing the homepage orbit logos.

---

## 1. Google Sheets & Apps Script Setup

### Step A: Google Sheets Structure
Your primary database is your Google Sheet. Ensure it has the following Exact Sheet Names at the bottom tabs:
- `Users`
- `Inventory`
- `UsageHistory`
- `Categories`
- `ItemRequests`
- `Requests`
- `LaserCutter` (and other machine names)
- `Home` (For the guest homepage dynamic data)

**Important:** For the *Firebase Sync Quota Optimization* to work, the backend expects an MD5 hash check column on the data rows (usually appended at the end by the Apps Script sync worker) to determine if a row is actually "dirty" or changed. 

### Step B: Deploying Apps Script
1. Go to `Extensions > Apps Script` inside your Google Sheet.
2. Copy the entire contents of the updated `APPS_SCRIPT_TEMPLATE.gs` from your project into `Code.gs`.
3. Locate `const SPREADSHEET_ID = '...'` at the top and replace the string with your Google Sheet ID (found in the sheet's URL between `/d/` and `/edit`).
4. Click **Deploy > New deployment**.
5. Select type: **Web app**.
   - Description: "Version 2.0"
   - Execute as: **Me**
   - Who has access: **Anyone**
6. Click Deploy. (You may need to authorize permissions for Google Drive/Sheets heavily on the first run).
7. Copy the generated **Web App URL**. Head to your frontend code (`client/src/lib/constants.ts` or similar config file) and paste this URL as your `SCRIPT_URL`.

---

## 2. Firebase Deployment

1. Ensure you have the Firebase CLI installed (`npm install -g firebase-tools`).
2. Log in using `firebase login`.
3. In your project's root folder, open a terminal.
4. Run `npm install` and then `npm run build`. This generates a `dist` folder.
5. Run `firebase deploy --only hosting`.
6. Your live web application is now active with the newly implemented Aesthetic Light theme!

---

## 3. How to Replace Default Homepage Logos with Your Own Images

The new aesthetic homepage comes with default placeholder icons orbiting the center. You requested the ability to replace these with your own `.svg` or `.png` logo files.

### Requirements for the Logos:
- The backend expects them in the `public` folder of your project (e.g., `client/public/fablab.png`).
- File types: `.svg` (Best for sharpness and scaling) or transparent `.png`.
- Make sure to crop all transparent dead space around your logo so the orbiting circle wraps it tightly!

### Steps to Swap:
1. Place your new logo image (e.g., `fablab.svg`) inside the `public` folder.
2. Open `client/src/pages/Home.tsx`.
3. You will see a `PLANETS` array at the top of the file mapping each aspect to a placeholder `lucide-react` icon:
   ```javascript
   const PLANETS = [
     { name: "FabLab", icon: Cpu, color: "text-blue-500", bg: "bg-blue-50", border: "border-blue-200" },
     ...
   ];
   ```
4. To add custom images, modify the objects to include an `imgSrc` property pointing to the file path:
   ```javascript
   const PLANETS = [
     // Add your file path here starting with a forward slash:
     { name: "FabLab", imgSrc: "/fablab.svg", color: "text-blue-500", bg: "bg-blue-50", border: "border-blue-200" },
     // Keep using icons for the ones you haven't uploaded yet:
     { name: "Astronomy", icon: Telescope, color: "text-indigo-500", bg: "bg-indigo-50", border: "border-indigo-200" },
   ];
   ```
5. Scroll down in `Home.tsx` to around **line 114**, inside the mapped `planet` component. Instead of always rendering the `<planet.icon />`:
   ```javascript
   {planet.imgSrc ? (
     <img src={planet.imgSrc} alt={planet.name} className="w-8 h-8 object-contain" />
   ) : (
     planet.icon && <planet.icon className={`w-8 h-8 ${planet.color}`} />
   )}
   ```
*(Note: I have already partially prepared this step in the code comments for you. You just need to swap the components out).* 

---

## 4. Admin Operation Guidelines

- **Force Turn Off:** To manually sign a user out of their session tracking on the Monitor tab, simply click the new "Force Turn Off" button on their card. This prevents skewed screen-time logs.
- **Background Syncs (No freezing):** Adding inventory items from your Desktop or Mobile camera will now show a smooth "Background Syncing" card instead of freezing your screen. You can continue interacting with the panel while Google Drive categorizes the uploads.
