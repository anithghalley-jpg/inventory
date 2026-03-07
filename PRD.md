# Product Requirements Document (PRD)
## Inventory Management System
**Version:** 2.1  
**Last Updated:** March 2026  
**Status:** Approved for Development & Reference

---

## 📋 Table of Contents

1. [Project Overview](#1-project-overview)
2. [Problem Statement](#2-problem-statement)
3. [Goals and Success Metrics](#3-goals-and-success-metrics)
4. [User Roles & Personas](#4-user-roles--personas)
5. [System Architecture](#5-system-architecture)
6. [Technology Stack](#6-technology-stack)
7. [Core Features & Workflows](#7-core-features--workflows)
8. [Data Structure](#8-data-structure)
9. [Security & Access Control](#9-security--access-control)
10. [User Interface Requirements](#10-user-interface-requirements)
11. [Known Issues & Design Decisions](#11-known-issues--design-decisions)
12. [Future Roadmap](#12-future-roadmap)
13. [Glossary](#13-glossary)

---

## 1. Project Overview

This is an **Inventory Management System : The name of the APP is Aesthetic Centre** built for an aesthetic centre, makerspace, or shared workshop environment where members borrow and return physical equipment (e.g., tools, electronics, machines). 

The system tracks:
- Who has checked out which items and when.
- Who is allowed to approve checkouts.
- Real-time availability of items.
- Laptop/Machine online/offline status to track time spent by users.
- Automated machine usage time and session history via RFID (e.g., Laser Cutter, 3D Printer).
- User registration, approval, and role management.
- Dynamic guest-facing homepage content managed directly by administrators.

The application is a web app hosted on Firebase and accessible from any web browser. All application data is ultimately managed by the organization's administration using familiar tools — primarily **Google Sheets** — with the website automatically staying in sync via Google Apps Script and Firestore.

---

## 2. Problem Statement

Shared workspaces have physical equipment that needs to be tracked. Without a formal system in place:
- Items are lost, not returned, or difficult to identify for team members in the lab.
- Admins manually manage Excel files or paper logs, which is error-prone and unscalable.
- There is no accountability for machine usage time or laptop screen time.
- Approvals dictate slow, back-and-forth communication.

This system replaces manual processes with an automated, role-based, real-time web application.

---

## 3. Goals and Success Metrics

### Goals
- **Self-Service:** Allow members to browse available inventory and submit checkout requests.
- **Controlled Approvals:** Enable team members (staff) to approve/reject requests once they physically hand the item to the user.
- **Automated Sync:** Keep Google Sheets automatically updated when items are checked out, checked in, added, or deleted. 
- **Admin Control:** Grant admins full control over users, inventory, guest homepage content, and generated reports (e.g., screen time, machine usage).
- **Online Monitoring:** Allow Admins and Team members to forcefully turn off a user's "Online" status from the monitor dashboard if the user forgets to do so.
- **RFID Tracking:** Track hardware machine usage effortlessly using RFID card scanning.
- **Robust Database Sync:** Ensure robust data synchronization between Google Sheets and Firestore using an efficient, rate-limited MD5 hashing batch sync to prevent API quota limits. Deletions in Sheets must accurately reflect in Firestore.
- **Mobile Friendly:** Ensure item addition (including camera support for images) is fully operational on mobile devices.

### Success Metrics
| Metric | Target |
|---|---|
| Checkout request approval time | < 5 minutes |
| Data sync delay (Sheets ↔ Website) | < 30 seconds |
| Number of simultaneous users supported | 70+ |
| System uptime | 99%+ |
| Admin setup time for new items | < 2 minutes |

---

## 4. User Roles & Personas

The system features three distinct roles with progressive levels of access.

### 4.1 Regular User (Role: USER)
**Who they are:** A makerspace member, student, or general public member. 

**What they can do:**
- Register for an account (requires admin/team approval before access is granted).
- Browse the real-time inventory catalog.
- Request to check out items.
- View their own active checkouts and borrowing history.
- Submit a return request when bringing an item back.
- Toggle their "Laptop/Machine" online/offline status to log their system usage time.
- View a community directory of approved users, including detailed views of user profiles.

**What they CANNOT do:**
- Approve anyone's checkout or return requests.
- Add new items to inventory.
- View other users' private metrics (Screentime, Machine usage).
- Access the Admin Panel.

---

### 4.2 Team Member (Role: TEAM)
**Who they are:** A staff member, volunteer, or trusted senior user who helps manage the space.

**Everything a User can do, PLUS:**
- Approve checkout requests from regular users (cannot approve requests from other team members or admins without admin privileges).
- Process returns when a user brings items back (mark items as received).
- View a list of all active loans across the system.
- See all pending return requests they are assigned to.
- Monitor which users are currently online.
- **Force Turn Off:** Turn off the online toggle for users from the Monitor dashboard if they left it on.
- **Inventory Management:** Add, edit, or delete inventory items (if enabled by the Admin via the general settings).

**What they CANNOT do:**
- Approve or reject new user registrations.
- Access the full Admin management panel.
- See other users' personal metrics (Screentime and Machine usage).

---

### 4.3 Administrator (Role: ADMIN)
**Who they are:** The system owner, root manager, or lead administrator of the space.

**Everything a Team Member can do, PLUS:**
- Approve or reject new user registration requests.
- Change a user's role (promote to Team, demote to User).
- Add private administration notes to any user's profile (stored in the Google Sheets).
- Toggle the "Allow Team to Manage Inventory" setting to permit or block Team members from altering the inventory.
- Manage product categories.
- Manage the Guest Homepage Content using a dedicated CMS-like "Home" tab (uploading images, galleries, links, and descriptions).
- View full usage history and metrics for all users.
- Access real-time machine monitor dashboards (which machines are ON, who is using them).

---

## 5. System Architecture

The application adopts a decoupled architecture with three distinct layers:

### Part 1: The Website (Frontend)
A modern, interactive React web application serving four primary UI views:
- **Guest Homepage:** A dynamic, public-facing page showcasing content managed by the admin. It features a rich banner with orbiting aesthetic logos (e.g., FabLab, Sculpture, Painting, Astronomy)keep the theme of a darkist Instagram look and feel and dynamic cards for different center aspects. 
- **Login Page:** Authentication gateway.
- **User/Team Dashboard:** Inventory catalog, checkout management, and live user monitoring tabs.
- **Admin Panel:** Comprehensive management interface for users, inventory, system settings, and homepage content.

### Part 2: The Brains / Logic Layer (Google Apps Script)
The central processor that executes business logic between the frontend and the database. 
1. Validates requests (e.g., checking stock, verifying user roles).
2. Reads & Writes to the Google Sheets exactly as a reliable backing store.
3. Automatically triggers synchronization to Firebase Firestore when data in Sheets is updated.

### Part 3: The Live Database (Firebase Firestore + Google Sheets)
- **Google Sheets (Primary Source of Truth):** Simplifies data administration for non-technical staff. Tracks Users, Inventory, Requests, Categories, and Machine Logs.
- **Firebase Firestore (Real-time Read Replica):** Serves live data to concurrent web users lightning-fast without hitting Google App Script or Sheets API quotas.
- **Sync Architecture:** To prevent free-tier API quota limit errors, the system employs an **MD5 Hashing & Batch Sync** mechanism. Changes in Google Sheets are selectively synced (only "dirty" rows) to Firebase in controlled, rate-limited batches. 

### Part 4: Machine Monitoring (RFID + ESP32)
Physical machines are connected to ESP32 microcontrollers with RC522 RFID readers.
1. User scans their RFID card.
2. ESP32 sends a signal to Google Apps Script.
3. Apps Script resolves the user, logs the session start time to the machine's Sheet, and tracks the session length dynamically.
4. Admins monitor this live on the web app.

---

## 6. Technology Stack

| Tool | Purpose |
|---|---|
| **React + Vite** | Powers the User Interface, compiled quickly for optimal client-side performance. |
| **TypeScript** | Type-safe programming language for robust code maintainability. |
| **Tailwind CSS / shadcn** | Styling libraries utilized for beautiful, accessible, and responsive visual components. |
| **Firebase Hosting** | Deploys and serves the web application securely via HTTPS. |
| **Firebase Firestore** | Real-time NoSQL cloud database distributing live inventory, users, and content data to the UI. |
| **Google Sheets** | The admin-friendly primary database acting as the ultimate system of record. |
| **Google Apps Script** | The backend API layer that mediates between the web app, Google Sheets, and Firebase. |
| **ESP32 + RFID (RC522)** | Hardware integrated at workstations to enable physical machine tracking. |

---

## 7. Core Features & Workflows

### Feature 1: User Registration, Login & Onboarding
Users register with an email and name. New accounts are registered as "PENDING". Once an administrator approves them from the Admin Panel, the user is granted "APPROVED" access and routed to the corresponding User, Team, or Admin dashboard.

### Feature 2: Guest Homepage Content Management
Admins possess a dedicated "Home" tab in their dashboard. Here, they can compile banners, text blocks, embedded links, and gallery images. Google Apps Script writes these to the `Home` sheet, which automatically syncs to the `home` collection in Firestore, instantly updating the public-facing Guest homepage.

### Feature 3: Checkout and Return Workflow
1. User requests an item checkout from the catalog view.
2. The request is recorded as "PENDING" in the backend. 
3. An Admin or Team member reviews the request and hands the item to the user. They click "Approve" in the dashboard.
4. The system reduces inventory count and transitions the item to the user's active loans.
5. User initiates a return when finished.
6. Admin/Team receives the physical item, process the return on the dashboard, and the system restores the stock quantities.

### Feature 4: Online Toggle & Force Turn-Off Monitoring
Users manually toggle their status "Online" when in the lab to track session metrics and screen time. If a user leaves without toggling offline, Team members or Admins browsing the **Monitor Tab** can click "Force Turn Off" on the user's card to accurately close out their session parameters.

### Feature 5: Admin Panel & Settings Controls
A dedicated dashboard that allows Admins to comprehensively manage the organization. Notable features include:
- A macro-toggle: **"Allow Team to Manage Inventory"**. Turning this on delegates item creation/deletion powers to TEAM roles. Turning it off restricts inventory modifications to ADMIN only.
- Direct management over system users, categories, and RFID machine assignments.

---

## 8. Data Structure

### Google Sheets — Primary Database

- **Users Sheet:** Tracks user emails, roles, approval statuses, tags, total time, and the "Admin Note" fields.
- **Inventory Sheet:** Stores item names, quantities, categories, linked images (from Google Drive), and remarks.
- **Requests Sheet:** Logs the state and timeline of all item checkout and return processes.
- **Home Sheet:** Defines dynamic content to be shown on the public homepage.
- **Machine Log Sheets:** Dedicated sheets per physical machine (e.g., LaserCutter) logging RFID strings, recognized names, and session timestamps.

### Firebase Firestore — Real-time Endpoints
Firestore caches these sheets into respective collections updated through Google App Script:
- `inventory`
- `users`
- `home`
- `requests`

---

## 9. Security & Access Control

- **Authentication:** Currently implemented via controlled email specification mapping to approved Google Sheets entries. 
- **Authorization:** Interface routing strictly correlates to the user's defined Role (USER, TEAM, ADMIN). Unauthorized API endpoint calls are blocked at the Google Apps Script layer based on the sender's encoded identity.
- **Database Safety:** Firestore rules are configured to restrict write-access strictly to the backend service accounts. Direct modification via the client application is strictly prohibited.

---

## 10. User Interface Requirements

### Design Aesthetics & Experience
- **Vibrant & Premium Feel:** Implementation leverages smooth aesthetic elements, modern gradients, and clear and distict boarder palettes (e.g., Instagram Like) over static primitive colors over the usual template of a AI bot..
- **Micro-animations:** Interactive components include hover effects, soft transition scaling on cards, and loaders that don't block user navigation (e.g., using toast notifications instead of total screen lockouts).
- **Responsive Layout:** Must present cleanly on varied viewports from Desktop to mobile. 

### Key Component Details
- **Dynamic Homepage:** Orbiting planetary logo graphics (Fablab, Astronomy, painting, sclupting, weaving, music , dance, truth, beauty and value) representing interconnectedness wrapping around a central "Aesthetic Center."
- **Inventory Cards:** Card-style layouts displaying images, intuitive stock-status colored badges, metadata, and 1-click checkout request actions.
- **Machine Cards:** Live pulsing indicators (Green for active, Red for offline) visualizing current machine occupation.
- **User Directory:** Expandable profile cards featuring associated tags. If an admin has left a private note, it drops down inline for authorized viewers only.

---

## 11. Implemented Features & Design Decisions

### Issue Resolved: Firebase Bulk Sync Quota Errors
**Resolution:** To stay within Firebase's free tier, sync optimizations were introduced:
- **MD5 Hash Tracking:** Before writing to Firestore, Apps Script compares the MD5 hash of a Sheet row with the database to detect actual modifications.
- **Selective Sync:** Unchanged rows are skipped entirely.
- **Rate-Limited Batching:** Forced 1-second delays are injected between batch writes, keeping the sync beneath Firebase's burst transaction limits limit.
- Any action by the user, team or admin, if it takes time them just show a porcessing toast and dont make frontend to freeze until a task is done alway show if it is successful or not.

### Workflow Enhancement: "Force Turn Off" for Online Users
**Decision:** Users often forget to toggle their laptop status "offline" when leaving the physical space, causing skewed screen-time metrics. Team members and admins have been granted an override button in the Monitor UI to forcefully stop the session counter on behalf of the user.

---

## 12. Future Roadmap

### Short-Term (Next 1–3 months)
- **Google OAuth Login:** Replace the manual email-entry flow with standardized Google Sign-In via Firebase Auth.
- **Email/Push Notifications:** Trigger alerts to members regarding approval states or overdue items.

### Medium-Term (4–6 months)
- **Inventory Analytics Dashboard:** Incorporate pie charts and time-series graphs tracking item popularity and usage trends.
- **QR/Barcode Checkout:** Allow members to scan item barcodes directly via their mobile camera to trigger a fast checkout.

### Long-Term (6+ months)
- **Full Backend Migration:** Migrate all Apps Script write-logic to Firebase Cloud Functions to minimize Google Sheets API dependency overhead.

---

## 13. Glossary

| Term | Definition |
|---|---|
| **Firestore** | Firebase's NoSQL real-time database, acting as a high-speed replica for the Google Sheets. |
| **Google Apps Script (GAS)** | JavaScript code living inside Google Workspace that processes logic and modifies the Sheets records. |
| **RFID / ESP32** | Hardware arrays positioned at workstations utilized for hands-free session tracking. |
| **Batch Sync** | The process of grouping multiple database updates into a single payload to conserve API limits. |
| **Guest Homepage** | The dynamic, non-authenticated gateway page controlled by admins for general public visibility. |
| **Force Turn Off** | Administrative action to terminate a user's lingering "Online" time-tracking session. |

---

*This document actively describes the final functional scope and architectural strategy of the Inventory Management System. It serves as the definitive reference for developers and stakeholders.*
