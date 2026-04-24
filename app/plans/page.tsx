"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Satellite, CheckCircle, Loader2 } from "lucide-react";

interface Plan {
  _id: string;
  name: string;
  price: number;
  duration: number;
}

export default function PlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [purchasing, setPurchasing] = useState<string | null>(null);

  // Fetch plans from backend
  useEffect(() => {
    const fetchPlans = async () => {
      try {
        setLoading(true);
        const response = await fetch('https://splendid-starlink.onrender.com/plans');
        if (!response.ok) {
          throw new Error('Failed to fetch plans');
        }
        const data = await response.json();
        setPlans(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchPlans();
  }, []);

  // Handle plan purchase
  const handlePurchase = async (planId: string, planName: string) => {
    // Check if user is authenticated
    const token = localStorage.getItem('token');
    if (!token) {
      // Redirect to signup page with plan info
      window.location.href = `/auth/signup?redirect=plans&plan=${planId}&name=${encodeURIComponent(planName)}`;
      return;
    }

    // If authenticated, redirect to dashboard bundles section
    window.location.href = '/dashboard?tab=bundles';
  };

  // Format plan name for display
  const formatPlanName = (name: string) => {
    if (name.includes('100 CFA')) return 'Basic';
    if (name.includes('200 CFA')) return 'Standard';
    if (name.includes('500 CFA')) return 'Premium';
    if (name.includes('2500 CFA')) return 'Silver';
    if (name.includes('5000 CFA')) return 'Gold';
    if (name.includes('7000 CFA')) return 'Platinum';
    return name;
  };

  const getPlanConnectionSpeed = (name: string) => {
    return name.toLowerCase().includes('unlimited')
      ? 'High-speed connection'
      : 'Medium-speed connection';
  };

  const formatPlanDurationLabel = (plan: Plan) => {
    if ([100, 200, 300].includes(plan.price)) {
      return `${plan.duration} hours`;
    }
    if (plan.price === 500) {
      return '10 hours';
    }
    if (plan.price === 2500) {
      return '1 week';
    }
    if (plan.price === 5000 || plan.price === 7000) {
      return '1 month';
    }
    return `${plan.duration} hours`;
  };

  // Get emoji for plan
  const getPlanEmoji = (name: string) => {
    if (name.includes('100 CFA')) return '🚀';
    if (name.includes('200 CFA')) return '⭐';
    if (name.includes('500 CFA')) return '👑';
    if (name.includes('2500 CFA')) return '👑';
    if (name.includes('5000 CFA')) return '👑';
    if (name.includes('7000 CFA')) return '👑';
    return '📦';
  };

  // Check if plan is popular
  const isPopularPlan = (name: string) => {
    return name.includes('200 CFA'); // Standard plan is popular
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white text-amber-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-amber-700" />
          <p className="text-amber-700">Loading plans...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white text-amber-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-4">Error: {error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="bg-amber-700 hover:bg-amber-800 text-white px-4 py-2 rounded-lg transition"
          >
            Retry
          </button>
        </div>
      </div>
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
        <div className="hidden md:flex items-center space-x-6">
          <Link href="/auth/login" className="text-amber-700 hover:text-amber-900 transition cursor-pointer">Sign In</Link>
          <Link href="/auth/signup" className="bg-amber-700 hover:bg-amber-800 text-white font-semibold py-2 px-4 rounded-lg transition cursor-pointer">
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="px-6 py-20 bg-white">
        <div className="max-w-6xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-amber-900 mb-4 animate-fade-in">Choose Your Perfect Plan</h1>
          <p className="text-xl text-amber-700 mb-8 animate-fade-in animation-delay-200">
            Simple, transparent pricing with no hidden fees. Choose the plan that works best for you.
          </p>
        </div>
      </section>

      {/* Security Information */}
      <section className="px-6 py-12 bg-amber-50 border-t border-amber-200">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg p-6 shadow-sm border border-amber-200">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-amber-900 mb-2">Security & Payment Protection</h3>
                <div className="text-sm text-amber-700 space-y-1">
                  <p>• <strong>Rate Limiting:</strong> Maximum 3 payment requests per hour per device</p>
                  <p>• <strong>Transaction Locks:</strong> Only one pending payment allowed at a time</p>
                  <p>• <strong>Device Restrictions:</strong> One account per device (except gift purchases)</p>
                  <p>• <strong>Phone Verification:</strong> Payments require valid phone number verification</p>
                  <p>• <strong>Blacklist Protection:</strong> We block repeat abuse from the same device, phone number, or IP so the service stays fair and available for everyone.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Plans */}
      <section id="plans" className="px-6 py-20 bg-amber-50">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8">
            {plans.map((plan) => (
              <div
                key={plan._id}
                className={`border rounded-lg p-6 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-amber-500/10 ${
                  isPopularPlan(plan.name)
                    ? "border-amber-500"
                    : "border-amber-900/20"
                }`}
              >
                <div className="text-center mb-4">
                  <div className="text-4xl mb-3">{getPlanEmoji(plan.name)}</div>
                  <h3 className="text-xl font-bold text-amber-900">{formatPlanName(plan.name)}</h3>
                  <p className="text-3xl font-bold mb-4 text-amber-900">
                    {plan.price} FCFA
                    <span className="text-lg text-amber-600"> / {formatPlanDurationLabel(plan)}</span>
                  </p>
                  {isPopularPlan(plan.name) && (
                    <div className="inline-block bg-amber-700 text-white text-xs px-3 py-1 rounded-full">
                      Most Popular
                    </div>
                  )}
                </div>
                <ul className="space-y-3 mb-6">
                  <li className="flex items-start text-amber-900">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-3 flex-shrink-0 mt-1" />
                    <span>{formatPlanDurationLabel(plan)} access</span>
                  </li>
                  <li className="flex items-start text-amber-900">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-3 flex-shrink-0 mt-1" />
                    <span>{getPlanConnectionSpeed(plan.name)}</span>
                  </li>
                  <li className="flex items-start text-amber-900">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-3 flex-shrink-0 mt-1" />
                    <span>{isPopularPlan(plan.name) ? 'Priority support' : 'Standard support'}</span>
                  </li>
                </ul>
                <button
                  onClick={() => handlePurchase(plan._id, plan.name)}
                  disabled={purchasing === plan._id}
                  className="w-full bg-amber-700 hover:bg-amber-800 text-white font-semibold py-3 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {purchasing === plan._id ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Processing...
                    </>
                  ) : (
                    'Get Started'
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-6 py-20 bg-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-amber-900 mb-4 animate-fade-in">Ready to Get Started?</h2>
          <p className="text-xl text-amber-700 mb-8 animate-fade-in animation-delay-200">
            Have questions about our plans? Need a custom solution for your business?
          </p>
          <div className="flex flex-col md:flex-row gap-4 justify-center items-center">
            <Link href="/auth/signup" className="bg-amber-700 hover:bg-amber-800 text-white font-semibold py-3 px-6 rounded-lg transition">
              Create Account
            </Link>
            <button className="border border-amber-900/20 rounded-lg px-6 py-3 text-amber-700 hover:border-amber-500 hover:bg-amber-50 transition">
              Contact Sales
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
