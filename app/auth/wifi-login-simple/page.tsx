"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Loader2, AlertCircle, CheckCircle2, Eye, EyeOff } from "lucide-react";

/**
 * WiFi Login Page - Simple login form for WiFi users
 * 
 * Flow:
 * 1. User redirected here from login.html (MAC captured)
 * 2. Check-mac endpoint called to pre-fill username
 * 3. User enters password (or both if MAC not found)
 * 4. Form submits to /auth/login with fromWifi: true
 * 5. Backend validates + authenticates with MikroTik
 * 6. User gets JWT token + internet access
 * 7. Redirect to dashboard
 */
function WiFiLoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [checkingMac, setCheckingMac] = useState(true);
  const [mac, setMac] = useState<string | null>(null);
  const [planStatus, setPlanStatus] = useState<string | null>(null);

  // Check MAC on load
  useEffect(() => {
    const macFromUrl = searchParams.get("mac");
    const userFromUrl = searchParams.get("username");
    const planStatusFromUrl = searchParams.get("planStatus");

    if (macFromUrl) {
      setMac(macFromUrl);
      if (userFromUrl) {
        setUsername(decodeURIComponent(userFromUrl));
        console.log("✅ Username pre-filled from MAC check:", userFromUrl);
      }
      if (planStatusFromUrl) {
        setPlanStatus(planStatusFromUrl);
      }
    }

    setCheckingMac(false);
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (!username.trim() || !password.trim()) {
        setError("Please enter both username and password");
        setLoading(false);
        return;
      }

      console.log("📱 WiFi Login:", {
        username,
        fromWifi: !!mac,
        mac: mac || undefined,
      });

      // Submit to backend /auth/login
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "https://splendid-starlink.onrender.com"}/auth/login`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username,
            password,
            fromWifi: !!mac,
            macAddress: mac || undefined,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Login failed");
        setLoading(false);
        return;
      }

      console.log("✅ Login successful:", data);

      // Store token
      if (data.data?.token || data.data?.access_token) {
        const token = data.data.token || data.data.access_token;
        localStorage.setItem("token", token);

        // Store user info
        if (data.data?.user) {
          localStorage.setItem("user", JSON.stringify(data.data.user));
        }

        // Check plan status
        if (data.data?.planStatus?.planExpired) {
          setError("Your subscription has expired. Please go to the dashboard to renew your plan.");
          // Still allow redirect to dashboard for renewal
          setTimeout(() => {
            router.push("/dashboard");
          }, 1250);
          return;
        }

        // Check MikroTik auth result
        if (data.data?.mikrotikAuth) {
          if (data.data.mikrotikAuth.success) {
            console.log("✅ MikroTik authentication successful");
          } else {
            console.warn("⚠️ MikroTik authentication failed:", data.data.mikrotikAuth.message);
            // Still allow login to dashboard even if MikroTik auth failed
            // User might need to reconnect WiFi for internet
          }
        }

        // Redirect to dashboard
        setTimeout(() => {
          router.push("/dashboard");
        }, 500);
      } else {
        setError("Invalid response from server");
        setLoading(false);
      }
    } catch (err: any) {
      console.error("❌ Login error:", err);
      setError(err.message || "An error occurred");
      setLoading(false);
    }
  };

  if (checkingMac) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-amber-700" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-white flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <span className="text-3xl">🛰️</span>
            <h1 className="text-3xl font-bold text-amber-900">Splendid StarLink</h1>
          </div>
          <p className="text-gray-600">WiFi Access Portal</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-lg shadow-lg p-8 border border-amber-200">
          {/* Status Badge */}
          {mac && planStatus === "expired" && (
            <div className="bg-red-50 border border-red-300 text-red-800 px-4 py-3 rounded-lg mb-6 flex items-center gap-2 text-sm">
              <AlertCircle className="h-5 w-5" />
              ⚠️ Device recognized but plan is expired. Please continue to dashboard to renew.
            </div>
          )}
          {mac && planStatus !== "expired" && (
            <div className="bg-green-50 border border-green-300 text-green-800 px-4 py-3 rounded-lg mb-6 flex items-center gap-2 text-sm">
              <CheckCircle2 className="h-5 w-5" />
              ✅ Device recognized - Active plan found
            </div>
          )}

          {/* Error Alert */}
          {error && (
            <div className="bg-red-50 border border-red-300 text-red-800 px-4 py-3 rounded-lg mb-6 flex items-center gap-2 text-sm">
              <AlertCircle className="h-5 w-5" />
              {error}
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                className="w-full px-4 py-3 bg-gray-50 border border-amber-200 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white transition"
                disabled={loading}
                required
              />
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full px-4 py-3 pr-10 bg-gray-50 border border-amber-200 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white transition"
                  disabled={loading}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-gray-500 hover:text-gray-900 transition"
                  disabled={loading}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-6 px-6 py-3 bg-amber-700 hover:bg-amber-800 disabled:bg-gray-400 text-white font-semibold rounded-lg transition flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  🌐 Login to WiFi
                </>
              )}
            </button>
          </form>

          {/* Info Text */}
          <p className="text-xs text-gray-500 text-center mt-4">
            Your connection will be active as long as your subscription is valid
          </p>
        </div>

        {/* Footer */}
        <div className="text-center mt-6 text-sm text-gray-600">
          <p>Need help? Contact support</p>
        </div>
      </div>
    </div>
  );
}

export default function WiFiLoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-amber-700" /></div>}>
      <WiFiLoginPageContent />
    </Suspense>
  );
}
