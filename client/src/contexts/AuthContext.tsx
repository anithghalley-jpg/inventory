import React, { createContext, useContext, useState, useCallback } from 'react';
import { useConvex, useMutation } from "convex/react";

import { api } from "../../../convex/_generated/api";
import { SCRIPT_URL } from '@/config';

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'USER' | 'TEAM';
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdDate: string;
  laptopStatus?: 'Online' | 'Offline';
  totalTime?: number;
  tags?: string[];
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, name: string) => Promise<User>;
  logout: () => void;
  updateUserRole: (userId: string, role: 'ADMIN' | 'USER' | 'TEAM') => Promise<void>;
  updateUserStatus: (userId: string, status: 'APPROVED' | 'REJECTED') => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const APPROVAL_PRIORITY: Record<User['status'], number> = {
  REJECTED: 0,
  PENDING: 1,
  APPROVED: 2,
};

const ROLE_PRIORITY: Record<User['role'], number> = {
  USER: 0,
  TEAM: 1,
  ADMIN: 2,
};

function normalizeUser(data: any): User {
  return {
    id: data._id || data.id || data.email,
    email: data.email,
    name: data.name,
    role: data.role?.toUpperCase() || 'USER',
    status: data.status?.toUpperCase() || 'PENDING',
    createdDate: data.createdDate || new Date().toISOString(),
    laptopStatus: data.laptopStatus || 'Offline',
    totalTime: data.totalTime || 0,
    tags: Array.isArray(data.tags) ? data.tags : (data.tags ? String(data.tags).split(',').map((tag: string) => tag.trim()).filter(Boolean) : [])
  };
}

