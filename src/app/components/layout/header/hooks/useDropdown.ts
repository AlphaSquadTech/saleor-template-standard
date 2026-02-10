import { useState, useRef, useCallback, useEffect } from "react";

export const useDropdown = (delay: number = 300) => {
  const [isOpen, setIsOpen] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const clearExistingTimeout = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const handleMouseEnter = useCallback(() => {
    clearExistingTimeout();
    setIsOpen(true);
  }, [clearExistingTimeout]);

  const handleMouseLeave = useCallback(() => {
    clearExistingTimeout();
    timeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, delay);
  }, [clearExistingTimeout, delay]);

  const close = useCallback(() => {
    clearExistingTimeout();
    setIsOpen(false);
  }, [clearExistingTimeout]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearExistingTimeout();
    };
  }, [clearExistingTimeout]);

  return {
    isOpen,
    handleMouseEnter,
    handleMouseLeave,
    close,
    setIsOpen
  };
};