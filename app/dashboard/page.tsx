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
  Loader2
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { apiFetchGet, apiFetchPost } from "@/lib/api-client";

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

export default function DashboardPage() {
  const router = useRouter();
  const { user, isLoading: authLoading, isAuthenticated, logout } = useAuth();
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

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/auth/login");
    }
  }, [isAuthenticated, authLoading, router]);

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

  // Fetch session and user plan data
  useEffect(() => {
    const fetchSessionData = async () => {
      if (!isAuthenticated || !user?.userId) {
        return;
      }
      
      try {
        setDataLoading(true);
        console.log('Fetching session data for user:', user.userId);
        
        // Fetch session data for isActive status
        const sessionRes = await apiFetchGet<SessionData>('/sessions/status');
        console.log('Session data:', sessionRes);
        setSessionData(sessionRes);
        
        // Fetch user data to get purchased bundles
        const userRes = await apiFetchGet<any>('/users/me');
        console.log('User data:', userRes);
        
        if (userRes?.purchasedBundles && userRes.purchasedBundles.length > 0) {
          // Get the most recent purchased bundle
          const sorted = [...userRes.purchasedBundles].sort(
            (a, b) => new Date(b.purchasedAt).getTime() - new Date(a.purchasedAt).getTime()
          );
          setActivePlan(sorted[0]);
        } else {
          setActivePlan(null);
        }
      } catch (err) {
        console.error('Failed to fetch session data:', err);
        // Set defaults on error
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
    if (tab && ['overview', 'connection', 'bundles', 'gift', 'billing'].includes(tab)) {
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
      
      const response = await apiFetchPost('/payments/initiate', {
        planId,
        email: user?.username + '@splendidstarlink.com',
        phone: phoneNumber,
        externalId: Date.now().toString(),
        name: user?.username || 'User',
      });

      addToast(`Transaction ID: ${response.transId}. Please complete payment on your mobile device.`, 'success', 5000);
      setShowPaymentForm(null);
      setPhoneNumber('');
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Payment failed';
      addToast(errorMessage, 'error');
    } finally {
      setPurchasing(null);
    }
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

    try {
      setSendingGift(true);
      
      const response = await apiFetchPost('/payments/initiate', {
        planId: selectedGiftPlan,
        email: giftRecipientUsername + '@splendidstarlink.com',
        phone: giftPhoneNumber,
        externalId: Date.now().toString(),
        name: giftRecipientUsername,
      });

      addToast(`Gift sent to ${giftRecipientUsername}! Transaction ID: ${response.transId}. Complete payment on your mobile device.`, 'success', 6000);
      
      // Reset form
      setGiftRecipientUsername('');
      setGiftRecipientPassword('');
      setGiftPhoneNumber('');
      setSelectedGiftPlan(null);
      
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

  const connectionStats = {
    downloadSpeed: 245,
    uploadSpeed: 42,
    latency: 35,
    uptime: 99.9,
    dataUsed: "1.2 TB",
    dataLimit: "Unlimited"
  };

  const recentActivity = [
    { id: 1, action: "Payment processed", date: "2024-03-26", status: "success" },
    { id: 2, action: "Service upgrade", date: "2024-03-20", status: "success" },
    { id: 3, action: "Connection issue", date: "2024-03-15", status: "resolved" },
    { id: 4, action: "Router firmware update", date: "2024-03-10", status: "success" }
  ];

  const menuItems = [
    { id: "overview", label: "Overview", icon: Activity },
    { id: "connection", label: "Connection", icon: Wifi },
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
                  <div className="text-xl font-bold text-amber-900">{connectionStats.uptime}%</div>
                  <div className="text-sm text-amber-600">Outstanding reliability</div>
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
              <div className="space-y-3">
                {recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-center justify-between p-3 bg-amber-50 rounded-lg border border-amber-900/20">
                    <div className="flex items-center space-x-3">
                      {activity.status === "success" ? (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      ) : (
                        <AlertTriangle className="h-5 w-5 text-yellow-500" />
                      )}
                      <div>
                        <div className="font-medium text-amber-900">{activity.action}</div>
                        <div className="text-sm text-amber-600">{activity.date}</div>
                      </div>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      activity.status === "success" 
                        ? "bg-green-500/20 text-green-400" 
                        : "bg-yellow-500/20 text-yellow-400"
                    }`}>
                      {activity.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case "connection":
        return (
          <div className="space-y-6">
            <div className="bg-white rounded-lg p-6 border border-amber-900/20 shadow-sm">
              <h2 className="text-2xl font-bold mb-6 text-amber-900">Connection Details</h2>
              
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4 text-amber-900">Performance Metrics</h3>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center p-3 bg-amber-50 rounded-lg border border-amber-900/20">
                      <span className="text-amber-700">Download Speed</span>
                      <span className="font-bold">{connectionStats.downloadSpeed} Mbps</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-amber-50 rounded-lg border border-amber-900/20">
                      <span className="text-amber-700">Upload Speed</span>
                      <span className="font-bold">{connectionStats.uploadSpeed} Mbps</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-amber-50 rounded-lg border border-amber-900/20">
                      <span className="text-amber-700">Latency</span>
                      <span className="font-bold">{connectionStats.latency} ms</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-amber-50 rounded-lg border border-amber-900/20">
                      <span className="text-amber-700">Packet Loss</span>
                      <span className="font-bold">0.1%</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-4 text-amber-900">Data Usage</h3>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center p-3 bg-amber-50 rounded-lg border border-amber-900/20">
                      <span className="text-amber-700">This Month</span>
                      <span className="font-bold">{connectionStats.dataUsed}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-amber-50 rounded-lg border border-amber-900/20">
                      <span className="text-amber-700">Data Limit</span>
                      <span className="font-bold text-green-400">{connectionStats.dataLimit}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-amber-50 rounded-lg border border-amber-900/20">
                      <span className="text-amber-700">Peak Usage</span>
                      <span className="font-bold">8 PM - 11 PM</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-amber-50 rounded-lg border border-amber-900/20">
                      <span className="text-amber-700">Connected Devices</span>
                      <span className="font-bold">12</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 p-4 bg-green-500/20 border border-green-500 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Wifi className="h-6 w-6 text-green-400" />
                  <div>
                    <div className="font-semibold">Connection Status: Excellent</div>
                    <div className="text-sm text-amber-600">Your Splendid StarLink connection is performing optimally</div>
                  </div>
                </div>
              </div>
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
              
              <div className="grid md:grid-cols-2 gap-6">
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
                  <h3 className="text-lg font-semibold mb-4 text-amber-900">Payment Method</h3>
                  <div className="p-4 bg-amber-50 rounded-lg border border-amber-900/20">
                    <div className="flex items-center space-x-3 mb-3">
                      <CreditCard className="h-5 w-5 text-amber-700" />
                      <span>••••• •••• •••• 4242</span>
                    </div>
                    <p className="text-amber-600 text-sm">Expires 12/25</p>
                    <button className="mt-3 text-amber-400 hover:text-amber-900 transition text-sm cursor-pointer">
                      Update payment method
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <h3 className="text-lg font-semibold mb-4 text-amber-900">Recent Invoices</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-amber-50 rounded-lg border border-amber-900/20">
                    <div>
                      <div className="font-medium">March 2024</div>
                      <div className="text-sm text-amber-600">Paid on Mar 1, 2024</div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className="font-bold text-amber-900">200 FCFA</span>
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    </div>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-amber-50 rounded-lg border border-amber-900/20">
                    <div>
                      <div className="font-medium">February 2024</div>
                      <div className="text-sm text-amber-600">Paid on Feb 1, 2024</div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className="font-bold text-amber-900">200 FCFA</span>
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    </div>
                  </div>
                </div>
              </div>
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
    </div>
  );
}
