import Link from "next/link";
import { useRef, useEffect } from "react";
import { UserProfileIcon } from "@/app/utils/svgs/userProfileIcon";
import { ShoppingCart } from "@/app/utils/svgs/shoppingCart";
import Search from "../search";
import SecondaryButton from "../../../reuseableUI/secondaryButton";
import AccountMenuDropdown from "../accountMenuDropdown";
import CartDropDown from "../../cartDropDown";
import { CartBadge } from "./CartBadge";
import { navbarStyles } from "../styles/navbarStyles";
import PrimaryButton from "@/app/components/reuseableUI/primaryButton";
import { useAppConfiguration } from "@/app/components/providers/ServerAppConfigurationProvider";

interface NavbarActionsProps {
  isLoggedIn: boolean;
  isAccountOpen: boolean;
  setIsAccountOpen: (open: boolean) => void;
  isLoggingOut: boolean;
  handleLogout: () => Promise<void>;
  totalItems: number;
  syncingCart: boolean;
  toggleAccount: () => void;
  isActive: (href: string) => boolean;
}

export const NavbarActions = ({
  isLoggedIn,
  isAccountOpen,
  setIsAccountOpen,
  isLoggingOut,
  handleLogout,
  totalItems,
  syncingCart,
  toggleAccount,
  isActive,
}: NavbarActionsProps) => {
  const accountRef = useRef<HTMLDivElement>(null);
  const { isDealerLocatorEnabled } = useAppConfiguration();

  // Close account menu on outside click
  useEffect(() => {
    const handleOutside = (e: PointerEvent) => {
      if (!isAccountOpen) return;
      const target = e.target as Node | null;
      if (
        accountRef.current &&
        target &&
        !accountRef.current.contains(target)
      ) {
        setIsAccountOpen(false);
      }
    };
    document.addEventListener("pointerdown", handleOutside);
    return () => {
      document.removeEventListener("pointerdown", handleOutside);
    };
  }, [isAccountOpen, setIsAccountOpen]);

  return (
    <div className={navbarStyles.actionsContainer}>
      <div className="flex w-full items-center justify-end">
        <Search />
      </div>

      {isLoggedIn ? (
        <div className="relative" ref={accountRef}>
          <button
            onClick={toggleAccount}
            className={`cursor-pointer p-2.5 ${navbarStyles.iconBtnBase} ${
              isAccountOpen
                ? "bg-[var(--color-secondary-900)] text-[var(--color-primary-500)]"
                : navbarStyles.navLinkInactive
            }`}
            aria-label="User Account"
            aria-expanded={isAccountOpen}
            aria-haspopup="menu"
            disabled={isLoggingOut}
          >
            {UserProfileIcon}
          </button>

          <AccountMenuDropdown
            isAccountOpen={isAccountOpen}
            isLoggingOut={isLoggingOut}
            handleLogout={handleLogout}
          />
        </div>
      ) : (
        <Link href="/account/login" prefetch={false}>
          <SecondaryButton className="text-base whites" content="LOGIN" />
        </Link>
      )}
      {isDealerLocatorEnabled() && (
        <Link href="/locator" prefetch={false}>
          <PrimaryButton className="text-base whitespace-nowrap text-black" content="Find A Dealer" />
        </Link>
      )}
      <div className="group">
        <Link
          href="/cart"
          prefetch={false}
          className={`flex items-center p-2.5 ${navbarStyles.iconBtnBase} ${
            isActive("/cart")
              ? "bg-[var(--color-secondary-900)] text-[var(--color-primary-500)]"
              : navbarStyles.navLinkInactive
          } relative`}
          aria-label={`Cart with ${totalItems} items`}
        >
          {ShoppingCart}
          {syncingCart ? (
            <div
              className="absolute -top-1 -right-1 w-3 h-3 border border-[var(--color-primary-600)] rounded-full border-t-transparent animate-spin"
              aria-label="Syncing cart"
            />
          ) : (
            <CartBadge count={totalItems} />
          )}
        </Link>
        <div className="opacity-0 transition-opacity duration-300 pointer-events-none group-hover:pointer-events-auto group-hover:opacity-100">
          <CartDropDown />
        </div>
      </div>
    </div>
  );
};
