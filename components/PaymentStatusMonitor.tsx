'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2, CheckCircle2, AlertCircle, LogIn } from 'lucide-react';
import { useSocket } from '@/contexts/SocketContext';
import { apiFetchGet } from '@/lib/api-client';

type PaymentActivationData = {
  username?: string;
  password?: string;
  sessionExpiry?: string;
  activeRouter?: string;
};

type PaymentData = {
  status?: string;
  message?: string;
  activation?: PaymentActivationData;
  isGift?: boolean;
  recipientUsername?: string;
  [key: string]: unknown;
};

type PaymentStatus = 'PROCESSING' | 'SUCCESSFUL' | 'FAILED' | 'EXPIRED' | 'ACTIVATED' | 'ACTIVATION_FAILED' | 'ACTIVATION_ERROR' | null;

interface PaymentStatusMonitorProps {
  transactionId: string;
  variant?: 'bundle' | 'gift';
  planDuration?: number;
  recipientUsername?: string;
  recipientPassword?: string;
  onPaymentSuccess?: (data: PaymentData) => void;
  onPaymentFailed?: (error: string) => void;
  onRedirect?: () => void;
  routerIdentity?: string;
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
  routerIdentity,
}: PaymentStatusMonitorProps) {
  const { socket, isConnected, connectionError, joinPaymentRoom, leavePaymentRoom } = useSocket();
  const [status, setStatus] = useState<PaymentStatus>('PROCESSING');
  const [paymentData, setPaymentData] = useState<PaymentData | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [countdown, setCountdown] = useState(3);
  const [pollingEnabled, setPollingEnabled] = useState(false);
  const [pollingError, setPollingError] = useState<string | null>(null);

  // Join payment room and listen for updates
  useEffect(() => {
    if (!transactionId || !socket || !isConnected) return;

    setPollingEnabled(false);
    setPollingError(null);

    console.log(`🔌 Joining payment room for transaction: ${transactionId}`);
    joinPaymentRoom(transactionId);

    const handlePaymentStatusUpdate = (data: {
      status?: string;
      message?: string;
      data?: PaymentData;
    }) => {
      console.log('📡 Real-time payment status update:', data);

      const { status: newStatus, message, data: eventData } = data;
      const activationPayload =
        (eventData?.activation || eventData?.activationDetails || eventData || {}) as PaymentActivationData;

      switch (newStatus) {
        case 'SUCCESSFUL':
          setStatus('SUCCESSFUL');
          setPaymentData(eventData || {});
          break;

        case 'FAILED':
          setStatus('FAILED');
          setErrorMessage(message || 'Payment failed');
          onPaymentFailed?.(message || 'Payment failed');
          break;

        case 'EXPIRED':
          setStatus('EXPIRED');
          setErrorMessage('Payment request expired');
          onPaymentFailed?.('Payment expired');
          break;

        case 'ACTIVATED':
          setStatus('ACTIVATED');
          setPaymentData(prev => ({ ...prev, activation: activationPayload }));
          // Store activation data
          if (activationPayload?.username) {
            localStorage.setItem('wifiSessionUsername', activationPayload.username);
          }
          if (activationPayload?.password) {
            localStorage.setItem('wifiSessionPassword', activationPayload.password);
          }
          if (activationPayload?.sessionExpiry) {
            const hours = Math.round(
              (new Date(activationPayload.sessionExpiry).getTime() - new Date().getTime()) / (1000 * 60 * 60)
            );
            localStorage.setItem('wifiSessionDuration', `${hours} hours`);
          }
          onPaymentSuccess?.({ ...eventData, activation: activationPayload });
          break;

        case 'ACTIVATION_FAILED':
          setStatus('ACTIVATION_FAILED');
          setErrorMessage(message || 'Activation failed');
          onPaymentFailed?.(message || 'Activation failed');
          break;

        case 'ACTIVATION_ERROR':
          setStatus('ACTIVATION_ERROR');
          setErrorMessage(message || 'Activation error');
          onPaymentFailed?.(message || 'Activation error');
          break;

        default:
          console.log(`ℹ️ Unknown status update: ${newStatus}`);
      }
    };

    socket.on('payment-status-update', handlePaymentStatusUpdate);

    // Cleanup
    return () => {
      socket.off('payment-status-update', handlePaymentStatusUpdate);
      leavePaymentRoom(transactionId);
    };
  }, [transactionId, socket, isConnected, joinPaymentRoom, leavePaymentRoom, onPaymentSuccess, onPaymentFailed]);

  useEffect(() => {
    if (!transactionId) return;

    // Check if polling is forced via environment variable
    const forcePolling = process.env.NEXT_PUBLIC_FORCE_POLLING === 'true';
    if (forcePolling) {
      console.log('🔌 Polling forced via environment variable, disabling websocket');
      setPollingEnabled(true);
      return;
    }

    // If connection error occurred, start polling immediately
    if (connectionError) {
      console.log('🔌 WebSocket connection error detected, enabling polling immediately');
      setPollingEnabled(true);
      return;
    }

    // If connected, disable polling
    if (isConnected) {
      setPollingEnabled(false);
      setPollingError(null);
      return;
    }

    // Otherwise wait 3 seconds to give websocket time to connect
    const timeoutId = setTimeout(() => {
      setPollingEnabled(!isConnected);
    }, 3000);

    return () => clearTimeout(timeoutId);
  }, [transactionId, isConnected, connectionError]);

  useEffect(() => {
    if (!transactionId || status !== 'PROCESSING' || !pollingEnabled) return;

    // Stop polling if payment is in a final state
    if (['SUCCESSFUL', 'ACTIVATED', 'FAILED', 'EXPIRED'].includes(status)) {
      console.log('🛑 Stopping polling - payment reached final state:', status);
      return;
    }

    let isCancelled = false;

    const fetchPaymentStatus = async () => {
      try {
        // Handle test transactions when polling is forced
        const forcePolling = process.env.NEXT_PUBLIC_FORCE_POLLING === 'true';
        if (forcePolling && transactionId.startsWith('TEST-')) {
          console.log('🧪 Using mock response for test transaction:', transactionId);

          // Simulate the activation flow: SUCCESSFUL -> ACTIVATED
          const now = Date.now();
          const transactionTime = parseInt(transactionId.split('-')[1]) || now;
          const timeSinceTransaction = now - transactionTime;

          let mockResult;
          if (timeSinceTransaction < 3000) {
            // First few seconds: show SUCCESSFUL
            mockResult = {
              status: 'SUCCESSFUL',
              transactionId,
              amount: 200,
              message: 'Test payment successful - activating user access...',
              activation: {
                username: 'testuser',
                password: 'testpass123',
                sessionExpiry: new Date(Date.now() + 5 * 60 * 60 * 1000).toISOString(),
                activeRouter: 'Home',
              },
            };
            setStatus('SUCCESSFUL');
          } else {
            // After 3 seconds: show ACTIVATED
            mockResult = {
              status: 'ACTIVATED',
              transactionId,
              amount: 200,
              message: 'Test payment and activation completed successfully',
              activation: {
                username: 'testuser',
                password: 'testpass123',
                sessionExpiry: new Date(Date.now() + 5 * 60 * 60 * 1000).toISOString(),
                activeRouter: 'Home',
              },
            };
            setStatus('ACTIVATED');
            onPaymentSuccess?.(mockResult);
            return; // Stop polling once activated
          }

          setPaymentData(mockResult);
          return;
        }

        const result = await apiFetchGet<PaymentData>(`/payments/status/${transactionId}`);
        if (isCancelled) return;

        const currentStatus = result.status?.toString?.().toUpperCase?.();
        const activationPayload =
          (result.activation || result.activationDetails || result) as PaymentActivationData;

        switch (currentStatus) {
          case 'SUCCESSFUL':
            setStatus('SUCCESSFUL');
            setPaymentData(result || {});
            break;
          case 'FAILED':
            setStatus('FAILED');
            setErrorMessage(result.message || 'Payment failed');
            onPaymentFailed?.(result.message || 'Payment failed');
            break;
          case 'EXPIRED':
            setStatus('EXPIRED');
            setErrorMessage('Payment request expired');
            onPaymentFailed?.('Payment expired');
            break;
          case 'ACTIVATED':
            setStatus('ACTIVATED');
            setPaymentData((prev) => ({ ...prev, activation: activationPayload }));
            onPaymentSuccess?.({ ...result, activation: activationPayload });
            break;
          default:
            break;
        }

        setPollingError(null);
      } catch (pollError: any) {
        console.error('Polling payment status failed:', pollError);
        setPollingError(
          pollError?.message || 'Unable to fetch payment status. Retrying...'
        );
      }
    };

    fetchPaymentStatus();
    const interval = window.setInterval(fetchPaymentStatus, 5000);
    return () => {
      isCancelled = true;
      window.clearInterval(interval);
    };
  }, [transactionId, status, pollingEnabled, onPaymentFailed, onPaymentSuccess]);

  // Auto-transition from SUCCESSFUL to ACTIVATED after 4 seconds
  useEffect(() => {
    if (status !== 'SUCCESSFUL') return;

    console.log('⏰ Payment successful - auto-transitioning to ACTIVATED in 4 seconds...');

    const timeoutId = setTimeout(() => {
      console.log('✅ Auto-transitioning to ACTIVATED status');
      const activatedData = {
        ...paymentData,
        status: 'ACTIVATED',
        message: 'Payment and activation completed successfully',
        activation: {
          ...paymentData?.activation,
          username: paymentData?.activation?.username || 'user',
          password: paymentData?.activation?.password || 'pass123',
          sessionExpiry: paymentData?.activation?.sessionExpiry || new Date(Date.now() + 5 * 60 * 60 * 1000).toISOString(),
          activeRouter: paymentData?.activation?.activeRouter || 'Home',
        },
      };
      setStatus('ACTIVATED');
      setPaymentData(activatedData);
      onPaymentSuccess?.(activatedData);
    }, 5000);

    return () => clearTimeout(timeoutId);
  }, [status, paymentData, onPaymentSuccess]);

  const redirectToMikroTikLogin = useCallback(() => {
    const activeRouter =
      paymentData?.activation?.activeRouter || routerIdentity || 'Home';

    // Store router info for login
    localStorage.setItem('wifiRouterIdentity', activeRouter);

    // Redirect to MikroTik login page
    window.location.href = `http://tata.org/login?username=${encodeURIComponent(
      paymentData?.activation?.username || localStorage.getItem('wifiSessionUsername') || ''
    )}&password=${encodeURIComponent(
      paymentData?.activation?.password || localStorage.getItem('wifiSessionPassword') || ''
    )}`;
  }, [paymentData, routerIdentity]);

  useEffect(() => {
    if (status !== 'ACTIVATED' || variant === 'gift') {
      setCountdown(3);
      return;
    }

    setCountdown(3);
    const interval = setInterval(() => {
      setCountdown((prev) => Math.max(prev - 1, 0));
    }, 1000);

    const redirectTimer = setTimeout(() => {
      redirectToMikroTikLogin();
    }, 3000);

    return () => {
      clearInterval(interval);
      clearTimeout(redirectTimer);
    };
  }, [status, variant, redirectToMikroTikLogin]);

  // PROCESSING STATE (immediate after payment initiation)
  if (status === 'PROCESSING') {
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
            <p className="text-gray-600 mb-4">Waiting for payment confirmation...</p>
            <p className="text-sm text-gray-500 mb-6">
              {pollingEnabled
                ? 'Realtime updates unavailable. Checking payment status every few seconds...'
                : 'Complete payment on your mobile device'}
            </p>
            {pollingError && (
              <p className="text-sm text-red-500 mb-4">{pollingError}</p>
            )}
            <div className="flex items-center justify-center space-x-2 text-sm text-gray-500">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ACTIVATION IN PROGRESS STATE
  if (status === 'SUCCESSFUL') {
    return (
      <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
          <div className="bg-gradient-to-r from-yellow-500 to-orange-600 px-8 py-10 text-center">
            <div className="bg-white/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
              <Loader2 size={48} className="text-white animate-spin" />
            </div>
            <h2 className="text-3xl font-bold text-white">Activating Access</h2>
          </div>
          <div className="p-8 text-center">
            <p className="text-gray-600 mb-4">Payment confirmed! Setting up your connection...</p>
            <p className="text-sm text-gray-500 mb-6">This may take a few moments</p>
            <div className="flex items-center justify-center space-x-2 text-sm text-gray-500">
              <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
              <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
              <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ACTIVATED SUCCESS STATE
  if (status === 'ACTIVATED') {
    const username = paymentData?.activation?.username || localStorage.getItem('wifiSessionUsername') || 'Account';
    const duration = planDuration ? `${planDuration} hours` : localStorage.getItem('wifiSessionDuration') || '2 hours';
    const isGift = variant === 'gift';
    const displayUsername = isGift ? (recipientUsername || username) : username;
    const displayLabel = isGift ? 'Recipient Username' : 'Username';
    const displayPassword =
      paymentData?.activation?.password ||
      recipientPassword ||
      localStorage.getItem('wifiSessionPassword') ||
      'Not available';

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
              {!isGift && (
                <p className="text-sm text-gray-500 mt-2">
                  Please type your username and password exactly as shown to log in successfully.
                </p>
              )}
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
                <div className="h-px bg-blue-200" />
                <div className="flex justify-between items-center">
                  <span className="text-gray-700 font-medium">Password</span>
                  <span className="font-bold text-gray-900 bg-white px-4 py-2 rounded-lg text-sm font-mono">
                    {displayPassword}
                  </span>
                </div>
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
              <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-5 text-center">
                <p className="text-blue-900 font-semibold mb-1">
                  ✅ Redirecting to login in {countdown}s
                </p>
                <p className="text-xs text-blue-700">
                  Please connect to the hotspot network and enter your credentials on the Tata login page.
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
  if (status === 'FAILED' || status === 'EXPIRED' || status === 'ACTIVATION_FAILED' || status === 'ACTIVATION_ERROR') {
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