import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import ProtectedRoute from "./components/ProtectedRoute";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AuthProvider } from "./contexts/AuthContext";
import Login from "./pages/Login";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import AdminPanel from "./pages/AdminPanel";
import TeamDashboard from "./pages/TeamDashboard";
import Community from "./pages/Community";
import Learning from "./pages/Learning";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/login" component={Login} />
      <Route path="/community" component={Community} />
      <Route path="/learning" component={Learning} />
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
