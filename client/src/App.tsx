import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AuthProvider } from "./contexts/AuthContext";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import AdminPanel from "./pages/AdminPanel";

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
      <Route path={"/dashboard"} component={Dashboard} />
      <Route path={"/admin"} component={AdminPanel} />
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
            <Toaster />
            <Router />
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
