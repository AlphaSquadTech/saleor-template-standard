import { useRef, useCallback } from 'react';
import ReCAPTCHA from 'react-google-recaptcha';

export const useRecaptcha = () => {
  const recaptchaRef = useRef<ReCAPTCHA>(null);

  const getRecaptchaToken = useCallback(async (): Promise<string | null> => {
    if (!recaptchaRef.current) {
      console.warn('reCAPTCHA ref not available');
      return null;
    }

    try {
      const token = await recaptchaRef.current.executeAsync();
      return token;
    } catch (error) {
      console.error('reCAPTCHA execution failed:', error);
      return null;
    }
  }, []);

  const resetRecaptcha = useCallback(() => {
    if (recaptchaRef.current) {
      recaptchaRef.current.reset();
    }
  }, []);

  return { 
    recaptchaRef, 
    getRecaptchaToken, 
    resetRecaptcha 
  };
};