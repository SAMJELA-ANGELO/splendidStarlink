import { useState, useCallback } from 'react';
import {
  apiFetch,
  apiFetchGet,
  apiFetchPost,
  apiFetchPut,
  apiFetchPatch,
  apiFetchDelete,
} from '@/lib/api-client';

interface UseApiState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
}

interface UseApiActions<T> {
  execute: (...args: any[]) => Promise<T>;
  setData: (data: T | null) => void;
  setError: (error: Error | null) => void;
  reset: () => void;
}

/**
 * Custom hook for making API requests with loading and error states
 */
export function useApi<T = any>(
  initialState?: Partial<UseApiState<T>>
): UseApiState<T> & UseApiActions<T> {
  const [state, setState] = useState<UseApiState<T>>({
    data: initialState?.data || null,
    loading: initialState?.loading || false,
    error: initialState?.error || null,
  });

  const execute = useCallback(
    async (fetchFn: (...args: any[]) => Promise<T>) => {
      setState((s) => ({ ...s, loading: true, error: null }));
      try {
        const result = await fetchFn();
        setState((s) => ({ ...s, data: result, loading: false }));
        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setState((s) => ({ ...s, error, loading: false }));
        throw error;
      }
    },
    []
  );

  return {
    ...state,
    execute,
    setData: (data) => setState((s) => ({ ...s, data })),
    setError: (error) => setState((s) => ({ ...s, error })),
    reset: () =>
      setState({ data: initialState?.data || null, loading: false, error: null }),
  };
}

/**
 * Hook for GET requests
 */
export function useApiGet<T = any>(endpoint?: string) {
  const api = useApi<T>();

  const fetch = useCallback(
    (url: string = endpoint || '') => {
      if (!url) throw new Error('Endpoint is required');
      return api.execute(() => apiFetchGet<T>(url));
    },
    [endpoint, api]
  );

  return { ...api, fetch };
}

/**
 * Hook for POST requests
 */
export function useApiPost<T = any>(endpoint?: string) {
  const api = useApi<T>();

  const post = useCallback(
    (body?: any, url?: string) => {
      const targetUrl = url || endpoint || '';
      if (!targetUrl) throw new Error('Endpoint is required');
      return api.execute(() => apiFetchPost<T>(targetUrl, body));
    },
    [endpoint, api]
  );

  return { ...api, post };
}

/**
 * Hook for PUT requests
 */
export function useApiPut<T = any>(endpoint?: string) {
  const api = useApi<T>();

  const put = useCallback(
    (body?: any, url?: string) => {
      const targetUrl = url || endpoint || '';
      if (!targetUrl) throw new Error('Endpoint is required');
      return api.execute(() => apiFetchPut<T>(targetUrl, body));
    },
    [endpoint, api]
  );

  return { ...api, put };
}

/**
 * Hook for DELETE requests
 */
export function useApiDelete<T = any>(endpoint?: string) {
  const api = useApi<T>();

  const remove = useCallback(
    (url?: string) => {
      const targetUrl = url || endpoint || '';
      if (!targetUrl) throw new Error('Endpoint is required');
      return api.execute(() => apiFetchDelete<T>(targetUrl));
    },
    [endpoint, api]
  );

  return { ...api, delete: remove };
}
