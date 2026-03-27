"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { 
  Satellite, 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  Activity,
  Wifi,
  Globe,
  Clock,
  RefreshCw,
  MapPin,
  Users
} from "lucide-react";

interface ServiceStatus {
  service: string;
  status: "operational" | "degraded" | "outage";
  description: string;
  lastUpdated: string;
  affected?: string;
}

interface SystemMetrics {
  uptime: number;
  activeUsers: number;
  totalSatellites: number;
  averageLatency: number;
  networkLoad: number;
}

export default function StatusPage() {
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Mock data - replace with actual API calls
  const services: ServiceStatus[] = [
    {
      service: "Internet Connectivity",
      status: "operational",
      description: "All systems operational. Users are experiencing normal service.",
      lastUpdated: "2 minutes ago"
    },
    {
      service: "Satellite Network",
      status: "operational",
      description: "All satellites functioning normally. Full network coverage available.",
      lastUpdated: "5 minutes ago"
    },
    {
      service: "Ground Stations",
      status: "operational",
      description: "All ground stations online and processing requests normally.",
      lastUpdated: "1 minute ago"
    },
    {
      service: "User Authentication",
      status: "operational",
      description: "Login and authentication services are working normally.",
      lastUpdated: "3 minutes ago"
    },
    {
      service: "Billing System",
      status: "degraded",
      description: "Some users may experience delays in payment processing.",
      lastUpdated: "10 minutes ago",
      affected: "2% of users"
    },
    {
      service: "Customer Support",
      status: "operational",
      description: "Support channels are open and responding normally.",
      lastUpdated: "15 minutes ago"
    }
  ];

  const systemMetrics: SystemMetrics = {
    uptime: 99.9,
    activeUsers: 2847392,
    totalSatellites: 5423,
    averageLatency: 32,
    networkLoad: 67
  };

  const recentIncidents = [
    {
      id: 1,
      title: "Payment Processing Delays",
      status: "investigating",
      started: "2024-03-26 14:30 UTC",
      description: "We're investigating reports of delayed payment processing for some users."
    },
    {
      id: 2,
      title: "Scheduled Maintenance Complete",
      status: "resolved",
      started: "2024-03-25 02:00 UTC",
      resolved: "2024-03-25 04:30 UTC",
      description: "Scheduled maintenance has been completed successfully. All systems are now operational."
    },
    {
      id: 3,
      title: "North America Connectivity Issue",
      status: "resolved",
      started: "2024-03-24 18:45 UTC",
      resolved: "2024-03-24 19:30 UTC",
      description: "Connectivity issues in North America have been resolved. Service has returned to normal."
    }
  ];

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setLastRefresh(new Date());
      setIsRefreshing(false);
    }, 1000);
  };

  const getStatusIcon = (status: ServiceStatus["status"]) => {
    switch (status) {
      case "operational":
        return <CheckCircle className="h-6 w-6 text-green-500" />;
      case "degraded":
        return <AlertTriangle className="h-6 w-6 text-yellow-500" />;
      case "outage":
        return <XCircle className="h-6 w-6 text-red-500" />;
    }
  };

  const getStatusColor = (status: ServiceStatus["status"]) => {
    switch (status) {
      case "operational":
        return "text-green-400 bg-green-500/20 border-green-500";
      case "degraded":
        return "text-yellow-400 bg-yellow-500/20 border-yellow-500";
      case "outage":
        return "text-red-400 bg-red-500/20 border-red-500";
    }
  };

  const getIncidentStatusColor = (status: string) => {
    switch (status) {
      case "investigating":
        return "text-yellow-400 bg-yellow-500/20 border-yellow-500";
      case "resolved":
        return "text-green-400 bg-green-500/20 border-green-500";
      default:
        return "text-slate-400 bg-slate-500/20 border-slate-500";
    }
  };

  const overallStatus = services.some(s => s.status === "outage") 
    ? "outage" 
    : services.some(s => s.status === "degraded") 
    ? "degraded" 
    : "operational";

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 text-white">
      {/* Navigation */}
      <nav className="flex justify-between items-center px-6 py-4 border-b border-slate-700">
        <Link href="/" className="flex items-center space-x-2">
          <Satellite className="h-8 w-8 text-blue-400" />
          <span className="text-xl font-bold">StarLink</span>
        </Link>
        <div className="hidden md:flex items-center space-x-6">
          <Link href="/#features" className="hover:text-blue-400 transition">Features</Link>
          <Link href="/plans" className="hover:text-blue-400 transition">Plans</Link>
          <Link href="/status" className="text-blue-400">Status</Link>
          <Link href="/auth/login" className="hover:text-blue-400 transition">Login</Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="px-6 py-20 text-center">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-center space-x-3 mb-6">
            {getStatusIcon(overallStatus)}
            <h1 className="text-5xl font-bold">
              {overallStatus === "operational" && "All Systems Operational"}
              {overallStatus === "degraded" && "Minor Issues Detected"}
              {overallStatus === "outage" && "Service Outage Detected"}
            </h1>
          </div>
          <p className="text-xl text-slate-300 mb-8">
            Real-time status of StarLink services worldwide
          </p>
          <div className="flex items-center justify-center space-x-4">
            <button
              onClick={handleRefresh}
              className="flex items-center space-x-2 bg-slate-700 hover:bg-slate-600 px-4 py-2 rounded-lg transition"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </button>
            <span className="text-slate-400">
              Last updated: {lastRefresh.toLocaleTimeString()}
            </span>
          </div>
        </div>
      </section>

      {/* System Metrics */}
      <section className="px-6 pb-20">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold mb-8 text-center">System Performance</h2>
          <div className="grid md:grid-cols-5 gap-6 mb-12">
            <div className="bg-slate-800 rounded-lg p-6 border border-slate-700 text-center">
              <Activity className="h-8 w-8 text-green-500 mx-auto mb-3" />
              <div className="text-2xl font-bold mb-1">{systemMetrics.uptime}%</div>
              <div className="text-sm text-slate-400">Uptime (30 days)</div>
            </div>
            <div className="bg-slate-800 rounded-lg p-6 border border-slate-700 text-center">
              <Users className="h-8 w-8 text-blue-500 mx-auto mb-3" />
              <div className="text-2xl font-bold mb-1">{(systemMetrics.activeUsers / 1000000).toFixed(1)}M</div>
              <div className="text-sm text-slate-400">Active Users</div>
            </div>
            <div className="bg-slate-800 rounded-lg p-6 border border-slate-700 text-center">
              <Satellite className="h-8 w-8 text-purple-500 mx-auto mb-3" />
              <div className="text-2xl font-bold mb-1">{systemMetrics.totalSatellites}</div>
              <div className="text-sm text-slate-400">Active Satellites</div>
            </div>
            <div className="bg-slate-800 rounded-lg p-6 border border-slate-700 text-center">
              <Globe className="h-8 w-8 text-orange-500 mx-auto mb-3" />
              <div className="text-2xl font-bold mb-1">{systemMetrics.averageLatency}ms</div>
              <div className="text-sm text-slate-400">Avg Latency</div>
            </div>
            <div className="bg-slate-800 rounded-lg p-6 border border-slate-700 text-center">
              <Wifi className="h-8 w-8 text-cyan-500 mx-auto mb-3" />
              <div className="text-2xl font-bold mb-1">{systemMetrics.networkLoad}%</div>
              <div className="text-sm text-slate-400">Network Load</div>
            </div>
          </div>

          {/* Service Status */}
          <h2 className="text-3xl font-bold mb-8 text-center">Service Status</h2>
          <div className="space-y-4">
            {services.map((service, index) => (
              <div
                key={index}
                className="bg-slate-800 rounded-lg p-6 border border-slate-700"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4">
                    {getStatusIcon(service.status)}
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold mb-2">{service.service}</h3>
                      <p className="text-slate-300 mb-2">{service.description}</p>
                      <div className="flex items-center space-x-4 text-sm text-slate-400">
                        <span className="flex items-center space-x-1">
                          <Clock className="h-4 w-4" />
                          <span>{service.lastUpdated}</span>
                        </span>
                        {service.affected && (
                          <span className="flex items-center space-x-1">
                            <Users className="h-4 w-4" />
                            <span>{service.affected} affected</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(service.status)}`}>
                    {service.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Recent Incidents */}
      <section className="px-6 py-20 bg-slate-800/50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold mb-8 text-center">Recent Incidents</h2>
          <div className="space-y-6">
            {recentIncidents.map((incident) => (
              <div key={incident.id} className="bg-slate-800 rounded-lg p-6 border border-slate-700">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-xl font-semibold">{incident.title}</h3>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getIncidentStatusColor(incident.status)}`}>
                    {incident.status}
                  </span>
                </div>
                <p className="text-slate-300 mb-3">{incident.description}</p>
                <div className="text-sm text-slate-400 space-y-1">
                  <div className="flex items-center space-x-2">
                    <Clock className="h-4 w-4" />
                    <span>Started: {incident.started}</span>
                  </div>
                  {incident.resolved && (
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span>Resolved: {incident.resolved}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Subscribe to Updates */}
      <section className="px-6 py-20">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">Stay Informed</h2>
          <p className="text-xl text-slate-300 mb-8">
            Subscribe to status updates and get notified about service disruptions
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-md mx-auto">
            <input
              type="email"
              placeholder="Enter your email"
              className="flex-1 px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg font-semibold transition">
              Subscribe
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 py-12 border-t border-slate-700">
        <div className="max-w-6xl mx-auto text-center text-slate-400">
          <p>&copy; 2024 StarLink Internet. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
