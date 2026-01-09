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

  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const [, navigate] = useLocation();
  const [role, setRole] = useState(''); // Default is 'USER'
  const [status, setStatus] = useState(''); // Default is 'PENDING'


  const handleGoogleSignIn = async () => {
    if (!email || !name) {
      toast.error('Please enter your email and name');
      return;
    }

    setIsLoading(true);
    try {
      const user = await login(email, name);

      if (user.status === 'PENDING') {
        toast.info('Your account is awaiting approval.');
        navigate('/dashboard'); // Or a "Pending" page
        return;
      }

      if (user.status === 'REJECTED') {
        toast.error('Access denied by admin.');
        return;
      }

      // 3. Check the Role for Redirection
      if (user.role === 'ADMIN') {
        toast.success(`Welcome back, Admin ${user.name}`);
        navigate('/admin');
      } else if (user.role === 'TEAM') {
        toast.success(`Welcome, Team Member ${user.name}`);
        navigate('/team');
      } else {
        toast.success('Login successful!');
        navigate('/dashboard');
      }

    } catch (error) {
      toast.error('Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdminLogin = async () => {
    setIsLoading(true);
    try {
      await login('admin@company.com', 'Admin User');
      const adminUser = {
        id: 'admin@company.com',
        email: 'admin@company.com',
        name: 'Admin User',
        role: 'ADMIN',
        status: 'APPROVED',
        createdDate: new Date().toISOString(),
      };
      localStorage.setItem('user_admin@company.com', JSON.stringify(adminUser));
      toast.success('Admin login successful!');
      navigate('/admin');
    } catch (error) {
      toast.error('Admin login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
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
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-100 mb-4">
              <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m0 0l8 4m-8-4v10l8 4m0-10l8 4m-8-4v10l8-4M7 7l8 4m0 0l8-4" />
              </svg>
            </div>
            <h1 className="text-3xl font-display font-bold text-foreground mb-2">
              Aesthetic Centre
            </h1>
            <p className="text-muted-foreground">
              Ease of Access
            </p>
          </div>

          {/* Login Card */}
          <Card className="card-soft p-8 space-y-6">
            {/* Email Input */}
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium text-foreground">
                Email Address
              </label>
              <Input
                id="email"
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                className="transition-smooth"
              />
            </div>

            {/* Name Input */}
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium text-foreground">
                Full Name
              </label>
              <Input
                id="name"
                type="text"
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isLoading}
                className="transition-smooth"
              />
            </div>

            {/* Google Sign-In Button */}
            <div className="w-full flex justify-center">
              <GoogleLogin

                onSuccess={(credentialResponse) => {
                  const decoded = jwtDecode(credentialResponse.credential!) as any;
                  login(decoded.email, decoded.name)
                    .then((user) => {
                      if (user.role === 'ADMIN') {
                        toast.success('Welcome back Admin!');
                        navigate('/admin');
                      } else if (user.role === 'TEAM') {
                        toast.success('Welcome Team Member!');
                        navigate('/team');
                      } else {
                        toast.success('Login successful!');
                        navigate('/dashboard');
                      }
                    })
                    .catch(() => {
                      toast.error('Login failed. Please try again.');
                    });
                }}
                onError={() => {
                  toast.error('Google sign-in failed. Please try again.');
                }}
              />
            </div>
            {/* Info text */}
            <p className="text-xs text-muted-foreground text-center">
              First-time users will need admin approval to access the system.
            </p>

            {/* Admin Login Button */}
            <div className="pt-2 border-t border-border">
              <p className="text-xs text-muted-foreground text-center mb-3">Testing?</p>
              <Button
                onClick={handleAdminLogin}
                disabled={isLoading}
                variant="outline"
                className="w-full border-emerald-200 text-emerald-600 hover:bg-emerald-50"
              >
                Login as Admin
              </Button>
            </div>
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
