import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation } from 'wouter';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
    component: React.ComponentType<any>;
    allowedRoles?: ('ADMIN' | 'USER')[];
    path?: string;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ component: Component, allowedRoles, ...rest }) => {
    const { user, isLoading, isAuthenticated } = useAuth();
    const [, setLocation] = useLocation();

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
            </div>
        );
    }

    // 1. Check if user is logged in
    if (!user) {
        setLocation('/');
        return null;
    }

    // 2. Check if user is approved (Status Check)
    if (user.status !== 'APPROVED') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background p-4">
                <div className="max-w-md w-full bg-card border border-border rounded-lg shadow-lg p-6 text-center">
                    <h2 className="text-xl font-bold text-red-600 mb-2">Account Pending Approval</h2>
                    <p className="text-muted-foreground mb-4">
                        Your account is currently {user.status.toLowerCase()}. Please wait for an administrator to approve your request.
                    </p>
                    <button
                        onClick={() => setLocation('/')}
                        className="text-emerald-600 hover:underline"
                    >
                        Back to Login
                    </button>
                </div>
            </div>
        );
    }

    // 3. Check for Role Access
    if (allowedRoles && !allowedRoles.includes(user.role)) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background p-4">
                <div className="max-w-md w-full bg-card border border-border rounded-lg shadow-lg p-6 text-center">
                    <h2 className="text-xl font-bold text-red-600 mb-2">Access Denied</h2>
                    <p className="text-muted-foreground mb-4">
                        You do not have permission to view this page. Required role: {allowedRoles.join(' or ')}.
                    </p>
                    <button
                        onClick={() => setLocation(user.role === 'ADMIN' ? '/admin' : '/dashboard')}
                        className="text-emerald-600 hover:underline"
                    >
                        Go to My Dashboard
                    </button>
                </div>
            </div>
        );
    }

    // Authorized
    return <Component {...rest} />;
};

export default ProtectedRoute;
