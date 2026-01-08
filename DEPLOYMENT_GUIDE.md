# Deployment Guide - Inventory Management System

This guide covers deploying the Inventory Management System to Firebase Hosting with Google Apps Script backend integration.

## Prerequisites

- Google Account with access to Google Cloud, Firebase, and Google Drive
- Node.js and npm/pnpm installed locally
- Firebase CLI installed (`npm install -g firebase-tools`)
- Google Apps Script project created

## Part 1: Firebase Hosting Setup

### Step 1: Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project"
3. Enter project name: `inventory-management`
4. Accept terms and create project
5. Wait for project to be created

### Step 2: Install Firebase CLI

```bash
npm install -g firebase-tools
```

### Step 3: Initialize Firebase in Your Project

Navigate to your project directory and run:

```bash
firebase login
firebase init hosting
```

When prompted:
- Select your Firebase project
- Set public directory to `dist`
- Configure as single-page app: **Yes**
- Set up automatic builds: **No** (we'll build manually)

### Step 4: Build the Frontend

```bash
cd /home/ubuntu/inventory_management
pnpm install
pnpm build
```

This creates a `dist` folder with optimized production files.

### Step 5: Deploy to Firebase

```bash
firebase deploy --only hosting
```

Your app is now live at: `https://inventory-management-xxxxx.web.app`

## Part 2: Google Apps Script Backend Setup

### Step 1: Create Google Sheets Database

1. Go to [Google Sheets](https://sheets.google.com)
2. Create a new spreadsheet named "Inventory Management"
3. Create the following sheets (tabs at bottom):
   - **Users**
   - **Inventory**
   - **UsageHistory**
   - **Categories**
   - **ItemRequests**

### Step 2: Set Up Sheet Headers

#### Users Sheet
```
A: email
B: name
C: role
D: status
E: createdDate
```

#### Inventory Sheet
```
A: id
B: name
C: quantity
D: category
E: company
F: imageUrl
G: remarks
H: links
```

#### UsageHistory Sheet
```
A: id
B: itemId
C: userEmail
D: action
E: quantity
F: timestamp
```

#### Categories Sheet
```
A: name
```

#### ItemRequests Sheet
```
A: id
B: userEmail
C: itemName
D: remarks
E: timestamp
```

### Step 3: Create Google Apps Script Project

1. Go to [Google Apps Script](https://script.google.com)
2. Create a new project
3. Replace the default code with the template from `APPS_SCRIPT_TEMPLATE.gs`
4. Update the `SPREADSHEET_ID` variable with your Google Sheet ID:
   - Get it from the URL: `https://docs.google.com/spreadsheets/d/{SPREADSHEET_ID}/edit`

### Step 4: Deploy Apps Script as Web App

1. In Apps Script editor, click "Deploy" → "New deployment"
2. Select type: "Web app"
3. Execute as: Your email
4. Who has access: "Anyone"
5. Click "Deploy"
6. Copy the deployment URL (looks like: `https://script.google.com/macros/d/{SCRIPT_ID}/userweb`)

### Step 5: Set Up Google Drive Folder for Images

1. Go to [Google Drive](https://drive.google.com)
2. Create a folder named "InventoryImages"
3. Share it with "Anyone with the link" can view
4. Note the folder ID for later use

## Part 3: Connect Frontend to Backend

### Step 1: Update Environment Variables

Create a `.env` file in the project root:

```env
VITE_APPS_SCRIPT_URL=https://script.google.com/macros/d/{YOUR_SCRIPT_ID}/userweb
VITE_GOOGLE_DRIVE_FOLDER_ID={YOUR_FOLDER_ID}
```

### Step 2: Update AuthContext

Edit `client/src/contexts/AuthContext.tsx` to use the Apps Script endpoint:

```typescript
const APPS_SCRIPT_URL = import.meta.env.VITE_APPS_SCRIPT_URL;

const login = useCallback(async (email: string, name: string) => {
  setIsLoading(true);
  try {
    const response = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      body: JSON.stringify({
        action: 'login',
        email,
        name
      })
    });
    const data = await response.json();
    if (data.success) {
      setUser(data.user);
      localStorage.setItem(`user_${email}`, JSON.stringify(data.user));
    }
  } finally {
    setIsLoading(false);
  }
}, []);
```

### Step 3: Rebuild and Deploy

```bash
pnpm build
firebase deploy --only hosting
```

## Part 4: Google Sign-In Setup (Optional)

For production, implement real Google Sign-In:

### Step 1: Set Up Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project
3. Enable Google+ API
4. Create OAuth 2.0 credentials (Web application)
5. Add authorized redirect URIs:
   - `https://inventory-management-xxxxx.web.app`
   - `http://localhost:3000`

### Step 2: Implement Google Sign-In

Update `Login.tsx`:

```typescript
import { GoogleLogin } from '@react-oauth/google';

// In your login component
<GoogleLogin
  onSuccess={(credentialResponse) => {
    const decoded = jwtDecode(credentialResponse.credential);
    login(decoded.email, decoded.name);
  }}
/>
```

## Part 5: Security Configuration

### Step 1: Set Up Firebase Security Rules

Create `firestore.rules`:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

### Step 2: Configure CORS in Apps Script

The template already includes CORS headers. Ensure:
- `Access-Control-Allow-Origin: *`
- `Access-Control-Allow-Methods: GET, POST, OPTIONS`

### Step 3: Enable HTTPS

Firebase Hosting automatically provides HTTPS. Ensure all API calls use HTTPS.

## Part 6: Monitoring and Maintenance

### View Logs

```bash
firebase functions:log
```

### Monitor Performance

1. Go to Firebase Console
2. Select your project
3. Check "Analytics" and "Performance" tabs

### Update Deployment

After making changes:

```bash
pnpm build
firebase deploy
```

## Troubleshooting

### Apps Script Deployment Issues

**Error: "Deployment failed"**
- Ensure you're logged in with the correct Google account
- Check that the spreadsheet ID is correct
- Verify sheet names match exactly

**Error: "Permission denied"**
- Check that the Apps Script has access to the spreadsheet
- Verify folder sharing settings for images

### Firebase Deployment Issues

**Error: "Authentication required"**
```bash
firebase logout
firebase login
```

**Error: "Project not found"**
- Verify Firebase project ID in `.firebaserc`
- Check that you have access to the project

### Frontend Issues

**Blank page after deployment**
- Check browser console for errors
- Verify `dist` folder was created with `pnpm build`
- Clear browser cache and reload

**API calls failing**
- Verify Apps Script URL in environment variables
- Check CORS headers in Apps Script
- Ensure Google Sheets is accessible

## Performance Optimization

### Frontend Optimization

```bash
# Build with optimizations
pnpm build

# Check bundle size
npm install -g source-map-explorer
source-map-explorer 'dist/**/*.js'
```

### Apps Script Optimization

- Use caching for frequently accessed data
- Implement pagination for large datasets
- Optimize Google Sheets queries

## Backup and Recovery

### Backup Google Sheets

1. In Google Sheets, click "File" → "Download"
2. Save as CSV or Excel
3. Store in secure location

### Backup Firebase Data

```bash
firebase firestore:export gs://your-bucket/backup
```

## Scaling Considerations

As your inventory grows:

1. **Database:** Consider migrating from Google Sheets to Firestore
2. **Storage:** Use Cloud Storage instead of Google Drive
3. **Backend:** Migrate to Cloud Functions for better performance
4. **Caching:** Implement Redis for frequently accessed data

## Support

For issues:
1. Check the [Firebase Documentation](https://firebase.google.com/docs)
2. Review [Google Apps Script Guide](https://developers.google.com/apps-script)
3. Check browser console for error messages
4. Review deployment logs

---

**Last Updated:** January 2026
**Version:** 1.0.0

{allUsers.map((u) => (
  // Use u.id or u.email here. NEVER use the index if you plan to sort the list.
  <Card key={u.id || u.email} className="p-4 flex items-center justify-between">
     {/* ... contents ... */}
  </Card>
))}