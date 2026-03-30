"use client";

import { useEffect, useState } from "react";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";

interface SilentLoginFormProps {
  username?: string;
  tempPassword?: string; // For MAC login (from token exchange)
  isTemporaryLogin?: boolean; // True if using temporary password (MAC login)
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

/**
 * SilentLoginForm - Auto-login component for MikroTik hotspot using API
 * 
 * Uses the backend API to perform silent login instead of form submission.
 * This calls the MikroTik service's SilentLogin method which forces an active session.
 * 
 * Two modes:
 * 1. SIGNUP MODE (with stored password):
 *    - User just signed up, password in localStorage
 *    - After payment completed, auto-login happens via API
 *    
 * 2. LOGIN MODE (with temporary password):
 *    - User connecting via WiFi with active plan
 *    - MAC verified, temporary password generated
 *    - Automatic login with single-use temp password via API
 * 
 * Requirements: MAC address and IP address from WiFi connection
 */
export function SilentLoginForm({ 
  username, 
  tempPassword,
  isTemporaryLogin = false,
  onSuccess, 
  onError 
}: SilentLoginFormProps) {
  const [status, setStatus] = useState<'connecting' | 'success' | 'error'>('connecting');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const performSilentLogin = async () => {
      console.log('🔐 ===== SILENT LOGIN FORM START =====');
      console.log('🔐 SilentLoginForm: Starting API-based silent login process...');
      console.log(`🔐 Mode: ${isTemporaryLogin ? 'MAC Login (Temp Password)' : 'Signup (Stored Password)'}`);

      // Determine password source based on login mode
      let passwordToUse = tempPassword;
      if (!passwordToUse) {
        // Signup mode: try to get from localStorage
        const storedPassword = localStorage.getItem('wifiSessionPassword');
        if (!storedPassword) {
          const errorMsg = 'Password not found for silent login';
          console.warn('⚠️ SilentLoginForm:', errorMsg);
          setStatus('error');
          setErrorMessage(errorMsg);
          onError?.(errorMsg);
          return;
        }
        passwordToUse = storedPassword;
      }

      // Get WiFi session data from localStorage (stored by AuthContext)
      const storedUsername = localStorage.getItem('wifiSessionUsername');
      const macAddress = localStorage.getItem('macAddress');
      const ipAddress = localStorage.getItem('userIp');

      console.log('📱 SilentLoginForm: Retrieved WiFi data:', {
        hasPassword: !!passwordToUse,
        storedUsername: storedUsername,
        macAddress: macAddress,
        ipAddress: ipAddress
      });

      // Use provided username or stored username
      const finalUsername = username || storedUsername;

      // Check required data
      if (!finalUsername) {
        const errorMsg = 'Username not found for silent login';
        console.warn('⚠️ SilentLoginForm:', errorMsg);
        setStatus('error');
        setErrorMessage(errorMsg);
        onError?.(errorMsg);
        return;
      }

      if (!macAddress || !ipAddress) {
        const errorMsg = 'MAC address or IP address not found. User may need to connect to WiFi first.';
        console.warn('⚠️ SilentLoginForm:', errorMsg);
        setStatus('error');
        setErrorMessage(errorMsg);
        onError?.(errorMsg);
        return;
      }

      // Get duration from localStorage (set during payment/signup)
      const durationHours = parseInt(localStorage.getItem('wifiSessionDuration') || '24');
      console.log('⏱️ SilentLoginForm: Session duration:', durationHours, 'hours');

      console.log('🚀 SilentLoginForm: Calling backend silent login API...');
      console.log('   👤 Username:', finalUsername);
      console.log('   📍 MAC:', macAddress);
      console.log('   🌐 IP:', ipAddress);
      console.log('   ⏱️ Duration:', durationHours, 'hours');

      // Call backend API for silent login
      const apiUrl = `${process.env.NEXT_PUBLIC_API_URL || 'https://splendid-starlink.onrender.com'}/auth/silent-login`;
      console.log('🔗 API URL:', apiUrl);

      try {
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            username: finalUsername,
            password: passwordToUse,
            macAddress,
            ipAddress,
            durationHours,
          }),
        });

        console.log('📡 API Response status:', response.status);
        console.log('📡 API Response headers:', Object.fromEntries(response.headers.entries()));

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error('❌ API Error response:', errorData);
          throw new Error(errorData.message || `Silent login failed: ${response.statusText}`);
        }

        const result = await response.json();
        console.log('✅ SilentLoginForm: Silent login API response:', result);

        // Clear sensitive data
        if (!isTemporaryLogin) {
          localStorage.removeItem('wifiSessionPassword');
          localStorage.removeItem('wifiSessionUsername');
          console.log('🧹 Cleared sensitive WiFi data from localStorage');
        }

        setStatus('success');
        console.log('🔐 ===== SILENT LOGIN FORM SUCCESS =====');
        onSuccess?.();

      } catch (error: any) {
        console.error('❌ ===== SILENT LOGIN FORM FAILED =====');
        console.error('❌ Error message:', error.message);
        console.error('❌ Error object:', error);
        setStatus('error');
        setErrorMessage(error.message);
        onError?.(error.message);
      }
    };

    performSilentLogin();
  }, [username, tempPassword, isTemporaryLogin, onSuccess, onError]);

  // Render loading state
  if (status === 'connecting') {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-8">
        <Loader2 className="h-12 w-12 animate-spin text-amber-700 mb-6" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Connecting to WiFi</h2>
        <p className="text-gray-600 text-center mb-6">
          Automatically logging you into the hotspot...
        </p>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-sm text-center">
          <p className="text-sm text-blue-800">
            This may take a few seconds. Please wait...
          </p>
        </div>
      </div>
    );
  }

  // Render success state
  if (status === 'success') {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-8">
        <CheckCircle2 className="h-16 w-16 text-green-500 mb-6" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Connected!</h2>
        <p className="text-gray-600 text-center mb-6">
          You are now connected to the internet.
        </p>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 max-w-sm text-center mb-8">
          <p className="text-sm text-green-800">
            ✅ Hotspot authentication successful
          </p>
        </div>
        <a
          href="/dashboard"
          className="bg-amber-700 hover:bg-amber-800 text-white font-semibold px-6 py-3 rounded-lg transition"
        >
          Go to Dashboard
        </a>
      </div>
    );
  }

  // Render error state
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-8">
      <AlertCircle className="h-16 w-16 text-red-500 mb-6" />
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Connection Failed</h2>
      <p className="text-gray-600 text-center mb-6">
        {errorMessage || 'Unable to connect to the hotspot automatically.'}
      </p>
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 max-w-sm text-center mb-8">
        <p className="text-sm text-red-800 mb-2">
          You may need to enter your credentials manually at the hotspot login page.
        </p>
        <p className="text-xs text-red-700">
          Try refreshing this page or reconnecting to the WiFi network.
        </p>
      </div>
      <a
        href="/dashboard"
        className="bg-amber-700 hover:bg-amber-800 text-white font-semibold px-6 py-3 rounded-lg transition"
      >
        Go to Dashboard
      </a>
    </div>
  );
}
