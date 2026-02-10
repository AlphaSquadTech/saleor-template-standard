import Link from "next/link";
import { SearchIcon } from "@/app/utils/svgs/searchIcon";
import { CrossIcon } from "@/app/utils/svgs/crossIcon";
import { MenuIcon } from "@/app/utils/svgs/menuIcon";
import { UserProfileIcon } from "@/app/utils/svgs/userProfileIcon";
import { ShoppingCart } from "@/app/utils/svgs/shoppingCart";
import Search from "../search";
import SecondaryButton from "../../../reuseableUI/secondaryButton";
import { NavbarBrand } from "./NavbarBrand";
import { CartBadge } from "./CartBadge";
import { navbarStyles } from "../styles/navbarStyles";

interface MobileNavbarProps {
  isEnableSearch: boolean;
  toggleSearch: () => void;
  isHamMenuOpen: boolean;
  toggleHamMenu: () => void;
  logo: string;
  brandName: string;
  isLoggedIn: boolean;
  totalItems: number;
  syncingCart: boolean;
  isActive: (href: string) => boolean;
}

export const MobileNavbar = ({
  isEnableSearch,
  toggleSearch,
  isHamMenuOpen,
  toggleHamMenu,
  logo,
  brandName,
  isLoggedIn,
  totalItems,
  syncingCart,
  isActive
}: MobileNavbarProps) => {
  return (
    <div className={navbarStyles.mobileContainer}>
      {isEnableSearch ? (
        <div className="flex items-center w-full gap-2">
          <Search className="w-full max-w-none" />
          <button
            onClick={toggleSearch}
            className="p-2.5 cursor-pointer [&>svg]:size-5"
            aria-label="Close search"
          >
            {CrossIcon}
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-3">
            <button
              onClick={toggleHamMenu}
              className="[&>svg]:size-5 py-2.5 text-white cursor-pointer"
              aria-label={isHamMenuOpen ? "Close menu" : "Open menu"}
              aria-expanded={isHamMenuOpen}
            >
              {isHamMenuOpen ? CrossIcon : MenuIcon}
            </button>
            <NavbarBrand 
              logo={logo} 
              brandName={brandName} 
              width={107} 
              height={32} 
            />
          </div>
          
          <div className="flex w-fit items-center gap-4">
            <button
              onClick={toggleSearch}
              className="text-white py-2.5 hover:text-[var(--color-primary-500)] cursor-pointer transition-all ease-in-out duration-300"
              aria-label="Open search"
            >
              {SearchIcon}
            </button>
            
            {isLoggedIn ? (
              <Link
                href="/account"
                prefetch={false}
                className={`flex items-center py-2.5 !bg-transparent ${navbarStyles.iconBtnBase} ${
                  isActive("/account")
                    ? "text-[var(--color-primary-500)]"
                    : navbarStyles.navLinkInactive
                } relative`}
                aria-label="User Account"
              >
                {UserProfileIcon}
              </Link>
            ) : (
              <Link href="/account/login" prefetch={false}>
                <SecondaryButton className="text-xs md:text-base px-2 md:px-4" content="LOGIN" />
              </Link>
            )}
            
            <Link
              href="/cart"
              prefetch={false}
              className={`flex items-center py-2.5 !bg-transparent ${navbarStyles.iconBtnBase} ${
                isActive("/cart")
                  ? "text-[var(--color-primary-500)]"
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
          </div>
        </div>
      )}
    </div>
  );
};