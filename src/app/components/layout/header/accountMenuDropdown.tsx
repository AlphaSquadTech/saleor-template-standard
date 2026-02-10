"use client";

import { LogOutIcon } from "@/app/utils/svgs/logOutIcon";
import { UserProfileIcon } from "@/app/utils/svgs/userProfileIcon";
import Link from "next/link";

type AccountMenuDropdownProps = {
  isAccountOpen: boolean;
  isLoggingOut: boolean;
  handleLogout: () => void;
};

export default function AccountMenuDropdown({
  isAccountOpen,
  isLoggingOut,
  handleLogout,
}: AccountMenuDropdownProps) {
  if (!isAccountOpen) return null;

  return (
    <div
      role="menu"
      aria-label="Account menu"
      style={{ backgroundColor: "var(--color-secondary-50)" }}
      className="absolute right-0 mt-2 w-52 shadow-[0_10px_20px_0_rgba(0,0,0,0.10)] z-50"
    >
      {/* Account Dashboard */}
      <Link
        href="/account/settings"
        className="flex w-full items-center gap-2 font-secondary transition-all ease-in-out duration-300 border-b border-[var(--color-secondary-200)] rounded-md font-normal px-4 py-3 text-sm text-[var(--color-secondary-900)] hover:text-[var(--color-primary-500)]"
        role="menuitem"
      >
        <span className="[&>svg]:size-4 text-[var(--color-primary-600)]">
          {UserProfileIcon}
        </span>
        Account Dashboard
      </Link>

      {/* Logout Button */}
      <button
        onClick={handleLogout}
        disabled={isLoggingOut}
        className="flex w-full items-center gap-2 font-secondary transition-all ease-in-out duration-300 rounded-md font-normal px-4 py-3 text-left text-sm text-[var(--color-secondary-900)] hover:text-[var(--color-primary-500)] disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
        role="menuitem"
      >
        <span className="[&>svg]:size-4 text-[var(--color-primary-600)]">
          {LogOutIcon}
        </span>
        {isLoggingOut ? "Signing Out..." : "Logout"}
      </button>
    </div>
  );
}
