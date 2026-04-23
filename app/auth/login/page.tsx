"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Satellite, User, Lock, Eye, EyeOff, Loader2, Key, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetchGet, apiFetchPost } from "@/lib/api-client";

export default function LoginPage() {
  const router = useRouter();
  const { login, isLoading: authLoading, isAuthenticated, setUserIp } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [redirectInfo, setRedirectInfo] = useState<{ tab?: string; plan?: string; name?: string; mac?: string; router?: string; ip?: string }>({});
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordUsername, setForgotPasswordUsername] = useState("");
  const [recoveredPassword, setRecoveredPassword] = useState<string | null>(null);
  const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false);
  const [forgotPasswordError, setForgotPasswordError] = useState("");

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      router.push("/dashboard");
    }
  }, [isAuthenticated, authLoading, router]);

  // Handle URL parameters for redirect and WiFi info
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const redirect = urlParams.get('redirect');
    const plan = urlParams.get('plan');
    const name = urlParams.get('name');
    const mac = urlParams.get('mac');
    const routerParam = urlParams.get('router');
    const ip = urlParams.get('ip');
    
    if (redirect || plan || name || mac || routerParam || ip) {
      setRedirectInfo({ 
        tab: redirect || '', 
        plan: plan || '', 
        name: name || '',
        mac: mac || '',
        router: routerParam || '',
        ip: ip || ''
      });
      
      // Log captured WiFi info for debugging
      if (mac || routerParam || ip) {
        console.log('📱 WiFi Portal Info Captured:', { mac, router: routerParam, ip });
      }
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      // Determine if this is a WiFi login based on captured parameters
      const isWifiLogin = !!(redirectInfo.mac || redirectInfo.router || redirectInfo.ip);
      
      console.log('🔐 Login attempt:', { 
        username, 
        isWifiLogin, 
        hasMac: !!redirectInfo.mac, 
        hasRouter: !!redirectInfo.router,
        hasIp: !!redirectInfo.ip 
      });

      await login(username, password, redirectInfo.mac, redirectInfo.router, isWifiLogin);

      // Store password for silent authentication (used during payment)
      localStorage.setItem('wifiSessionPassword', password);
      localStorage.setItem('wifiSessionUsername', username);

      // Store IP if captured from WiFi portal
      if (redirectInfo.ip) {
        setUserIp(redirectInfo.ip);
      }

      // Check if user has active session
      try {
        const sessionStatus = await apiFetchGet<{ isActive: boolean; remainingTime?: number }>('/sessions/status');
        if (sessionStatus.isActive) {
          // User has active session, show connection status
          router.push('/dashboard?tab=connectivity');
          return;
        }
      } catch (sessionErr) {
        console.warn('Could not fetch session status:', sessionErr);
        // Continue to dashboard if session check fails
      }

      // For WiFi logins, check plan status and redirect accordingly
      if (isWifiLogin) {
        try {
          const userProfile = await apiFetchGet('/users/profile');
          const hasActivePlan = userProfile.isActive && userProfile.sessionExpiry && new Date(userProfile.sessionExpiry) > new Date();
          
          if (hasActivePlan) {
            // Active plan - redirect to connection status (WiFi should be working)
            console.log('✅ User has active plan, redirecting to connection status');
            router.push('/dashboard?tab=connectivity');
          } else {
            // No active plan - redirect to plans page for renewal
            console.log('⚠️ User has no active plan, redirecting to plans');
            router.push('/dashboard?tab=bundles');
          }
          return;
        } catch (profileErr) {
          console.warn('Could not fetch user profile:', profileErr);
          // Fall back to dashboard
        }
      }

      // Regular login - redirect based on URL parameters or default to dashboard
      if (redirectInfo.tab === 'bundles') {
        router.push('/dashboard?tab=bundles');
      } else {
        router.push('/dashboard');
      }
    } catch (err: any) {
      setError(err.message || "An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotPasswordLoading(true);
    setForgotPasswordError("");
    setRecoveredPassword(null);

    try {
      const response = await apiFetchPost<{ password: string }>('/auth/recover-password', {
        username: forgotPasswordUsername
      });
      setRecoveredPassword(response.password);
    } catch (err: any) {
      setForgotPasswordError(err.message || "Failed to recover password. Please try again.");
    } finally {
      setForgotPasswordLoading(false);
    }
  };

  const resetForgotPassword = () => {
    setShowForgotPassword(false);
    setForgotPasswordUsername("");
    setRecoveredPassword(null);
    setForgotPasswordError("");
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-amber-700" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4 py-8">
      <div className="max-w-md w-full">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <Satellite className="h-8 w-8 text-amber-700 animate-pulse" />
            <span className="text-2xl font-bold text-gray-900">Splendid StarLink</span>
          </div>
          <h2 className="text-3xl font-bold text-gray-900 animate-fade-in">Welcome Back</h2>
          <p className="text-gray-700 animate-fade-in animation-delay-200">Sign in to your Splendid StarLink account</p>
        </div>

        {/* Login Form */}
        <div className="bg-white rounded-lg p-8 border border-amber-900/20 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-500/20 border border-red-500 text-red-300 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            {redirectInfo.router && (
              <div className="bg-blue-500/10 border border-blue-500/30 text-blue-700 px-4 py-3 rounded-lg text-sm">
                🛰️ Connected to: <strong>{redirectInfo.router}</strong>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Username</label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-5 w-5 text-gray-700" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-10 pr-3 py-3 bg-white border border-amber-900/20 rounded-lg text-gray-900 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  placeholder="Enter your username"
                  required
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">Password</label>
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(true)}
                  className="text-sm text-amber-600 hover:text-amber-700 font-medium transition"
                >
                  Forgot Password?
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-5 w-5 text-gray-700" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-3 bg-white border border-amber-900/20 rounded-lg text-gray-900 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  placeholder="Enter your password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-gray-700 hover:text-gray-900 transition"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-amber-700 hover:bg-amber-800 text-white font-semibold py-3 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-600">
              Don't have an account?{" "}
              <Link href="/auth/signup" className="text-gray-700 hover:text-gray-900 font-medium transition cursor-pointer">
                Sign up
              </Link>
            </p>
          </div>
        </div>

        {/* Back to Home */}
        <div className="mt-8 text-center">
          <Link href="/" className="text-gray-400 hover:text-white transition inline-flex items-center">
            ← Back to Home
          </Link>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotPassword && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <Key className="h-5 w-5 mr-2 text-amber-600" />
                Password Recovery
              </h3>
              <button
                onClick={resetForgotPassword}
                className="text-gray-400 hover:text-gray-600 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mb-4">
              <p className="text-sm text-gray-600">
                Enter your username to recover your password. You can only change your password from your account dashboard.
              </p>
            </div>

            {recoveredPassword ? (
              <div className="space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="font-semibold text-green-800">Password Recovered</span>
                  </div>
                  <p className="text-green-700 mb-2">Your current password is:</p>
                  <div className="bg-white border border-green-300 rounded px-3 py-2 font-mono text-green-800">
                    {recoveredPassword}
                  </div>
                  <p className="text-sm text-green-600 mt-2">
                    Please save this password securely. To change it, go to your dashboard Account settings.
                  </p>
                </div>
                <div className="flex space-x-3">
                  <button
                    onClick={resetForgotPassword}
                    className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-4 rounded-lg transition"
                  >
                    Close
                  </button>
                  <Link
                    href="/dashboard?tab=account"
                    className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-medium py-2 px-4 rounded-lg transition text-center"
                  >
                    Go to Account Settings
                  </Link>
                </div>
              </div>
            ) : (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                {forgotPasswordError && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                    {forgotPasswordError}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Username</label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-5 w-5 text-gray-700" />
                    <input
                      type="text"
                      value={forgotPasswordUsername}
                      onChange={(e) => setForgotPasswordUsername(e.target.value)}
                      className="w-full pl-10 pr-3 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-amber-500"
                      placeholder="Enter your username"
                      required
                    />
                  </div>
                </div>

                <div className="flex space-x-3">
                  <button
                    type="button"
                    onClick={resetForgotPassword}
                    className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-4 rounded-lg transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={forgotPasswordLoading}
                    className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-medium py-2 px-4 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                  >
                    {forgotPasswordLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Recovering...
                      </>
                    ) : (
                      'Recover Password'
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
