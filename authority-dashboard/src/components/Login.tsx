import React, { useState, useEffect } from "react";
import { Shield, Users, AlertTriangle, Eye, EyeOff } from "lucide-react";
import { login as authLogin } from "../api/auth";
import { User } from "../types";
import { useNavigate } from "react-router-dom";
import { useToast } from "./ToastProvider";
import { API_BASE_URL } from "../config";

interface LoginProps {
  onLogin: (user: User) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  const [displayCount, setDisplayCount] = useState(0);

  // Fetch SOS count from backend and animate it
  useEffect(() => {
    const fetchSosCount = async () => {
      try {
        const headers: HeadersInit = {};
        const token = localStorage.getItem("token");
        if (token) headers["Authorization"] = `Bearer ${token}`;
        const response = await fetch(`${API_BASE_URL}/count`, { headers });
        const data = await response.json();
        if (data.success) {
          // Animate from 0 to target count
          setDisplayCount(0); // Reset to 0
          const targetCount = data.new;
          const duration = 2000; // 2 seconds
          const steps = 60;
          const stepDuration = duration / steps;
          const increment = targetCount / steps;

          let currentCount = 0;
          const timer = setInterval(() => {
            currentCount += increment;
            if (currentCount >= targetCount) {
              setDisplayCount(targetCount);
              clearInterval(timer);
            } else {
              setDisplayCount(Math.round(currentCount));
            }
          }, stepDuration);
        }
      } catch (error) {
        console.error("Error fetching SOS count:", error);
      }
    };

    fetchSosCount();
    const interval = setInterval(fetchSosCount, 30000);
    return () => clearInterval(interval);
  }, []); // Remove sosCount dependency to prevent re-animation on state updates

  const navigate = useNavigate();
  const { showToast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      const res = await authLogin(email, password);
      if (!res.success) {
        setError(res.message || "Login failed");
        showToast(res.message || "Login failed", "error");
        return;
      }

      // Since authentication is handled by cookies, we just need to check
      // if login was successful and we have user data
      if (res.user) {
        if (res.token) {
          localStorage.setItem("token", res.token);
        }
        onLogin(res.user);
        // If the logged-in user is an authority, create socket immediately
        try {
          if (window.createAuthoritySocketForCurrentUser) {
            // call the window helper exposed in App to create socket and store ref there
            window.createAuthoritySocketForCurrentUser();
          }
        } catch (e) {
          console.warn("Could not create authority socket immediately", e);
        }
        showToast("Login successful", "success");
        navigate("/dashboard");
      } else {
        setError("No user data received from server");
        showToast("No user data received from server", "error");
      }
    } catch (err: any) {
      setError(err?.message || "Unexpected error occurred during login");
      showToast(
        err?.message || "Unexpected error occurred during login",
        "error",
      );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 flex items-center justify-center px-4">
      <div className="max-w-6xl w-full grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
        {/* Left Side - Features */}
        <div className="flex flex-col justify-center space-y-8">
          <div className="text-center lg:text-left">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Smart Tourist Safety
            </h1>
            <p className="text-xl text-gray-600">
              Authority Dashboard & Incident Response System
            </p>
          </div>

          <div className="flex flex-col space-y-4">
            <div className="p-4 bg-blue-50 rounded-lg transform transition-all hover:scale-105">
              <Shield className="h-8 w-8 text-blue-600 mb-2" />
              <h3 className="font-medium text-gray-900">
                Real-time Monitoring
              </h3>
              <p className="text-sm text-gray-600">
                Track tourist activities and respond to emergencies instantly
              </p>
            </div>
            <div className="p-4 bg-green-50 rounded-lg transform transition-all hover:scale-105">
              <Users className="h-8 w-8 text-green-600 mb-2" />
              <h3 className="font-medium text-gray-900">Tourist Management</h3>
              <p className="text-sm text-gray-600">
                Efficiently manage tourist information and safety
              </p>
            </div>
            <div className="p-4 bg-purple-50 rounded-lg transform transition-all hover:scale-105">
              <AlertTriangle className="h-8 w-8 text-purple-600 mb-2" />
              <h3 className="font-medium text-gray-900">Emergency Response</h3>
              <p className="text-sm text-gray-600">
                Quick action protocols for crisis situations
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-4 bg-white/80 backdrop-blur p-4 rounded-lg">
            <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center shadow-lg">
              <div className="text-2xl font-bold text-white">
                {displayCount}
              </div>
            </div>
            <div className="flex-1">
              <h3 className="font-medium text-gray-900">Active SOS Alerts</h3>
              <p className="text-sm text-gray-600">
                Waiting for immediate assistance
              </p>
            </div>
          </div>
        </div>

        {/* Right Side - Login Form */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <div className="mx-auto h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
              <Shield className="h-6 w-6 text-blue-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">
              Authority Login
            </h2>
            <p className="text-gray-600 mt-2">Secure access to the dashboard</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Official Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                placeholder="your-email@system.gov"
                required
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors pr-12"
                  placeholder="Enter your password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Sign In to Dashboard
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-500">
            <p>
              Authorized personnel only. All access is logged and monitored.
            </p>
            <p className="mt-3">
              <button
                type="button"
                onClick={() => navigate("/signup")}
                className="text-blue-600 hover:underline"
              >
                Need an account? Sign up
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