/**
 * AuthProvider Component
 * 
 * Manages user authentication state and communicates with Google Apps Script backend.
 * 
 * Flow:
 * 1. User enters email and name on Login page
 * 2. login() function sends data to Apps Script via POST request
 * 3. Apps Script checks Google Sheets for existing user
 * 4. If new user: creates entry with PENDING status
 * 5. If existing user: returns their current data
 * 6. Frontend stores user in state and localStorage
 * 7. User can access dashboard if status is APPROVED
 */
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const convex = useConvex();
  const loginMutation = useMutation(api.users.login);
  const upsertFromSheetSnapshotMutation = useMutation(api.users.upsertFromSheetSnapshot);

  const maybeHydrateFromSheet = useCallback(async (email: string, name: string, currentUser?: User | null) => {
    const response = await fetch(SCRIPT_URL, {
      method: 'POST',
      body: JSON.stringify({
        action: 'login',
        email,
        name,
      }),
    });
    if (!response.ok) {
      throw new Error(`Google Server Error: ${response.status}`);
    }

    const data = await response.json();
    if (!data.success || !data.user) {
      return currentUser ?? null;
    }

    const sheetUser = normalizeUser(data.user);
    const shouldPromoteFromSheet =
      !currentUser ||
      ROLE_PRIORITY[sheetUser.role] > ROLE_PRIORITY[currentUser.role] ||
      APPROVAL_PRIORITY[sheetUser.status] > APPROVAL_PRIORITY[currentUser.status];

    if (!shouldPromoteFromSheet) {
      return currentUser;
    }

    const syncResult = await upsertFromSheetSnapshotMutation({
      email: sheetUser.email,
      name: sheetUser.name,
      role: sheetUser.role,
      status: sheetUser.status,
      createdDate: sheetUser.createdDate,
      laptopStatus: sheetUser.laptopStatus,
      sessionStart: (data.user.sessionStart || '') as string,
      sessionEnd: (data.user.sessionEnd || '') as string,
      totalTime: sheetUser.totalTime,
      rfid: (data.user.rfid || '') as string,
      myPageLink: (data.user.myPageLink || '') as string,
      tags: sheetUser.tags,
      note: (data.user.note || '') as string,
    });

    return syncResult.user ? normalizeUser(syncResult.user) : sheetUser;
  }, [upsertFromSheetSnapshotMutation]);

  /**
   * login - Authenticates user with Google Apps Script backend
   * 
   * @param email - User's email address
   * @param name - User's full name
   * 
   * Process:
   * 1. Send POST request to Apps Script with action: 'login'
   * 2. Apps Script queries Users sheet in Google Sheets
   * 3. If user exists: return their data
   * 4. If new user: add to sheet with PENDING status
   * 5. Store user data in state and localStorage
   */
  const login = useCallback(async (email: string, name: string): Promise<User> => {
    setIsLoading(true);
    try {
      const normalizedEmail = email.trim();
      const result = await loginMutation({
        email: normalizedEmail,
        name: name.trim(),
        scriptUrl: SCRIPT_URL,
      });
      if (!result.success || !result.user) {
        throw new Error('Unauthorized access');
      }
      let userData = normalizeUser(result.user);
      if (userData.role === 'USER' && userData.status !== 'APPROVED') {
        const hydratedUser = await maybeHydrateFromSheet(normalizedEmail, name.trim(), userData);
        if (hydratedUser) {
          userData = hydratedUser;
        }
      }

      setUser(userData);
      localStorage.setItem(`user_${normalizedEmail}`, JSON.stringify(userData));
      localStorage.setItem('active_session_email', normalizedEmail);
      return userData;
    } catch (error) {
      console.error('❌ Login error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [loginMutation, maybeHydrateFromSheet]);

  /**
   * logout - Clears user session
   * 
   * Process:
   * 1. Clear user from state
   * 2. Clear localStorage
   * 3. User redirected to login page
   */
  const logout = useCallback(() => {
    console.log('🚪 User logging out');
    const activeEmail = localStorage.getItem('active_session_email');
    if (activeEmail) {
      localStorage.removeItem(`user_${activeEmail}`);
    }
    localStorage.removeItem('active_session_email');
    setUser(null);
  }, []);


  // 2. Auto-Logout on Inactivity
  React.useEffect(() => {
    if (!user) return;

    let timeoutId: ReturnType<typeof setTimeout>;
    const INACTIVITY_LIMIT = 15 * 60 * 1000; // 15 Minutes

    const resetTimer = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        console.log('⏰ Session expired due to inactivity');
        logout();
        // Optional: toast.info('Logged out due to inactivity');
      }, INACTIVITY_LIMIT);
    };

    // Events to track activity
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    events.forEach(event => document.addEventListener(event, resetTimer));

    // Initialize timer
    resetTimer();

    return () => {
      clearTimeout(timeoutId);
      events.forEach(event => document.removeEventListener(event, resetTimer));
    };
  }, [user, logout]);

  // 1. Session Restoration on Mount
  React.useEffect(() => {
    let isMounted = true;
    const activeEmail = localStorage.getItem('active_session_email');
    if (activeEmail) {
      const storedUser = localStorage.getItem(`user_${activeEmail}`);
      if (storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser);
          setUser(parsedUser);
          console.log('🔄 Session restored for:', parsedUser.email);

          convex
            .query(api.users.getUserByEmail, { email: parsedUser.email })
            .then((freshUserData) => {
              if (!isMounted) return;
              if (freshUserData) {
                const freshUser = normalizeUser(freshUserData);
                setUser(freshUser);
                localStorage.setItem(`user_${activeEmail}`, JSON.stringify(freshUser));
              } else {
                logout();
              }
            })
            .catch((e) => {
              console.warn('Silent auth verify failed (offline?), keeping cached session', e);
            });

        } catch (e) {
          console.error('Failed to parse stored user session');
          localStorage.removeItem(`user_${activeEmail}`);
        }
      }
    }
    setIsLoading(false);
    return () => {
      isMounted = false;
    };
  }, [convex, logout]);



  /**
   * updateUserRole - Updates user role (Admin only)
   * 
   * @param userId - Email of user to update
   * @param role - New role (ADMIN or USER)
   */
  const updateUserRole = useCallback(async (userId: string, role: 'ADMIN' | 'USER' | 'TEAM') => {
    if (user) {
      const updatedUser = { ...user, role };
      setUser(updatedUser);
      localStorage.setItem(`user_${user.email}`, JSON.stringify(updatedUser));
      console.log('✅ User role updated:', role);
    }
  }, [user]);

  /**
   * updateUserStatus - Updates user approval status (Admin only)
   * 
   * @param userId - Email of user to update
   * @param status - New status (APPROVED or REJECTED)
   * 
   * Process:
   * 1. Send POST request to Apps Script with action: 'approveUser' or 'rejectUser'
   * 2. Apps Script updates Users sheet in Google Sheets
   * 3. Update local state
   */
  const updateUserStatus = useCallback(async (userId: string, status: 'APPROVED' | 'REJECTED') => {
    if (user) {
      const updatedUser = { ...user, status };
      setUser(updatedUser);
      localStorage.setItem(`user_${user.email}`, JSON.stringify(updatedUser));
      console.log('✅ User status updated:', status);
    }
  }, [user]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user && user.status === 'APPROVED',
        isLoading,
        login,
        logout,
        updateUserRole,
        updateUserStatus,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

/**
 * useAuth Hook
 * 
 * Usage: const { user, login, logout } = useAuth();
 * 
 * Provides access to authentication state and functions throughout the app
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
