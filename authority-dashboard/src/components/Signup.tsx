import React, { useState, useEffect } from "react";
import { Shield, Users, AlertTriangle } from "lucide-react";
import { signup } from "../api/auth";
import { useToast } from "./ToastProvider";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../config";

type SignupProps = {};

const Signup: React.FC<SignupProps> = () => {
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authorityId, setauthorityId] = useState("");
  const [role, setRole] = useState<
    | "Police Officer"
    | "Tourism Officer"
    | "Emergency Responder"
    | "System Administrator"
  >("Police Officer");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const res = await signup({
        username,
        email,
        password,
        fullName,
        authorityId,
        role,
      });
      if (res.success) {
        setMessage(
          res.message || "Signup successful. Redirecting to dashboard...",
        );
        setUsername("");
        setFullName("");
        setEmail("");
        setPassword("");
        setauthorityId("");
        showToast(res.message || "Signup successful", "success");
        // if backend auto-logs in and returns user/token, redirect to dashboard
        // otherwise, navigate to login
        navigate("/dashboard");
      } else {
        setError(res.message || "Signup failed");
        showToast(res.message || "Signup failed", "error");
      }
    } catch (err: any) {
      setError(err?.message || "Unexpected error");
      showToast(err?.message || "Unexpected error", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 flex items-center justify-center px-4">
      <div className="max-w-6xl w-full grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
        {/* Left Side - Hero Section */}
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

        {/* Right Side - Signup Form */}
        <div className="bg-white rounded-2xl shadow-xl p-6">
          <div className="text-center mb-6">
            <div className="mx-auto h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center mb-3">
              <svg
                className="h-6 w-6 text-blue-600"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
              >
                <path d="M12 11c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3z" />
                <path d="M21 21v-2a4 4 0 00-4-4H7a4 4 0 00-4 4v2" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900">
              Create Authority Account
            </h2>
            <p className="text-gray-600 mt-1">Register a new authority user</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Username
                </label>
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Full Name
                </label>
                <input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Department Role
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as any)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white"
                >
                  <option value="Police Officer">Police Officer</option>
                  <option value="Tourism Officer">Tourism Officer</option>
                  <option value="Emergency Responder">
                    Emergency Responder
                  </option>
                  <option value="Admin">System Administrator</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Authority ID
                </label>
                <input
                  value={authorityId}
                  onChange={(e) => setauthorityId(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Official Email
              </label>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              />
            </div>

            {message && (
              <div className="bg-green-50 border border-green-200 text-green-800 px-3 py-2 rounded-lg text-sm">
                {message}
              </div>
            )}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div className="flex space-x-3">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                {loading ? "Creating..." : "Create Account"}
              </button>
              <button
                type="button"
                onClick={() => navigate("/login")}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium py-2 px-4 rounded-lg transition-colors duration-200"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Signup;
