import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation, Link } from 'wouter';
import { Card } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import { jwtDecode } from 'jwt-decode';
import { GOOGLE_CLIENT_ID } from '@/config';

/**
 * Design: Modern Minimalist - Login Page.
 * - Hero section with generated background image
 * - Centered card with warm sage green accent
 * - Google Sign-In simulation (in production, use Google OAuth)
 * - Smooth animations and clear typography
 */

export default function Login() {
  const [isLoading, setIsLoading] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const { login } = useAuth();
  const [, navigate] = useLocation();

  if (!GOOGLE_CLIENT_ID) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 via-background to-emerald-50 px-4">
        <Card className="card-soft max-w-lg p-8 space-y-4">
          <h1 className="text-2xl font-display font-bold text-foreground">Google Sign-In is not configured</h1>
          <p className="text-sm leading-6 text-muted-foreground">
            Set <code>VITE_GOOGLE_CLIENT_ID</code> for this deployment, rebuild the frontend, and redeploy Firebase Hosting.
          </p>
          <p className="text-sm leading-6 text-muted-foreground">
            In Google Cloud Console, add your hosted Firebase domains to the OAuth client&apos;s Authorized JavaScript origins before testing login.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 via-background to-emerald-50 px-4">
        {/* Navigation Bar */}
        <header className="fixed top-0 left-0 w-full p-4 md:px-8 md:py-6 z-50 flex items-center justify-between transition-all duration-300 bg-background/80 backdrop-blur-md border-b border-border/50 text-slate-900 pointer-events-auto">
          {/* Left: Logo */}
          <Link href="/">
            <div className="flex flex-col cursor-pointer group">
              <span className="font-display font-black text-xl leading-none tracking-tight group-hover:text-emerald-600 transition-colors">AESTHETIC</span>
              <span className="font-sans font-medium text-[0.65rem] leading-none tracking-[0.3em] text-emerald-600 mt-0.5 uppercase">Centre</span>
            </div>
          </Link>

          {/* Center: Navigation Links */}
          <div className="hidden md:flex items-center gap-12 absolute left-1/2 -translate-x-1/2">
            <Link href="/community">
              <button className="text-sm font-medium tracking-wide text-slate-500 hover:text-slate-900 transition-colors duration-200">
                Community
              </button>
            </Link>
            <Link href="/">
              <button className="text-sm font-semibold tracking-wide text-slate-900 transition-colors duration-200">
                Aesthetic Centre
              </button>
            </Link>
            <Link href="/learning">
              <button className="text-sm font-medium tracking-wide text-slate-500 hover:text-slate-900 transition-colors duration-200">
                Learning
              </button>
            </Link>
          </div>

          {/* Right: Login Button */}
          <button disabled className="px-6 py-2.5 text-white text-sm font-semibold rounded-full shadow-md bg-emerald-600/50 cursor-not-allowed">
            Sign In
          </button>
        </header>
        {/* Decorative background elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 right-20 w-72 h-72 bg-emerald-100 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
          <div className="absolute bottom-20 left-20 w-72 h-72 bg-amber-100 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" style={{ animationDelay: '2s' }}></div>
        </div>

        {/* Main content */}
        <div className="relative z-10 w-full max-w-md">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="h-20 flex items-center justify-center mb-2">
              {isRedirecting ? (
                <motion.div
                  className="w-16 h-16 bg-emerald-600 flex items-center justify-center shadow-lg"
                  animate={{
                    scale: [1, 1.1, 1],
                    rotate: [0, 180, 180, 0],
                    borderRadius: ["50%", "20%", "50%", "20%", "50%"]
                  }}
                  transition={{
                    duration: 3,
                    ease: "easeInOut",
                    times: [0, 0.2, 0.5, 0.8, 1],
                    repeat: Infinity
                  }}
                >
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m0 0l8 4m-8-4v10l8 4m0-10l8 4m-8-4v10l8-4M7 7l8 4m0 0l8-4" />
                  </svg>
                </motion.div>
              ) : (
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-100 transition-all duration-300 hover:scale-105">
                  <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m0 0l8 4m-8-4v10l8 4m0-10l8 4m-8-4v10l8-4M7 7l8 4m0 0l8-4" />
                  </svg>
                </div>
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
                        const returnTo = sessionStorage.getItem('returnTo');
                        if (returnTo) {
                          sessionStorage.removeItem('returnTo');
                          navigate(returnTo);
                        } else if (user.role === 'ADMIN') {
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
            Internal use only • Secure & encrypted.
          </p>
        </div>
      </div>
    </GoogleOAuthProvider>
  );
}
