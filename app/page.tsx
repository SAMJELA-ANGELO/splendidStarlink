"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Satellite, Rocket, Globe, Wifi, CheckCircle, ArrowRight, Menu, X, Shield, Zap, Users, Star, RocketIcon, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

function HomeContent() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setMacAddress, setRouterIdentity, setUserIp, user } = useAuth();

  // Session-based flow state
  const [isFromWifi, setIsFromWifi] = useState(false);
  const [wifiInfo, setWifiInfo] = useState<{
    mac: string | null;
    ip: string | null;
    router_id: string | null;
    link_login: string | null;
    link_orig: string | null;
  } | null>(null);

  // Capture device info from MikroTik redirect
  useEffect(() => {
    const mac = searchParams.get("mac");
    const ip = searchParams.get("ip");
    const router_id = searchParams.get("router_id");
    const link_login = searchParams.get("link_login");
    const link_orig = searchParams.get("link_orig");

    // Check if user came from WiFi captive portal
    if (mac && link_login) {
      console.log('🌐 WiFi Captive Portal Redirect Detected:', { mac, ip, router_id });
      setIsFromWifi(true);
      setWifiInfo({ mac, ip, router_id, link_login, link_orig });

      // Store in auth context
      setMacAddress(mac);
      localStorage.setItem("macAddress", mac);
      localStorage.setItem("wifiMacAddress", mac); // For SilentLoginForm
      localStorage.setItem("wifiLinkLogin", link_login);
      if (link_orig) localStorage.setItem("wifiLinkOrig", link_orig);

      if (ip) {
        setUserIp(ip);
        localStorage.setItem("userIp", ip);
        localStorage.setItem("wifiIpAddress", ip); // For SilentLoginForm
      }

      if (router_id) {
        setRouterIdentity(router_id);
        localStorage.setItem("routerIdentity", router_id);
      }

      // Redirect directly to login page
      setTimeout(() => {
        router.push(`/auth/login?mac=${encodeURIComponent(mac)}&router=${encodeURIComponent(router_id || '')}&ip=${encodeURIComponent(ip || '')}&link_login=${encodeURIComponent(link_login)}&link_orig=${encodeURIComponent(link_orig || '')}`);
      }, 1500);
    } else {
      // Regular landing page load
      setIsFromWifi(false);
    }
  }, [searchParams, setMacAddress, setRouterIdentity, setUserIp]);

  // If from WiFi, show redirect message
  if (isFromWifi && wifiInfo) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6">
        <div className="text-center max-w-md">
          <Wifi className="h-16 w-16 text-amber-700 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-amber-900 mb-2">Welcome to Splendid StarLink</h1>
          <p className="text-gray-600 mb-8">You're connected to our WiFi network. Please log in to access the internet.</p>
          
          <div className="bg-amber-50 rounded-lg p-4 mb-6 text-left">
            <p className="text-sm text-gray-700 mb-2"><span className="font-semibold">Device MAC:</span> {wifiInfo.mac ? `${wifiInfo.mac.slice(0, 12)}...` : 'Unknown'}</p>
            <p className="text-sm text-gray-700"><span className="font-semibold">Router:</span> {wifiInfo.router_id || 'Unknown'}</p>
          </div>

          <p className="text-sm text-amber-700 mb-4">Redirecting to login...</p>
          <Loader2 className="h-8 w-8 animate-spin text-amber-700 mx-auto" />
        </div>
      </div>
    );
  }

  // Regular landing page (no WiFi redirect)
  return (
    <div className="min-h-screen bg-white text-amber-900 overflow-hidden relative">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex justify-between items-center px-6 py-4 border-b border-amber-900/20 bg-white/95 backdrop-blur-sm shadow-lg">
        <div className="flex items-center space-x-2">
          <Link href="/" className="flex items-center space-x-2">
            <Satellite className="h-8 w-8 text-amber-700 animate-pulse" />
            <span className="text-xl font-bold text-amber-900">Splendid StarLink</span>
          </Link>
        </div>
        
        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center space-x-6">
          <Link href="/auth/login" className="hover:text-amber-400 transition-all duration-300 hover:scale-105">Sign In</Link>
          <Link href="/auth/signup" className="bg-amber-600 hover:bg-amber-700 px-4 py-2 rounded-lg transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-amber-500/25">
            Get Started
          </Link>
        </div>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="md:hidden p-2 rounded-lg hover:bg-amber-50 transition"
        >
          {isMobileMenuOpen ? <X className="h-6 w-6 text-amber-700" /> : <Menu className="h-6 w-6 text-amber-700" />}
        </button>
      </nav>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="fixed inset-0 bg-black/50" onClick={() => setIsMobileMenuOpen(false)} />
          <div className="fixed right-0 top-0 h-full w-64 bg-white shadow-xl transform transition-transform duration-300 ease-in-out">
            <div className="p-6">
              <div className="flex flex-col space-y-4">
                <Link href="/auth/login" onClick={() => setIsMobileMenuOpen(false)} className="text-amber-700 hover:text-amber-900 transition py-2">Sign In</Link>
                <Link href="/auth/signup" onClick={() => setIsMobileMenuOpen(false)} className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg transition">Get Started</Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hero Section */}
      <section className="px-6 py-20 text-center relative">
        {/* Floating Elements */}
        <div className="absolute top-20 left-10 w-20 h-20 bg-amber-500/10 rounded-full animate-float"></div>
        <div className="absolute top-40 right-20 w-32 h-32 bg-cyan-500/10 rounded-full animate-float animation-delay-2000"></div>
        <div className="absolute bottom-20 left-1/4 w-16 h-16 bg-amber-400/10 rounded-full animate-float animation-delay-4000"></div>
        
        <div className="max-w-4xl mx-auto relative z-10">
          <div className="text-center mb-8">
            <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-amber-600 to-cyan-300 bg-clip-text text-transparent animate-slide-up">
              High-Speed Internet from Space
            </h1>
            <p className="text-xl md:text-2xl text-gray-600 mb-8 animate-slide-up animation-delay-200">
              Experience the future of connectivity with Splendid StarLink's revolutionary Starlink services.
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center text-center animate-slide-up animation-delay-400">
            <Link 
              href="/plans" 
              className="bg-amber-600 hover:bg-amber-700 justify-center px-6 py-2 rounded-lg text-center text-lg font-semibold transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-amber-500/25 flex items-center group"
            >
              Browse Plans <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform duration-300" />
            </Link>
            <Link 
              href="/auth/signup" 
              className="border border:bg-amber-600 hover:bg-amber-700 justify-center px-6 py-2 rounded-lg text-center text-lg font-semibold transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-amber-500/25 flex items-center group"
            >
              Get Started <RocketIcon className="ml-2 h-5 w-5 group-hover:translate-y-[-2px] transition-transform duration-300" />
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="px-6 py-20 bg-gradient-to-br from-amber-50 to-white relative overflow-hidden">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-16 text-amber-900 animate-fade-in">Why Choose Splendid StarLink?</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center group hover:scale-105 transition-all duration-300">
              <div className="bg-amber-600 rounded-full p-4 w-20 h-20 mx-auto mb-6 flex items-center justify-center group-hover:rotate-12 transition-transform duration-300 shadow-lg group-hover:shadow-amber-500/25">
                <Rocket className="h-10 w-10 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-4 text-amber-900 group-hover:text-amber-700 transition">Lightning Fast</h3>
              <p className="text-gray-600 group-hover:text-amber-600 transition">Experience blazing-fast speeds up to 1 Gbps with our advanced satellite network</p>
              <div className="flex justify-center space-x-4 mt-6">
                <div className="bg-amber-100 rounded-lg px-4 py-2 text-center">
                  <div className="text-3xl font-bold text-amber-900">1000+</div>
                  <div className="text-sm text-amber-600">Mbps Speed</div>
                </div>
                <div className="bg-amber-100 rounded-lg px-4 py-2 text-center">
                  <div className="text-3xl font-bold text-amber-900">99.9%</div>
                  <div className="text-sm text-amber-600">Uptime</div>
                </div>
              </div>
            </div>

            <div className="text-center group hover:scale-105 transition-all duration-300">
              <div className="bg-amber-600 rounded-full p-4 w-20 h-20 mx-auto mb-6 flex items-center justify-center group-hover:rotate-12 transition-transform duration-300 shadow-lg group-hover:shadow-amber-500/25">
                <Globe className="h-10 w-10 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-4 text-amber-900 group-hover:text-amber-700 transition">Global Coverage</h3>
              <p className="text-gray-600 group-hover:text-amber-600 transition">Connect from anywhere with our extensive satellite constellation covering every corner of the globe</p>
              <div className="flex justify-center space-x-4 mt-6">
                <div className="bg-amber-100 rounded-lg px-4 py-2 text-center">
                  <div className="text-3xl font-bold text-amber-900">150+</div>
                  <div className="text-sm text-amber-600">Countries</div>
                </div>
                <div className="bg-amber-100 rounded-lg px-4 py-2 text-center">
                  <div className="text-3xl font-bold text-amber-900">24/7</div>
                  <div className="text-sm text-amber-600">Support</div>
                </div>
              </div>
            </div>

            <div className="text-center group hover:scale-105 transition-all duration-300">
              <div className="bg-amber-600 rounded-full p-4 w-20 h-20 mx-auto mb-6 flex items-center justify-center group-hover:rotate-12 transition-transform duration-300 shadow-lg group-hover:shadow-amber-500/25">
                <Wifi className="h-10 w-10 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-4 text-amber-900 group-hover:text-amber-700 transition">Always Connected</h3>
              <p className="text-gray-600 group-hover:text-amber-600 transition">Industry-leading 99.9% uptime with advanced redundancy and automatic failover systems</p>
              <div className="flex justify-center space-x-4 mt-6">
                <div className="bg-amber-100 rounded-lg px-4 py-2 text-center">
                  <div className="text-3xl font-bold text-amber-900">Advanced</div>
                  <div className="text-sm text-amber-600">Tech</div>
                </div>
                <div className="bg-amber-100 rounded-lg px-4 py-2 text-center">
                  <div className="text-3xl font-bold text-amber-900">Instant</div>
                  <div className="text-sm text-amber-600">Setup</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Plans */}
      <section id="plans" className="px-6 py-20 bg-white relative overflow-hidden">
        <div className="max-w-6xl mx-auto">
          <div className="bg-white rounded-lg p-6 border border-amber-900/20 shadow-sm relative">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold mb-4 text-amber-900">Choose Your Plan</h2>
              <p className="text-amber-700 mb-8">Select the perfect plan for your needs</p>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="border border-amber-900/20 rounded-lg p-6 hover:border-amber-500 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-amber-500/10">
                <div className="text-center mb-4">
                  <div className="text-4xl mb-3">🚀</div>
                  <h3 className="text-xl font-bold mb-2 text-amber-900">Basic</h3>
                  <p className="text-2xl font-bold mb-4 text-amber-900">100 FCFA<span className="text-lg text-amber-600"> / 2 hours</span></p>
                  <ul className="space-y-2 mb-4">
                    <li className="flex items-center text-amber-900"><CheckCircle className="h-4 w-4 text-green-500 mr-2" /> 2 hours access</li>
                    <li className="flex items-center text-amber-900"><CheckCircle className="h-4 w-4 text-green-500 mr-2" /> High-speed connection</li>
                    <li className="flex items-center text-amber-900"><CheckCircle className="h-4 w-4 text-green-500 mr-2" /> No data limits</li>
                  </ul>
                  <Link href="/auth/signup" className="w-full bg-amber-700 hover:bg-amber-800 py-2 rounded-lg transition block text-center text-white">Get Started</Link>
                </div>
              </div>
              <div className="border border-amber-500 rounded-lg p-6 hover:border-amber-400 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-amber-500/10 relative">
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-amber-700 px-3 py-1 rounded-full text-sm text-white">Popular</div>
                <div className="text-center mb-4">
                  <div className="text-4xl mb-3">⭐</div>
                  <h3 className="text-xl font-bold mb-2 text-amber-900">Standard</h3>
                  <p className="text-2xl font-bold mb-4 text-amber-900">200 FCFA<span className="text-lg text-amber-600"> / 5 hours</span></p>
                  <ul className="space-y-2 mb-4">
                    <li className="flex items-center text-amber-900"><CheckCircle className="h-4 w-4 text-green-500 mr-2" /> 5 hours access</li>
                    <li className="flex items-center text-amber-900"><CheckCircle className="h-4 w-4 text-green-500 mr-2" /> High-speed connection</li>
                    <li className="flex items-center text-amber-900"><CheckCircle className="h-4 w-4 text-green-500 mr-2" /> Priority support</li>
                  </ul>
                  <Link href="/auth/signup" className="w-full bg-amber-700 hover:bg-amber-800 py-2 rounded-lg transition block text-center text-white">Get Started</Link>
                </div>
              </div>
              <div className="border border-amber-900/20 rounded-lg p-6 hover:border-amber-500 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-amber-500/10">
                <div className="text-center mb-4">
                  <div className="text-4xl mb-3">👑</div>
                  <h3 className="text-xl font-bold mb-2 text-amber-900">Premium</h3>
                  <p className="text-2xl font-bold mb-4 text-amber-900">500 FCFA<span className="text-lg text-amber-600"> / 10 hours</span></p>
                  <ul className="space-y-2 mb-4">
                    <li className="flex items-center text-amber-900"><CheckCircle className="h-4 w-4 text-green-500 mr-2" /> 10 hours access</li>
                    <li className="flex items-center text-amber-900"><CheckCircle className="h-4 w-4 text-green-500 mr-2" /> Maximum speed</li>
                    <li className="flex items-center text-amber-900"><CheckCircle className="h-4 w-4 text-green-500 mr-2" /> Premium support</li>
                  </ul>
                  <Link href="/auth/signup" className="w-full bg-amber-700 hover:bg-amber-800 py-2 rounded-lg transition block text-center text-white">Get Started</Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-6 py-20 bg-gradient-to-r from-amber-600 to-cyan-600 text-center relative overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-600/20 to-transparent animate-shimmer"></div>
        
        <div className="max-w-4xl mx-auto relative z-10">
          <div className="text-center">
            <div className="inline-flex items-center bg-white/10 backdrop-blur-sm rounded-full px-6 py-3 mb-6 animate-fade-in">
              <Star className="h-8 w-8 text-amber-600 mr-3" />
              <span className="text-amber-900 font-semibold">Trusted by 10,000+ Users</span>
            </div>
            <h2 className="text-4xl font-bold mb-4 text-white animate-fade-in animation-delay-200">Ready to Experience the Future?</h2>
            <p className="text-xl text-white/90 mb-8 animate-fade-in animation-delay-400">
              Join thousands of satisfied customers enjoying lightning-fast satellite internet across the globe
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in animation-delay-600">
              <Link href="/plans" className="bg-white text-amber-600 hover:bg-amber-50 px-8 py-4 rounded-lg text-lg font-semibold transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-white/25 flex items-center group">
                Browse Plans <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform duration-300" />
              </Link>
              <Link href="/auth/signup" className="bg-amber-700 hover:bg-amber-800 text-white px-8 py-4 rounded-lg text-lg font-semibold transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-white/25 flex items-center group">
                Get Started <Rocket className="ml-2 h-5 w-5 group-hover:translate-y-[-2px] transition-transform duration-300" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gradient-to-b from-amber-900 to-amber-950 text-white">
        <div className="max-w-6xl mx-auto grid md:grid-cols-4 gap-8 px-6 py-12">
          <div className="animate-fade-in">
            <div className="flex items-center space-x-2 mb-4">
              <Satellite className="h-6 w-6 text-amber-400 animate-pulse" />
              <span className="text-lg font-bold">Splendid StarLink</span>
            </div>
            <p className="text-amber-200">High-speed satellite internet for everyone, everywhere.</p>
          </div>
          
          <div className="animate-fade-in animation-delay-200">
            <h4 className="font-semibold mb-2">Quick Links</h4>
            <div className="space-y-2">
              <Link href="/plans" className="text-amber-200 hover:text-white transition">Browse Plans</Link>
              <Link href="/auth/login" className="text-amber-200 hover:text-white transition">Sign In</Link>
              <Link href="/auth/signup" className="text-amber-200 hover:text-white transition">Get Started</Link>
            </div>
          </div>

          <div className="animate-fade-in animation-delay-400">
            <h4 className="font-semibold mb-2">Contact Info</h4>
            <div className="space-y-2">
              <p className="text-amber-200">support@splendidstarlink.com</p>
              <p className="text-amber-200">+237 123 456 789</p>
            </div>
          </div>

          <div className="animate-fade-in animation-delay-600">
            <h4 className="font-semibold mb-2">Follow Us</h4>
            <div className="flex space-x-4">
              <a href="#" className="text-amber-200 hover:text-white transition">
                <Users className="h-5 w-5" />
              </a>
              <a href="#" className="text-amber-200 hover:text-white transition">
                <Globe className="h-5 w-5" />
              </a>
              <a href="#" className="text-amber-200 hover:text-white transition">
                <Wifi className="h-5 w-5" />
              </a>
            </div>
          </div>
        </div>
        
        <div className="max-w-6xl mx-auto mt-8 pt-8 border-t border-amber-800 text-center text-amber-200 animate-fade-in animation-delay-800">
          <p>&copy; 2026 Splendid StarLink. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-amber-700" /></div>}>
      <HomeContent />
    </Suspense>
  );
}
