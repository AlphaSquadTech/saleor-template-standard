"use client";

import { useMemo, useCallback } from "react";
import { useCartSync } from "@/hooks/useCartSync";
import useGlobalStore from "@/store/useGlobalStore";
import HamMenuSlide from "./hamMenuSlide";
import { MobileNavbar } from "./components/MobileNavbar";
import { NavbarBrand } from "./components/NavbarBrand";
import { NavigationLinks } from "./components/NavigationLinks";
import { NavbarActions } from "./components/NavbarActions";
import { LoadingState } from "./components/LoadingState";
import { useNavbarData } from "./hooks/useNavbarData";
import { useNavbarState } from "./hooks/useNavbarState";
import { navbarStyles } from "./styles/navbarStyles";

interface NavBarProps {
  initialIsLoggedIn?: boolean;
}

export const NavBar = ({ initialIsLoggedIn = false }: NavBarProps) => {
  // Custom hooks for state and data management
  const { categories, menuItems, loading, error } = useNavbarData();
  const {
    isAccountOpen,
    setIsAccountOpen,
    isLoggingOut,
    setIsLoggingOut,
    isHamMenuOpen,
    setIsHamMenuOpen,
    isEnableSearch,
    isActive,
    toggleAccount,
    toggleHamMenu,
    toggleSearch,
  } = useNavbarState();

  // Global state
  const logout = useGlobalStore((s) => s.logout);
  const isLoggedIn = useGlobalStore((s) => s.isLoggedIn);
  const totalItems = useGlobalStore((s) => s.totalItems);
  const { syncingCart } = useCartSync();

  // Memoized brand configuration
  const brandConfig = useMemo(() => {
    const TENANT_NAME = process.env.NEXT_PUBLIC_TENANT_NAME || "default";
    const brandName = TENANT_NAME || "Next.js Theme System";
    const logo =
      process.env.NEXT_PUBLIC_LOGO_URL ||
      "https://webshopmanager.com/files/images/logo.png";
    return { brandName, logo };
  }, []);

  // Memoized logout handler
  const handleLogout = useCallback(async () => {
    if (isLoggingOut) return;
    try {
      setIsLoggingOut(true);
      setIsAccountOpen(false);
      await logout();
    } catch {
      // Hard redirect fallback
      window.location.href = "/";
    } finally {
      setIsLoggingOut(false);
    }
  }, [isLoggingOut, logout, setIsAccountOpen, setIsLoggingOut]);

  // Show loading state while data is being fetched
  if (loading && !error) {
    return (
      <>
        <MobileNavbar
          {...brandConfig}
          isEnableSearch={isEnableSearch}
          toggleSearch={toggleSearch}
          isHamMenuOpen={isHamMenuOpen}
          toggleHamMenu={toggleHamMenu}
          isLoggedIn={isLoggedIn}
          totalItems={totalItems}
          syncingCart={syncingCart}
          isActive={isActive}
        />
        <div>
          <nav className={navbarStyles.desktopContainer}>
            <div className={navbarStyles.linksContainer}>
              <NavbarBrand {...brandConfig} />
            </div>
            <NavbarActions
              isLoggedIn={isLoggedIn}
              isAccountOpen={isAccountOpen}
              setIsAccountOpen={setIsAccountOpen}
              isLoggingOut={isLoggingOut}
              handleLogout={handleLogout}
              totalItems={totalItems}
              syncingCart={syncingCart}
              toggleAccount={toggleAccount}
              isActive={isActive}
            />
          </nav>
          <div className="hidden xl:block bg-black border-b border-zinc-600 py-4 px-20 ">
            <LoadingState />
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <MobileNavbar
        {...brandConfig}
        isEnableSearch={isEnableSearch}
        toggleSearch={toggleSearch}
        isHamMenuOpen={isHamMenuOpen}
        toggleHamMenu={toggleHamMenu}
        isLoggedIn={isLoggedIn}
        totalItems={totalItems}
        syncingCart={syncingCart}
        isActive={isActive}
      />

      {/* Desktop Menu */}
      <div>
        <nav className={navbarStyles.desktopContainer}>
          <div className={navbarStyles.linksContainer}>
            <NavbarBrand {...brandConfig} />
          </div>

          <NavbarActions
            isLoggedIn={isLoggedIn}
            isAccountOpen={isAccountOpen}
            setIsAccountOpen={setIsAccountOpen}
            isLoggingOut={isLoggingOut}
            handleLogout={handleLogout}
            totalItems={totalItems}
            syncingCart={syncingCart}
            toggleAccount={toggleAccount}
            isActive={isActive}
          />
        </nav>
        <div className="hidden xl:block bg-[var(--color-secondary-950)] border-b border-zinc-600">
          <nav className="hidden xl:flex w-full items-center gap-8 py-4 xl:px-20 text-sm font-semibold container mx-auto justify-center">
            <NavigationLinks
              categories={categories}
              categoriesLoading={loading}
              menuItems={menuItems}
              isActive={isActive}
            />
          </nav>
        </div>
      </div>

      <HamMenuSlide
        isHamMenuOpen={isHamMenuOpen}
        setIsHamMenuOpen={setIsHamMenuOpen}
        menuItems={menuItems}
      />
    </>
  );
};
