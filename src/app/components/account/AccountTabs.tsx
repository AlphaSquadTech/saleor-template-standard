"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function AccountTabs() {
  const pathname = usePathname();
  return (
    <div className="flex w-full text-sm md:text-lg lg:text-xl font-semibold text-center tracking-[-0.05px] font-secondary">
      <Link
        href="/account/login"
        style={
          pathname === "/account/login"
            ? {
                color: "var(--color-primary-700)",
                borderBottom: "1px solid var(--color-primary-600)",
              }
            : {}
        }
        className="w-1/2 py-2"
      >
        SIGN IN
      </Link>
       <Link
              href="/account/register"
              style={
                pathname === "/account/register"
                  ? {
                      color: "var(--color-primary-700)",
                      borderBottom: "1px solid var(--color-primary-600)",
                    }
                  : {}
              }
              className="w-1/2 py-2"
            >
              CREATE ACCOUNT
            </Link>
    </div>
  );
}
