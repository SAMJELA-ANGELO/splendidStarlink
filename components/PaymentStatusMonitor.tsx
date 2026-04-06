"use client";

import { useEffect, useState } from "react";
import { Loader2, CheckCircle2, AlertCircle, LogIn, Wifi, Clock } from "lucide-react";

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
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [modalCountdown, setModalCountdown] = useState<number | null>(null);
  const [attemptCount, setAttemptCount] = useState(0);

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
            console.log('✅ Payment SUCCESSFUL - triggering redirect to success page');
            console.log('✅ Activation data:', data.activation);
            console.log('✅ Is Gift:', data.isGift);

            setPaymentData(data);

            // Store duration for success page
            if (data.activation?.plan?.duration) {
              localStorage.setItem('wifiSessionDuration', data.activation.plan.duration.toString());
              console.log(`⏱️ Stored session duration: ${data.activation.plan.duration} hours`);
            }

            // Store username for success page
            if (data.activation?.username) {
              localStorage.setItem('wifiSessionUsername', data.activation.username);
              console.log(`👤 Stored username: ${data.activation.username}`);
            }

            // Store gift information if applicable
            if (data.isGift) {
              localStorage.setItem('wifiPaymentIsGift', 'true');
              console.log(`🎁 This is a gift payment`);
            }

            if (data.recipientUsername) {
              localStorage.setItem('wifiPaymentRecipientUsername', data.recipientUsername);
              console.log(`🎁 Recipient: ${data.recipientUsername}`);
            }

            setStatus('success');
            setShowSuccessModal(true);
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

  // On successful payment, show success modal and redirect to login
  useEffect(() => {
    if (status === 'success' && showSuccessModal) {
      console.log('🌐 ===== PAYMENT SUCCESS MODAL =====');
      console.log('🌐 Showing success modal, will redirect to login in 5 seconds...');

      // Auto-redirect after 5 seconds
      setModalCountdown(5);
      const countdownInterval = setInterval(() => {
        setModalCountdown(prev => prev !== null && prev > 0 ? prev - 1 : null);
      }, 1000);

      const timer = setTimeout(() => {
        console.log('🌐 ===== EXECUTING REDIRECT TO MIKROTIK LOGIN =====');
        clearInterval(countdownInterval);
        redirectToMikroTikLogin();
      }, 5000);

      return () => {
        clearTimeout(timer);
        clearInterval(countdownInterval);
      };
    }
  }, [status, showSuccessModal]);

  const redirectToMikroTikLogin = () => {
    const wifiLinkLogin = localStorage.getItem('wifiLinkLogin');
    const wifiLinkOrig = localStorage.getItem('wifiLinkOrig');
    const captivePortalUrl = wifiLinkLogin || wifiLinkOrig;

    if (captivePortalUrl) {
      console.log('🔄 Redirecting to MikroTik captive portal:', captivePortalUrl);
      window.location.href = captivePortalUrl;
    } else {
      // Fallback to a typical MikroTik login URL
      console.log('🔄 No captive portal URL found, redirecting to default MikroTik login');
      window.location.href = 'http://10.0.0.1/login';
    }
  };

  // Render different states - all fullscreen overlay
  if (status === 'checking') {
    return (
      <div className="fixed inset-0 bg-white flex flex-col items-center justify-center p-8 z-[100] overflow-y-auto" style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 100 }}>
        <div className="flex flex-col items-center justify-center">
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
      </div>
    );
  }

  if (status === 'success') {
    return null; // Modal will be shown instead
  }

  // Failed state
  return (
    <div className="fixed inset-0 bg-white flex flex-col items-center justify-center p-8 z-[100] overflow-y-auto" style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 100 }}>
      <div className="flex flex-col items-center justify-center">
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
    </div>
  );

  // Success Modal
  if (showSuccessModal && status === 'success') {
    const username = localStorage.getItem('wifiSessionUsername') || 'Your Account';
    const duration = localStorage.getItem('wifiSessionDuration') || 'Standard Plan';
    const isGift = localStorage.getItem('wifiPaymentIsGift') === 'true';
    const recipientUsername = localStorage.getItem('wifiPaymentRecipientUsername');

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[100]" style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 100 }}>
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-green-500 to-green-600 px-6 py-8 flex flex-col items-center">
            <div className="bg-white bg-opacity-20 rounded-full p-3 mb-4">
              <CheckCircle2 size={40} className="text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white text-center">
              Payment Successful!
            </h2>
          </div>

          {/* Content */}
          <div className="p-6">
            <div className="text-center mb-6">
              <p className="text-gray-700 text-lg font-semibold mb-2">
                {isGift
                  ? `Gift sent to ${recipientUsername}`
                  : 'Your plan is now active!'}
              </p>
              <p className="text-gray-600 text-sm">
                {isGift
                  ? 'The recipient can now log in with their credentials'
                  : 'You can now connect to the WiFi and access the internet'}
              </p>
            </div>

            {/* Session Details */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-gray-700">
                  <div className="bg-blue-100 rounded-full p-1.5">
                    <Wifi size={16} className="text-blue-700" />
                  </div>
                  <span className="font-medium text-sm">Username</span>
                </div>
                <span className="font-semibold text-gray-900 text-sm">
                  {username}
                </span>
              </div>

              <div className="h-px bg-gray-200" />

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-gray-700">
                  <div className="bg-orange-100 rounded-full p-1.5">
                    <Clock size={16} className="text-orange-700" />
                  </div>
                  <span className="font-medium text-sm">Duration</span>
                </div>
                <span className="font-semibold text-gray-900 text-sm">
                  {duration} {duration !== 'Standard Plan' ? 'hours' : ''}
                </span>
              </div>
            </div>

            {/* Auto-redirect Notice */}
            {modalCountdown !== null && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4 text-center">
                <p className="text-sm text-amber-800">
                  Redirecting to login portal in {modalCountdown} second{modalCountdown !== 1 ? 's' : ''}...
                </p>
              </div>
            )}

            {/* Instructions */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <h3 className="font-semibold text-blue-900 mb-2 text-sm">What's Next?</h3>
              <ol className="text-xs text-blue-800 space-y-1">
                <li className="flex items-start gap-2">
                  <span className="font-bold flex-shrink-0">1.</span>
                  <span>
                    {isGift
                      ? 'Share the login credentials with the recipient'
                      : 'Connect to your WiFi network'}
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold flex-shrink-0">2.</span>
                  <span>Log in with your username and password</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold flex-shrink-0">3.</span>
                  <span>Enjoy unlimited internet access!</span>
                </li>
              </ol>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={redirectToMikroTikLogin}
                className="flex-1 bg-amber-700 hover:bg-amber-800 text-white font-semibold py-3 px-4 rounded-lg transition flex items-center justify-center gap-2"
              >
                <LogIn size={18} />
                Go to Login Portal
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
};
