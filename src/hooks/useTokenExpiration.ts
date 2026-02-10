'use client';

import { useEffect, useRef } from 'react';
import { useGlobalStore } from '@/store/useGlobalStore';
import { jwtDecode } from 'jwt-decode';

type JwtPayload = { exp?: number };

export function useTokenExpiration() {
  const logout = useGlobalStore(s => s.logout);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const SKEW = 30_000; // 30s early

    const doClearAuth = async () => {
      try {
        // quick local cleanup to avoid UI flash
        ['token','refreshToken','user','auth','session','apollo-cache-persist','wsm-global-store']
          .forEach(k => { try { localStorage.removeItem(k); } catch {} });
        await logout?.(); // store owns navigation
      } catch {
        window.location.replace('/');
      }
    };

    const validateToken = (token: string): { isValid: boolean; expMs: number | null } => {
      try {
        const { exp } = jwtDecode<JwtPayload>(token);
        const expMs = typeof exp === 'number' ? exp * 1000 : null;
        const isValid = !!expMs && expMs > Date.now();
        return { isValid, expMs };
      } catch {
        return { isValid: false, expMs: null };
      }
    };

    const schedule = () => {
      if (timeoutRef.current) { 
        clearTimeout(timeoutRef.current); 
        timeoutRef.current = null; 
      }

      const token = localStorage.getItem('token');
      if (!token) return;

      const { isValid, expMs } = validateToken(token);
      
      // If token is invalid or expired, clear auth immediately
      if (!isValid) {
        void doClearAuth();
        return;
      }

      // If token is valid, schedule the next check
      if (expMs) {
        const delay = Math.max(expMs - Date.now() - SKEW, 0);
        if (delay > 0) {
          timeoutRef.current = window.setTimeout(() => { void doClearAuth(); }, delay);
        } else {
          void doClearAuth();
        }
      }
    };

    const onFocus = () => schedule();
    const onVisibility = () => { if (document.visibilityState === 'visible') schedule(); };

    schedule();
    window.addEventListener('focus', onFocus);
    window.addEventListener('visibilitychange', onVisibility);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('visibilitychange', onVisibility);
    };
  }, [logout]);
}
