"use client";

import { useEffect, useState } from "react";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";

interface PaymentStatusMonitorProps {
  transactionId: string;
  onPaymentSuccess?: (data: any) => void;
  onPaymentFailed?: (error: string) => void;
  pollInterval?: number; // ms between polls, default 3000
  maxAttempts?: number; // max polling attempts, default 40 (2 minutes)
}

/**
 * PaymentStatusMonitor - Polls payment status and triggers silent login
 * 
 * After user initiates payment, this component:
 * 1. Periodically checks payment status from backend
 * 2. When payment is SUCCESSFUL:
 *    - Extracts username from activation response
 *    - Renders SilentLoginForm to auto-login user to MikroTik
 *    - User gets internet access immediately
 * 3. Handles payment failures gracefully
 */
export function PaymentStatusMonitor({
  transactionId,
  onPaymentSuccess,
  onPaymentFailed,
  pollInterval = 3000,
  maxAttempts = 40,
}: PaymentStatusMonitorProps) {
  const [status, setStatus] = useState<"checking" | "success" | "failed">("checking");
  const [paymentData, setPaymentData] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [attemptCount, setAttemptCount] = useState(0);
  const [redirectCountdown, setRedirectCountdown] = useState<number | null>(null);

  useEffect(() => {
    const pollPaymentStatus = async () => {
      console.log('💳 ===== PAYMENT STATUS MONITOR POLL START =====');
      console.log(`💳 Polling payment status: ${transactionId} (attempt ${attemptCount + 1}/${maxAttempts})`);

      try {
        const apiUrl = `${process.env.NEXT_PUBLIC_API_URL || 'https://splendid-starlink.onrender.com'}/payments/status/${transactionId}`;
        console.log('🔗 Payment status API URL:', apiUrl);

        const response = await fetch(apiUrl);

        console.log('📡 Payment status API response status:', response.status);
        console.log('📡 Payment status API response headers:', Object.fromEntries(response.headers.entries()));

        if (!response.ok) {
          const errorText = await response.text();
          console.error('❌ Payment status API error response:', errorText);
          throw new Error(`Status check failed: ${response.statusText}`);
        }

        const data = await response.json();
        console.log('💳 Payment status response data:', data);
        console.log('💳 Payment status:', data.status);

        switch (data.status) {
          case 'SUCCESSFUL':
            console.log('✅ ===== PAYMENT SUCCESSFUL =====');
            console.log('✅ Payment SUCCESSFUL - triggering silent login');
            console.log('✅ Activation data:', data.activation);
            console.log('✅ Ready for silent login:', data.activation?.readyForSilentLogin);

            setPaymentData(data);

            // Store duration for silent login
            if (data.activation?.plan?.duration) {
              localStorage.setItem('wifiSessionDuration', data.activation.plan.duration.toString());
              console.log(`⏱️ Stored session duration: ${data.activation.plan.duration} hours`);
            }

            // Store username for silent login
            if (data.activation?.username) {
              localStorage.setItem('wifiSessionUsername', data.activation.username);
              console.log(`👤 Stored username for silent login: ${data.activation.username}`);
            }

            setStatus('success');
            console.log('✅ ===== PAYMENT STATUS MONITOR SUCCESS =====');
            onPaymentSuccess?.(data);
            break;

          case 'FAILED':
            console.error('❌ ===== PAYMENT FAILED =====');
            console.error('❌ Payment FAILED - reason:', data.message);
            setStatus('failed');
            setErrorMessage(data.message || 'Payment was declined by the provider');
            onPaymentFailed?.(data.message || 'Payment failed');
            break;

          case 'EXPIRED':
            console.warn('⏱️ ===== PAYMENT EXPIRED =====');
            console.warn('⏱️ Payment EXPIRED - request expired');
            setStatus('failed');
            setErrorMessage('Payment request has expired. Please initiate a new payment.');
            onPaymentFailed?.('Payment expired');
            break;

          case 'pending':
          case 'created':
            // Still pending, continue polling
            console.log(`⏳ Payment still ${data.status}, will check again in ${pollInterval}ms...`);
            console.log('⏳ ===== PAYMENT STATUS MONITOR CONTINUE POLLING =====');
            setAttemptCount(prev => prev + 1);
            break;

          default:
            console.log(`❓ ===== UNKNOWN PAYMENT STATUS =====`);
            console.log(`❓ Unknown payment status: ${data.status}`);
            console.log('❓ Full response data:', data);
            setAttemptCount(prev => prev + 1);
        }
      } catch (error: any) {
        console.error('❌ ===== PAYMENT STATUS MONITOR ERROR =====');
        console.error('❌ Error checking payment status:', error.message);
        console.error('❌ Error object:', error);
        // Continue polling on error
        setAttemptCount(prev => prev + 1);
      }
    };

    // Only set up polling if we haven't reached a terminal state
    if (status === 'checking' && attemptCount < maxAttempts) {
      console.log(`⏰ Setting up next poll in ${pollInterval}ms...`);
      const timer = setTimeout(pollPaymentStatus, pollInterval);
      return () => clearTimeout(timer);
    }
  }, [transactionId, status, attemptCount, pollInterval, maxAttempts, onPaymentSuccess, onPaymentFailed]);

  // On successful payment, redirect to captive portal login page (or fallback to /auth/login)
  useEffect(() => {
    if (status === 'success') {
      const wifiLinkLogin = localStorage.getItem('wifiLinkLogin');
      const wifiLinkOrig = localStorage.getItem('wifiLinkOrig');
      
      const captivePortalUrl =
        wifiLinkLogin ||
        wifiLinkOrig ||
        '/auth/login';

      console.log('🌐 ===== PAYMENT SUCCESS REDIRECT =====');
      console.log('🌐 wifiLinkLogin from localStorage:', wifiLinkLogin);
      console.log('🌐 wifiLinkOrig from localStorage:', wifiLinkOrig);
      console.log('🌐 Final captive portal URL:', captivePortalUrl);
      console.log('🌐 Will redirect in 2 seconds...');

      // Start countdown
      setRedirectCountdown(2);
      const countdownInterval = setInterval(() => {
        setRedirectCountdown(prev => prev !== null && prev > 0 ? prev - 1 : null);
      }, 1000);

      const timer = setTimeout(() => {
        console.log('🌐 ===== EXECUTING REDIRECT =====');
        console.log('🌐 Redirecting to:', captivePortalUrl);
        clearInterval(countdownInterval);
        try {
          window.location.href = captivePortalUrl;
        } catch (error) {
          console.error('🌐 ===== REDIRECT FAILED =====');
          console.error('🌐 Error redirecting to captive portal:', error);
        }
      }, 2000);

      return () => {
        clearTimeout(timer);
        clearInterval(countdownInterval);
      };
    }
  }, [status]);

  // Render different states
  if (status === 'checking') {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-8">
        <Loader2 className="h-12 w-12 animate-spin text-amber-700 mb-6" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Processing Payment</h2>
        <p className="text-gray-600 text-center mb-6">
          Verifying your payment with Fapshi...
        </p>
        <p className="text-sm text-gray-500 mb-8">
          Attempt {attemptCount + 1} of {maxAttempts}
        </p>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-sm text-center">
          <p className="text-sm text-blue-800">
            Do not refresh or close this page. We're checking your payment status.
          </p>
        </div>

        <div className="mt-8 text-center text-xs text-gray-500 max-w-sm">
          <p>
            Transaction ID: <code className="bg-gray-100 px-2 py-1 rounded text-gray-700">{transactionId}</code>
          </p>
        </div>
      </div>
    );
  }

  if (status === 'success') {
    const captivePortalUrl =
      localStorage.getItem('wifiLinkLogin') ||
      localStorage.getItem('wifiLinkOrig') ||
      '/auth/login';

    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-8">
        <CheckCircle2 className="h-16 w-16 text-green-500 mb-6" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Payment Successful!</h2>
        <p className="text-gray-600 text-center mb-6">
          {paymentData?.activation?.message || 'Your plan is activated. Redirecting you to your WiFi portal for normal login...'}
        </p>

        {redirectCountdown !== null && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-sm text-center mb-4">
            <p className="text-sm text-blue-800">
              Redirecting in {redirectCountdown} second{redirectCountdown !== 1 ? 's' : ''}...
            </p>
          </div>
        )}

        <div className="bg-green-50 border border-green-200 rounded-lg p-4 max-w-sm text-center mb-8">
          <p className="text-sm text-green-800 mb-2">
            If redirect does not start automatically, click the button below.
          </p>
          <p className="text-xs text-green-700">
            Or use your browser's back button to return to the captive portal.
          </p>
        </div>

        <a
          href={captivePortalUrl}
          className="bg-amber-700 hover:bg-amber-800 text-white font-semibold px-6 py-3 rounded-lg transition"
        >
          Go to Captive Portal
        </a>
      </div>
    );
  }

  // Failed state
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-8">
      <AlertCircle className="h-16 w-16 text-red-500 mb-6" />
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Payment Failed</h2>
      <p className="text-gray-600 text-center mb-6">
        {errorMessage || 'Unable to process your payment at this time.'}
      </p>

      <div className="bg-red-50 border border-red-200 rounded-lg p-4 max-w-sm text-center mb-8">
        <p className="text-sm text-red-800 mb-2">
          Transaction ID: <code className="bg-red-100 px-2 py-1 rounded">{transactionId}</code>
        </p>
      </div>

      <div className="flex gap-4">
        <a
          href="/dashboard?tab=bundles"
          className="bg-amber-700 hover:bg-amber-800 text-white font-semibold px-6 py-3 rounded-lg transition"
        >
          Try Again
        </a>
        <a
          href="/dashboard"
          className="bg-gray-200 hover:bg-gray-300 text-gray-900 font-semibold px-6 py-3 rounded-lg transition"
        >
          Go to Dashboard
        </a>
      </div>

      <div className="mt-8 text-center text-xs text-gray-500 max-w-sm">
        <p className="mb-2">
          If you believe this is an error, please contact support with your transaction ID.
        </p>
      </div>
    </div>
  );
}
