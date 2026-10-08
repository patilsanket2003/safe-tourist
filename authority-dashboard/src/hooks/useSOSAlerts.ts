import { useEffect, useState } from 'react';
import { onAuthorityEvent, offAuthorityEvent } from '../utils/socketClient';

import { SOSAlert } from '../types';

interface UseSOSAlertsReturn {
  alerts: SOSAlert[];
  latestAlert: SOSAlert | null;
  clearAlerts: () => void;
  removeAlert: (alertId: string) => void;
}

// Rate limiting sound logic removed (handled globally)
// Browser notification logic removed (handled globally)


/**
 * Validate incoming SOS alert data
 * Backend now sends: alertId, touristId, touristName, emergencyContact, location, timestamp, safetyScore, sosReason, status
 */
const isValidAlert = (alert: any): alert is SOSAlert => {
  return (
    alert &&
    typeof alert.alertId === 'string' &&
    typeof alert.touristId === 'string' &&
    alert.location &&
    Array.isArray(alert.location.coordinates) &&
    alert.location.coordinates.length === 2 &&
    typeof alert.timestamp === 'string'
    // Note: severity field is optional - backend uses safetyScore instead
  );
};

/**
 * Custom hook to manage SOS alerts and real-time updates
 */
export const useSOSAlerts = (): UseSOSAlertsReturn => {
  const [alerts, setAlerts] = useState<SOSAlert[]>([]);
  const [latestAlert, setLatestAlert] = useState<SOSAlert | null>(null);

  useEffect(() => {
    // 1. Check for persisted alert on mount
    const persisted = localStorage.getItem('latest_sos_banner');
    if (persisted) {
        try {
            const { alert, timestamp } = JSON.parse(persisted);
            const age = Date.now() - timestamp;
            if (age < 60000) { // Less than 60s old
                console.log('[useSOSAlerts] Restoring persisted banner');
                setLatestAlert(alert);
                // Set timeout for remainder
                setTimeout(() => {
                    setLatestAlert(null);
                    localStorage.removeItem('latest_sos_banner');
                }, 60000 - age);
            } else {
                localStorage.removeItem('latest_sos_banner');
            }
        } catch (e) {
            localStorage.removeItem('latest_sos_banner');
        }
    }

    console.log('[useSOSAlerts] Setting up newSOSAlert event listener');

    // Handler for new SOS alerts
    const handleNewSOSAlert = (alertData: any) => {
      console.log('🆘 New SOS Alert received:', alertData);

      // Validate alert data
      if (!isValidAlert(alertData)) {
        console.error('[useSOSAlerts] ❌ Invalid alert data received:', alertData);
        return;
      }

      // Update latest alert & Persist
      // Update latest alert (local state)
      // Persistence is now handled by GlobalAlertListener
      setLatestAlert(alertData);
      
      // Auto-dismiss local state after 60s
      setTimeout(() => {
        setLatestAlert((current) => {
           if (current?.alertId === alertData.alertId) {
             return null;
           }
           return current;
        });
      }, 60000);

      // Add to alerts list (prepend to show newest first)
      setAlerts((prevAlerts) => {
        // Check if alert already exists (prevent duplicates)
        const exists = prevAlerts.some((a) => a.alertId === alertData.alertId);
        if (exists) {
          console.log('[useSOSAlerts] Alert already exists, updating:', alertData.alertId);
          return prevAlerts.map((a) =>
            a.alertId === alertData.alertId ? alertData : a
          );
        }
        console.log('[useSOSAlerts] Adding new alert:', alertData.alertId);
        return [alertData, ...prevAlerts];
      });

      // NOTE: Sound and Notification are now handled globally by GlobalAlertListener
    };

    // Register event listener
    onAuthorityEvent('newSOSAlert', handleNewSOSAlert);

    // Cleanup on unmount
    return () => {
      console.log('[useSOSAlerts] Cleaning up newSOSAlert event listener');
      offAuthorityEvent('newSOSAlert', handleNewSOSAlert);
    };
  }, []);

  // Request notification permission on mount


  const clearAlerts = () => {
    console.log('[useSOSAlerts] Clearing all alerts');
    setAlerts([]);
    setLatestAlert(null);
  };

  const removeAlert = (alertId: string) => {
    console.log('[useSOSAlerts] Removing alert:', alertId);
    setAlerts((prev) => prev.filter((alert) => alert.alertId !== alertId));
    if (latestAlert?.alertId === alertId) {
      setLatestAlert(null);
    }
  };

  return { alerts, latestAlert, clearAlerts, removeAlert };
};
