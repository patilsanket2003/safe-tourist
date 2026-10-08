/**
 * Path Deviation WebSocket Client
 * Handles real-time deviation updates from FastAPI backend
 */

import { pathDeviationService, DeviationStatus, GPSPoint } from './pathDeviationService';

export interface WebSocketMessage {
  type: 'connection_ack' | 'gps_update' | 'deviation_update' | 'batch_processed' | 'ping' | 'error';
  [key: string]: any;
}

export interface DeviationUpdateMessage {
  type: 'deviation_update';
  journey_id: string;
  deviation: DeviationStatus;
  metrics?: {
    distance_from_route?: number;
    time_deviation?: number;
  };
  route_probabilities?: Record<string, number>;
  timestamp: string;
}

export interface GPSUpdateMessage {
  type: 'gps_update';
  journey_id: string;
  location: GPSPoint;
}

export interface BatchProcessedMessage {
  type: 'batch_processed';
  batch_number: number;
  points_processed: number;
  map_matched: boolean;
}

type MessageHandler = (message: WebSocketMessage) => void;

class PathDeviationWebSocket {
  private ws: WebSocket | null = null;
  private journeyId: string | null = null;
  private connected: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number | null = null; // null = retry forever while journey is active
  private reconnectDelay: number = 2000;
  private listeners: Map<string, MessageHandler[]> = new Map();
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private shouldReconnect: boolean = false;

  /**
   * Connect to WebSocket
   */
  connect(journeyId: string): void {
    if (this.connected && this.journeyId === journeyId) {
      console.log('[PathDeviationWS] Already connected to journey:', journeyId);
      return;
    }

    this.disconnect(); // Clean up any existing connection
    this.journeyId = journeyId;
    this.shouldReconnect = true;

    const wsUrl = pathDeviationService.getWebSocketUrl(journeyId);
    console.log('[PathDeviationWS] Connecting to:', wsUrl);

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => this.handleOpen();
      this.ws.onmessage = (event) => this.handleMessage(event);
      this.ws.onerror = (error) => this.handleError(error);
      this.ws.onclose = () => this.handleClose();
    } catch (error) {
      console.error('[PathDeviationWS] Connection error:', error);
      this.emit('error', { error });
    }
  }

  /**
   * Handle WebSocket open
   */
  private handleOpen(): void {
    console.log('[PathDeviationWS] Connected');
    this.connected = true;
    this.reconnectAttempts = 0;
    this.emit('connected', {});
    this.startHeartbeat();
  }

  /**
   * Handle incoming WebSocket message
   */
  private handleMessage(event: MessageEvent): void {
    try {
      const message: WebSocketMessage = JSON.parse(event.data);
      console.log('[PathDeviationWS] Received:', message.type);

      // Emit to specific type listeners
      this.emit(message.type, message);
      
      // Emit to general message listeners
      this.emit('message', message);

      // Handle ping-pong
      if (message.type === 'ping') {
        this.sendPong(message.timestamp);
      }
    } catch (error) {
      console.error('[PathDeviationWS] Failed to parse message:', error);
    }
  }

  /**
   * Handle WebSocket error
   */
  private handleError(error: Event): void {
    console.error('[PathDeviationWS] Error:', error);
    this.emit('error', { error });
  }

  /**
   * Handle WebSocket close
   */
  private handleClose(): void {
    console.log('[PathDeviationWS] Disconnected');
    this.connected = false;
    this.stopHeartbeat();
    this.emit('disconnected', {});

    // Attempt reconnection
    const canRetry =
      this.shouldReconnect &&
      this.journeyId &&
      (this.maxReconnectAttempts === null || this.reconnectAttempts < this.maxReconnectAttempts);

    if (canRetry) {
      this.reconnectAttempts++;
      const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
      
      console.log(
        `[PathDeviationWS] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`
      );

      setTimeout(() => {
        if (this.journeyId) {
          this.connect(this.journeyId);
        }
      }, delay);
    }
  }

  /**
   * Send pong response to ping
   */
  private sendPong(timestamp: number): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'pong', timestamp }));
    }
  }

  /**
   * Start heartbeat
   */
  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        // Connection is alive, no action needed (server sends pings)
      } else {
        console.warn('[PathDeviationWS] Connection lost during heartbeat check');
        this.stopHeartbeat();
      }
    }, 30000); // Check every 30 seconds
  }

  /**
   * Stop heartbeat
   */
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Register event listener
   */
  on(event: string, handler: MessageHandler): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(handler);
  }

  /**
   * Unregister event listener
   */
  off(event: string, handler: MessageHandler): void {
    const handlers = this.listeners.get(event);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  /**
   * Emit event to listeners
   */
  private emit(event: string, data: any): void {
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error('[PathDeviationWS] Error in event handler:', error);
        }
      });
    }
  }

  /**
   * Disconnect WebSocket
   */
  disconnect(): void {
    if (this.ws) {
      console.log('[PathDeviationWS] Disconnecting...');
      this.stopHeartbeat();
      this.shouldReconnect = false;
      this.journeyId = null;
      this.ws.close();
      this.ws = null;
      this.connected = false;
    }
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.connected && this.ws?.readyState === WebSocket.OPEN;
  }

  /**
   * Remove all listeners
   */
  removeAllListeners(): void {
    this.listeners.clear();
  }
}

export const pathDeviationWebSocket = new PathDeviationWebSocket();
