"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
  Satellite, 
  CheckCircle, 
  AlertTriangle,
  Wifi,
  Clock,
  RefreshCw,
  Loader2,
  Home
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { apiFetchGet } from "@/lib/api-client";

interface SessionStatus {
  isActive: boolean;
  remainingTime?: number;
}

export default function ConnectionStatusPage() {
  const router = useRouter();
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const { addToast } = useToast();

  const [sessionData, setSessionData] = useState<SessionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(false); // Disabled auto-refresh
  const [refreshInterval, setRefreshInterval] = useState(5000); // 5 seconds

  // Redirect to dashboard connectivity tab
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      router.push('/dashboard?tab=connectivity');
    }
  }, [isAuthenticated, authLoading, router]);

  // Fetch session status
  useEffect(() => {
    const fetchSessionStatus = async () => {
      if (!isAuthenticated || !user?.userId) {
        return;
      }

      try {
        setLoading(true);
        const status = await apiFetchGet<SessionStatus>('/sessions/status');
        setSessionData(status);
        
        if (status.isActive) {
          console.log(`✅ Connection active! Time remaining: ${formatRemainingTime(status.remainingTime || 0)}`);
        } else {
          console.log(`⚠️ No active connection`);
        }
      } catch (err) {
        console.error('Failed to fetch session status:', err);
        addToast('Failed to fetch connection status', 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchSessionStatus();

    // Set up auto-refresh if enabled
    if (autoRefreshEnabled && sessionData?.isActive) {
      const interval = setInterval(fetchSessionStatus, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, user?.userId, autoRefreshEnabled, refreshInterval, sessionData?.isActive]);

  const formatRemainingTime = (ms: number): string => {
    if (ms <= 0) return "Expired";
    
    const seconds = Math.floor((ms / 1000) % 60);
    const minutes = Math.floor((ms / (1000 * 60)) % 60);
    const hours = Math.floor((ms / (1000 * 60 * 60)) % 24);
    const days = Math.floor(ms / (1000 * 60 * 60 * 24));

    if (days > 0) {
      return `${days}d ${hours}h`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    } else {
      return `${seconds}s`;
    }
  };

  const handleRefresh = async () => {
    try {
      setLoading(true);
      const status = await apiFetchGet<SessionStatus>('/sessions/status');
      setSessionData(status);
      addToast('✅ Connection status updated', 'success', 2000);
    } catch (err) {
      addToast('Failed to refresh connection status', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-amber-700" />
          <p className="text-amber-700 font-medium">Checking your connection...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const isConnected = sessionData?.isActive;
  const remainingTime = sessionData?.remainingTime || 0;

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white">
      {/* Navigation */}
      <nav className="flex justify-between items-center px-6 py-4 border-b border-amber-900/20 bg-white">
        <Link href="/" className="flex items-center space-x-2">
          <Satellite className="h-8 w-8 text-amber-700" />
          <span className="text-xl font-bold text-amber-900 hidden sm:inline">Splendid StarLink</span>
        </Link>
        <button
          onClick={() => router.push('/dashboard')}
          className="flex items-center space-x-2 bg-amber-700 hover:bg-amber-800 text-white font-semibold py-2 px-4 rounded-lg transition"
        >
          <Home className="h-5 w-5" />
          <span>Go to Dashboard</span>
        </button>
      </nav>

      {/* Connection Status Section */}
      <section className="px-6 py-20">
        <div className="max-w-md mx-auto">
          {/* Status Card */}
          <div className="bg-white rounded-lg p-12 border border-amber-900/20 shadow-lg text-center mb-8">
            {isConnected ? (
              <>
                <div className="flex justify-center mb-6">
                  <div className="relative">
                    <div className="absolute inset-0 bg-green-500 rounded-full opacity-10 animate-pulse"></div>
                    <div className="relative bg-gradient-to-br from-green-400 to-green-600 rounded-full p-6">
                      <CheckCircle className="h-16 w-16 text-white" />
                    </div>
                  </div>
                </div>

                <h1 className="text-4xl font-bold text-green-600 mb-3">Connected!</h1>
                <p className="text-xl text-amber-700 mb-8">Your WiFi connection is active and ready to use.</p>

                {/* Connection Details */}
                <div className="bg-green-50 rounded-lg p-6 mb-8 border border-green-200">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-amber-700 font-medium">Status</span>
                      <span className="flex items-center space-x-2">
                        <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
                        <span className="text-green-600 font-bold">Active</span>
                      </span>
                    </div>

                    <div className="h-px bg-green-200"></div>

                    <div className="flex items-center justify-between">
                      <span className="text-amber-700 font-medium">Time Remaining</span>
                      <span className="text-2xl font-bold text-amber-900">
                        {formatRemainingTime(remainingTime)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Instructions */}
                <div className="bg-amber-50 rounded-lg p-6 mb-8 border border-amber-200">
                  <h3 className="text-lg font-semibold text-amber-900 mb-3">📱 You're All Set!</h3>
                  <ul className="text-left space-y-2 text-amber-800">
                    <li className="flex items-start space-x-2">
                      <span className="text-green-600 font-bold mt-1">✓</span>
                      <span>Open WiFi settings on your device</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <span className="text-green-600 font-bold mt-1">✓</span>
                      <span>Look for "Starlink-WiFi" network</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <span className="text-green-600 font-bold mt-1">✓</span>
                      <span>No login needed - you're auto-connected!</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <span className="text-green-600 font-bold mt-1">✓</span>
                      <span>Start browsing and enjoy fast internet</span>
                    </li>
                  </ul>
                </div>
              </>
            ) : (
              <>
                <div className="flex justify-center mb-6">
                  <div className="bg-red-50 rounded-full p-6">
                    <AlertTriangle className="h-16 w-16 text-red-600" />
                  </div>
                </div>

                <h1 className="text-4xl font-bold text-red-600 mb-3">No Connection</h1>
                <p className="text-xl text-amber-700 mb-8">Your WiFi connection is not currently active.</p>

                {/* Troubleshooting */}
                <div className="bg-red-50 rounded-lg p-6 mb-8 border border-red-200">
                  <h3 className="text-lg font-semibold text-red-900 mb-3">What to do:</h3>
                  <ul className="text-left space-y-2 text-red-800">
                    <li className="flex items-start space-x-2">
                      <span className="text-red-600 font-bold mt-1">•</span>
                      <span>Purchase a plan to activate your connection</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <span className="text-red-600 font-bold mt-1">•</span>
                      <span>Check the Bundles tab in your dashboard</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <span className="text-red-600 font-bold mt-1">•</span>
                      <span>Make sure your payment was completed</span>
                    </li>
                  </ul>
                </div>

                {/* Buy Plan Button */}
                <button
                  onClick={() => router.push('/dashboard?tab=bundles')}
                  className="w-full bg-amber-700 hover:bg-amber-800 text-white font-semibold py-3 rounded-lg transition mb-4"
                >
                  🛒 Browse Plans
                </button>
              </>
            )}

            {/* Refresh Button */}
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="w-full flex items-center justify-center space-x-2 bg-amber-100 hover:bg-amber-200 text-amber-900 font-semibold py-3 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
              <span>{loading ? 'Checking...' : 'Refresh Status'}</span>
            </button>
          </div>

          {/* Auto-refresh Toggle */}
          {isConnected && (
            <div className="bg-white rounded-lg p-4 border border-amber-900/20 shadow">
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoRefreshEnabled}
                  onChange={(e) => setAutoRefreshEnabled(e.target.checked)}
                  className="w-4 h-4 text-amber-700 rounded"
                />
                <span className="text-amber-900">
                  Auto-refresh every {refreshInterval / 1000}s
                  {autoRefreshEnabled && <span className="animate-pulse"> ✓</span>}
                </span>
              </label>
            </div>
          )}
        </div>
      </section>

      {/* Full Dashboard Access */}
      <section className="px-6 py-12 bg-amber-50">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl font-bold text-amber-900 mb-3">Want more details?</h2>
          <p className="text-amber-700 mb-6">Visit your dashboard for complete connection statistics and usage information.</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="bg-amber-700 hover:bg-amber-800 text-white font-semibold py-3 px-8 rounded-lg transition inline-flex items-center space-x-2"
          >
            <Home className="h-5 w-5" />
            <span>Go to Dashboard</span>
          </button>
        </div>
      </section>
    </div>
  );
}
