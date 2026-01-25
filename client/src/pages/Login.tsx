import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';


import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google'; // Add GoogleOAuthProvider here

import { jwtDecode } from 'jwt-decode';                // To decode the JWT credential
/**
 * Design: Modern Minimalist - Login Page
 * - Hero section with generated background image
 * - Centered card with warm sage green accent
 * - Google Sign-In simulation (in production, use Google OAuth)
 * - Smooth animations and clear typography
 */

// In your login component

// interface GoogleJwtPayload {
//   email: string;
//   name: string;
// }

export default function Login() {

  const [isLoading, setIsLoading] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false); // New state for transition
  const { login } = useAuth();
  const [, navigate] = useLocation();

  // Replace YOUR_GOOGLE_CLIENT_ID with your actual ID from Google Console
  const GOOGLE_CLIENT_ID = "631532726702-n5v60fv80jgri9u370fv1qo26m8aab04.apps.googleusercontent.com";

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 via-background to-emerald-50 px-4">
        {/* Decorative background elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 right-20 w-72 h-72 bg-emerald-100 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
          <div className="absolute bottom-20 left-20 w-72 h-72 bg-amber-100 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" style={{ animationDelay: '2s' }}></div>
        </div>

        {/* Main content */}
        <div className="relative z-10 w-full max-w-md">
          {/* Header */}
          <div className="text-center mb-8">
            <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-100 mb-4 transition-all duration-500 ${isRedirecting ? 'scale-110 bg-emerald-200' : ''}`}>
              {isRedirecting ? (
                <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
              ) : (
                <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m0 0l8 4m-8-4v10l8 4m0-10l8 4m-8-4v10l8-4M7 7l8 4m0 0l8-4" />
                </svg>
              )}
            </div>
            <h1 className="text-3xl font-display font-bold text-foreground mb-2">
              {isRedirecting ? 'Welcome Back!' : 'Aesthetic Centre'}
            </h1>
            <p className="text-muted-foreground">
              {isRedirecting ? 'Logging you in safely...' : 'Ease of Access'}
            </p>
          </div>

          {/* Login Card */}
          <Card className={`card-soft p-12 space-y-8 flex flex-col items-center justify-center transition-all duration-500 ${isRedirecting ? 'opacity-50 scale-95 pointer-events-none' : 'opacity-100 scale-100'}`}>

            <div className="text-center space-y-2">
              <h2 className="text-xl font-semibold">Sign In</h2>
              <p className="text-sm text-muted-foreground">Use your Google Account to continue</p>
            </div>

            {/* Google Sign-In Button */}
            <div className="w-full flex justify-center scale-110">
              <GoogleLogin
                onSuccess={(credentialResponse) => {
                  const decoded = jwtDecode(credentialResponse.credential!) as any;

                  // Trigger loading animation IMMEDIATELY after Google popup closes
                  setIsRedirecting(true);

                  login(decoded.email, decoded.name)
                    .then((user) => {
                      toast.success(`Welcome ${user.name}`);
                      setTimeout(() => {
                        if (user.role === 'ADMIN') {
                          navigate('/admin');
                        } else if (user.role === 'TEAM') {
                          navigate('/team');
                        } else {
                          navigate('/dashboard');
                        }
                      }, 800);
                    })
                    .catch((error) => {
                      // Revert animation if auth fails
                      setIsRedirecting(false);
                      console.error("Login Check Failed", error);
                      // Check if it's a rejection or just error
                      // For now generic error
                      toast.error('Login failed. Please try again.');
                    });
                }}
                onError={() => {
                  toast.error('Google sign-in failed.');
                }}
              />
            </div>

            {/* Info text */}
            <p className="text-xs text-muted-foreground text-center max-w-[200px]">
              First-time users will need admin approval to access the system.
            </p>
          </Card>

          {/* Footer */}
          <p className="text-center text-xs text-muted-foreground mt-8">
            Internal use only • Secure & encrypted
          </p>
        </div>
      </div>
    </GoogleOAuthProvider>
  );
}
