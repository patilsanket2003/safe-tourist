import { useState, useEffect, useCallback } from 'react';
import { onAuthorityEvent, offAuthorityEvent } from '../utils/socketClient';

export type NotificationType = 'info' | 'success' | 'warning' | 'error';

export interface Notification {
    id: string;
    fallback: string;
    text: string;
    time: string;
    type: NotificationType;
    read: boolean;
    timestamp: number; // For sorting and auto-removal
}

const NOTIFICATION_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

export function useNotifications() {
    const [notifications, setNotifications] = useState<Notification[]>([]);

    // Load notifications from localStorage on mount
    useEffect(() => {
        try {
            const stored = localStorage.getItem('sidebar_notifications');
            if (stored) {
                const parsed = JSON.parse(stored) as Notification[];
                // Filter out expired notifications (read + older than 24h)
                const now = Date.now();
                const valid = parsed.filter((n) => {
                    if (n.read && now - n.timestamp > NOTIFICATION_EXPIRY_MS) {
                        return false;
                    }
                    return true;
                });
                setNotifications(valid);
            }
        } catch (e) {
            console.error('[useNotifications] Failed to load from localStorage', e);
        }
    }, []);

    // Save notifications to localStorage when they change
    useEffect(() => {
        try {
            localStorage.setItem('sidebar_notifications', JSON.stringify(notifications));
        } catch (e) {
            console.error('[useNotifications] Failed to save to localStorage', e);
        }
    }, [notifications]);

    // Format time ago
    const formatTimeAgo = (timestamp: number): string => {
        const diff = Date.now() - timestamp;
        const minutes = Math.floor(diff / 60000);
        if (minutes < 1) return 'just now';
        if (minutes < 60) return `${minutes}m ago`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}h ago`;
        const days = Math.floor(hours / 24);
        return `${days}d ago`;
    };

    // Add a new notification
    const addNotification = useCallback((
        text: string,
        type: NotificationType = 'info',
        fallback?: string
    ) => {
        const now = Date.now();
        const newNotification: Notification = {
            id: `notif-${now}-${Math.random().toString(36).substr(2, 9)}`,
            fallback: fallback || text.charAt(0).toUpperCase(),
            text,
            time: formatTimeAgo(now),
            type,
            read: false,
            timestamp: now,
        };

        setNotifications((prev) => [newNotification, ...prev]);
    }, []);

    // Listen for real-time socket events
    useEffect(() => {
        // SOS Alert handler
        const handleNewSOSAlert = (alertData: any) => {
            console.log('[useNotifications] Received newSOSAlert:', alertData);
            const name = alertData.touristName || 'Unknown';
            addNotification(
                `🚨 SOS Alert: ${name} needs help!`,
                'error',
                'SOS'
            );
        };

        // Tourist check-in handler
        const handleTouristCheckin = (data: any) => {
            console.log('[useNotifications] Received tourist check-in:', data);
            const name = data.touristName || data.name || 'A tourist';
            addNotification(
                `${name} checked in`,
                'success',
                'TR'
            );
        };

        // Alert status update handler
        const handleAlertStatusUpdate = (data: any) => {
            console.log('[useNotifications] Received alert status update:', data);
            const status = data.status || 'updated';
            addNotification(
                `Alert #${data.alertId?.slice(-6) || 'unknown'} ${status}`,
                'info',
                'ALT'
            );
        };

        // Location update handler (optional - for tracking updates)
        const handleLocationUpdate = (data: any) => {
            // Only notify for significant updates (e.g., zone entry)
            if (data.zoneAlert) {
                addNotification(
                    `Tourist entered ${data.zoneName || 'a monitored zone'}`,
                    'warning',
                    'ZN'
                );
            }
        };

        // Register all event listeners
        onAuthorityEvent('newSOSAlert', handleNewSOSAlert);
        onAuthorityEvent('touristCheckin', handleTouristCheckin);
        onAuthorityEvent('alertStatusUpdate', handleAlertStatusUpdate);
        onAuthorityEvent('locationUpdate', handleLocationUpdate);

        return () => {
            offAuthorityEvent('newSOSAlert', handleNewSOSAlert);
            offAuthorityEvent('touristCheckin', handleTouristCheckin);
            offAuthorityEvent('alertStatusUpdate', handleAlertStatusUpdate);
            offAuthorityEvent('locationUpdate', handleLocationUpdate);
        };
    }, [addNotification]);

    // Update time strings periodically
    useEffect(() => {
        const interval = setInterval(() => {
            setNotifications((prev) =>
                prev.map((n) => ({
                    ...n,
                    time: formatTimeAgo(n.timestamp),
                }))
            );
        }, 60000); // Update every minute

        return () => clearInterval(interval);
    }, []);

    // Mark a single notification as read
    const markAsRead = useCallback((id: string) => {
        setNotifications((prev) =>
            prev.map((n) => (n.id === id ? { ...n, read: true } : n))
        );
    }, []);

    // Mark all notifications as read
    const markAllAsRead = useCallback(() => {
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    }, []);

    // Clear all notifications
    const clearAll = useCallback(() => {
        setNotifications([]);
    }, []);

    // Remove a single notification
    const removeNotification = useCallback((id: string) => {
        setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, []);

    // Clear read notifications older than 24h
    const clearExpired = useCallback(() => {
        const now = Date.now();
        setNotifications((prev) =>
            prev.filter((n) => !n.read || now - n.timestamp < NOTIFICATION_EXPIRY_MS)
        );
    }, []);

    return {
        notifications,
        unreadCount: notifications.filter((n) => !n.read).length,
        addNotification,
        markAsRead,
        markAllAsRead,
        clearAll,
        removeNotification,
        clearExpired,
    };
}
