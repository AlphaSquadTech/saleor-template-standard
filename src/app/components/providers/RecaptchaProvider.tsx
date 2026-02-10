'use client';

import type React from 'react';
import { useAppConfiguration } from "./ServerAppConfigurationProvider";

interface RecaptchaProviderProps {
  children: React.ReactNode;
}

export default function RecaptchaProvider({ children }: RecaptchaProviderProps) {
  const { getGoogleRecaptchaConfig } = useAppConfiguration();
  
  const recaptchaConfig = getGoogleRecaptchaConfig();
  
  // For now, just return children. In the future, this could inject reCAPTCHA scripts
  // based on the dynamic configuration
  return <>{children}</>;
}