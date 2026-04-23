"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Satellite, User, Lock, Eye, EyeOff, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { setToken, setStoredUser } from "@/lib/api-client";

export default function SignupPage() {
  const router = useRouter();
  const { login, isLoading: authLoading, isAuthenticated, setUser } = useAuth();
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [redirectInfo, setRedirectInfo] = useState<{ redirect?: string; plan?: string; name?: string; mac?: string; router?: string; ip?: string; link_login?: string; link_orig?: string }>({});

  // Note: We intentionally do NOT redirect authenticated users on the signup page
  // Users should be able to create a new account even if they have an existing session
  // If they want to go back to their existing account, they can click the login link

  // Handle URL parameters for redirect
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const redirect = urlParams.get('redirect');
    const plan = urlParams.get('plan');
    const name = urlParams.get('name');
    const mac = urlParams.get('mac');
    const routerParam = urlParams.get('router');
    const ip = urlParams.get('ip');
    const link_login = urlParams.get('link_login');
    const link_orig = urlParams.get('link_orig');
    const fromCaptivePortal = urlParams.get('fromCaptivePortal');
    
    if (redirect || plan || name || mac || routerParam || ip || link_login || link_orig || fromCaptivePortal) {
      setRedirectInfo({ 
        redirect: redirect || '', 
        plan: plan || '', 
        name: name || '',
        mac: mac || '',
        router: routerParam || '',
        ip: ip || '',
        link_login: link_login || '',
        link_orig: link_orig || ''
      });
      
      // Log captured WiFi info for debugging
      if (mac || routerParam || ip || link_login) {
        console.log('📱 WiFi Portal Info Captured (Signup):', { mac, router: routerParam, ip, link_login: !!link_login, link_orig: !!link_orig });
      }

      // Store captive portal data in localStorage for payment flow
      if (fromCaptivePortal === 'true') {
        sessionStorage.setItem('captivePortalRedirect', JSON.stringify({
          mac,
          ip,
          routerId: routerParam,
          linkLogin: link_login,
          linkOrig: link_orig
        }));
        console.log('✅ Captive portal redirect stored');
      }
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'https://splendid-starlink.onrender.com'}/auth/register`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            username: formData.username, 
            password: formData.password,
            macAddress: redirectInfo.mac || null,
            routerIdentity: redirectInfo.router || null,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Signup failed');
      }

      console.log('✅ Signup successful:', { username: formData.username, mac: redirectInfo.mac });

      // Store password in localStorage for silent WiFi login after payment
      // Password is only stored on user's device, never transmitted after signup
      // It will be used to auto-login to MikroTik hotspot after payment confirmation
      if (redirectInfo.mac || redirectInfo.router || redirectInfo.link_login) {
        console.log('📱 Storing WiFi session data for silent login...');
        localStorage.setItem('wifiSessionPassword', formData.password);
        localStorage.setItem('wifiSessionUsername', formData.username);
        if (redirectInfo.router) localStorage.setItem('wifiRouter', redirectInfo.router);
        if (redirectInfo.mac) localStorage.setItem('wifiMac', redirectInfo.mac);
        if (redirectInfo.ip) localStorage.setItem('wifiUserIp', redirectInfo.ip);
        if (redirectInfo.link_login) localStorage.setItem('wifiLinkLogin', redirectInfo.link_login);
        if (redirectInfo.link_orig) localStorage.setItem('wifiLinkOrig', redirectInfo.link_orig);
        console.log('✅ WiFi session data stored locally');
      }

      // Handle both response formats
      // Always use login() to properly update AuthContext state
      // This ensures token and user are synchronized in context
      try {
        console.log('🔐 Logging in after signup to update AuthContext...');
        await login(formData.username, formData.password, redirectInfo.mac, redirectInfo.router);
        
        console.log('✅ Login after signup successful');
        
        // Store portal data in localStorage for payment/redemption flow
        if (redirectInfo.mac || redirectInfo.link_login) {
          localStorage.setItem('wifiLinkLogin', redirectInfo.link_login || '');
          localStorage.setItem('wifiLinkOrig', redirectInfo.link_orig || '');
          console.log('✅ Portal links stored for payment redirect');
        }
        
        // Redirect to dashboard bundles tab for user to purchase
        // Use a longer delay (500ms) to ensure context fully updates before dashboard loads
        setTimeout(() => {
          console.log('🚀 Redirecting to dashboard after signup+login');
          router.push('/dashboard?tab=bundles');
        }, 500);
        return;
      } catch (err) {
        console.warn('⚠️ Login after signup failed, but signup was successful');
        // If login fails after signup, this is unusual but continue to dashboard anyway
        // The user registered successfully, they just need to complete the auth flow
        setTimeout(() => {
          router.push('/dashboard?tab=bundles');
        }, 500);
        return;
      }

      throw new Error('Invalid signup response - no user data');
    } catch (err: any) {
      setError(err.message || "An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
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
            <Satellite className="h-8 w-8 text-gray-700 animate-pulse" />
            <span className="text-2xl font-bold text-gray-900">Splendid StarLink</span>
          </div>
          <h2 className="text-3xl font-bold text-gray-900 animate-fade-in">Create Account</h2>
          <p className="text-gray-700 animate-fade-in animation-delay-200">Join Splendid StarLink and experience high-speed internet</p>
        </div>

        {/* Signup Form */}
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
                  id="username"
                  name="username"
                  type="text"
                  value={formData.username}
                  onChange={handleChange}
                  className="w-full pl-10 pr-3 py-3 bg-white border border-amber-900/20 rounded-lg text-gray-900 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  placeholder="Choose a username"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-5 w-5 text-gray-700" />
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full pl-10 pr-10 py-3 bg-white border border-amber-900/20 rounded-lg text-gray-900 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  placeholder="Create a strong password"
                  required
                  minLength={8}
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

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Confirm Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-5 w-5 text-gray-700" />
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="w-full pl-10 pr-10 py-3 bg-white border border-amber-900/20 rounded-lg text-gray-900 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  placeholder="Confirm your password"
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-3 text-gray-700 hover:text-gray-900 transition"
                >
                  {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>


            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-amber-600 hover:bg-amber-700 text-white font-semibold py-3 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? "Creating Account..." : "Create Account"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-slate-400">
              Already have an account?{" "}
              <Link href="/auth/login" className="text-blue-400 hover:text-blue-300 transition">
                Sign in
              </Link>
            </p>
          </div>
        </div>

        {/* Back to Home */}
        <div className="mt-8 text-center">
          <Link href="/" className="text-slate-400 hover:text-white transition inline-flex items-center">
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
