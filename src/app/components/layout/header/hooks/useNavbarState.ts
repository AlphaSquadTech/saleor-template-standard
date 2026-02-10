import { useState, useEffect, useCallback } from "react";
import { usePathname } from "next/navigation";

export const useNavbarState = () => {
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isHamMenuOpen, setIsHamMenuOpen] = useState(() => false);
  const [isEnableSearch, setIsEnableSearch] = useState(() => false);
  const pathName = usePathname();

  // Close account menu on route change
  useEffect(() => {
    setIsAccountOpen(false);
  }, [pathName]);

  // Close account menu on Esc key
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsAccountOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const isActive = useCallback((href: string) => 
    pathName === href || pathName.startsWith(`${href}/`),
    [pathName]
  );

  const toggleAccount = useCallback(() => {
    setIsAccountOpen((v) => !v);
  }, []);

  const toggleHamMenu = useCallback(() => {
    // Add protection against rapid toggling from extensions
    setIsHamMenuOpen((prev) => {
      // Ensure we always get a clean boolean value
      const currentState = Boolean(prev);
      return !currentState;
    });
  }, []);

  const toggleSearch = useCallback(() => {
    setIsEnableSearch((prev) => {
      // Ensure we always get a clean boolean value  
      const currentState = Boolean(prev);
      return !currentState;
    });
  }, []);

  return {
    isAccountOpen,
    setIsAccountOpen,
    isLoggingOut,
    setIsLoggingOut,
    isHamMenuOpen,
    setIsHamMenuOpen,
    isEnableSearch,
    setIsEnableSearch,
    pathName,
    isActive,
    toggleAccount,
    toggleHamMenu,
    toggleSearch
  };
};