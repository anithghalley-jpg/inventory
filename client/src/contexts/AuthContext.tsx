import React, { createContext, useContext, useState, useCallback } from 'react';

// ============================================================================
// GOOGLE APPS SCRIPT CONFIGURATION
// ============================================================================
// Replace this URL with your deployed Apps Script Web App URL
// Format: https://script.google.com/macros/s/{SCRIPT_ID}/exec
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwXHLzLob0rScK6t0AaxZeKyi7HxG5NG8HEWNm0_Vs2Hkt4yd_pg81AqCPucjwpJ7o6/exec';

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'USER';
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdDate: string;
  laptopStatus?: 'Online' | 'Offline';
  totalTime?: number;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, name: string) => Promise<User>;
  logout: () => void;
  updateUserRole: (userId: string, role: 'ADMIN' | 'USER') => Promise<void>;
  updateUserStatus: (userId: string, status: 'APPROVED' | 'REJECTED') => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

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
      const response = await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        body: JSON.stringify({
          action: 'login',
          email: email.trim(),
          name: name.trim()
        })
      });

      // 2. Check for network errors
      if (!response.ok) {
        throw new Error(`Google Server Error: ${response.status}`);
      }

      const data = await response.json();

      // 3. Logic check (Did handleLogin return success?)
      if (data.success && data.user) {
        const userData: User = {
          id: data.user.id || data.user.email,
          email: data.user.email,
          name: data.user.name,
          role: data.user.role?.toUpperCase() || 'USER', // Normalize to uppercase
          status: data.user.status?.toUpperCase() || 'PENDING', // Normalize to uppercase
          createdDate: data.user.createdDate || new Date().toISOString(),
          laptopStatus: data.user.laptopStatus || 'Offline',
          totalTime: data.user.totalTime || 0
        };

        setUser(userData);
        localStorage.setItem(`user_${email}`, JSON.stringify(userData));
        localStorage.setItem('active_session_email', email); // For persistence

        console.log(`Logged in as ${userData.role}`);
        return userData;

      } else {
        throw new Error(data.message || 'Unauthorized access');
      }
    } catch (error) {
      console.error('❌ Login error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

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
    setUser(null);
    localStorage.clear();
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
    const activeEmail = localStorage.getItem('active_session_email');
    if (activeEmail) {
      const storedUser = localStorage.getItem(`user_${activeEmail}`);
      if (storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser);
          // Optional: Verify token validity here if you had an expiry
          setUser(parsedUser);
          console.log('🔄 Session restored for:', parsedUser.email);
        } catch (e) {
          console.error('Failed to parse stored user session');
          localStorage.removeItem(`user_${activeEmail}`);
        }
      }
    }
    setIsLoading(false);
  }, []);



  /**
   * updateUserRole - Updates user role (Admin only)
   * 
   * @param userId - Email of user to update
   * @param role - New role (ADMIN or USER)
   */
  const updateUserRole = useCallback(async (userId: string, role: 'ADMIN' | 'USER') => {
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
