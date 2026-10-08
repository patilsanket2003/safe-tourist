"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { BellIcon, CheckCheck, Trash2 } from "lucide-react";
import { toast } from "sonner";
import * as React from "react";

export type Notification = {
  id: string;
  avatar?: string;
  fallback: string;
  text: string;
  time: string;
  type?: "info" | "success" | "warning" | "error";
  read?: boolean;
};

interface NotificationsPopoverProps {
  notifications: Notification[];
  onNotificationClick?: (id: string) => void;
  onMarkAllRead?: () => void;
  onClearAll?: () => void;
}

export function NotificationsPopover({
  notifications,
  onNotificationClick,
  onMarkAllRead,
  onClearAll,
}: NotificationsPopoverProps) {
  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleNotificationClick = (notification: Notification) => {
    // Mark as read
    if (onNotificationClick) {
      onNotificationClick(notification.id);
    }

    // Show a toast with the notification details
    const toastFn = notification.type === "error"
      ? toast.error
      : notification.type === "warning"
        ? toast.warning
        : notification.type === "success"
          ? toast.success
          : toast.info;

    toastFn(notification.text, {
      description: notification.time,
      duration: 4000,
    });
  };

  const handleMarkAllRead = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onMarkAllRead) {
      onMarkAllRead();
    }
    toast.success("All notifications marked as read", {
      duration: 2000,
    });
  };

  const handleClearAll = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onClearAll) {
      onClearAll();
    }
    toast.success("All notifications cleared", {
      duration: 2000,
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full relative"
          aria-label="Open notifications"
        >
          <BellIcon className="size-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-medium text-white animate-pulse">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="right" className="w-80 my-6">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notifications</span>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={handleMarkAllRead}
              title="Mark all as read"
              disabled={unreadCount === 0}
            >
              <CheckCheck className="size-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-destructive hover:text-destructive"
              onClick={handleClearAll}
              title="Clear all"
              disabled={notifications.length === 0}
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {notifications.length === 0 ? (
          <div className="py-6 text-center text-sm text-muted-foreground">
            No notifications
          </div>
        ) : (
          <div className="max-h-[300px] overflow-y-auto">
            {notifications.slice(0, 6).map((notification) => (
              <DropdownMenuItem
                key={notification.id}
                className={`flex items-start gap-3 cursor-pointer ${!notification.read ? "bg-accent/50" : ""}`}
                onClick={() => handleNotificationClick(notification)}
              >
                <Avatar className="size-8 flex-shrink-0">
                  <AvatarImage src={notification.avatar} alt="Avatar" />
                  <AvatarFallback className="text-xs">{notification.fallback}</AvatarFallback>
                </Avatar>
                <div className="flex flex-col flex-1 min-w-0">
                  <span className={`text-sm ${!notification.read ? "font-medium" : ""} line-clamp-2`}>
                    {notification.text}
                  </span>
                  <span className="text-xs text-muted-foreground">{notification.time}</span>
                </div>
                {!notification.read && (
                  <span className="flex-shrink-0 h-2 w-2 rounded-full bg-blue-500 mt-1.5" />
                )}
              </DropdownMenuItem>
            ))}
          </div>
        )}
        {notifications.length > 6 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="justify-center text-sm text-muted-foreground hover:text-primary">
              View all {notifications.length} notifications
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
