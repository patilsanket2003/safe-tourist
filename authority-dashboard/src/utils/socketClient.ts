import { io, Socket } from "socket.io-client";
import { API_BASE_URL } from "../config";

// Base URL for backend (can be overridden via Vite env)
const BASE_URL = import.meta.env.VITE_API_BASE_URL || API_BASE_URL;

// // Connects to backend for general client usage
// const socket: Socket = io(BASE_URL, { autoConnect: false });

// export function connectSocket(
//   onClientUpdate: (data: any) => void,
//   onBackendUpdate?: (data: any) => void,
// ) {
//   if (!socket.connected) socket.connect();

//   socket.on("connect", () => {
//     socket.emit("register", "touristApp");
//   });

//   socket.on("clientUpdate", onClientUpdate);

//   if (onBackendUpdate) socket.on("backendUpdate", onBackendUpdate);

//   return socket;
// }

// export function emitClientUpdate(payload: any) {
//   socket.emit("clientUpdate", payload);
// }

// export function disconnectSocket() {
//   socket.off("clientUpdate");
//   socket.off("backendUpdate");
//   socket.disconnect();
// }

// export { socket };

// --- Authority mock client helpers ---
// Creates a socket that registers as an `authority` with the backend using
// the `registerAuthority` handshake used by the server code.
let authoritySocket: Socket | null = null;
// pending handlers stored when socket not yet created: eventName -> Set of handlers
const pendingHandlers: Map<string, Set<(...args: any[]) => void>> = new Map();

export function createAuthoritySocket(userId: string) {
  if (authoritySocket && authoritySocket.connected) return authoritySocket;

  authoritySocket = io(BASE_URL, {
    transports: ["websocket"],
    autoConnect: false,
  });

  // attach any pending handlers that were registered before socket existed
  pendingHandlers.forEach((handlers, eventName) => {
    handlers.forEach((h) => {
      console.debug(
        `[socketClient] attaching pending handler for event: ${eventName}`,
      );
      authoritySocket?.on(eventName, h);
    });
  });

  // connect and register
  authoritySocket.connect();

  authoritySocket.on("connect", () => {
    console.log("=".repeat(60));
    console.log("[SocketClient] ✅ Authority WebSocket CONNECTED");
    console.log("[SocketClient] Socket ID:", authoritySocket?.id);
    console.log("[SocketClient] Registering as authority with userId:", userId);
    console.log("=".repeat(60));
    authoritySocket?.emit("registerAuthority", { role: "authority", userId });
  });

  authoritySocket.on("connect_error", (error) => {
    console.error("=".repeat(60));
    console.error("[SocketClient] ❌ Connection ERROR:", error.message);
    console.error(
      "[SocketClient] Please verify backend is running and CORS is configured",
    );
    console.error("=".repeat(60));
  });

  authoritySocket.on("disconnect", (reason) => {
    console.log("=".repeat(60));
    console.log("[SocketClient] 🔌 Authority WebSocket DISCONNECTED");
    console.log("[SocketClient] Reason:", reason);
    console.log("=".repeat(60));
  });

  return authoritySocket;
}

export function disconnectAuthoritySocket(authSocket?: Socket | null) {
  const sock = authSocket || authoritySocket;
  if (!sock) return;
  sock.off("connect");
  sock.off("disconnect");
  sock.disconnect();
  if (sock === authoritySocket) authoritySocket = null;
}

export function onAuthorityEvent(
  eventName: string,
  handler: (...args: any[]) => void,
) {
  if (authoritySocket) {
    console.log(`[SocketClient] Registering event handler for: ${eventName}`);
    authoritySocket.on(eventName, handler);
    return true;
  }
  // queue handler for when socket is created
  console.debug(`[socketClient] queueing handler for event: ${eventName}`);
  let set = pendingHandlers.get(eventName);
  if (!set) {
    set = new Set();
    pendingHandlers.set(eventName, set);
  }
  set.add(handler);
  return false;
}

export function offAuthorityEvent(
  eventName: string,
  handler: (...args: any[]) => void,
) {
  if (authoritySocket) {
    authoritySocket.off(eventName, handler);
    return true;
  }
  // remove from pending handlers if present
  const set = pendingHandlers.get(eventName);
  if (set) {
    set.delete(handler);
    if (set.size === 0) pendingHandlers.delete(eventName);
  }
  return false;
}

export function getAuthoritySocket() {
  return authoritySocket;
}

// Broadcast alert to tourists
export function broadcastAlertToTourists(alertData: any): Promise<void> {
  return new Promise((resolve, reject) => {
    const socket = getAuthoritySocket();

    if (!socket || !socket.connected) {
      reject(new Error("Socket not connected"));
      return;
    }

    // Set up listeners
    const successHandler = () => {
      socket.off("broadcastSuccess", successHandler);
      socket.off("broadcastError", errorHandler);
      resolve();
    };

    const errorHandler = (error: any) => {
      socket.off("broadcastSuccess", successHandler);
      socket.off("broadcastError", errorHandler);
      reject(new Error(error.message || "Broadcast failed"));
    };

    socket.once("broadcastSuccess", successHandler);
    socket.once("broadcastError", errorHandler);

    // Emit the broadcast
    socket.emit("authorityBroadcast", alertData);

    // Timeout after 10 seconds and assume success
    setTimeout(() => {
      socket.off("broadcastSuccess", successHandler);
      socket.off("broadcastError", errorHandler);
      resolve();
    }, 10000);
  });
}
