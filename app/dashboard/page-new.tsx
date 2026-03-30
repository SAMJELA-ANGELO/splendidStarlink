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
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetchGet, apiFetchPost } from "@/lib/api-client";
import { PaymentStatusMonitor } from "@/components/PaymentStatusMonitor";

interface Plan {
  _id: string;
  name: string;
  price: number;
  duration: number;
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, isLoading: authLoading, isAuthenticated, logout } = useAuth();
  
  const [activeTab, setActiveTab] = useState("overview");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(false);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [showPaymentForm, setShowPaymentForm] = useState<string | null>(null);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [activeTransactionId, setActiveTransactionId] = useState<string | null>(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/auth/login");
    }
  }, [isAuthenticated, authLoading, router]);

  // Handle URL parameters for initial tab
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tab = urlParams.get("tab");
    if (tab && ["overview", "connection", "bundles", "gift", "billing"].includes(tab)) {
      setActiveTab(tab);
    }
  }, []);

  // Fetch plans from backend with token
  useEffect(() => {
    const fetchPlans = async () => {
      try {
        setLoading(true);
        const data = await apiFetchGet<Plan[]>("/plans");
        setPlans(data || []);
      } catch (err) {
        console.error("Failed to fetch plans:", err);
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
      router.push("/auth/login");
      return;
    }

    // Show payment form for this plan
    setShowPaymentForm(planId);
  };

  // Handle payment submission
  const handlePaymentSubmit = async (planId: string) => {
    if (!phoneNumber.trim()) {
      alert("Please enter your phone number");
      return;
    }

    try {
      setPurchasing(planId);
      
      // Get WiFi info from AuthContext  
      const { macAddress, routerIdentity } = useAuth();
      
      const paymentPayload: any = {
        planId,
        email: user?.username + "@splendidstarlink.com",
        phone: phoneNumber,
        externalId: Date.now().toString(),
        name: user?.username || "User",
      };

      // Include MAC, router info, and user IP if available
      if (macAddress) {
        paymentPayload.macAddress = macAddress;
        console.log('✅ MAC address included:', macAddress);
      }
      
      if (routerIdentity) {
        paymentPayload.routerIdentity = routerIdentity;
        console.log('✅ Router identity included:', routerIdentity);
      }

      const userIp = localStorage.getItem('userIp');
      if (userIp) {
        paymentPayload.userIp = userIp;
        console.log('✅ User IP included:', userIp);
      } else {
        console.warn('⚠️ User IP not found - silent login may not work');
      }

      const password = localStorage.getItem('wifiSessionPassword');
      if (password) {
        paymentPayload.password = password;
        console.log('✅ Password included for silent login');
      } else {
        console.warn('⚠️ Password not found - user may need manual login');
      }

      const response = await apiFetchPost("/payments/initiate", paymentPayload);

      console.log('💳 Payment initiated:', response);
      console.log('   Transaction ID:', response.transId);

      // Set the transaction ID to trigger PaymentStatusMonitor
      setActiveTransactionId(response.transId);
      setShowPaymentForm(null);
      setPhoneNumber("");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Payment failed");
    } finally {
      setPurchasing(null);
    }
  };

  // Handle logout
  const handleLogout = async () => {
    await logout();
    router.push("/");
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
    dataLimit: "Unlimited",
  };

  const recentActivity = [
    { id: 1, action: "Payment processed", date: "2024-03-26", status: "success" },
    { id: 2, action: "Service upgrade", date: "2024-03-20", status: "success" },
    { id: 3, action: "Connection issue", date: "2024-03-15", status: "resolved" },
    { id: 4, action: "Router firmware update", date: "2024-03-10", status: "success" },
  ];

  const menuItems = [
    { id: "overview", label: "Overview", icon: Activity },
    { id: "connection", label: "Connection", icon: Wifi },
    { id: "bundles", label: "Browse Bundles", icon: ShoppingBag },
    { id: "gift", label: "Buy for Someone", icon: Gift },
    { id: "billing", label: "Billing", icon: CreditCard },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case "overview":
        return (
          <div className="space-y-6">
            {/* Welcome Section */}
            <div className="bg-white rounded-lg p-6 border border-amber-900/20 shadow-sm">
              <h2 className="text-2xl font-bold mb-4 text-amber-900">
                Welcome back, {user?.username}!
              </h2>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="bg-amber-50 rounded-lg p-4 border border-amber-900/20">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-amber-700">Account Status</span>
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  </div>
                  <div className="text-xl font-bold text-amber-900">Active</div>
                  <div className="text-sm text-amber-600">Full access enabled</div>
                </div>
                <div className="bg-amber-50 rounded-lg p-4 border border-amber-900/20">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-amber-700">Service Status</span>
                    <Wifi className="h-5 w-5 text-blue-500" />
                  </div>
                  <div className="text-xl font-bold text-green-400">Online</div>
                  <div className="text-sm text-amber-600">Excellent connection</div>
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
                  onClick={() => setActiveTab("bundles")}
                  className="bg-amber-700 hover:bg-amber-800 p-4 rounded-lg text-center transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-amber-500/25"
                >
                  <ShoppingBag className="h-8 w-8 text-white mx-auto mb-2" />
                  <div className="text-white font-semibold">Browse Bundles</div>
                  <div className="text-amber-100 text-sm">Buy more data packages</div>
                </button>
                <button
                  onClick={() => setActiveTab("gift")}
                  className="bg-green-600 hover:bg-green-700 p-4 rounded-lg text-center transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-green-500/25"
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
                  <div
                    key={activity.id}
                    className="flex items-center justify-between p-3 bg-amber-50 rounded-lg border border-amber-900/20"
                  >
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
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        activity.status === "success"
                          ? "bg-green-500/20 text-green-400"
                          : "bg-yellow-500/20 text-yellow-400"
                      }`}
                    >
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
                    <div className="text-sm text-amber-600">
                      Your Splendid StarLink connection is performing optimally
                    </div>
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
              <h2 className="text-2xl font-bold mb-6 text-amber-900">Browse Bundles</h2>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-amber-700" />
                  <span className="ml-3 text-amber-700">Loading plans...</span>
                </div>
              ) : plans.length > 0 ? (
                <div className="grid md:grid-cols-3 gap-6">
                  {plans.map((plan) => (
                    <div
                      key={plan._id}
                      className="border border-amber-900/20 rounded-lg p-6 hover:border-amber-500 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-amber-500/10"
                    >
                      <h3 className="text-xl font-bold mb-2 text-amber-900">
                        {plan.name.includes("100") ? "Basic" : plan.name.includes("200") ? "Standard" : "Premium"}
                      </h3>
                      <p className="text-2xl font-bold mb-4 text-amber-900">
                        {plan.price} FCFA{" "}
                        <span className="text-lg text-amber-600">/ {plan.duration} hours</span>
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
                          {plan.name.includes("200") ? "Priority support" : "Standard support"}
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
                          "Buy Now"
                        )}
                      </button>

                      {/* Payment Form */}
                      {showPaymentForm === plan._id && (
                        <div className="mt-4 p-4 bg-amber-50 border border-amber-900/20 rounded-lg">
                          <h4 className="font-semibold text-amber-900 mb-3">Enter Payment Details</h4>
                          <div className="space-y-3">
                            <div>
                              <label className="block text-sm font-medium text-amber-700 mb-1">
                                Phone Number
                              </label>
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
                                  "Pay Now"
                                )}
                              </button>
                              <button
                                onClick={() => {
                                  setShowPaymentForm(null);
                                  setPhoneNumber("");
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
              ) : (
                <div className="text-center py-12">
                  <p className="text-amber-600">No plans available at the moment</p>
                </div>
              )}
            </div>
          </div>
        );

      case "gift":
        return (
          <div className="space-y-6">
            <div className="bg-white rounded-lg p-6 border border-amber-900/20 shadow-sm">
              <h2 className="text-2xl font-bold mb-6 text-amber-900">Buy for Someone Else</h2>
              <div className="p-4 bg-amber-50 border border-amber-900/20 rounded-lg">
                <p className="text-amber-700">Gift functionality coming soon!</p>
              </div>
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
                  <h3 className="text-lg font-semibold mb-4 text-amber-900">Account Information</h3>
                  <div className="p-4 bg-amber-50 rounded-lg border border-amber-900/20">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-amber-700">Username</span>
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    </div>
                    <div className="text-xl font-bold text-amber-900">{user?.username}</div>
                    <div className="text-sm text-amber-600 mt-2">Account in good standing</div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-4 text-amber-900">Payment Method</h3>
                  <div className="p-4 bg-amber-50 rounded-lg border border-amber-900/20">
                    <div className="flex items-center space-x-3 mb-3">
                      <CreditCard className="h-5 w-5 text-amber-700" />
                      <span>Mobile Money</span>
                    </div>
                    <p className="text-amber-600 text-sm">Credit via Fapshi Payment Gateway</p>
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

  // Show payment status monitor if payment was initiated
  if (activeTransactionId) {
    return (
      <PaymentStatusMonitor
        transactionId={activeTransactionId}
        onPaymentSuccess={(data) => {
          console.log('✅ Payment success callback triggered');
          // Clear transaction ID and reset to dashboard
          setTimeout(() => {
            setActiveTransactionId(null);
            setActiveTab('overview');
          }, 3000); // Give silent login time to complete
        }}
        onPaymentFailed={(error) => {
          console.error('❌ Payment failed:', error);
          // Give user option to try again
          setTimeout(() => {
            setActiveTransactionId(null);
            setActiveTab('bundles');
          }, 2000);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-white text-amber-900">
      {/* Navigation */}
      <nav className="flex justify-between items-center px-6 py-4 border-b border-amber-900/20 bg-white">
        <Link href="/" className="flex items-center space-x-2">
          <Satellite className="h-8 w-8 text-amber-700" />
          <span className="text-xl font-bold text-amber-900">Splendid StarLink</span>
        </Link>
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="md:hidden text-amber-700 hover:text-amber-900 transition p-2"
          >
            <Menu className="h-6 w-6" />
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center space-x-2 text-amber-700 hover:text-amber-900 transition cursor-pointer"
          >
            <LogOut className="h-5 w-5" />
            <span>Logout</span>
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <div className="flex">
        {/* Sidebar */}
        <aside
          className={`${
            isSidebarOpen ? "translate-x-0" : "-translate-x-full"
          } md:translate-x-0 fixed md:relative w-64 bg-white border-r border-amber-900/20 p-4 transition-transform duration-300 z-50 min-h-screen`}
        >
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="md:hidden absolute top-4 right-4 text-amber-700 hover:text-amber-900"
          >
            <X className="h-6 w-6" />
          </button>

          <nav className="space-y-2 pt-4 md:pt-0">
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
                      ? "bg-amber-100 text-amber-900 border border-amber-500"
                      : "text-amber-700 hover:bg-amber-50 border border-transparent"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span className="font-medium">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Page Content */}
        <main className="flex-1 p-6">{renderContent()}</main>
      </div>
    </div>
  );
}
