"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
  Satellite, 
  CreditCard, 
  Activity, 
  Wifi, 
  Globe, 
  Download, 
  Upload,
  Clock,
  CheckCircle,
  AlertTriangle,
  User,
  LogOut,
  Menu,
  X,
  Gift,
  ShoppingBag,
  Loader2,
  RefreshCw
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { apiFetchGet, apiFetchPost } from "@/lib/api-client";
import { PaymentStatusMonitor } from "@/components/PaymentStatusMonitor";

interface Plan {
  _id: string;
  name: string;
  price: number;
  duration: number;
}

interface SessionData {
  isActive: boolean;
  remainingTime?: number;
}

interface PurchasedBundle {
  plan: string;
  purchasedAt: Date;
  amount: number;
  duration: number;
}

interface Activity {
  id: string;
  action: string;
  category: string;
  description: string;
  status: 'success' | 'failed' | 'pending' | 'warning';
  timestamp: Date;
}

interface BillingData {
  totalInvoices: number;
  totalAmountSpent: number;
  invoices: Array<{
    id: string;
    planName: string;
    amount: number;
    status: string;
    purchaseDate: Date;
    isGift?: boolean;
    recipientUsername?: string;
  }>;
}

interface ConnectionMetrics {
  isConnected: boolean;
  metrics: {
    downloadSpeed: number;
    uploadSpeed: number;
    latency: number;
    signalStrength: number;
    connectionQuality: string;
    timestamp: Date;
  };
  status: string;
}

