'use client';

import { useTokenExpiration } from '@/hooks/useTokenExpiration';

export function TokenExpirationHandler() {
  useTokenExpiration();
  return null;
}
