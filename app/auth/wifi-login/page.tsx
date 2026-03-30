"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { SilentLoginForm } from "@/components/SilentLoginForm";

/**
 * WiFi Login Page - Handles MAC-based login with session token
 * 
 * Flow:
 * 1. User connects to WiFi and is redirected here
 * 2. Check-mac endpoint was called, session token stored
 * 3. This page exchanges token for temporary credentials
 * 4. Uses SilentLoginForm to auto-login with temp password
 * 5. No manual password entry needed - completely automatic
 */
function WiFiLoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [status, setStatus] = useState<"exchanging" | "ready" | "error">("exchanging");
  const [credentials, setCredentials] = useState<{ username: string; tempPassword: string } | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    exchangeTokenForCredentials();
  }, []);

  const exchangeTokenForCredentials = async () => {
    try {
      // Get MAC from URL or localStorage
      const macFromUrl = searchParams.get("mac");
      const macFromStorage = localStorage.getItem("wifiMacAddress");
      const mac = macFromUrl || macFromStorage;

      // Get session token from localStorage
      const sessionToken = localStorage.getItem("wifiSessionToken");

      if (!mac || !sessionToken) {
        setErrorMessage("Session information missing. Please reconnect to WiFi.");
        setStatus("error");
        console.error("❌ Missing MAC or session token");
        return;
      }

      console.log("🔑 Exchanging session token for hotspot credentials...");

      // Exchange token for temporary credentials
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "https://splendid-starlink.onrender.com"}/auth/hotspot-login`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionToken, mac }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        setErrorMessage(data.message || "Failed to exchange credentials");
        setStatus("error");
        console.error("❌ Token exchange failed:", data);
        return;
      }

      console.log("✅ Credentials received, ready for silent login");
      console.log("   Username:", data.username);
      console.log("   Temp password: [HIDDEN]");

      // Store credentials temporarily (will be used by SilentLoginForm)
      setCredentials({
        username: data.username,
        tempPassword: data.tempPassword,
      });

      // Clean up: Remove session token from storage (single-use)
      localStorage.removeItem("wifiSessionToken");
      localStorage.removeItem("wifiMacAddress");

      setStatus("ready");
    } catch (error: any) {
      setErrorMessage(error.message || "Failed to process credentials");
      setStatus("error");
      console.error("❌ Error exchanging token:", error);
    }
  };

  // Show error state
  if (status === "error") {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-8">
        <AlertCircle className="h-16 w-16 text-red-500 mb-6" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Login Failed</h2>
        <p className="text-gray-600 text-center mb-6 max-w-sm">{errorMessage}</p>

        <div className="flex gap-4">
          <button
            onClick={() => router.push("/")}
            className="bg-amber-700 hover:bg-amber-800 text-white font-semibold px-6 py-3 rounded-lg transition"
          >
            Reconnect to WiFi
          </button>
          <button
            onClick={() => router.push("/auth/login")}
            className="bg-gray-200 hover:bg-gray-300 text-gray-900 font-semibold px-6 py-3 rounded-lg transition"
          >
            Manual Login
          </button>
        </div>

        <p className="mt-8 text-sm text-gray-500 text-center max-w-sm">
          If this error persists, your WiFi session may have expired.
          <br />
          Please reconnect to the WiFi network and try again.
        </p>
      </div>
    );
  }

  // Show loading state while exchanging token
  if (status === "exchanging") {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-8">
        <Loader2 className="h-12 w-12 animate-spin text-amber-700 mb-6" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Authenticating...</h2>
        <p className="text-gray-600 text-center">
          Verifying your WiFi session and preparing login credentials
        </p>
        
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>Do not close this window</p>
        </div>
      </div>
    );
  }

  // Show silent login form when credentials are ready
  if (status === "ready" && credentials) {
    return (
      <SilentLoginForm
        username={credentials.username}
        tempPassword={credentials.tempPassword}
        isTemporaryLogin={true}
        onSuccess={() => {
          console.log("✅ WiFi login successful!");
          // Redirect to dashboard or wait for MikroTik redirect
          setTimeout(() => {
            router.push("/dashboard");
          }, 2000);
        }}
        onError={(error) => {
          console.error("❌ WiFi login error:", error);
          setErrorMessage(error);
          setStatus("error");
        }}
      />
    );
  }

  return null;
}

export default function WiFiLoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-amber-700" /></div>}>
      <WiFiLoginPageContent />
    </Suspense>
  );
}
