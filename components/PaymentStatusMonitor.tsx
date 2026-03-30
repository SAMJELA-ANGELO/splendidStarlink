"use client";

import { useEffect, useState } from "react";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { SilentLoginForm } from "@/components/SilentLoginForm";

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

  useEffect(() => {
    const pollPaymentStatus = async () => {
      try {
        if (attemptCount >= maxAttempts) {
          setStatus("failed");
          const msg = "Payment status check timed out. Please verify payment manually on your account.";
          setErrorMessage(msg);
          onPaymentFailed?.(msg);
          return;
        }

        console.log(`💳 Polling payment status: ${transactionId} (attempt ${attemptCount + 1}/${maxAttempts})`);

        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || 'https://splendid-starlink.onrender.com'}/payments/status/${transactionId}`
        );

        if (!response.ok) {
          throw new Error(`Status check failed: ${response.statusText}`);
        }

        const data = await response.json();
        console.log('💳 Payment status response:', data);

        switch (data.status) {
          case 'SUCCESSFUL':
            console.log('✅ Payment SUCCESSFUL - triggering silent login');
            setPaymentData(data);
            
            // Store duration for silent login
            if (data.activation?.plan?.duration) {
              localStorage.setItem('wifiSessionDuration', data.activation.plan.duration.toString());
              console.log(`⏱️ Stored session duration: ${data.activation.plan.duration} hours`);
            }
            
            setStatus('success');
            onPaymentSuccess?.(data);
            break;

          case 'FAILED':
            console.error('❌ Payment FAILED');
            setStatus('failed');
            setErrorMessage(data.message || 'Payment was declined by the provider');
            onPaymentFailed?.(data.message || 'Payment failed');
            break;

          case 'EXPIRED':
            console.warn('⏱️ Payment EXPIRED');
            setStatus('failed');
            setErrorMessage('Payment request has expired. Please initiate a new payment.');
            onPaymentFailed?.('Payment expired');
            break;

          case 'pending':
          case 'created':
            // Still pending, continue polling
            console.log(`⏳ Payment still ${data.status}, will check again...`);
            setAttemptCount(prev => prev + 1);
            break;

          default:
            console.log(`❓ Unknown payment status: ${data.status}`);
            setAttemptCount(prev => prev + 1);
        }
      } catch (error: any) {
        console.error('❌ Error checking payment status:', error.message);
        // Continue polling on error
        setAttemptCount(prev => prev + 1);
      }
    };

    // Only set up polling if we haven't reached a terminal state
    if (status === 'checking' && attemptCount < maxAttempts) {
      const timer = setTimeout(pollPaymentStatus, pollInterval);
      return () => clearTimeout(timer);
    }
  }, [transactionId, status, attemptCount, pollInterval, maxAttempts, onPaymentSuccess, onPaymentFailed]);

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

  if (status === 'success' && paymentData?.activation?.readyForSilentLogin) {
    // Payment successful and ready for silent WiFi login
    return (
      <SilentLoginForm
        username={paymentData.activation.username}
        onSuccess={() => {
          console.log('✅ Silent login successful!');
          // Could redirect to dashboard or wait for MikroTik redirect
        }}
        onError={(error) => {
          console.error('❌ Silent login error:', error);
          setStatus('failed');
          setErrorMessage(`Silent login failed: ${error}`);
        }}
      />
    );
  }

  if (status === 'success') {
    // Payment successful but no silent login (gift flow or other reason)
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-8">
        <CheckCircle2 className="h-16 w-16 text-green-500 mb-6" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Payment Successful!</h2>
        <p className="text-gray-600 text-center mb-6">
          {paymentData?.activation?.message || 'Your payment has been processed successfully.'}
        </p>

        <div className="bg-green-50 border border-green-200 rounded-lg p-4 max-w-sm text-center mb-8">
          <p className="text-sm text-green-800 mb-2">
            ✅ Your account is now active
          </p>
          {paymentData?.activation?.sessionExpiry && (
            <p className="text-xs text-green-700">
              Session expires: {new Date(paymentData.activation.sessionExpiry).toLocaleString()}
            </p>
          )}
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
