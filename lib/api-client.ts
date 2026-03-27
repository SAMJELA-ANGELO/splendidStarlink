/**
 * API Client for making requests to the backend
 * Automatically injects the JWT token from localStorage
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://splendid-starlink.onrender.com';

interface RequestOptions extends RequestInit {
  skipToken?: boolean;
}

/**
 * Get the current JWT token from localStorage
 * Token is stored as 'utoken' for "user token"
 */
export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('utoken');
}

/**
 * Store the JWT token in localStorage
 * Also stores in a cookie for middleware access
 */
export function setToken(token: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('utoken', token);
  // Also set as cookie for middleware
  document.cookie = `utoken=${token}; path=/; max-age=${3600 * 24 * 7}; SameSite=Strict`;
}

/**
 * Clear the JWT token from localStorage and cookies
 */
export function clearToken(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('utoken');
  localStorage.removeItem('user');
  // Clear cookie
  document.cookie = 'utoken=; path=/; max-age=0; SameSite=Strict';
}

/**
 * Get the stored user data from localStorage
 */
export function getStoredUser(): any {
  if (typeof window === 'undefined') return null;
  const user = localStorage.getItem('user');
  return user ? JSON.parse(user) : null;
}

/**
 * Store user data in localStorage
 */
export function setStoredUser(user: any): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('user', JSON.stringify(user));
}

/**
 * Make an API request with automatic token injection
 */
export async function apiFetch<T = any>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const { skipToken = false, ...fetchOptions } = options;

  // Prepare headers
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...fetchOptions.headers as Record<string, string>,
  };

  // Add authorization header if token exists and skipToken is false
  if (!skipToken) {
    const token = getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      headers,
    });

    // Handle 401 - Token might be expired
    if (response.status === 401) {
      clearToken();
      // Redirect to login if we're in browser
      if (typeof window !== 'undefined') {
        window.location.href = '/auth/login';
      }
    }

    // If response is not JSON, return as is
    const contentType = response.headers.get('content-type');
    let data;

    if (contentType?.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    if (!response.ok) {
      throw new Error(
        typeof data === 'object' && data?.message
          ? data.message
          : `API Error: ${response.status}`
      );
    }

    return data as T;
  } catch (error) {
    console.error(`API Error [${endpoint}]:`, error);
    throw error;
  }
}

/**
 * Shorthand for GET request
 */
export function apiFetchGet<T = any>(
  endpoint: string,
  options?: RequestOptions
): Promise<T> {
  return apiFetch<T>(endpoint, { ...options, method: 'GET' });
}

/**
 * Shorthand for POST request
 */
export function apiFetchPost<T = any>(
  endpoint: string,
  body?: any,
  options?: RequestOptions
): Promise<T> {
  return apiFetch<T>(endpoint, {
    ...options,
    method: 'POST',
    body: body ? JSON.stringify(body) : undefined,
  });
}

/**
 * Shorthand for PUT request
 */
export function apiFetchPut<T = any>(
  endpoint: string,
  body?: any,
  options?: RequestOptions
): Promise<T> {
  return apiFetch<T>(endpoint, {
    ...options,
    method: 'PUT',
    body: body ? JSON.stringify(body) : undefined,
  });
}

/**
 * Shorthand for PATCH request
 */
export function apiFetchPatch<T = any>(
  endpoint: string,
  body?: any,
  options?: RequestOptions
): Promise<T> {
  return apiFetch<T>(endpoint, {
    ...options,
    method: 'PATCH',
    body: body ? JSON.stringify(body) : undefined,
  });
}

/**
 * Shorthand for DELETE request
 */
export function apiFetchDelete<T = any>(
  endpoint: string,
  options?: RequestOptions
): Promise<T> {
  return apiFetch<T>(endpoint, { ...options, method: 'DELETE' });
}
