import { useEffect, useState } from 'react';
import { Socket } from 'socket.io-client';
import {
  createAuthoritySocket,
  disconnectAuthoritySocket,
  getAuthoritySocket,
} from '../utils/socketClient';

interface UseSocketReturn {
  socket: Socket | null;
  isConnected: boolean;
}

/**
 * Custom hook to manage Socket.IO connection for authority dashboard
 * @param userId - The authority user ID for registration
 * @returns socket instance and connection state
 */
export const useSocket = (userId: string): UseSocketReturn => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!userId) {
      console.warn('[useSocket] No userId provided, cannot connect');
      return;
    }

    console.log('[useSocket] Initializing socket connection for userId:', userId);

    // Create socket connection
    const authoritySocket = createAuthoritySocket(userId);
    setSocket(authoritySocket);

    // Track connection state
    const handleConnect = () => {
      console.log('[useSocket] ✅ Socket connected');
      setIsConnected(true);
    };

    const handleDisconnect = (reason: string) => {
      console.log('[useSocket] 🔌 Socket disconnected:', reason);
      setIsConnected(false);
    };

    const handleReconnect = (attemptNumber: number) => {
      console.log('[useSocket] 🔄 Socket reconnected after', attemptNumber, 'attempts');
      setIsConnected(true);
      
      // Re-register as authority after reconnection
      const sock = getAuthoritySocket();
      if (sock) {
        console.log('[useSocket] Re-registering as authority after reconnection');
        sock.emit('registerAuthority', { role: 'authority', userId });
      }
    };

    const handleConnectError = (error: Error) => {
      console.error('[useSocket] ❌ Connection error:', error.message);
      setIsConnected(false);
    };

    // Attach event listeners
    authoritySocket.on('connect', handleConnect);
    authoritySocket.on('disconnect', handleDisconnect);
    authoritySocket.on('reconnect', handleReconnect);
    authoritySocket.on('connect_error', handleConnectError);

    // Set initial connection state
    setIsConnected(authoritySocket.connected);

    // Cleanup on unmount
    return () => {
      console.log('[useSocket] Cleaning up socket connection');
      authoritySocket.off('connect', handleConnect);
      authoritySocket.off('disconnect', handleDisconnect);
      authoritySocket.off('reconnect', handleReconnect);
      authoritySocket.off('connect_error', handleConnectError);
      disconnectAuthoritySocket(authoritySocket);
    };
  }, [userId]);

  return { socket, isConnected };
};
