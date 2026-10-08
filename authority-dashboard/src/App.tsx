import React, { useState, useEffect } from "react";
import { User } from "./types";
import AppRouter from "./AppRouter";
import { getCurrentUser } from "./api/auth";
import {
  createAuthoritySocket,
  disconnectAuthoritySocket,
} from "./utils/socketClient";
import { Toaster } from "./components/ui/sonner";

function App() {
  const [user, setUser] = useState<User | null>(null);
  // authView is managed by routes now; keep a setter to pass to router if needed
  const [_authView, setAuthView] = React.useState<"login" | "signup">("login");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // On mount, check if user is already authenticated (via cookie/session)
    const checkAuth = async () => {
      try {
        const res = await getCurrentUser();
        if (res.success && res.user) {
          setUser(res.user);
        }
      } catch (e) {
        // ignore error, user stays null
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, []);

  const handleLogin = (userData: User) => {
    // set user only; socket creation is handled centrally in the user effect
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    // Disconnect authority socket on logout
    if (authoritySocketRef.current) {
      disconnectAuthoritySocket(authoritySocketRef.current);
      authoritySocketRef.current = null;
    }
    setUser(null);
  };

  const authoritySocketRef = React.useRef<any>(null);

  useEffect(() => {
    // Expose helper functions on window (available before user logs in)
    window.createAuthoritySocketForCurrentUser = async () => {
      if (!user) {
        console.warn(
          "No authenticated user available to register as authority",
        );
        return null;
      }
      if (authoritySocketRef.current) {
        console.warn("Authority socket already created");
        return authoritySocketRef.current;
      }
      console.log("[App] Creating authority socket for user:", user.id);
      const sock = createAuthoritySocket(String(user.id));
      authoritySocketRef.current = sock;
      return sock;
    };

    window.disconnectAuthoritySocketForCurrentUser = () => {
      if (authoritySocketRef.current) {
        disconnectAuthoritySocket(authoritySocketRef.current);
        authoritySocketRef.current = null;
      }
    };

    // Expose getAuthoritySocket for components to access socket
    window.getAuthoritySocket = () => {
      return authoritySocketRef.current;
    };

    return () => {
      try {
        delete (window as any).createAuthoritySocketForCurrentUser;
        delete (window as any).disconnectAuthoritySocketForCurrentUser;
        delete (window as any).getAuthoritySocket;
      } catch (e) {
        // ignore
      }
    };
  }, [user]); // Keep user dependency so helpers always have latest user

  // Separate effect for auto-creating socket when user logs in
  useEffect(() => {
    if (user && !authoritySocketRef.current) {
      console.log("[App] Auto-creating authority socket for logged-in user:", user.id);
      authoritySocketRef.current = createAuthoritySocket(String(user.id));
    }

    // Cleanup on logout
    return () => {
      if (!user && authoritySocketRef.current) {
        console.log("[App] Disconnecting socket on user logout");
        disconnectAuthoritySocket(authoritySocketRef.current);
        authoritySocketRef.current = null;
      }
    };
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-lg">
        Loading...
      </div>
    );
  }

  return (
    <>
      <Toaster position="bottom-right" richColors closeButton />
      <AppRouter
        user={user}
        setAuthView={setAuthView}
        handleLogin={handleLogin}
        handleLogout={handleLogout}
      />
    </>
  );
}

export default App;
