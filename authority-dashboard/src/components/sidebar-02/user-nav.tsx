"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { LogOut, ChevronUp, Shield, Building2 } from "lucide-react";

export interface UserInfo {
  name: string;
  email?: string;
  role: string;
  department?: string;
}

interface UserNavProps {
  user: UserInfo;
  onLogout: () => void;
}

// Get role badge color
const getRoleBadge = (role: string) => {
  const r = role.toLowerCase();
  if (r.includes("admin"))
    return {
      bg: "bg-purple-100",
      text: "text-purple-700",
      label: "Administrator",
    };
  if (r.includes("police"))
    return {
      bg: "bg-blue-100",
      text: "text-blue-700",
      label: "Police Officer",
    };
  if (r.includes("tourism"))
    return {
      bg: "bg-green-100",
      text: "text-green-700",
      label: "Tourism Officer",
    };
  return { bg: "bg-gray-100", text: "text-gray-700", label: role };
};

export function UserNav({ user, onLogout }: UserNavProps) {
  const { isMobile, state } = useSidebar();
  const isCollapsed = state === "collapsed";
  const roleBadge = getRoleBadge(user.role);

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground hover:bg-sidebar-accent/50 transition-colors"
            >
              {/* Avatar with status indicator */}
              <div className="relative">
                <div className="flex aspect-square size-9 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-700 text-white font-semibold shadow-sm">
                  {(user.name || "U").charAt(0).toUpperCase()}
                </div>
                {/* Online status dot */}
                <span className="absolute -bottom-0.5 -right-0.5 block h-2.5 w-2.5 rounded-full bg-green-500 ring-2 ring-sidebar" />
              </div>
              {!isCollapsed && (
                <>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">{user.name}</span>
                    <span className="truncate text-xs text-muted-foreground">
                      {user.email ||
                        `${user.name.toLowerCase().replace(/\s+/g, ".")}@gov`}
                    </span>
                  </div>
                  <ChevronUp className="ml-auto size-4 text-muted-foreground" />
                </>
              )}
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-64 rounded-xl shadow-lg mb-4"
            align="start"
            side={isMobile ? "bottom" : "right"}
            sideOffset={8}
          >
            {/* User header */}
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-t-xl">
                <div className="flex aspect-square size-12 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-700 text-white font-bold text-lg shadow-md">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="truncate font-semibold text-gray-900">
                    {user.name}
                  </p>
                  <p className="truncate text-sm text-gray-600">
                    {user.email ||
                      `${user.name.toLowerCase().replace(/\s+/g, ".")}@authority.gov`}
                  </p>
                </div>
              </div>
            </DropdownMenuLabel>

            {/* Role & Department info */}
            <div className="px-3 py-3 space-y-2 border-b">
              <div className="flex items-center gap-2 text-sm">
                <Shield className="size-4 text-blue-600" />
                <span className="text-muted-foreground">Role:</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-medium ${roleBadge.bg} ${roleBadge.text}`}
                >
                  {roleBadge.label}
                </span>
              </div>
              {user.department && (
                <div className="flex items-center gap-2 text-sm">
                  <Building2 className="size-4 text-gray-500" />
                  <span className="text-muted-foreground">Dept:</span>
                  <span className="text-gray-900">{user.department}</span>
                </div>
              )}
            </div>

            {/* Logout button */}
            <div className="p-1">
              <DropdownMenuItem
                className="gap-3 px-3 py-2.5 cursor-pointer rounded-lg text-red-600 focus:text-red-600 focus:bg-red-50"
                onClick={onLogout}
              >
                <LogOut className="size-4" />
                <span className="font-medium">Sign Out</span>
              </DropdownMenuItem>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
