"use client";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuItem as SidebarMenuSubItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import type React from "react";
import { useState } from "react";

export type Route = {
  id: string;
  title: string;
  icon?: React.ReactNode;
  link: string;
  roles?: string[];
  subs?: {
    title: string;
    link: string;
    icon?: React.ReactNode;
  }[];
};

interface DashboardNavigationProps {
  routes: Route[];
  userRole?: string;
}

export default function DashboardNavigation({ routes, userRole }: DashboardNavigationProps) {
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [openCollapsible, setOpenCollapsible] = useState<string | null>(null);
  const location = useLocation();

  // Filter routes based on user role
  const filteredRoutes = userRole
    ? routes.filter((route) => !route.roles || route.roles.includes(userRole))
    : routes;

  // Check if current path matches a route
  const isActiveRoute = (link: string) => {
    const currentPath = location.pathname === "/" ? "/dashboard" : location.pathname;
    return currentPath === link || currentPath.startsWith(link + "/");
  };

  return (
    <SidebarMenu>
      {filteredRoutes.map((route) => {
        const isOpen = !isCollapsed && openCollapsible === route.id;
        const hasSubRoutes = !!route.subs?.length;
        const isActive = isActiveRoute(route.link);

        return (
          <SidebarMenuItem key={route.id}>
            {hasSubRoutes ? (
              <Collapsible
                open={isOpen}
                onOpenChange={(open: boolean) =>
                  setOpenCollapsible(open ? route.id : null)
                }
                className="w-full"
              >
                <CollapsibleTrigger asChild>
                  <SidebarMenuButton
                    className={cn(
                      "flex w-full items-center rounded-lg px-2 transition-colors",
                      isOpen || isActive
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                      isCollapsed && "justify-center"
                    )}
                  >
                    {route.icon}
                    {!isCollapsed && (
                      <span className="ml-2 flex-1 text-sm font-medium">
                        {route.title}
                      </span>
                    )}
                    {!isCollapsed && hasSubRoutes && (
                      <span className="ml-auto">
                        {isOpen ? (
                          <ChevronUp className="size-4" />
                        ) : (
                          <ChevronDown className="size-4" />
                        )}
                      </span>
                    )}
                  </SidebarMenuButton>
                </CollapsibleTrigger>

                {!isCollapsed && (
                  <CollapsibleContent>
                    <SidebarMenuSub className="my-1 ml-3.5 ">
                      {route.subs?.map((subRoute) => {
                        const isSubActive = isActiveRoute(subRoute.link);
                        return (
                          <SidebarMenuSubItem
                            key={`${route.id}-${subRoute.title}`}
                            className="h-auto"
                          >
                            <SidebarMenuSubButton asChild>
                              <Link
                                to={subRoute.link}
                                className={cn(
                                  "flex items-center rounded-md px-4 py-1.5 text-sm font-medium transition-colors",
                                  isSubActive
                                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                                    : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                                )}
                              >
                                {subRoute.icon}
                                <span className={subRoute.icon ? "ml-2" : ""}>{subRoute.title}</span>
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        );
                      })}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                )}
              </Collapsible>
            ) : (
              <SidebarMenuButton tooltip={route.title} asChild>
                <Link
                  to={route.link}
                  className={cn(
                    "flex items-center rounded-lg px-2 transition-colors",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                    isCollapsed && "justify-center"
                  )}
                >
                  {route.icon}
                  {!isCollapsed && (
                    <span className="ml-2 text-sm font-medium">
                      {route.title}
                    </span>
                  )}
                </Link>
              </SidebarMenuButton>
            )}
          </SidebarMenuItem>
        );
      })}
    </SidebarMenu>
  );
}
