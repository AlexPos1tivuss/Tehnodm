import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider, useAuth } from "./lib/auth";
import { Navbar } from "./components/layout/Navbar";
import { AnimatePresence } from "framer-motion";
import { useEffect } from "react";

// Pages
import Home from "./pages/home";
import Login from "./pages/auth/login";
import Register from "./pages/auth/register";
import Track from "./pages/track";
import Troubleshooter from "./pages/troubleshooter";
import NewBooking from "./pages/booking/new";
import ClientDashboard from "./pages/dashboard/client";
import AdminDashboard from "./pages/dashboard/admin";
import TechnicianDashboard from "./pages/dashboard/technician";
import NotFound from "./pages/not-found";

const queryClient = new QueryClient();

function ProtectedRoute({ component: Component, allowedRoles }: { component: React.ComponentType, allowedRoles?: string[] }) {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        setLocation("/login");
      } else if (allowedRoles && !allowedRoles.includes(user.role)) {
        setLocation("/");
      }
    }
  }, [user, isLoading, setLocation, allowedRoles]);

  if (isLoading) return <div className="min-h-screen flex items-center justify-center">Загрузка...</div>;
  if (!user || (allowedRoles && !allowedRoles.includes(user.role))) return null;

  return <Component />;
}

function RedirectHome() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  useEffect(() => {
    if (user?.role === "admin") setLocation("/admin");
    else if (user?.role === "technician") setLocation("/technician");
    else if (user?.role === "client") setLocation("/dashboard");
  }, [user, setLocation]);
  return <Home />;
}

function Router() {
  const [location] = useLocation();
  
  return (
    <div className="flex flex-col min-h-screen bg-slate-50/50">
      <Navbar />
      <main className="flex-1">
        <AnimatePresence mode="wait">
          <Switch key={location}>
            <Route path="/" component={RedirectHome} />
            <Route path="/login" component={Login} />
            <Route path="/register" component={Register} />
            <Route path="/track" component={Track} />
            <Route path="/troubleshooter" component={Troubleshooter} />
            
            {/* Protected Routes */}
            <Route path="/booking/new">
              {() => <ProtectedRoute component={NewBooking} allowedRoles={["client"]} />}
            </Route>
            <Route path="/dashboard">
              {() => <ProtectedRoute component={ClientDashboard} allowedRoles={["client"]} />}
            </Route>
            <Route path="/admin">
              {() => <ProtectedRoute component={AdminDashboard} allowedRoles={["admin"]} />}
            </Route>
            <Route path="/technician">
              {() => <ProtectedRoute component={TechnicianDashboard} allowedRoles={["technician", "admin"]} />}
            </Route>
            
            <Route component={NotFound} />
          </Switch>
        </AnimatePresence>
      </main>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
        <AuthProvider>
          <Router />
        </AuthProvider>
      </WouterRouter>
    </QueryClientProvider>
  );
}

export default App;
