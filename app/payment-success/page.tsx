"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, Wifi, Clock, ArrowRight, LogIn } from "lucide-react";

export default function PaymentSuccessPage() {
  const router = useRouter();
  const [sessionData, setSessionData] = useState<any>(null);
  const [autoRedirectCountdown, setAutoRedirectCountdown] = useState<number | null>(null);

  useEffect(() => {
    // Retrieve payment/session data from localStorage
    const username = localStorage.getItem('wifiSessionUsername');
    const duration = localStorage.getItem('wifiSessionDuration');
    const isGift = localStorage.getItem('wifiPaymentIsGift');
    const recipientUsername = localStorage.getItem('wifiPaymentRecipientUsername');

    setSessionData({
      username: username || 'Your Account',
      duration: duration ? `${duration} hours` : 'Standard Plan',
      isGift: isGift === 'true',
      recipientUsername: recipientUsername,
    });

    // Auto-redirect after 5 seconds
    setAutoRedirectCountdown(5);
    const countdownInterval = setInterval(() => {
      setAutoRedirectCountdown(prev => prev !== null && prev > 0 ? prev - 1 : null);
    }, 1000);

    const timer = setTimeout(() => {
      redirectToPortal();
      clearInterval(countdownInterval);
    }, 5000);

    return () => {
      clearTimeout(timer);
      clearInterval(countdownInterval);
    };
  }, []);

  const redirectToPortal = () => {
    const wifiLinkLogin = localStorage.getItem('wifiLinkLogin');
    const wifiLinkOrig = localStorage.getItem('wifiLinkOrig');
    const captivePortalUrl = wifiLinkLogin || wifiLinkOrig || '/auth/login';

    console.log('🔄 Redirecting to captive portal:', captivePortalUrl);
    window.location.href = captivePortalUrl;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4 md:p-8">
      <div className="w-full max-w-md">
        {/* Success Card */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {/* Header with Success Icon */}
          <div className="bg-gradient-to-r from-green-500 to-green-600 px-6 py-12 flex flex-col items-center">
            <div className="bg-white bg-opacity-20 rounded-full p-4 mb-4">
              <CheckCircle size={48} className="text-white" />
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-white text-center">
              Payment Successful!
            </h1>
          </div>

          {/* Content */}
          <div className="p-6 md:p-8">
            {/* Success Message */}
            <div className="mb-8 text-center">
              <p className="text-gray-700 text-lg font-semibold mb-2">
                {sessionData?.isGift
                  ? `Gift sent to ${sessionData?.recipientUsername}`
                  : 'Your plan is now active!'}
              </p>
              <p className="text-gray-600 text-sm">
                {sessionData?.isGift
                  ? 'The recipient can now log in with their credentials'
                  : 'You can now connect to the WiFi and access the internet'}
              </p>
            </div>

            {/* Session Details */}
            <div className="bg-gray-50 rounded-lg p-4 mb-8 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-gray-700">
                  <div className="bg-blue-100 rounded-full p-2">
                    <Wifi size={18} className="text-blue-700" />
                  </div>
                  <span className="font-medium">Username</span>
                </div>
                <span className="font-semibold text-gray-900">
                  {sessionData?.username}
                </span>
              </div>

              <div className="h-px bg-gray-200" />

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-gray-700">
                  <div className="bg-orange-100 rounded-full p-2">
                    <Clock size={18} className="text-orange-700" />
                  </div>
                  <span className="font-medium">Duration</span>
                </div>
                <span className="font-semibold text-gray-900">
                  {sessionData?.duration}
                </span>
              </div>
            </div>

            {/* Instructions */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8">
              <h3 className="font-semibold text-blue-900 mb-2">What's Next?</h3>
              <ol className="text-sm text-blue-800 space-y-2">
                <li className="flex items-start gap-2">
                  <span className="font-bold flex-shrink-0">1.</span>
                  <span>
                    {sessionData?.isGift
                      ? 'Share the login credentials with the recipient'
                      : 'Connect to your WiFi network'}
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold flex-shrink-0">2.</span>
                  <span>Click the button below to open the login portal</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold flex-shrink-0">3.</span>
                  <span>
                    {sessionData?.isGift
                      ? 'The recipient logs in with their credentials'
                      : 'Log in with your username and password'}
                  </span>
                </li>
              </ol>
            </div>

            {/* Auto-redirect Notice */}
            {autoRedirectCountdown !== null && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-6 text-center">
                <p className="text-sm text-amber-800">
                  Redirecting to login portal in {autoRedirectCountdown} second{autoRedirectCountdown !== 1 ? 's' : ''}...
                </p>
              </div>
            )}

            {/* Main Button */}
            <button
              onClick={redirectToPortal}
              className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-semibold py-3 rounded-lg transition duration-200 flex items-center justify-center gap-2 mb-4"
            >
              <LogIn size={20} />
              Go to WiFi Login Portal
              <ArrowRight size={18} />
            </button>

            {/* Secondary Button */}
            <button
              onClick={() => router.push('/dashboard')}
              className="w-full bg-gray-200 hover:bg-gray-300 text-gray-900 font-semibold py-2 rounded-lg transition duration-200"
            >
              Return to Dashboard
            </button>
          </div>
        </div>

        {/* Footer Info */}
        <div className="mt-6 text-center text-sm text-gray-600">
          <p>
            {sessionData?.isGift
              ? 'The recipient can log in from any WiFi-connected device'
              : 'Your session will be active for the duration specified above'}
          </p>
        </div>
      </div>
    </div>
  );
}
