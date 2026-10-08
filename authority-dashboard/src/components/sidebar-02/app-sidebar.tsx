"use client";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  Users,
  AlertTriangle,
  Map,
  FileText,
  Settings,
  Shield,
} from "lucide-react";
import type { Route } from "./nav-main";
import DashboardNavigation from "@/components/sidebar-02/nav-main";
import { NotificationsPopover } from "@/components/sidebar-02/nav-notifications";
import { UserNav, UserInfo } from "@/components/sidebar-02/user-nav";
import { useNotifications } from "@/hooks/useNotifications";

// Dashboard routes matching the old sidebar
const dashboardRoutes: Route[] = [
  {
    id: "dashboard",
    title: "Dashboard",
    icon: <LayoutDashboard className="size-4" />,
    link: "/dashboard",
    roles: ["police", "tourism", "admin"],
  },
  {
    id: "tourists",
    title: "Tourist Management",
    icon: <Users className="size-4" />,
    link: "/tourists",
    roles: ["police", "tourism", "admin"],
  },
  {
    id: "alerts",
    title: "SOS Alerts",
    icon: <AlertTriangle className="size-4" />,
    link: "/alerts",
    roles: ["police", "tourism", "admin"],
  },
  {
    id: "heatmap",
    title: "Heatmap & Zones",
    icon: <Map className="size-4" />,
    link: "/heatmap",
    roles: ["police", "tourism", "admin"],
  },
  {
    id: "firs",
    title: "E-FIR Generator",
    icon: <FileText className="size-4" />,
    link: "/firs",
    roles: ["police", "admin"],
  },
  {
    id: "emergency-vehicles",
    title: "Emergency Vehicles",
    icon: <Shield className="size-4" />,
    link: "/emergency-vehicles",
    roles: ["admin"],
  },
  {
    id: "settings",
    title: "Settings",
    icon: <Settings className="size-4" />,
    link: "/settings",
    roles: ["admin"],
  },
];

// Helper to normalize role strings
const normalizeRole = (raw: string | undefined): string => {
  if (!raw) return "police";
  const r = raw.toLowerCase();
  if (r.includes("police")) return "police";
  if (r.includes("tourism") || r.includes("tourism officer")) return "tourism";
  if (r.includes("admin") || r.includes("system") || r.includes("administrator")) return "admin";
  return "police";
};

interface DashboardSidebarProps {
  user?: UserInfo;
  onLogout?: () => void;
}

export function DashboardSidebar({ user, onLogout }: DashboardSidebarProps) {
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";

  // Use real-time notifications hook
  const {
    notifications,
    markAsRead,
    markAllAsRead,
    clearAll,
  } = useNotifications();

  // Normalize user role for filtering
  const userRole = user ? normalizeRole(user.role) : undefined;

  return (
    <Sidebar variant="inset" collapsible="icon">
      <SidebarHeader
        className={cn(
          "flex md:pt-3.5",
          isCollapsed
            ? "flex-row items-center justify-between gap-y-4 md:flex-col md:items-start md:justify-start"
            : "flex-row items-center justify-between"
        )}
      >
        <a href="/dashboard" className="flex items-center gap-2">
          <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-blue-600 text-white">
            <Shield className="size-5" />
          </div>
          {!isCollapsed && (
            <div className="flex flex-col">
              <span className="font-semibold text-foreground">
                Tourist Safety
              </span>
              <span className="text-xs text-muted-foreground">
                Authority Portal
              </span>
            </div>
          )}
        </a>

        <motion.div
          key={isCollapsed ? "header-collapsed" : "header-expanded"}
          className={cn(
            "flex items-center gap-2",
            isCollapsed ? "flex-row md:flex-col-reverse" : "flex-row"
          )}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
        >
          <NotificationsPopover
            notifications={notifications}
            onNotificationClick={markAsRead}
            onMarkAllRead={markAllAsRead}
            onClearAll={clearAll}
          />
          <SidebarTrigger />
        </motion.div>
      </SidebarHeader>

      <SidebarContent className="gap-4 px-2 py-4">
        <DashboardNavigation routes={dashboardRoutes} userRole={userRole} />
      </SidebarContent>

      <SidebarFooter className="px-2">
        {user && onLogout ? (
          <UserNav user={user} onLogout={onLogout} />
        ) : null}
      </SidebarFooter>
    </Sidebar>
  );
}
