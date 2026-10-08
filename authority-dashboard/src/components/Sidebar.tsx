import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  AlertTriangle,
  Map,
  FileText,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { User } from "../types";

interface SidebarProps {
  currentPage?: string;
  onPageChange?: (page: string) => void;
  user: User;
  onLogout: () => void;
  isCollapsed: boolean;
  toggleSidebar: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  onPageChange,
  user,
  onLogout,
  isCollapsed,
  toggleSidebar,
}) => {
  // Normalize various backend role strings into the internal roles used by the app
  const normalizeRole = (raw: string | undefined) => {
    if (!raw) return "police";
    const r = raw.toLowerCase();
    if (r.includes("police")) return "police";
    if (r.includes("tourism") || r.includes("tourism officer"))
      return "tourism";
    if (
      r.includes("admin") ||
      r.includes("system") ||
      r.includes("administrator")
    )
      return "admin";
    // fallback to police to avoid hiding the whole sidebar
    return "police";
  };
  // `user` may carry various role field names depending on backend; cast to any to read safely
  const u: any = user as any;
  const rawRole =
    typeof u.role === "string"
      ? u.role
      : (u && (u.roleName || u.role_type)) || "";
  const role = normalizeRole(rawRole as any);
  const menuItems = [
    {
      id: "dashboard",
      icon: LayoutDashboard,
      label: "Dashboard",
      roles: ["police", "tourism", "admin"],
    },
    {
      id: "tourists",
      icon: Users,
      label: "Tourist Management",
      roles: ["police", "tourism", "admin"],
    },
    {
      id: "alerts",
      icon: AlertTriangle,
      label: "SOS Alerts",
      roles: ["police", "tourism", "admin"],
    },
    {
      id: "heatmap",
      icon: Map,
      label: "Heatmap & Zones",
      roles: ["police", "tourism", "admin"],
    },
    {
      id: "firs",
      icon: FileText,
      label: "E-FIR Generator",
      roles: ["police", "admin"],
    },
    { id: "settings", icon: Settings, label: "Settings", roles: ["admin"] },
  ];

  let filteredMenuItems = menuItems.filter((item) =>
    item.roles.includes(role as any),
  );
  // If no menu items matched the normalized role, fall back to showing all items
  // This prevents the sidebar from appearing empty when backend roles use unexpected labels.
  if (filteredMenuItems.length === 0) {
    filteredMenuItems = menuItems;
  }

  // use react-router location/navigate so clicks update URL and active state reliably
  const location = useLocation();
  const navigate = useNavigate();
  const current = (
    location.pathname === "/" ? "/dashboard" : location.pathname
  ).replace(/^\//, "");

  return (
    <div
      className={`bg-white shadow-lg h-screen fixed left-0 top-0 z-30 flex flex-col border-r-2 border-gray-100 transition-all duration-300 ${
        isCollapsed ? "w-20" : "w-64"
      }`}
      style={{ backgroundClip: "padding-box" }}
    >
      {/* Header */}
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        {!isCollapsed && (
          <div className="overflow-hidden whitespace-nowrap">
            <h1 className="text-xl font-bold text-gray-900">Tourist Safety</h1>
            <p className="text-sm text-gray-600 capitalize">
              Authority Portal
            </p>
          </div>
        )}
        <button
          onClick={toggleSidebar}
          className={`p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors ${
            isCollapsed ? "mx-auto" : ""
          }`}
        >
          {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-6 overflow-y-auto overflow-x-hidden">
        <div className="space-y-1 px-3">
          {filteredMenuItems.map((item) => {
            const Icon = item.icon;
            const isActive = current === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  const to =
                    item.id === "dashboard" ? "/dashboard" : `/${item.id}`;
                  // prefer prop callback if provided (for backwards compatibility)
                  if (onPageChange) onPageChange(item.id);
                  navigate(to);
                }}
                className={`w-full flex items-center px-3 py-3 rounded-lg text-left transition-colors duration-200 ${
                  isActive
                    ? "bg-blue-50 text-blue-700 border-r-2 border-blue-600"
                    : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                } ${isCollapsed ? "justify-center" : ""}`}
                title={isCollapsed ? item.label : ""}
              >
                <Icon
                  className={`h-5 w-5 ${
                    isActive ? "text-blue-600" : "text-gray-400"
                  } ${isCollapsed ? "" : "mr-3"}`}
                />
                {!isCollapsed && (
                  <span className="font-medium whitespace-nowrap">
                    {item.label}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* User Info & Logout */}
      <div className="p-4 border-t border-gray-200">
        {!isCollapsed && (
          <div className="mb-4">
            {/* User Avatar & Name */}
            <div className="flex items-center space-x-3 mb-3">
              <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold flex-shrink-0">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div className="overflow-hidden">
                <p className="font-semibold text-gray-900 text-sm truncate">
                  {user.name}
                </p>
                <p className="text-xs text-gray-500 truncate capitalize">
                  {user.role}
                </p>
              </div>
            </div>
            {/* Additional Info */}
            <div className="space-y-1.5 px-1">
              <div className="flex items-start space-x-2">
                <span className="text-xs text-gray-400 font-medium w-16 flex-shrink-0">Dept:</span>
                <span className="text-xs text-gray-600 truncate capitalize">{user.role}</span>
              </div>
              <div className="flex items-start space-x-2">
                <span className="text-xs text-gray-400 font-medium w-16 flex-shrink-0">ID:</span>
                <span className="text-xs text-gray-600 truncate">{user.department}</span>
              </div>
            </div>
          </div>
        )}
        {isCollapsed && (
          <div className="mb-4 flex justify-center">
            <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold">
              {user.name.charAt(0).toUpperCase()}
            </div>
          </div>
        )}
        <button
          onClick={onLogout}
          className={`w-full flex items-center px-3 py-2 rounded-lg text-gray-700 hover:bg-red-50 hover:text-red-600 transition-colors duration-200 ${
            isCollapsed ? "justify-center" : ""
          }`}
          title={isCollapsed ? "Logout" : ""}
        >
          <LogOut className={`h-5 w-5 ${isCollapsed ? "" : "mr-3"}`} />
          {!isCollapsed && <span className="font-medium">Logout</span>}
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
