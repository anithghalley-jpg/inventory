import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import ProtectedRoute from "./components/ProtectedRoute";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AuthProvider } from "./contexts/AuthContext";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import AdminPanel from "./pages/AdminPanel";
import TeamDashboard from "./pages/TeamDashboard";

/**
 * Design Philosophy: Modern Minimalist with Warm Accents
 * - Warm sage green (#10b981) primary color
 * - Cream background (#fafaf9) with white cards
 * - Plus Jakarta Sans for headers, Inter for body
 * - Soft shadows and rounded corners (12px radius)
 * - Smooth transitions and micro-interactions
 */

function Router() {
  return (
    <Switch>
      <Route path={"/"} component={Login} />
      <Route path="/dashboard">
        <ProtectedRoute component={Dashboard} allowedRoles={['USER', 'ADMIN']} />
      </Route>
      <Route path="/admin">
        <ProtectedRoute component={AdminPanel} allowedRoles={['ADMIN', 'TEAM']} />
      </Route>
      <Route path="/team">
        <ProtectedRoute component={TeamDashboard} allowedRoles={['TEAM', 'ADMIN']} />
      </Route>
      <Route path={"/404"} component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <AuthProvider>
          <TooltipProvider>
            <Toaster richColors position="bottom-right" />
            <Router />
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