interface ActivityStats {
  successfulActionsThisMonth: number;
  failedActionsThisMonth: number;
  paymentsThisMonth: number;
  hoursServiceActiveThisMonth: number;
  monthStart: Date;
  monthEnd: Date;
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, isLoading: authLoading, isAuthenticated, logout, macAddress, routerIdentity } = useAuth();
  const { addToast } = useToast();
  
  const [activeTab, setActiveTab] = useState("overview");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(false);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [showPaymentForm, setShowPaymentForm] = useState<string | null>(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [activePlan, setActivePlan] = useState<PurchasedBundle | null>(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [giftRecipientUsername, setGiftRecipientUsername] = useState('');
  const [giftRecipientPassword, setGiftRecipientPassword] = useState('');
  const [giftPhoneNumber, setGiftPhoneNumber] = useState('');
  const [selectedGiftPlan, setSelectedGiftPlan] = useState<string | null>(null);
  const [sendingGift, setSendingGift] = useState(false);
  const [recentActivities, setRecentActivities] = useState<Activity[]>([]);
  const [billingData, setBillingData] = useState<BillingData | null>(null);
  const [connectionMetrics, setConnectionMetrics] = useState<ConnectionMetrics | null>(null);
  const [activitiesLoading, setActivitiesLoading] = useState(true);
  const [billingLoading, setBillingLoading] = useState(true);
  const [metricsLoading, setMetricsLoading] = useState(true);
  const [activityStats, setActivityStats] = useState<ActivityStats | null>(null);
  const [activityStatsLoading, setActivityStatsLoading] = useState(true);
  const [giftPasswordMode, setGiftPasswordMode] = useState<'generate' | 'manual'>('generate');
  const [activeTransactionId, setActiveTransactionId] = useState<string | null>(null);
  const [activePaymentVariant, setActivePaymentVariant] = useState<'bundle' | 'gift' | null>(null);
  const [activeGiftDetails, setActiveGiftDetails] = useState<{ recipientUsername: string; recipientPassword: string } | null>(null);
  const [activePlanDuration, setActivePlanDuration] = useState<number | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(5000); // 5 seconds

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/auth/login");
    }
  }, [isAuthenticated, authLoading, router]);

  // Capture MikroTik redirect parameters from the URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const linkLogin = params.get('link-login');
    const linkOrig = params.get('link-orig');

    if (linkLogin) localStorage.setItem('wifiLinkLogin', linkLogin);
    if (linkOrig) localStorage.setItem('wifiLinkOrig', linkOrig);
  }, []);

  // Fetch session status
  useEffect(() => {
    const fetchSessionStatus = async () => {
      if (!isAuthenticated || !user?.userId) {
        return;
      }

      try {
        setSessionLoading(true);
        const status = await apiFetchGet<SessionData>('/sessions/status');
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
        setSessionLoading(false);
      }
    };

    fetchSessionStatus();

    // Set up auto-refresh if enabled
    if (autoRefreshEnabled && sessionData?.isActive) {
      const interval = setInterval(fetchSessionStatus, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, user?.userId, autoRefreshEnabled, refreshInterval, sessionData?.isActive]);

  // Helper function to map price to plan name
  const getPlanName = (price: number | string): string => {
    const priceNum = typeof price === 'string' ? parseInt(price) : price;
    const planMap: Record<number, string> = {
      100: "Basic",
      200: "Standard",
      300: "Flex",
      500: "Premium"
    };
    return planMap[priceNum] || `Plan ${priceNum}`;
  };

  // Format remaining time
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

  // Handle refresh session status
  const handleRefresh = async () => {
    try {
      setSessionLoading(true);
      const status = await apiFetchGet<SessionData>('/sessions/status');
      setSessionData(status);
      addToast('✅ Connection status updated', 'success', 2000);
    } catch (err) {
      addToast('Failed to refresh connection status', 'error');
    } finally {
      setSessionLoading(false);
    }
  };

  // Fetch recent activities, billing, and metrics data
  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!isAuthenticated || !user?.userId) {
        return;
      }

      try {
        // Fetch recent activities
        setActivitiesLoading(true);
        const activitiesRes = await apiFetchGet<any>('/activities/recent?page=1&pageSize=5');
        if (activitiesRes?.activities) {
          setRecentActivities(activitiesRes.activities);
        }
        setActivitiesLoading(false);

        // Fetch activity stats
        setActivityStatsLoading(true);
        const statsRes = await apiFetchGet<ActivityStats>('/activities/stats');
        if (statsRes) {
          setActivityStats(statsRes);
        }
        setActivityStatsLoading(false);

        // Fetch billing data
        setBillingLoading(true);
        const billingRes = await apiFetchGet<BillingData>('/user/billing');
        if (billingRes) {
          setBillingData(billingRes);
        }
        setBillingLoading(false);

        // Fetch connection metrics
        setMetricsLoading(true);
        const metricsRes = await apiFetchGet<ConnectionMetrics>('/connection/metrics');
        if (metricsRes) {
          setConnectionMetrics(metricsRes);
        }
        setMetricsLoading(false);
      } catch (err) {
        console.error('Failed to fetch dashboard data:', err);
        setActivitiesLoading(false);
        setActivityStatsLoading(false);
        setBillingLoading(false);
        setMetricsLoading(false);
      }
    };

    if (!authLoading && isAuthenticated) {
      fetchDashboardData();
    }
  }, [isAuthenticated, authLoading, user?.userId]);

  // Fetch session and user plan data
  useEffect(() => {
    const fetchSessionData = async () => {
      if (!isAuthenticated || !user?.userId) {
        return;
      }
      try {
        setDataLoading(true);
        // Fetch session data for isActive status
        const sessionRes = await apiFetchGet<SessionData>('/sessions/status');
        setSessionData(sessionRes);
        
        // Fetch user's billing data (invoices/active plans)
        try {
          const billingRes = await apiFetchGet<BillingData>('/user/billing');
          if (billingRes && billingRes.invoices && billingRes.invoices.length > 0) {
            // Find the most recent invoice that's still active (based on purchaseDate and duration)
            const now = new Date();
            const activeInvoices = billingRes.invoices.filter((invoice) => {
              const purchaseDate = new Date(invoice.purchaseDate);
              // Assuming invoices have duration info, add to purchase date to get expiry
              // For now, we'll just show the most recent one if it looks recent
              const daysSincePurchase = (now.getTime() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24);
              return daysSincePurchase < 365; // Assume plans are valid for up to a year
            });
            
            if (activeInvoices.length > 0) {
              // Get the most recent one
              const mostRecent = activeInvoices.reduce((prev, current) => 
                new Date(current.purchaseDate) > new Date(prev.purchaseDate) ? current : prev
              );
              
              setActivePlan({
                plan: mostRecent.planName,
                purchasedAt: new Date(mostRecent.purchaseDate),
                amount: mostRecent.amount,
                duration: 0, // Duration would come from the plan details, defaulting to 0
              });
              console.log('✅ Active plan loaded:', mostRecent.planName);
            } else {
              setActivePlan(null);
              console.log('ℹ️ No active plans found');
            }
          } else {
            setActivePlan(null);
            console.log('ℹ️ No billing history found');
          }
        } catch (billingErr) {
          console.warn('Failed to fetch billing data:', billingErr);
          setActivePlan(null);
        }
      } catch (err) {
        console.error('Failed to fetch session data:', err);
        setSessionData({ isActive: false });
        setActivePlan(null);
      } finally {
        setDataLoading(false);
      }
    };

    if (!authLoading && isAuthenticated) {
      fetchSessionData();
    }
  }, [isAuthenticated, authLoading, user?.userId]);

  // Handle URL parameters for initial tab
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tab = urlParams.get('tab');
    if (tab && ['overview', 'connectivity', 'bundles', 'gift', 'billing'].includes(tab)) {
      setActiveTab(tab);
    }
  }, []);

  // Fetch plans from backend with token
  useEffect(() => {
    const fetchPlans = async () => {
      try {
        setLoading(true);
        const data = await apiFetchGet<Plan[]>('/plans');
        setPlans(data || []);
      } catch (err) {
        console.error('Failed to fetch plans:', err);
      } finally {
        setLoading(false);
      }
    };

    if (activeTab === "bundles" || activeTab === "gift") {
      fetchPlans();
    }
  }, [activeTab]);

  // Handle plan purchase
  const handlePurchase = async (planId: string) => {
    if (!isAuthenticated) {
      router.push('/auth/login');
      return;
    }
    
    // Show payment form for this plan
    setShowPaymentForm(planId);
  };

  // Handle payment submission
  const handlePaymentSubmit = async (planId: string) => {
    if (!phoneNumber.trim()) {
      addToast('Please enter your phone number', 'warning');
      return;
    }

    try {
      setPurchasing(planId);
      
      console.log('🔄 Initiating payment with WiFi info:', { macAddress, routerIdentity, user: user?.username });
      
      const paymentPayload: any = {
        planId,
        email: user?.username + '@splendidstarlink.com',
        phone: phoneNumber,
        externalId: Date.now().toString(),
        name: user?.username || 'User',
      };

      // Include MAC and router info if available (from WiFi redirect)
      if (macAddress) {
        paymentPayload.macAddress = macAddress;
        console.log('✅ MAC address included in payment:', macAddress);
      } else {
        console.warn('⚠️ MAC address is NULL - WiFi redirect may have failed');
      }
      
      if (routerIdentity) {
        paymentPayload.routerIdentity = routerIdentity;
        console.log('✅ Router identity included in payment:', routerIdentity);
      } else {
        console.warn('⚠️ Router identity is NULL');
      }

      // Capture user's local IP from localStorage (set by AuthContext or connection status)
      const userIp = localStorage.getItem('userIp');
      if (userIp) {
        paymentPayload.userIp = userIp;
        console.log('✅ User IP included in payment:', userIp);
      } else {
        console.warn('⚠️ User IP not found in localStorage - silent login may not work');
      }

      const password = localStorage.getItem('wifiSessionPassword');
      if (password) {
        paymentPayload.password = password;
        console.log('✅ Password included in payment for silent login');
      } else {
        console.warn('⚠️ Password not found in localStorage - user may need manual login');
      }

      console.log('📤 Sending payment payload:', paymentPayload);
      const response = await apiFetchPost('/payments/initiate', paymentPayload);
      
      const selectedPlan = plans.find(p => p._id === planId);
      const planName = selectedPlan?.name || 'Plan';
      const planDuration = selectedPlan?.duration || 24;

      addToast(
        `✅ Payment initiated!\n\n` +
        `Plan: ${planName}\n` +
        `Duration: ${planDuration} hours\n` +
        `Transaction ID: ${response.transId}\n\n` +
        `Complete payment on your mobile device.`,
        'success',
        8000
      );

      // Set transaction ID to trigger PaymentStatusMonitor
      setActivePaymentVariant('bundle');
      setActiveGiftDetails(null);
      setActivePlanDuration(planDuration);
      setActiveTransactionId(response.transId);
      
      setShowPaymentForm(null);
      setPhoneNumber('');
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Payment failed';
      addToast(errorMessage, 'error');
    } finally {
      setPurchasing(null);
    }
  };

  // Generate a random password for gift recipients
  const generateRandomPassword = (): string => {
    const length = 10;
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return password;
  };

  // Handle gift submission
  const handleGiftSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!giftRecipientUsername.trim()) {
      addToast('Please enter recipient username', 'warning');
      return;
    }
    if (!selectedGiftPlan) {
      addToast('Please select a plan to gift', 'warning');
      return;
    }
    if (!giftPhoneNumber.trim()) {
      addToast('Please enter your phone number for payment', 'warning');
      return;
    }
    
    // Validate password based on mode
    if (giftPasswordMode === 'manual') {
      if (!giftRecipientPassword.trim() || giftRecipientPassword.length < 6) {
        addToast('Password must be at least 6 characters', 'warning');
        return;
      }
    }

    try {
      setSendingGift(true);
      
      // Determine password based on mode
      let recipientPassword = giftRecipientPassword;
      if (giftPasswordMode === 'generate') {
        recipientPassword = generateRandomPassword();
        setGiftRecipientPassword(recipientPassword);
      }
      
      // Store the recipient password for the modal to display
      localStorage.setItem('wifiSessionPassword', recipientPassword);
      
      const response = await apiFetchPost('/payments/initiate', {
        planId: selectedGiftPlan,
        email: giftRecipientUsername + '@splendidstarlink.com',
        phone: giftPhoneNumber,
        externalId: Date.now().toString(),
        name: giftRecipientUsername,
        password: recipientPassword,
        isGift: true,
        recipientUsername: giftRecipientUsername,
        userIp: localStorage.getItem('wifiIpAddress') || undefined,
        // Include WiFi context for gift payments
        macAddress: macAddress,
        routerIdentity: routerIdentity,
      });

      const selectedPlan = plans.find(p => p._id === selectedGiftPlan);
      const planDuration = selectedPlan?.duration || 24;
      
      addToast(
        `🎁 Gift successfully sent to ${giftRecipientUsername}!\n\n` +
        `Login Credentials:\n` +
        `Username: ${giftRecipientUsername}\n` +
        `Password: ${recipientPassword}\n\n` +
        `Plan: ${planDuration} hours access\n` +
        `Transaction ID: ${response.transId}\n\n` +
        `${giftPasswordMode === 'generate' 
          ? 'A secure password was automatically generated.' 
          : 'Please share the password you set with the recipient.'}` +
        `\n\nComplete payment on your mobile device. Gift will activate immediately for the recipient.`,
        'success',
        10000
      );
      
      // Set transaction ID to trigger PaymentStatusMonitor
      setActivePaymentVariant('gift');
      setActiveGiftDetails({ recipientUsername: giftRecipientUsername, recipientPassword });
      setActivePlanDuration(planDuration);
      setActiveTransactionId(response.transId);
      
      // Reset form
      setGiftRecipientUsername('');
      setGiftRecipientPassword('');
      setGiftPhoneNumber('');
      setSelectedGiftPlan(null);
      setGiftPasswordMode('generate');

      // Switch to connectivity tab after 3 seconds (but don't redirect for gifts)
      setTimeout(() => {
        setActiveTab('connectivity');
      }, 3000);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Gift failed';
      addToast(errorMessage, 'error');
    } finally {
      setSendingGift(false);
    }
  };

  // Handle logout
  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-amber-700" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  // Format bytes to human-readable string
  function formatBytes(bytes?: number): string {
    if (bytes === undefined || bytes === null) return 'N/A';
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  const connectionStats = {
    downloadSpeed: connectionMetrics?.metrics?.downloadSpeed || 0,
    uploadSpeed: connectionMetrics?.metrics?.uploadSpeed || 0,
    latency: connectionMetrics?.metrics?.latency || 0,
    uptime: 99.9, // TODO: Replace with real uptime if available
    dataUsed: 'N/A', // Data usage tracking available in metrics
    dataLimit: 'Unlimited', // No hard data limit for active plans
  };

  const menuItems = [
    { id: "overview", label: "Overview", icon: Activity },
    { id: "connectivity", label: "Connectivity", icon: Wifi },
    { id: "bundles", label: "Browse Bundles", icon: ShoppingBag },
    { id: "gift", label: "Buy for Someone", icon: Gift },
    { id: "billing", label: "Billing", icon: CreditCard }
  ];

  const renderContent = () => {
    switch (activeTab) {
      case "overview":
        return (
          <div className="space-y-6">
            {/* Welcome Section */}
            <div className="bg-white rounded-lg p-6 border border-amber-900/20 shadow-sm">
              <h2 className="text-2xl font-bold mb-4 text-amber-900">Welcome back, {user?.username}!</h2>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="bg-amber-50 rounded-lg p-4 border border-amber-900/20">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-amber-700">Current Plan</span>
                    {activePlan ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : (
                      <AlertTriangle className="h-5 w-5 text-gray-400" />
                    )}
                  </div>
                  <div className="text-xl font-bold text-amber-900">
                    {activePlan ? getPlanName(activePlan.amount) : "No plan activated"}
                  </div>
                  <div className="text-sm text-amber-600">
                    {activePlan 
                      ? `Active since ${new Date(activePlan.purchasedAt).toLocaleDateString()}`
                      : "Activate a plan to start"}
                  </div>
                </div>
                <div className="bg-amber-50 rounded-lg p-4 border border-amber-900/20">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-amber-700">Service Status</span>
                    {sessionData?.isActive ? (
                      <Wifi className="h-5 w-5 text-green-500" />
                    ) : (
                      <AlertTriangle className="h-5 w-5 text-red-500" />
                    )}
                  </div>
                  <div className={`text-xl font-bold ${sessionData?.isActive ? 'text-green-500' : 'text-red-500'}`}>
                    {sessionData?.isActive ? "Online" : "Offline"}
                  </div>
                  <div className="text-sm text-amber-600">
                    {sessionData?.isActive ? "Excellent connection" : "No active session"}
                  </div>
                </div>
                <div className="bg-amber-50 rounded-lg p-4 border border-amber-900/20">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-amber-700">Uptime This Month</span>
                    <Clock className="h-5 w-5 text-orange-500" />
                  </div>
                  {activityStatsLoading ? (
                    <div className="text-xl font-bold text-amber-900">Loading...</div>
                  ) : activityStats ? (
                    <>
                      <div className="text-xl font-bold text-amber-900">
                        {activityStats.successfulActionsThisMonth + activityStats.failedActionsThisMonth > 0
                          ? ((activityStats.successfulActionsThisMonth / (activityStats.successfulActionsThisMonth + activityStats.failedActionsThisMonth)) * 100).toFixed(1)
                          : 100}%
                      </div>
                      <div className="text-sm text-amber-600">
                        {activityStats.hoursServiceActiveThisMonth > 0 
                          ? `${activityStats.hoursServiceActiveThisMonth} hours active` 
                          : 'No service yet'}
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="text-xl font-bold text-amber-900">--</div>
                      <div className="text-sm text-amber-600">Unable to load</div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-lg p-6 border border-amber-900/20 shadow-sm">
              <h3 className="text-xl font-bold mb-4 text-amber-900">Quick Actions</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <button 
                  onClick={() => {
                    setActiveTab("bundles");
                    router.push("/dashboard?tab=bundles");
                  }}
                  className="bg-amber-700 hover:bg-amber-800 p-4 rounded-lg cursor-pointer text-center transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-amber-500/25"
                >
                  <ShoppingBag className="h-8 w-8 text-white mx-auto mb-2" />
                  <div className="text-white font-semibold">Browse Bundles</div>
                  <div className="text-amber-100 text-sm">Buy more data packages</div>
                </button>
                <button 
                  onClick={() => {
                    setActiveTab("gift");
                    router.push("/dashboard?tab=gift");
                  }}
                  className="bg-green-600 hover:bg-green-700 cursor-pointer p-4 rounded-lg text-center transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-green-500/25"
                >
                  <Gift className="h-8 w-8 text-white mx-auto mb-2" />
                  <div className="text-white font-semibold">Buy for Someone</div>
                  <div className="text-green-100 text-sm">Gift internet access</div>
                </button>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-lg p-6 border border-amber-900/20 shadow-sm">
              <h3 className="text-xl font-bold mb-4 text-amber-900">Recent Activity</h3>
              {activitiesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-amber-700 mr-2" />
                  <span className="text-amber-700">Loading activities...</span>
                </div>
              ) : recentActivities && recentActivities.length > 0 ? (
                <div className="space-y-3">
                  {recentActivities.map((activity) => (
                    <div key={activity.id} className="flex items-center justify-between p-3 bg-amber-50 rounded-lg border border-amber-900/20">
                      <div className="flex items-center space-x-3">
                        {activity.status === "success" ? (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        ) : activity.status === "failed" ? (
                          <AlertTriangle className="h-5 w-5 text-red-500" />
                        ) : (
                          <AlertTriangle className="h-5 w-5 text-yellow-500" />
                        )}
                        <div>
                          <div className="font-medium text-amber-900">{activity.description}</div>
                          <div className="text-sm text-amber-600">{new Date(activity.timestamp).toLocaleDateString()}</div>
                        </div>
                      </div>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        activity.status === "success" 
                          ? "bg-green-500/20 text-green-400" 
                          : activity.status === "failed"
                          ? "bg-red-500/20 text-red-400"
                          : "bg-yellow-500/20 text-yellow-400"
                      }`}>
                        {activity.status}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 text-center text-amber-600">
                  <p>No activities yet</p>
                </div>
              )}
            </div>
          </div>
        );

      case "connectivity":
        return (
          <div className="space-y-6">
            <div className="bg-white rounded-lg p-6 border border-amber-900/20 shadow-sm">
              <h2 className="text-2xl font-bold mb-6 text-amber-900">Connection Status</h2>

              {sessionLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-amber-700" />
                  <p className="text-amber-700 font-medium">Checking your connection...</p>
                </div>
              ) : (
                <div className="max-w-md mx-auto">
                  {/* Status Card */}
                  <div className="bg-white rounded-lg p-8 border border-amber-900/20 shadow-lg text-center mb-6">
                    {sessionData?.isActive ? (
                      <>
                        <div className="flex justify-center mb-6">
                          <div className="relative">
                            <div className="absolute inset-0 bg-green-500 rounded-full opacity-10 animate-pulse"></div>
                            <div className="relative bg-gradient-to-br from-green-400 to-green-600 rounded-full p-6">
                              <CheckCircle className="h-16 w-16 text-white" />
                            </div>
                          </div>
                        </div>

                        <h3 className="text-3xl font-bold text-green-600 mb-3">Connected!</h3>
                        <p className="text-xl text-amber-700 mb-6">Your WiFi connection is active and ready to use.</p>

                        {/* Connection Details */}
                        <div className="bg-green-50 rounded-lg p-6 mb-6 border border-green-200">
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
                                {formatRemainingTime(sessionData.remainingTime || 0)}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Instructions */}
                        <div className="bg-amber-50 rounded-lg p-6 mb-6 border border-amber-200">
                          <h4 className="text-lg font-semibold text-amber-900 mb-3">📱 You're All Set!</h4>
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

                        <h3 className="text-3xl font-bold text-red-600 mb-3">No Connection</h3>
                        <p className="text-xl text-amber-700 mb-6">Your WiFi connection is not currently active.</p>

                        {/* Troubleshooting */}
                        <div className="bg-red-50 rounded-lg p-6 mb-6 border border-red-200">
                          <h4 className="text-lg font-semibold text-red-900 mb-3">What to do:</h4>
                          <ul className="text-left space-y-2 text-red-800">
                            <li className="flex items-start space-x-2">
                              <span className="text-red-600 font-bold mt-1">•</span>
                              <span>Purchase a plan to activate your connection</span>
                            </li>
                            <li className="flex items-start space-x-2">
                              <span className="text-red-600 font-bold mt-1">•</span>
                              <span>Check the Bundles tab for available plans</span>
                            </li>
                            <li className="flex items-start space-x-2">
                              <span className="text-red-600 font-bold mt-1">•</span>
                              <span>Make sure your payment was completed</span>
                            </li>
                          </ul>
                        </div>

                        {/* Buy Plan Button */}
                        <button
                          onClick={() => setActiveTab('bundles')}
                          className="w-full bg-amber-700 hover:bg-amber-800 text-white font-semibold py-3 rounded-lg transition mb-4"
                        >
                          🛒 Browse Plans
                        </button>
                      </>
                    )}

                    {/* Refresh Button */}
                    <button
                      onClick={handleRefresh}
                      disabled={sessionLoading}
                      className="w-full flex items-center justify-center space-x-2 bg-amber-100 hover:bg-amber-200 text-amber-900 font-semibold py-3 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <RefreshCw className={`h-5 w-5 ${sessionLoading ? 'animate-spin' : ''}`} />
                      <span>{sessionLoading ? 'Checking...' : 'Refresh Status'}</span>
                    </button>
                  </div>

                  {/* Auto-refresh Toggle */}
                  {sessionData?.isActive && (
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
              )}
            </div>
          </div>
        );

      case "bundles":
        return (
          <div className="space-y-6">
            <div className="bg-white rounded-lg p-6 border border-amber-900/20 shadow-sm">
              <h2 className="text-2xl font-bold mb-4 text-amber-900">Browse Bundles</h2>
              
              {/* Payment Information */}
              <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-yellow-700 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-yellow-900 space-y-2">
                    <p className="font-semibold">4% Network Deduction: We deduct 4% to cover mobile network withdrawal charges and payment processing fees.</p>
                    <p>Pay once only — duplicate payments will not be refunded.</p>
                    <p>Processing takes 1–5 minutes. Your service activates automatically once approved.</p>
                  </div>
                </div>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-amber-700" />
                  <span className="ml-3 text-amber-700">Loading plans...</span>
                </div>
              ) : (
                <div className="grid md:grid-cols-3 gap-6">
                  {plans.map((plan) => (
                    <div key={plan._id} className="border border-amber-900/20 rounded-lg p-6 hover:border-amber-500 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-amber-500/10">
                      <h3 className="text-xl font-bold mb-2 text-amber-900">
                        {plan.name.includes('100 CFA') ? 'Basic' : 
                         plan.name.includes('200 CFA') ? 'Standard' : 'Premium'}
                      </h3>
                      <p className="text-2xl font-bold mb-4 text-amber-900">
                        {plan.price} FCFA<span className="text-lg text-amber-600"> / {plan.duration} hours</span>
                      </p>
                      <ul className="space-y-2 mb-4">
                        <li className="flex items-center text-amber-900">
                          <CheckCircle className="h-4 w-4 text-green-500 mr-2" /> {plan.duration} hours access
                        </li>
                        <li className="flex items-center text-amber-900">
                          <CheckCircle className="h-4 w-4 text-green-500 mr-2" /> High-speed connection
                        </li>
                        <li className="flex items-center text-amber-900">
                          <CheckCircle className="h-4 w-4 text-green-500 mr-2" /> 
                          {plan.name.includes('200') ? 'Priority support' : 
                           plan.name.includes('500') ? 'Premium support' : 'Standard support'}
                        </li>
                      </ul>
                      <button
                        onClick={() => handlePurchase(plan._id)}
                        disabled={purchasing === plan._id}
                        className="w-full bg-amber-700 hover:bg-amber-800 text-white py-2 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                      >
                        {purchasing === plan._id ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            Processing...
                          </>
                        ) : (
                          'Buy Now'
                        )}
                      </button>

                      {/* Payment Form */}
                      {showPaymentForm === plan._id && (
                        <div className="mt-4 p-4 bg-amber-50 border border-amber-900/20 rounded-lg">
                          <h4 className="font-semibold text-amber-900 mb-3">Enter Payment Details</h4>
                          <div className="space-y-3">
                            <div>
                              <label className="block text-sm font-medium text-amber-700 mb-1">Phone Number</label>
                              <input
                                type="tel"
                                value={phoneNumber}
                                onChange={(e) => setPhoneNumber(e.target.value)}
                                className="w-full p-3 bg-white border border-amber-900/20 rounded-lg text-amber-900 placeholder-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-500"
                                placeholder="Enter your phone number"
                              />
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => handlePaymentSubmit(plan._id)}
                                disabled={purchasing === plan._id}
                                className="flex-1 bg-amber-700 hover:bg-amber-800 text-white font-semibold py-2 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {purchasing === plan._id ? (
                                  <>
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                    Processing...
                                  </>
                                ) : (
                                  'Pay Now'
                                )}
                              </button>
                              <button
                                onClick={() => {
                                  setShowPaymentForm(null);
                                  setPhoneNumber('');
                                }}
                                className="px-4 py-2 border border-amber-900/20 rounded-lg text-amber-700 hover:border-amber-500 hover:bg-amber-50 transition"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );

      case "gift":
        return (
          <div className="space-y-6">
            <div className="bg-white rounded-lg p-6 border border-amber-900/20 shadow-sm">
              <h2 className="text-2xl font-bold mb-4 text-amber-900">Buy for Someone Else</h2>
              
              {/* Payment Information */}
              <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-yellow-700 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-yellow-900 space-y-2">
                    <p className="font-semibold">4% Network Deduction: We deduct 4% to cover mobile network withdrawal charges and payment processing fees.</p>
                    <p>Pay once only — duplicate payments will not be refunded.</p>
                    <p>Processing takes 1–5 minutes. Gift activates automatically for the recipient.</p>
                  </div>
                </div>
              </div>

              <form onSubmit={handleGiftSubmit} className="grid md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4 text-amber-900">Recipient Information</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-amber-700 mb-2">Recipient Username</label>
                      <input
                        type="text"
                        value={giftRecipientUsername}
                        onChange={(e) => setGiftRecipientUsername(e.target.value)}
                        className="w-full p-3 bg-amber-50 border border-amber-900/20 rounded-lg text-amber-900 placeholder-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-500"
                        placeholder="Enter recipient username"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-amber-700 mb-2">Your Phone Number</label>
                      <input
                        type="tel"
                        value={giftPhoneNumber}
                        onChange={(e) => setGiftPhoneNumber(e.target.value)}
                        className="w-full p-3 bg-amber-50 border border-amber-900/20 rounded-lg text-amber-900 placeholder-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-500"
                        placeholder="Enter your phone number for payment"
                        required
                      />
                    </div>
                    
                    {/* Password Mode Selection */}
                    <div className="pt-2 border-t border-amber-900/20">
                      <label className="block text-sm font-medium text-amber-700 mb-3">Recipient Password</label>
                      <div className="space-y-3">
                        <label className="flex items-center p-3 bg-white border border-amber-900/20 rounded-lg cursor-pointer hover:border-amber-500 transition">
                          <input 
                            type="radio" 
                            name="password-mode" 
                            value="generate"
                            checked={giftPasswordMode === 'generate'}
                            onChange={(e) => {
                              setGiftPasswordMode(e.target.value as 'generate' | 'manual');
                              setGiftRecipientPassword('');
                            }}
                            className="mr-3" 
                          />
                          <div>
                            <div className="font-medium text-amber-900">Auto-Generate</div>
                            <div className="text-xs text-amber-600">We'll create a secure password</div>
                          </div>
                        </label>
                        
                        <label className="flex items-center p-3 bg-white border border-amber-900/20 rounded-lg cursor-pointer hover:border-amber-500 transition">
                          <input 
                            type="radio" 
                            name="password-mode" 
                            value="manual"
                            checked={giftPasswordMode === 'manual'}
                            onChange={(e) => {
                              setGiftPasswordMode(e.target.value as 'generate' | 'manual');
                              setGiftRecipientPassword('');
                            }}
                            className="mr-3" 
                          />
                          <div>
                            <div className="font-medium text-amber-900">Set Manually</div>
                            <div className="text-xs text-amber-600">You choose the password</div>
                          </div>
                        </label>
                      </div>

                      {/* Manual Password Input */}
                      {giftPasswordMode === 'manual' && (
                        <div className="mt-3">
                          <input
                            type="text"
                            value={giftRecipientPassword}
                            onChange={(e) => setGiftRecipientPassword(e.target.value)}
                            className="w-full p-3 bg-amber-50 border border-amber-900/20 rounded-lg text-amber-900 placeholder-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-500"
                            placeholder="Enter password for recipient"
                            minLength={6}
                            required={giftPasswordMode === 'manual'}
                          />
                          <p className="text-xs text-amber-600 mt-2">Minimum 6 characters</p>
                        </div>
                      )}

                      {/* Auto-Generate Info */}
                      {giftPasswordMode === 'generate' && (
                        <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                          <p className="text-xs text-green-700">
                            ✓ A secure 10-character password will be generated and shown after sending the gift
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-4 text-amber-900">Select Package</h3>
                  <div className="space-y-3">
                    {loading ? (
                      <div className="text-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin mx-auto text-amber-700" />
                        <p className="text-amber-700 mt-2">Loading available packages...</p>
                      </div>
                    ) : (
                      plans.map((plan) => (
                        <label key={plan._id} className="flex items-center p-4 bg-amber-50 rounded-lg border border-amber-900/20 cursor-pointer hover:border-amber-500 transition">
                          <input 
                            type="radio" 
                            name="gift-package" 
                            value={plan._id}
                            checked={selectedGiftPlan === plan._id}
                            onChange={(e) => setSelectedGiftPlan(e.target.value)}
                            className="mr-3" 
                          />
                          <div className="flex-1">
                            <div className="font-medium text-amber-900">
                              {plan.name}
                            </div>
                            <div className="text-sm text-amber-600">
                              {plan.duration} hours access • {plan.price} FCFA
                            </div>
                          </div>
                        </label>
                      ))
                    )}
                  </div>
                </div>
                <div className="md:col-span-2 flex gap-4">
                  <button
                    type="submit"
                    disabled={sendingGift}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                  >
                    {sendingGift ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin mr-2" />
                        Sending Gift...
                      </>
                    ) : (
                      <>
                        <Gift className="h-5 w-5 mr-2" />
                        Send Gift
                      </>
                    )}
                  </button>
                  <button
                    type="reset"
                    onClick={() => {
                      setGiftRecipientUsername('');
                      setGiftRecipientPassword('');
                      setGiftPhoneNumber('');
                      setSelectedGiftPlan(null);
                      setGiftPasswordMode('generate');
                    }}
                    className="px-6 py-3 border border-amber-900/20 rounded-lg text-amber-700 hover:border-amber-500 hover:bg-amber-50 transition font-semibold"
                  >
                    Reset
                  </button>
                </div>
              </form>
            </div>
          </div>
        );

      case "billing":
        return (
          <div className="space-y-6">
            <div className="bg-white rounded-lg p-6 border border-amber-900/20 shadow-sm">
              <h2 className="text-2xl font-bold mb-6 text-amber-900">Billing Information</h2>
              
              {billingLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-amber-700 mr-2" />
                  <span className="text-amber-700">Loading billing information...</span>
                </div>
              ) : (
                <>
                  <div className="grid md:grid-cols-2 gap-6 mb-6">
                    <div>
                      <h3 className="text-lg font-semibold mb-4 text-amber-900">Current Plan</h3>
                      <div className="p-4 bg-amber-50 rounded-lg border border-amber-900/20">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-amber-700">Current Plan</span>
                          {activePlan ? (
                            <CheckCircle className="h-5 w-5 text-green-500" />
                          ) : (
                            <AlertTriangle className="h-5 w-5 text-gray-400" />
                          )}
                        </div>
                        <div className="text-xl font-bold text-amber-900">
                          {activePlan ? getPlanName(activePlan.amount) : "No plan activated"}
                        </div>
                        <div className="text-sm text-amber-600">
                          {activePlan 
                            ? `Next billing date: ${new Date(activePlan.purchasedAt).toLocaleDateString()}`
                            : "No active plan"}
                        </div>
                        <Link href="/plans" className="text-amber-400 hover:text-amber-900 transition cursor-pointer">
                          Browse plans →
                        </Link>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold mb-4 text-amber-900">Billing Summary</h3>
                      <div className="p-4 bg-amber-50 rounded-lg border border-amber-900/20">
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-amber-700">Total Invoices</span>
                            <span className="font-bold text-amber-900">{billingData?.totalInvoices || 0}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-amber-700">Total Spent</span>
                            <span className="font-bold text-amber-900">{billingData?.totalAmountSpent || 0} FCFA</span>
                          </div>
                          <div className="flex justify-between items-center pt-2 border-t border-amber-900/20">
                            <span className="text-amber-700">Account Status</span>
                            <span className="font-bold text-green-500">Active</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold mb-4 text-amber-900">Recent Invoices</h3>
                    {billingData?.invoices && billingData.invoices.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-amber-200">
                          <thead className="bg-amber-100">
                            <tr>
                              <th className="px-4 py-2 text-left text-xs font-semibold text-amber-700 uppercase tracking-wider">Plan</th>
                              <th className="px-4 py-2 text-left text-xs font-semibold text-amber-700 uppercase tracking-wider">Amount</th>
                              <th className="px-4 py-2 text-left text-xs font-semibold text-amber-700 uppercase tracking-wider">Date</th>
                              <th className="px-4 py-2 text-left text-xs font-semibold text-amber-700 uppercase tracking-wider">Status</th>
                              <th className="px-4 py-2 text-left text-xs font-semibold text-amber-700 uppercase tracking-wider">Gift?</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-amber-100">
                            {billingData.invoices.slice(0, 5).map((invoice) => (
                              <tr key={invoice.id}>
                                <td className="px-4 py-2 font-medium text-amber-900">{invoice.planName}</td>
                                <td className="px-4 py-2 font-bold text-amber-900">{invoice.amount} FCFA</td>
                                <td className="px-4 py-2 text-amber-700">{new Date(invoice.purchaseDate).toLocaleString()}</td>
                                <td className="px-4 py-2">
                                  {invoice.status === 'SUCCESSFUL' ? (
                                    <span className="inline-flex items-center px-2 py-1 rounded text-xs font-semibold bg-green-100 text-green-700">
                                      <CheckCircle className="h-4 w-4 mr-1" /> Successful
                                    </span>
                                  ) : invoice.status === 'FAILED' ? (
                                    <span className="inline-flex items-center px-2 py-1 rounded text-xs font-semibold bg-red-100 text-red-700">
                                      <AlertTriangle className="h-4 w-4 mr-1" /> Failed
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center px-2 py-1 rounded text-xs font-semibold bg-yellow-100 text-yellow-700">
                                      <AlertTriangle className="h-4 w-4 mr-1" /> {invoice.status.charAt(0) + invoice.status.slice(1).toLowerCase()}
                                    </span>
                                  )}
                                </td>
                                <td className="px-4 py-2">
                                  {invoice.isGift ? (
                                    <span className="inline-flex items-center px-2 py-1 rounded text-xs font-semibold bg-blue-100 text-blue-700">
                                      🎁 Gift{invoice.recipientUsername ? ` for ${invoice.recipientUsername}` : ''}
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center px-2 py-1 rounded text-xs font-semibold bg-gray-100 text-gray-700">No</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="p-4 text-center text-amber-600 bg-amber-50 rounded-lg border border-amber-900/20">
                        <p>No invoices yet</p>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-white text-amber-900">
      {/* Navigation */}
      <nav className="flex justify-between items-center px-4 md:px-6 py-3 md:py-4 border-b border-amber-900/20 bg-white">
        <Link href="/" className="flex items-center space-x-1 md:space-x-2">
          <Satellite className="h-6 md:h-8 w-6 md:w-8 text-amber-700" />
          <span className="text-base md:text-xl font-bold text-amber-900 hidden sm:inline">Splendid StarLink</span>
        </Link>
        <div className="flex items-center space-x-2 md:space-x-4">
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="md:hidden text-amber-700 hover:text-amber-900 transition p-2"
          >
            <Menu className="h-6 w-6" />
          </button>
          <button onClick={handleLogout} className="flex items-center space-x-1 md:space-x-2 text-amber-700 hover:text-amber-900 transition cursor-pointer text-sm md:text-base">
            <LogOut className="h-4 md:h-5 w-4 md:w-5" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </nav>

      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-amber-900/30 backdrop-blur-sm z-40 animate-fade-in"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Breadcrumbs */}
      <div className="px-6 py-3 border-b border-amber-900/20">
        <div className="flex items-center space-x-2 text-sm text-amber-700">
          <Link href="/" className="hover:text-amber-900 transition cursor-pointer">Home</Link>
          <span>/</span>
          <span className="text-amber-900">Dashboard</span>
          {activeTab !== "overview" && (
            <>
              <span>/</span>
              <span className="text-amber-900">
                {menuItems.find(item => item.id === activeTab)?.label}
              </span>
            </>
          )}
        </div>
      </div>

      <div className="flex gap-6">
        {/* Sidebar */}
        <aside className={`fixed md:static inset-y-0 left-0 z-50 w-64 bg-amber-800/95 min-h-screen border-r border-amber-900/50 transform transition-transform duration-300 ease-in-out ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}>
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Dashboard</h2>
              <button
                onClick={() => setIsSidebarOpen(false)}
                className="md:hidden text-amber-200 hover:text-white transition"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <nav className="space-y-2">
              {menuItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id);
                      setIsSidebarOpen(false);
                    }}
                    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition ${
                      activeTab === item.id
                        ? "bg-amber-700 text-white"
                        : "hover:bg-amber-700/50 text-amber-200"
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-6">
            {renderContent()}
          </div>
        </main>
      </div>

      {/* Payment Status Monitor Overlay */}
      {activeTransactionId && (
        <PaymentStatusMonitor
          transactionId={activeTransactionId}
          variant={activePaymentVariant || 'bundle'}
          planDuration={activePlanDuration ?? undefined}
          recipientUsername={activeGiftDetails?.recipientUsername}
          recipientPassword={activeGiftDetails?.recipientPassword}
          routerIdentity={routerIdentity ?? undefined}
          onPaymentSuccess={(data) => {
            console.log('✅ Payment successful, user activated:', data);
            if (activePaymentVariant === 'gift') {
              addToast('🎉 Gift payment successful! Your recipient can now log in.', 'success', 7000);
            } else {
              addToast('🎉 Payment successful! Redirecting to captive portal for login.', 'success', 5000);
            }
            // Don't unmount immediately - let the modal show and handle redirect or close
          }}
          onPaymentFailed={(error) => {
            const failureMessage = typeof error === 'string' && error.trim() !== '' ? error : 'Unknown payment error';
            console.error('❌ Payment failed:', failureMessage);
            addToast(`Payment failed: ${failureMessage}`, 'error');
            setActiveTransactionId(null); // Only unmount on failure
            setActivePaymentVariant(null);
            setActiveGiftDetails(null);
            setActivePlanDuration(null);
          }}
          onRedirect={() => {
            console.log('🔄 Payment monitor redirect/close complete, unmounting component');
            setActiveTransactionId(null); // Unmount after redirect or gift close
            setActivePaymentVariant(null);
            setActiveGiftDetails(null);
            setActivePlanDuration(null);
          }}
          onCancel={() => {
            addToast('Payment monitoring cancelled. Please retry if needed.', 'info');
            setActiveTransactionId(null);
            setActivePaymentVariant(null);
            setActiveGiftDetails(null);
            setActivePlanDuration(null);
          }}
        />
      )}
    </div>
  );
}
