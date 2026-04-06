'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2, CheckCircle2, AlertCircle, LogIn } from 'lucide-react';

type PaymentData = {
  status?: string;
  message?: string;
  activation?: {
    username?: string;
    sessionExpiry?: string;
  };
  isGift?: boolean;
  recipientUsername?: string;
  [key: string]: unknown;
};

interface PaymentStatusMonitorProps {
  transactionId: string;
  variant?: 'bundle' | 'gift';
  planDuration?: number;
  recipientUsername?: string;
  recipientPassword?: string;
  onPaymentSuccess?: (data: PaymentData) => void;
  onPaymentFailed?: (error: string) => void;
  onRedirect?: () => void;
  onCancel?: () => void;
  routerIdentity?: string;
  pollInterval?: number;
  maxAttempts?: number;
}

export function PaymentStatusMonitor({
  transactionId,
  variant = 'bundle',
  planDuration,
  recipientUsername,
  recipientPassword,
  onPaymentSuccess,
  onPaymentFailed,
  onRedirect,
  onCancel,
  routerIdentity,
  pollInterval = 3000,
  maxAttempts = 40,
}: PaymentStatusMonitorProps) {
  const [status, setStatus] = useState<'CHECKING' | 'SUCCESSFUL' | 'FAILED' | null>(null);
  const [isCancelled, setIsCancelled] = useState(false);
  const [paymentData, setPaymentData] = useState<PaymentData | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [countdown, setCountdown] = useState(5);
  const [attemptCount, setAttemptCount] = useState(0);

  // Main polling effect
  useEffect(() => {
    if (status !== null || attemptCount >= maxAttempts || isCancelled) {
      return; 
    }

    const pollPaymentStatus = async () => {
      try {
        const apiUrl = `${process.env.NEXT_PUBLIC_API_URL || 'https://splendid-starlink.onrender.com'}/payments/status/${transactionId}`;
        console.log(`🔄 [Poll ${attemptCount + 1}/${maxAttempts}]`, apiUrl);

        const response = await fetch(apiUrl);
        if (!response.ok) {
          throw new Error(`API error: ${response.statusText}`);
        }

        const data = (await response.json()) as PaymentData;
        console.log('📊 Payment response:', data);

        const statusUpper = (data.status || '').toUpperCase();

        if (statusUpper === 'SUCCESSFUL') {
          console.log('✅ SUCCESSFUL:', data);
          setPaymentData(data);
          setStatus('SUCCESSFUL');

          // Store data
          if (data.activation?.username) {
            localStorage.setItem('wifiSessionUsername', data.activation.username);
          }
          if (data.activation?.sessionExpiry) {
            const hours = Math.round(
              (new Date(data.activation.sessionExpiry).getTime() - new Date().getTime()) / (1000 * 60 * 60)
            );
            localStorage.setItem('wifiSessionDuration', `${hours} hours`);
          }
          if (data.isGift) {
            localStorage.setItem('wifiPaymentIsGift', 'true');
          }
          if (data.recipientUsername) {
            localStorage.setItem('wifiPaymentRecipientUsername', data.recipientUsername);
          }

          onPaymentSuccess?.(data);
          return;
        }

        if (statusUpper === 'FAILED') {
          console.log('❌ FAILED');
          const message = data.message?.toString().trim() || 'Payment declined';
          setStatus('FAILED');
          setErrorMessage(message);
          onPaymentFailed?.(message);
          return;
        }

        if (statusUpper === 'EXPIRED') {
          const message = 'Payment request expired. Please try again.';
          setStatus('FAILED');
          setErrorMessage(message);
          onPaymentFailed?.('Payment expired');
          return;
        }

        // Still pending
        console.log(`⏳ Still pending, retry...`);
        setAttemptCount(prev => prev + 1);
      } catch (error: unknown) {
        const message =
          error instanceof Error
            ? error.message
            : typeof error === 'string'
            ? error
            : error !== null && typeof error === 'object'
            ? JSON.stringify(error)
            : 'Unknown error';

        console.error('❌ Error:', message);

        if (attemptCount + 1 >= maxAttempts) {
          const timeoutMessage = `Payment status polling failed: ${message}`;
          setStatus('FAILED');
          setErrorMessage(timeoutMessage);
          onPaymentFailed?.(timeoutMessage);
        } else {
          setAttemptCount(prev => prev + 1);
        }
      }
    };

    const timer = setTimeout(pollPaymentStatus, attemptCount === 0 ? 0 : pollInterval);
    return () => clearTimeout(timer);
  }, [status, attemptCount, maxAttempts, transactionId, pollInterval, onPaymentSuccess, onPaymentFailed]);

  const redirectToMikroTikLogin = useCallback(() => {
    const activeRouter =
      (paymentData?.activation as any)?.activeRouter || routerIdentity || 'Home';
    const routerKey = activeRouter.toString().toLowerCase();
    const url = routerKey.includes('school') || routerKey.includes('com')
      ? 'http://com.org/login'
      : 'http://tata.org/login';

    console.log('🔄 Redirecting to:', url, 'for router hint:', activeRouter);
    window.location.href = url;
    setTimeout(() => onRedirect?.(), 100);
  }, [onRedirect, paymentData?.activation, routerIdentity]);

  // Countdown effect
  useEffect(() => {
    if (status !== 'SUCCESSFUL') {
      return;
    }

    if (variant === 'gift') {
      console.log('🎁 Gift payment - staying on page');
      return;
    }

    console.log('🌐 Starting countdown...');
    let countdownValue = 5;

    const timer = setInterval(() => {
      countdownValue--;
      setCountdown(countdownValue);

      if (countdownValue <= 0) {
        clearInterval(timer);
        redirectToMikroTikLogin();
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [status, variant, redirectToMikroTikLogin]);

  // CHECKING STATE
  if (status === null) {
    const handleCancel = () => {
      if (isCancelled) return;
      setIsCancelled(true);
      console.log('🛑 Payment monitoring cancelled by user');
      onCancel?.();
    };

    return (
      <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
          <div className="bg-gradient-to-r from-blue-500 to-indigo-600 px-8 py-10 text-center">
            <div className="bg-white/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
              <Loader2 size={48} className="text-white animate-spin" />
            </div>
            <h2 className="text-3xl font-bold text-white">Processing Payment</h2>
          </div>
          <div className="p-8 text-center">
            <p className="text-gray-600 mb-4">Verifying with Fapshi...</p>
            <p className="text-sm text-gray-500 mb-6">Attempt {attemptCount + 1} of {maxAttempts}</p>
            <button
              type="button"
              onClick={handleCancel}
              className="inline-flex items-center justify-center px-5 py-3 rounded-lg border border-gray-300 text-sm font-semibold text-gray-700 hover:bg-gray-100 transition-colors"
            >
              Cancel payment
            </button>
          </div>
        </div>
      </div>
    );
  }

  // SUCCESS STATE
  if (status === 'SUCCESSFUL') {
    const username = paymentData?.activation?.username || localStorage.getItem('wifiSessionUsername') || 'Account';
    const duration = planDuration ? `${planDuration} hours` : localStorage.getItem('wifiSessionDuration') || '2 hours';
    const isGift = variant === 'gift';
    const displayUsername = isGift ? (recipientUsername || username) : username;
    const displayLabel = isGift ? 'Recipient Username' : 'Username';
    const displayPassword = isGift ? (recipientPassword || localStorage.getItem('wifiSessionPassword') || 'Generated') : null;

    return (
      <div className="fixed inset-0 z-[9999] bg-black/60 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-green-500 to-emerald-600 px-8 py-10 text-center">
            <div className="bg-white/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
              <CheckCircle2 size={48} className="text-white" />
            </div>
            <h2 className="text-3xl font-bold text-white">Success!</h2>
          </div>

          {/* Content */}
          <div className="p-8 space-y-6">
            {/* Message */}
            <div className="text-center">
              <p className="text-lg font-semibold text-gray-900 mb-2">
                {isGift ? `🎁 Gift sent to ${recipientUsername}` : '✅ All set!'}
              </p>
              <p className="text-gray-600 text-sm">
                {isGift ? 'They can now log in and connect' : 'Ready to connect'}
              </p>
            </div>

            {/* Details */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-700 font-medium">{displayLabel}</span>
                  <span className="font-bold text-gray-900 bg-white px-4 py-2 rounded-lg text-sm">
                    {displayUsername}
                  </span>
                </div>
                <div className="h-px bg-blue-200" />
                <div className="flex justify-between items-center">
                  <span className="text-gray-700 font-medium">Duration</span>
                  <span className="font-bold text-gray-900 bg-white px-4 py-2 rounded-lg text-sm">
                    {duration}
                  </span>
                </div>
                {isGift && (
                  <>
                    <div className="h-px bg-blue-200" />
                    <div className="flex justify-between items-center">
                      <span className="text-gray-700 font-medium">Password</span>
                      <span className="font-bold text-gray-900 bg-white px-4 py-2 rounded-lg text-sm font-mono">
                        {displayPassword}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Countdown or Success Message */}
            {isGift ? (
              <div className="bg-green-50 border-2 border-green-300 rounded-lg p-4 text-center">
                <p className="text-green-900 font-semibold">
                  🎉 Gift sent successfully!
                </p>
                <p className="text-green-700 text-sm mt-1">
                  {displayUsername} can now use their account with the credentials shown below.
                </p>
              </div>
            ) : (
              <div className="bg-amber-50 border-2 border-amber-300 rounded-lg p-5 text-center">
                <p className="text-amber-900 font-semibold mb-1">
                  ⏱️ Redirecting to login in <span className="text-2xl font-bold">{countdown}s</span>
                </p>
                <p className="text-xs text-amber-700">
                  If you are not redirected automatically, please click the button below.
                </p>
              </div>
            )}

            {/* Button */}
            <button
              onClick={variant === 'gift' ? () => onRedirect?.() : redirectToMikroTikLogin}
              className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold py-4 px-6 rounded-lg flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95"
            >
              <LogIn size={20} />
              {variant === 'gift' ? 'Close' : 'Connect to WiFi Now'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // FAILED STATE
  if (status === 'FAILED') {
    return (
      <div className="fixed inset-0 z-[9999] bg-black/60 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
          <div className="bg-gradient-to-r from-red-500 to-red-600 px-8 py-10 text-center">
            <div className="bg-white/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle size={48} className="text-white" />
            </div>
            <h2 className="text-3xl font-bold text-white">Payment Failed</h2>
          </div>
          <div className="p-8 text-center">
            <p className="text-gray-600 mb-6">{errorMessage}</p>
            <button
              onClick={() => (window.location.href = '/plans')}
              className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-lg transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
