import React from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Outlet,
  useLocation,
  Link,
} from "react-router-dom";
import Login from "./components/Login";
import Signup from "./components/Signup";
import { SidebarProvider, SidebarInset } from "./components/ui/sidebar";
import { DashboardSidebar } from "./components/sidebar-02/app-sidebar";
import Dashboard from "./components/Dashboard";
import TouristMap from "./components/TouristMap";
import AlertsPanel from "./components/AlertsPanel";
import TouristManagement from "./components/TouristManagement";
import FIRGenerator from "./components/FIRGenerator";
import EmergencyVehicleManagement from "./components/EmergencyVehicleManagement";
import ProtectedRoute from "./components/ProtectedRoute";
import { User } from "./types";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "./components/ui/breadcrumb";

interface AppRouterProps {
  user: User | null;
  setAuthView: (view: "login" | "signup") => void;
  handleLogin: (user: User) => void;
  handleLogout: () => void;
}

import GlobalAlertListener from "./components/GlobalAlertListener";

import ErrorBoundary from "./components/ErrorBoundary";

// Page title mapping
const pageTitles: Record<string, string> = {
  dashboard: "Dashboard",
  tourists: "Tourist Management",
  alerts: "SOS Alerts",
  heatmap: "Heatmap & Zones",
  firs: "E-FIR Generator",
  settings: "Settings",
};

// Layout used on protected pages: shows Sidebar and renders the nested route via Outlet
const ProtectedLayout: React.FC<{ user: User; onLogout: () => void }> = ({
  user,
  onLogout,
}) => {
  const location = useLocation();
  const path = location.pathname === "/" ? "/dashboard" : location.pathname;
  const currentPage = path.replace(/^\//, "").split("/")[0]; // Get first segment
  const isDashboard = currentPage === "dashboard";
  const pageTitle = pageTitles[currentPage] || currentPage.charAt(0).toUpperCase() + currentPage.slice(1);

  return (
    <SidebarProvider>
      {/* Global Listener for SOS Sounds/Toasts */}
      <GlobalAlertListener />

      <div className="relative flex h-screen w-full">
        <DashboardSidebar
          user={{ name: user.name, email: user.email, role: user.role, department: user.department }}
          onLogout={onLogout}
        />
        <SidebarInset className="flex flex-col flex-1">
          {/* Top Navigation Bar with Breadcrumbs */}
          <header className="flex h-14 shrink-0 items-center gap-2 border-b bg-background px-6">
            {isDashboard ? (
              // Dashboard: Simple welcome message
              <div className="flex flex-1 items-center">
                <div>
                  <h1 className="text-lg font-semibold">Dashboard Overview</h1>
                  <p className="text-sm text-muted-foreground">
                    Welcome back, {user.name}
                  </p>
                </div>
              </div>
            ) : (
              // Other pages: Show breadcrumb
              <div className="flex flex-1 items-center">
                <Breadcrumb>
                  <BreadcrumbList>
                    <BreadcrumbItem className="hidden md:block">
                      <BreadcrumbLink asChild>
                        <Link to="/dashboard">Dashboard</Link>
                      </BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator className="hidden md:block" />
                    <BreadcrumbItem>
                      <BreadcrumbPage>{pageTitle}</BreadcrumbPage>
                    </BreadcrumbItem>
                  </BreadcrumbList>
                </Breadcrumb>
              </div>
            )}
          </header>

          <main className="p-6 flex-1 overflow-auto">
            <ErrorBoundary>
              <Outlet />
            </ErrorBoundary>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};


const AppRouter: React.FC<AppRouterProps> = ({
  user,
  setAuthView,
  handleLogin,
  handleLogout,
}) => (
  <BrowserRouter>
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<Login onLogin={handleLogin} />} />
      <Route path="/signup" element={<Signup />} />

      {/* Protected routes grouped under a parent ProtectedRoute that uses an <Outlet /> */}
      <Route element={<ProtectedRoute user={user} />}>
        {/* The ProtectedLayout mounts the Sidebar and provides an Outlet for pages */}
        <Route
          element={
            <ProtectedLayout user={user! as User} onLogout={handleLogout} />
          }
        >
          <Route path="/" element={<Dashboard />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/tourists" element={<TouristManagement />} />
          <Route path="/alerts" element={<AlertsPanel />} />
          <Route path="/heatmap" element={<TouristMap />} />
          <Route path="/firs" element={<FIRGenerator />} />
          <Route path="/emergency-vehicles" element={<EmergencyVehicleManagement />} />
        </Route>
      </Route>
      <Route
        path="*"
        element={<Navigate to={user ? "/dashboard" : "/login"} replace />}
      />
    </Routes>
  </BrowserRouter>
);

export default AppRouter;
