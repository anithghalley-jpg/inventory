import React from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export default function NotFound() {
  const [, navigate] = useLocation();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 via-background to-emerald-50 px-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 right-20 w-72 h-72 bg-emerald-100 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
        <div className="absolute bottom-20 left-20 w-72 h-72 bg-amber-100 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      <div className="relative z-10 w-full max-w-md text-center">
        <Card className="card-soft p-12 space-y-6">
          <div className="text-6xl font-display font-bold text-emerald-600">
            404
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-display font-bold text-foreground">
              Page Not Found
            </h1>
            <p className="text-muted-foreground">
              The page you are looking for does not exist.
            </p>
          </div>

          <Button
            onClick={() => navigate('/')}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2 rounded-lg transition-smooth"
          >
            Return to Home
          </Button>
        </Card>
      </div>
    </div>
  );
}
