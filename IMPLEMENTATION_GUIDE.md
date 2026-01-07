# Inventory Management System - Implementation Guide

## Overview

This is a complete inventory management web application built with a modern minimalist design. The application features Google Sign-In authentication, role-based access control (Admin and User), and comprehensive inventory management capabilities.

## Architecture

### Frontend Stack
- **Framework:** React 19 with TypeScript
- **Styling:** Tailwind CSS 4 with custom warm sage green color palette
- **UI Components:** shadcn/ui components
- **Routing:** Wouter for client-side routing
- **State Management:** React Context API (AuthContext)

### Backend Integration (To Be Implemented)
- **Backend:** Google Apps Script Web App
- **Database:** Google Sheets
- **Image Storage:** Google Drive
- **Authentication:** Google Sign-In OAuth

### Design Philosophy
- **Color Scheme:** Warm sage green (#10b981) primary with cream backgrounds (#fafaf9)
- **Typography:** Plus Jakarta Sans for headers, Inter for body text
- **Components:** Rounded cards (12px radius) with soft shadows
- **Interactions:** Smooth transitions (200-300ms) and micro-interactions

## Project Structure

```
client/
├── public/
│   └── images/              # Generated visual assets
│       ├── hero-dashboard.jpg
│       ├── inventory-card-bg.jpg
│       └── admin-panel-bg.jpg
├── src/
│   ├── components/          # Reusable UI components (shadcn/ui)
│   ├── contexts/
│   │   ├── AuthContext.tsx  # User authentication & role management
│   │   └── ThemeContext.tsx # Theme switching (light/dark)
│   ├── pages/
│   │   ├── Login.tsx        # Google Sign-In page
│   │   ├── Dashboard.tsx    # User inventory search & checkout
│   │   ├── AdminPanel.tsx   # Admin management interface
│   │   └── NotFound.tsx     # 404 page
│   ├── lib/                 # Utility functions
│   ├── App.tsx              # Main app component with routing
│   ├── main.tsx             # React entry point
│   └── index.css            # Global styles & design tokens
└── index.html               # HTML template

server/                       # Placeholder for backend compatibility
shared/                       # Shared types and constants
```

## Key Features

### Authentication Flow

1. **Login Page** (`/`)
   - Email and name input fields
   - Google Sign-In button (simulated)
   - First-time users marked as "PENDING"
   - Awaiting admin approval message

2. **User Status States**
   - `PENDING` - Awaiting admin approval
   - `APPROVED` - Full access granted
   - `REJECTED` - Access denied

### User Features (`/dashboard`)

**Search & Filter Inventory**
- Real-time search by item name
- Filter by category dropdown
- Card-based display with item details
- Stock quantity indicators

**Checkout Items**
- Select item and quantity
- Modal confirmation dialog
- Usage history tracking
- Toast notifications for feedback

**Request New Items**
- Submit item requests to admin
- Include remarks and details
- Stored for admin review

### Admin Features (`/admin`)

**User Management**
- View pending user registrations
- Approve/reject users
- Track user creation dates
- Status indicators

**Inventory Management**
- Add new inventory items
- Specify quantity, company, category
- Image upload support (ready for Google Drive integration)
- Edit and delete capabilities

**Category Management**
- Create new categories
- Manage category list
- Used for inventory organization

**Usage History**
- Track all checkouts and returns
- User and item details
- Timestamp records
- Admin visibility for all transactions

## Database Structure (Google Sheets)

### Users Sheet
| Column | Type | Description |
|--------|------|-------------|
| id | String | Unique user identifier |
| email | String | User email address |
| name | String | User full name |
| role | String | ADMIN or USER |
| status | String | PENDING, APPROVED, or REJECTED |
| createdDate | DateTime | Account creation timestamp |

### Inventory Sheet
| Column | Type | Description |
|--------|------|-------------|
| id | String | Unique item identifier |
| name | String | Item name (check for duplicates) |
| quantity | Number | Current stock quantity |
| category | String | Item category |
| company | String | Manufacturer/supplier |
| imageUrl | String | Google Drive image link |
| remarks | String | Optional notes |
| links | String | Optional external links |

### Usage History Sheet
| Column | Type | Description |
|--------|------|-------------|
| id | String | Unique record identifier |
| itemId | String | Reference to inventory item |
| userEmail | String | User who performed action |
| action | String | CHECKOUT or RETURN |
| quantity | Number | Items checked out/returned |
| timestamp | DateTime | Action timestamp |

### Categories Sheet
| Column | Type | Description |
|--------|------|-------------|
| name | String | Category name |

### Item Requests Sheet
| Column | Type | Description |
|--------|------|-------------|
| id | String | Unique request identifier |
| userEmail | String | Requesting user |
| itemName | String | Requested item name |
| remarks | String | Request details |
| timestamp | DateTime | Request submission time |

## Backend Integration Steps

### 1. Google Apps Script Setup

Create a Google Apps Script Web App that handles:

```javascript
// Example Apps Script endpoint structure
function doGet(e) {
  // Handle GET requests for data retrieval
}

function doPost(e) {
  // Handle POST requests for data modifications
  const data = JSON.parse(e.postData.contents);
  
  // Route to appropriate handler
  switch(data.action) {
    case 'login':
      return handleLogin(data);
    case 'checkoutItem':
      return handleCheckout(data);
    case 'approveUser':
      return handleApproveUser(data);
    // ... other actions
  }
}
```

### 2. Frontend API Integration

Update `AuthContext.tsx` to call your Apps Script endpoint:

```typescript
const login = async (email: string, name: string) => {
  const response = await fetch(
    'YOUR_APPS_SCRIPT_ENDPOINT',
    {
      method: 'POST',
      body: JSON.stringify({ action: 'login', email, name })
    }
  );
  const user = await response.json();
  setUser(user);
};
```

### 3. Image Upload Flow

Implement camera capture and Google Drive upload:

```typescript
// Capture image from device camera
const captureImage = async () => {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.capture = 'environment';
  input.onchange = async (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (file) {
      // Upload to Google Drive via Apps Script
      const formData = new FormData();
      formData.append('file', file);
      const response = await fetch('YOUR_APPS_SCRIPT_ENDPOINT', {
        method: 'POST',
        body: formData
      });
      const { imageUrl } = await response.json();
      // Save imageUrl to inventory
    }
  };
  input.click();
};
```

## Deployment

### Firebase Hosting Setup

1. Install Firebase CLI
2. Initialize Firebase project
3. Build the frontend: `pnpm build`
4. Deploy: `firebase deploy`

### Google Apps Script Deployment

1. Create new Apps Script project
2. Implement backend logic
3. Deploy as Web App
4. Grant necessary permissions to Google Sheets and Drive

## Design System

### Color Palette
- **Primary:** #10b981 (Emerald)
- **Secondary:** #f59e0b (Amber)
- **Background:** #fafaf9 (Cream)
- **Foreground:** #1f2937 (Dark Gray)
- **Border:** #e5e7eb (Light Gray)
- **Success:** #10b981 (Green)
- **Error:** #ef4444 (Red)

### Typography
- **Display Font:** Plus Jakarta Sans (600, 700 weights)
- **Body Font:** Inter (400, 500, 600 weights)
- **H1:** 32px, 700 weight
- **H2:** 24px, 600 weight
- **H3:** 18px, 600 weight
- **Body:** 14px, 400 weight

### Component Styles
- **Border Radius:** 12px (0.75rem)
- **Shadows:** Soft shadows (0 1px 3px rgba)
- **Transitions:** 200-300ms ease-out
- **Spacing:** 8px base unit (8, 16, 24, 32, etc.)

## Security Considerations

### Frontend Security
- Input validation on all forms
- XSS protection through React's built-in escaping
- CSRF tokens for state-changing operations

### Backend Security (Apps Script)
- Validate user role before sensitive operations
- Verify email ownership for user actions
- Rate limiting on API endpoints
- Sanitize all user inputs
- Use HTTPS for all communications

### Data Protection
- Store sensitive data server-side only
- Use secure session management
- Implement proper access control
- Audit all admin actions

## Testing Checklist

- [ ] Login flow with email and name
- [ ] User approval workflow (pending → approved)
- [ ] Search functionality with partial matching
- [ ] Category filtering
- [ ] Checkout item with quantity validation
- [ ] Admin user approval/rejection
- [ ] Add new inventory item
- [ ] Add new category
- [ ] View usage history
- [ ] Responsive design on mobile/tablet/desktop
- [ ] Smooth animations and transitions
- [ ] Toast notifications for all actions
- [ ] Error handling and validation messages

## Future Enhancements

1. **Advanced Features**
   - Item return workflow with admin approval
   - Inventory low-stock alerts
   - User activity dashboard
   - Batch operations for inventory
   - Export reports (CSV/PDF)

2. **UI Improvements**
   - Dark mode theme
   - Advanced search filters
   - Item image gallery
   - User profile management
   - Notification preferences

3. **Integration**
   - Slack notifications for approvals
   - Email notifications for checkouts
   - Calendar integration for reservations
   - QR code generation for items

## Support & Maintenance

For issues or questions:
1. Check the implementation guide
2. Review the design system documentation
3. Test in different browsers and devices
4. Verify Google Apps Script endpoints are responding
5. Check Google Sheets permissions and structure

---

**Last Updated:** January 2026
**Version:** 1.0.0
**Status:** Ready for Backend Integration
