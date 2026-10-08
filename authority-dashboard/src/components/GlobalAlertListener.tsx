import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AlertTriangle, X, MapPin } from 'lucide-react';
import { useSOSAlerts } from '../hooks/useSOSAlerts';
import { useToast } from './ToastProvider';
import { playAlertSound } from '../utils/audio';
import { getSeverityFromScore, getSeverityColors } from '../utils/formatters';
import { onAuthorityEvent, offAuthorityEvent } from '../utils/socketClient';

const GlobalAlertListener: React.FC = () => {
    const { latestAlert } = useSOSAlerts(); // For visual banner state
    const { showToast } = useToast();
    const location = useLocation();
    const navigate = useNavigate();
    const [isVisible, setIsVisible] = useState(false);

    // Sync visibility with latestAlert from hook
    useEffect(() => {
        if (latestAlert) {
            setIsVisible(true);
        } else {
            setIsVisible(false);
        }
    }, [latestAlert]);

    // Force socket connection on mount (fixes race condition where page loads before App effect)
    useEffect(() => {
        const ensureSocket = async () => {
            const win = window as any;
            // If getAuthoritySocket exists but returns null, try to create it
            if (win.getAuthoritySocket && !win.getAuthoritySocket() && win.createAuthoritySocketForCurrentUser) {
                console.log('[GlobalAlertListener] 🔄 Enforcing socket connection on page visit...');
                try {
                    await win.createAuthoritySocketForCurrentUser();
                } catch (e) {
                    console.error('[GlobalAlertListener] Failed to enforce socket creation', e);
                }
            }
        };
        ensureSocket();
    }, [location.pathname]); // Re-check on navigation just in case

    // Side effects for Sound, Toast, Browser Notification
    // We use a separate listener to ensure these fire exactly once per socket event
    // independent of the hook's state management
    useEffect(() => {
        const handleNewAlert = (alertData: any) => {
            console.log('[GlobalAlertListener] 🚨 Handling side effects for new alert');
            
            // 1. Play Sound
            playAlertSound();

            // 2. Show Toast
            const name = alertData.touristName || 'Unknown Tourist';
            showToast(`SOS Alert: ${name}`, 'error');

            // 3. Browser Notification
            if ('Notification' in window && Notification.permission === 'granted') {
                try {
                    new Notification('🚨 SOS Alert Received', {
                        body: `Emergency reported by ${name} at ${alertData.location?.locationName || 'Unknown Location'}`,
                        icon: '/vite.svg', // Fallback icon
                        tag: 'sos-alert' // Replace existing notification with same tag
                    });
                } catch (e) {
                    console.warn('Notification failed', e);
                }
            }
        };

        // Request permission if needed
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }

        onAuthorityEvent('newSOSAlert', handleNewAlert);

        return () => {
            offAuthorityEvent('newSOSAlert', handleNewAlert);
        };
    }, [showToast]);

    // Hide banner on Alerts page to avoid duplication, or if no alert/dismissed
    const isAlertsPage = location.pathname === '/alerts';
    
    if (!isVisible || !latestAlert || isAlertsPage) return null;

    // Determine severity and colors
    const safetyScore = typeof latestAlert.safetyScore === 'number' ? latestAlert.safetyScore : 50;
    const severity = latestAlert.severity || getSeverityFromScore(safetyScore);
    const colors = getSeverityColors(severity);

    return (
        <div className="fixed top-0 left-0 right-0 z-[100] shadow-xl animate-in slide-in-from-top duration-300">
            <div className={`${colors.bg} ${colors.text} px-4 py-3 flex items-center justify-between`}>
                <div className="flex items-center space-x-3 container mx-auto max-w-7xl">
                    <div className="bg-white/20 p-2 rounded-full animate-pulse">
                        <AlertTriangle className={`h-6 w-6 ${colors.text}`} />
                    </div>
                    <div className="flex-1">
                        <h3 className="font-bold text-lg leading-tight uppercase">
                            NEW SOS ALERT - {latestAlert.touristName || 'Unknown'}
                        </h3>
                        <div className={`${colors.text} opacity-90 text-sm flex items-center mt-1`}>
                            <MapPin className="h-3 w-3 mr-1" />
                            {latestAlert.location?.locationName || 'Unknown Location'}
                            <span className="mx-2">•</span>
                            {new Date(latestAlert.timestamp).toLocaleTimeString()}
                        </div>
                    </div>
                    <div className="flex items-center space-x-3">
                        <button 
                            onClick={() => {
                                navigate(`/alerts?openAlertId=${latestAlert.alertId}`);
                                // Optionally keep the banner or dismiss it? 
                                // Navigating to alerts page will hide it due to isAlertsPage check
                            }}
                            className="bg-white text-red-600 px-4 py-1.5 rounded-lg font-bold text-sm hover:bg-red-50 transition-colors shadow-sm"
                        >
                            View Details
                        </button>
                        <button 
                            onClick={() => setIsVisible(false)}
                            className="p-1 hover:bg-red-700 rounded-full transition-colors text-white/80 hover:text-white"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GlobalAlertListener;
