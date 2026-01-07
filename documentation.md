# Inventory Management System - Complete Code Documentation

## Table of Contents
1. [System Architecture](#system-architecture)
2. [Data Flow Diagrams](#data-flow-diagrams)
3. [File Structure & Explanations](#file-structure--explanations)
4. [Component Documentation](#component-documentation)
5. [Context API (State Management)](#context-api-state-management)
6. [Google Apps Script Backend](#google-apps-script-backend)
7. [Firebase Hosting Integration](#firebase-hosting-integration)
8. [Troubleshooting Guide](#troubleshooting-guide)

---

## System Architecture

### High-Level Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     INVENTORY MANAGEMENT SYSTEM                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    FRONTEND (React + Vite)                      │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Pages: Login, Dashboard, AdminPanel, NotFound         │   │
│  │  Components: Cards, Buttons, Dialogs, Tables           │   │
│  │  State: AuthContext (User, Role, Status)               │   │
│  └─────────────────────────────────────────────────────────┘   │
│                           ↕ (HTTP POST/GET)                     │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│           GOOGLE APPS SCRIPT (Backend Web App)                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Endpoints: login, checkoutItem, approveUser, etc.     │   │
│  │  Validates requests and manages data                    │   │
│  │  Handles CORS headers for frontend communication        │   │
│  └─────────────────────────────────────────────────────────┘   │
│                           ↕ (Read/Write)                        │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│              GOOGLE SHEETS (Database)                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │    Users     │  │  Inventory   │  │Usage History │          │
│  │  Sheet       │  │  Sheet       │  │  Sheet       │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│  ┌──────────────┐  ┌──────────────┐                            │
│  │ Categories   │  │Item Requests │                            │
│  │  Sheet       │  │  Sheet       │                            │
│  └──────────────┘  └──────────────┘                            │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│         FIREBASE HOSTING (Static Frontend Deployment)           │
│  - Serves React app to users                                    │
│  - Handles SSL/TLS encryption                                   │
│  - Global CDN for fast delivery                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Data Flow Diagrams

### 1. User Login Flow

```
USER ENTERS EMAIL & NAME
         ↓
    [Login.tsx]
         ↓
   handleGoogleSignIn()
         ↓
   useAuth().login(email, name)
         ↓
    [AuthContext.tsx]
         ↓
   POST to Apps Script:
   {
     action: 'login',
     email: 'user@company.com',
     name: 'John Doe'
   }
         ↓
    [Google Apps Script]
         ↓
   Query Users Sheet:
   - Check if email exists
   - If YES: return user data
   - If NO: create new row with PENDING status
         ↓
   Response:
   {
     success: true,
     user: {
       email: 'user@company.com',
       name: 'John Doe',
       role: 'USER',
       status: 'PENDING',
       createdDate: '2024-01-06T...'
     }
   }
         ↓
    [AuthContext.tsx]
         ↓
   Store in state:
   - setUser(userData)
   - localStorage.setItem('user_...', JSON.stringify(userData))
         ↓
   Check status:
   - If PENDING: show "Awaiting approval" message
   - If APPROVED: redirect to /dashboard
   - If REJECTED: show "Access denied" message
         ↓
   USER SEES DASHBOARD OR PENDING MESSAGE
```

### 2. Admin Approval Flow

```
ADMIN VIEWS PENDING USERS
         ↓
    [AdminPanel.tsx]
         ↓
   Displays list of users with status = 'PENDING'
         ↓
   ADMIN CLICKS "APPROVE" BUTTON
         ↓
   handleApproveUser(userId)
         ↓
   Updates local state:
   - pendingUsers.map(u => u.id === userId ? {...u, status: 'APPROVED'} : u)
         ↓
   In production, would POST to Apps Script:
   {
     action: 'approveUser',
     userId: 'user@company.com'
   }
         ↓
   Apps Script updates Users Sheet:
   - Find row with email = userId
   - Set status column to 'APPROVED'
         ↓
   USER CAN NOW LOGIN AND ACCESS DASHBOARD
```

### 3. Inventory Checkout Flow

```
USER VIEWS INVENTORY ITEMS
         ↓
    [Dashboard.tsx]
         ↓
   Displays items from mock data:
   [
     {
       id: '1',
       name: 'Laptop',
       quantity: 5,
       category: 'Electronics',
       ...
     }
   ]
         ↓
   USER CLICKS "CHECKOUT ITEM"
         ↓
   Opens Dialog modal
   - Select quantity
   - Confirm checkout
         ↓
   handleCheckout()
         ↓
   In production, POST to Apps Script:
   {
     action: 'checkoutItem',
     itemId: '1',
     userEmail: 'user@company.com',
     quantity: 2
   }
         ↓
   Apps Script:
   - Find item in Inventory Sheet
   - Check if quantity available
   - Reduce quantity by checkout amount
   - Create entry in UsageHistory Sheet
         ↓
   Response: { success: true, message: 'Item checked out' }
         ↓
   Frontend:
   - Show success toast
   - Update local inventory
   - Record in checkoutRecords state
         ↓
   USER SEES CONFIRMATION MESSAGE
```

### 4. Admin Add Inventory Item Flow

```
ADMIN CLICKS "ADD ITEM" BUTTON
         ↓
    [AdminPanel.tsx - Inventory Tab]
         ↓
   Opens Dialog with form:
   - Item name
   - Company
   - Quantity
   - Category
   - (Optional: Image upload)
         ↓
   ADMIN FILLS FORM AND CLICKS "ADD ITEM"
         ↓
   handleAddItem()
         ↓
   Validates all required fields
         ↓
   In production, POST to Apps Script:
   {
     action: 'addInventoryItem',
     name: 'Laptop',
     quantity: 5,
     category: 'Electronics',
     company: 'Dell',
     imageUrl: 'https://drive.google.com/...',
     remarks: 'Business grade'
   }
         ↓
   Apps Script:
   - Check for duplicate item names
   - If duplicate: return error
   - If new: add row to Inventory Sheet
   - Create entry in UsageHistory Sheet (action: 'CREATE')
         ↓
   Response: { success: true, itemId: 'uuid' }
         ↓
   Frontend:
   - Add item to local inventory array
   - Show success toast
   - Clear form
   - Close dialog
         ↓
   ADMIN SEES NEW ITEM IN INVENTORY LIST
```

---

## File Structure & Explanations

### Project Root Structure

```
inventory_management/
├── client/                          # Frontend React app
│   ├── public/
│   │   ├── images/                 # Generated visual assets
│   │   │   ├── hero-dashboard.jpg
│   │   │   ├── inventory-card-bg.jpg
│   │   │   └── admin-panel-bg.jpg
│   │   └── index.html              # HTML template
│   │
│   ├── src/
│   │   ├── components/             # Reusable UI components (shadcn/ui)
│   │   │   ├── ui/                # Pre-built shadcn components
│   │   │   └── ErrorBoundary.tsx  # Error handling wrapper
│   │   │
│   │   ├── contexts/              # React Context for state management
│   │   │   ├── AuthContext.tsx    # User authentication state
│   │   │   └── ThemeContext.tsx   # Light/dark theme
│   │   │
│   │   ├── pages/                 # Page-level components (routes)
│   │   │   ├── Login.tsx          # Authentication page
│   │   │   ├── Dashboard.tsx      # User inventory view
│   │   │   ├── AdminPanel.tsx     # Admin management interface
│   │   │   └── NotFound.tsx       # 404 page
│   │   │
│   │   ├── lib/                   # Utility functions
│   │   │   └── utils.ts           # Helper functions
│   │   │
│   │   ├── App.tsx                # Main app component with routing
│   │   ├── main.tsx               # React entry point
│   │   └── index.css              # Global styles & Tailwind
│   │
│   └── package.json               # Frontend dependencies
│
├── server/                         # Placeholder for backend
├── shared/                         # Shared types
│
├── IMPLEMENTATION_GUIDE.md         # Feature documentation
├── APPS_SCRIPT_TEMPLATE.gs        # Backend code template
├── DEPLOYMENT_GUIDE.md            # Firebase deployment steps
└── CODE_DOCUMENTATION.md          # This file
```

---

## Component Documentation

### 1. Login.tsx

**Purpose:** User authentication and admin quick access

**Key Functions:**

```typescript
handleGoogleSignIn()
├─ Validates email and name inputs
├─ Calls AuthContext.login(email, name)
├─ Sends POST request to Apps Script
├─ Stores user in state and localStorage
└─ Redirects to /dashboard

handleAdminLogin()
├─ Calls AuthContext.login('admin@company.com', 'Admin User')
├─ Sets role to ADMIN and status to APPROVED
├─ Stores in localStorage
└─ Redirects to /admin
```

**State Variables:**

```typescript
email: string                    // User's email input
name: string                     // User's name input
isLoading: boolean              // Loading state during login
error: string | null            // Error message display
```

**User Flow:**
1. User enters email and name
2. Clicks "Sign in with Google"
3. Frontend sends data to Apps Script
4. Apps Script checks Google Sheets
5. User redirected based on approval status

---

### 2. Dashboard.tsx

**Purpose:** User inventory search, filter, and checkout

**Key Features:**

```typescript
Search Functionality
├─ Real-time filtering by item name
├─ Case-insensitive matching
└─ Updates display instantly

Category Filter
├─ Dropdown showing all categories
├─ Filters inventory by selected category
└─ "All Categories" option shows everything

Checkout Workflow
├─ Modal dialog for quantity selection
├─ Validates sufficient stock
├─ Records checkout in checkoutRecords state
└─ Shows success toast

Item Request
├─ Modal to request new items
├─ Submits to admin for review
└─ Stores in ItemRequests sheet
```

**Mock Data Structure:**

```typescript
interface InventoryItem {
  id: string;              // Unique identifier
  name: string;            // Item name
  quantity: number;        // Current stock
  category: string;        // Category name
  company: string;         // Manufacturer
  imageUrl: string;        // Image link
  remarks?: string;        // Optional notes
  links?: string;          // Optional external links
}
```

**Access Control:**

```typescript
if (!isAuthenticated) {
  // Show "Access Denied" message
  // User must be APPROVED to access dashboard
}
```

---

### 3. AdminPanel.tsx

**Purpose:** Admin management interface for users, inventory, and categories

**Tabs:**

```
1. Users Tab
   ├─ Display pending users
   ├─ Show user details (email, name, created date)
   ├─ Approve button → changes status to APPROVED
   └─ Reject button → changes status to REJECTED

2. Inventory Tab
   ├─ Display all inventory items
   ├─ Add Item button → opens modal
   ├─ Form: name, company, quantity, category
   └─ Submit creates new inventory entry

3. Categories Tab
   ├─ Display existing categories
   ├─ Add Category input
   ├─ Submit button → adds to categories list
   └─ Used in inventory management

4. History Tab
   ├─ Display usage history
   ├─ Shows: item name, user email, action, quantity, timestamp
   ├─ Tracks all checkouts and returns
   └─ Admin visibility only
```

**State Management:**

```typescript
pendingUsers: PendingUser[]        // Users awaiting approval
inventory: InventoryItem[]         // All inventory items
categories: string[]               // Available categories
usageHistory: UsageRecord[]        // All transactions
```

**Admin Functions:**

```typescript
handleApproveUser(userId)
├─ Updates user status to APPROVED
├─ Removes from pending list
└─ User can now login

handleRejectUser(userId)
├─ Updates user status to REJECTED
├─ User cannot access system
└─ Removed from pending list

handleAddCategory(categoryName)
├─ Validates category name
├─ Checks for duplicates
└─ Adds to categories list

handleAddItem(itemData)
├─ Validates all required fields
├─ Checks for duplicate item names
├─ Creates new inventory entry
└─ Records in usage history
```

---

## Context API (State Management)

### AuthContext.tsx

**Purpose:** Centralized user authentication state

**State:**

```typescript
user: User | null                  // Current logged-in user
isAuthenticated: boolean           // true if user.status === 'APPROVED'
isLoading: boolean                 // Loading state during API calls
```

**User Interface:**

```typescript
interface User {
  id: string;                      // Email or unique ID
  email: string;                   // User email
  name: string;                    // Full name
  role: 'ADMIN' | 'USER';         // User role
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdDate: string;             // ISO timestamp
}
```

**Functions:**

```typescript
login(email: string, name: string)
├─ Sends POST to Apps Script
├─ Receives user data from Google Sheets
├─ Stores in state and localStorage
└─ Throws error if login fails

logout()
├─ Clears user from state
├─ Clears localStorage
└─ User redirected to login page

updateUserRole(userId: string, role: 'ADMIN' | 'USER')
└─ Updates user role (admin only)

updateUserStatus(userId: string, status: 'APPROVED' | 'REJECTED')
└─ Updates approval status (admin only)
```

**Data Persistence:**

```typescript
// Stored in browser localStorage
localStorage.setItem(
  `user_${email}`,
  JSON.stringify(userData)
);

// Survives page refresh
// Cleared on logout
```

**Usage in Components:**

```typescript
const { user, login, logout, isAuthenticated } = useAuth();

// Check if user is authenticated
if (!isAuthenticated) {
  // Show access denied
}

// Get current user
console.log(user.role);  // 'ADMIN' or 'USER'
```

---

## Google Apps Script Backend

### Architecture

```
Google Apps Script Web App
├─ doPost(e)
│  ├─ Receives POST requests from frontend
│  ├─ Parses JSON body
│  ├─ Routes to appropriate handler
│  └─ Returns JSON response with CORS headers
│
├─ doGet(e)
│  └─ Handles OPTIONS requests (CORS preflight)
│
└─ Handler Functions
   ├─ handleLogin(data)
   ├─ handleCheckoutItem(data)
   ├─ handleApproveUser(data)
   ├─ handleAddInventoryItem(data)
   ├─ handleAddCategory(data)
   └─ handleGetInventory(data)
```

### Request/Response Format

**Request:**

```javascript
POST https://script.google.com/macros/s/{SCRIPT_ID}/exec

Body (JSON):
{
  action: 'login',              // Action to perform
  email: 'user@company.com',    // User email
  name: 'John Doe'              // User name
}
```

**Response:**

```javascript
{
  success: true,                // Success flag
  user: {                       // User data from Google Sheets
    email: 'user@company.com',
    name: 'John Doe',
    role: 'USER',
    status: 'PENDING',
    createdDate: '2024-01-06T...'
  }
}
```

### Key Functions

**handleLogin(data)**

```javascript
1. Extract email and name from request
2. Query Users sheet for existing user
3. If found: return user data
4. If not found:
   - Create new row in Users sheet
   - Set status to 'PENDING'
   - Return new user data
5. Return JSON response
```

**handleCheckoutItem(data)**

```javascript
1. Extract itemId, userEmail, quantity
2. Query Inventory sheet for item
3. Check if quantity available
4. If insufficient: return error
5. If sufficient:
   - Reduce inventory quantity
   - Create entry in UsageHistory sheet
   - Return success response
```

**handleApproveUser(data)**

```javascript
1. Extract userId (email)
2. Find user in Users sheet
3. Update status column to 'APPROVED'
4. Return success response
```

### Google Sheets Integration

**Users Sheet Structure:**

```
Column A: email          (Primary key)
Column B: name
Column C: role           ('ADMIN' or 'USER')
Column D: status         ('PENDING', 'APPROVED', 'REJECTED')
