"use client";

import { useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";

interface SilentLoginFormProps {
  username?: string;
  tempPassword?: string; // For MAC login (from token exchange)
  isTemporaryLogin?: boolean; // True if using temporary password (MAC login)
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

/**
 * SilentLoginForm - Auto-login component for MikroTik hotspot
 * 
 * Two modes:
 * 1. SIGNUP MODE (with stored password):
 *    - User just signed up, password in localStorage
 *    - After payment completed, auto-login happens
 *    
 * 2. LOGIN MODE (with temporary password):
 *    - User connecting via WiFi with active plan
 *    - MAC verified, temporary password generated
 *    - Automatic login with single-use temp password
 * 
 * In both cases:
 * - Creates hidden form with username/password
 * - Submits to MikroTik's link_login URL
 * - User gets internet access immediately
 * - Credentials cleared after use
 */
export function SilentLoginForm({ 
  username, 
  tempPassword,
  isTemporaryLogin = false,
  onSuccess, 
  onError 
}: SilentLoginFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const isSubmittedRef = useRef(false);

  useEffect(() => {
    // Prevent multiple form submissions
    if (isSubmittedRef.current) return;

    const submitForm = async () => {
      try {
        console.log('🔐 SilentLoginForm: Starting silent login process...');
        console.log(`   Mode: ${isTemporaryLogin ? 'MAC Login (Temp Password)' : 'Signup (Stored Password)'}`);

        // Determine password source based on login mode
        let passwordToUse = tempPassword;
        if (!passwordToUse) {
          // Signup mode: try to get from localStorage
          const storedPassword = localStorage.getItem('wifiSessionPassword');
          if (!storedPassword) {
            const errorMsg = 'Password not found for silent login';
            console.warn('⚠️ SilentLoginForm:', errorMsg);
            onError?.(errorMsg);
            return;
          }
          passwordToUse = storedPassword;
        }

        // Get WiFi session data from localStorage
        const storedUsername = localStorage.getItem('wifiSessionUsername');
        const linkUrl = localStorage.getItem('wifiLinkLogin');
        const linkOrig = localStorage.getItem('wifiLinkOrig');

        console.log('📱 SilentLoginForm: Retrieved WiFi data:', {
          hasPassword: !!passwordToUse,
          storedUsername: storedUsername,
          hasLinkUrl: !!linkUrl,
          hasLinkOrig: !!linkOrig
        });

        // Use provided username or stored username
        const finalUsername = username || storedUsername;

        // Check required data
        if (!finalUsername) {
          const errorMsg = 'Username not found for silent login';
          console.warn('⚠️ SilentLoginForm:', errorMsg);
          onError?.(errorMsg);
          return;
        }

        if (!linkUrl) {
          console.warn('⚠️ SilentLoginForm: No link_login URL found - user will see hotspot portal');
          onError?.('No hotspot login URL available - user will need to enter credentials manually');
          return;
        }

        // Create hidden form for submission to MikroTik
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = linkUrl;
        form.style.display = 'none';
        form.target = '_self';

        // Add username field
        const usernameInput = document.createElement('input');
        usernameInput.type = 'hidden';
        usernameInput.name = 'username';
        usernameInput.value = finalUsername;
        form.appendChild(usernameInput);

        // Add password field
        const passwordInput = document.createElement('input');
        passwordInput.type = 'hidden';
        passwordInput.name = 'password';
        passwordInput.value = passwordToUse;
        form.appendChild(passwordInput);

        // Add dst (destination) field if available
        if (linkOrig) {
          const dstInput = document.createElement('input');
          dstInput.type = 'hidden';
          dstInput.name = 'dst';
          dstInput.value = linkOrig;
          form.appendChild(dstInput);
        }

        // Append form to document temporarily
        document.body.appendChild(form);

        console.log('✅ SilentLoginForm: Submitting hidden form to MikroTik hotspot...');
        console.log('   📤 Form action:', linkUrl);
        console.log('   👤 Username:', finalUsername);
        console.log(`   🔒 Password: [${isTemporaryLogin ? 'TEMPORARY' : 'STORED'}]`);
        if (linkOrig) console.log('   🎯 Destination:', linkOrig);

        // Mark as submitted to prevent re-submission
        isSubmittedRef.current = true;

        // If signup mode with stored password: clear it after submission
        if (!isTemporaryLogin) {
          setTimeout(() => {
            localStorage.removeItem('wifiSessionPassword');
            localStorage.removeItem('wifiSessionUsername');
            console.log('🧹 Cleared sensitive WiFi data from localStorage');
          }, 500);
        }

        // Submit the form
        // Note: This will redirect the user to MikroTik's hotspot portal
        // If credentials are correct, they'll be authenticated and redirected to linkOrig
        form.submit();

        // Call success callback
        onSuccess?.();

        // Clean up
        setTimeout(() => {
          if (form.parentNode) {
            form.parentNode.removeChild(form);
          }
        }, 1000);

      } catch (error: any) {
        const errorMsg = error.message || 'Failed to process silent login';
        console.error('❌ SilentLoginForm Error:', errorMsg);
        onError?.(errorMsg);
      }
    };

    // Delay form submission to ensure component is fully mounted
    const timer = setTimeout(submitForm, 500);
    return () => clearTimeout(timer);
  }, [username, tempPassword, isTemporaryLogin, onSuccess, onError]);

  const modeLabel = isTemporaryLogin ? 'Connecting (MAC Login)...' : 'Connecting to WiFi...';
  const modeDesc = isTemporaryLogin 
    ? 'Authenticating with your active subscription'
    : `Automatically logging you into ${username || 'your'} connection`;

  return (
    <div className="flex flex-col items-center justify-center p-8 space-y-4">
      <Loader2 className="h-8 w-8 animate-spin text-amber-700" />
      <div className="text-center">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          🌐 {modeLabel}
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          {modeDesc}
        </p>
        <p className="text-xs text-gray-500">
          Do not refresh or close this page
        </p>
      </div>

      {/* Hidden form (for reference) */}
      <form ref={formRef} style={{ display: 'none' }} />

      <div className="mt-8 text-center text-xs text-gray-500 max-w-sm">
        {isTemporaryLogin ? (
          <>
            <p className="mb-2">
              ℹ️ Your subscription is active and verified. 
            </p>
            <p>
              Submitting temporary credentials securely to authenticate your connection.
            </p>
          </>
        ) : (
          <>
            <p className="mb-2">
              ℹ️ This page submits your credentials securely to authenticate with the WiFi hotspot.
            </p>
            <p>
              After authentication, you'll be redirected to the internet or your original destination.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
