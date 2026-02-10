import { cn } from "@/app/utils/functions";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ChevronDownIcon } from "@/app/utils/svgs/chevronDownIcon";
import PrimaryButton from "@/app/components/reuseableUI/primaryButton";
import SecondaryButton from "@/app/components/reuseableUI/secondaryButton";
import { useAppConfiguration } from "@/app/components/providers/ServerAppConfigurationProvider";
import useGlobalStore from "@/store/useGlobalStore";
import Link from "next/link";

type MenuItem = {
  id: string;
  name: string;
  url: string;
  level: number;
  metadata?: Array<{
    key: string;
    value: string;
  }>;
  children?: MenuItem[];
};

const NAV_LINKS = [
  { name: "Home", href: "/" },
  { name: "Shop", href: "/products/all" },
];

const HamMenuSlide = ({
  isHamMenuOpen,
  setIsHamMenuOpen,
  menuItems = [],
}: {
  isHamMenuOpen: boolean;
  setIsHamMenuOpen: (v: boolean) => void;
  menuItems?: MenuItem[];
}) => {
  const route = useRouter();
  const { isDealerLocatorEnabled } = useAppConfiguration();
  const isLoggedIn = useGlobalStore((s) => s.isLoggedIn);
  const logout = useGlobalStore((s) => s.logout);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const pathName = usePathname();
  const toggleExpanded = (itemId: string) => {
    setExpandedItems((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  const getTargetFromMetadata = (
    metadata?: Array<{ key: string; value: string }>
  ) => {
    const targetMetadata = metadata?.find((meta) => meta.key === "target");
    return targetMetadata?.value === "_blank" ? "_blank" : "_self";
  };

  const handleNavigation = (
    url: string,
    metadata?: Array<{ key: string; value: string }>
  ) => {
    setIsHamMenuOpen(false);
    const target = getTargetFromMetadata(metadata);

    if (target === "_blank") {
      window.open(url, "_blank", "noopener,noreferrer");
    } else {
      route.push(url);
    }
  };

  const handleLogout = async () => {
    if (isLoggingOut) return;
    try {
      setIsLoggingOut(true);
      setIsHamMenuOpen(false);
      await logout();
    } catch {
      window.location.href = "/";
    } finally {
      setIsLoggingOut(false);
    }
  };

  useEffect(() => {
    // Prevent extension interference by validating the state
    const validatedState = Boolean(isHamMenuOpen);

    if (validatedState) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }

    // Cleanup function to restore scroll on unmount
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [isHamMenuOpen]);
  return (
    <div
      className={cn(
        "fixed top-[136px] sm:top-[116px] md:top-[121px] h-[calc(100vh-136px)] sm:h-[calc(100vh-116px)] md:h-[calc(100vh-121px)] left-0 w-full bg-white z-40 transition-all duration-[400ms] ease-in-out",
        Boolean(isHamMenuOpen) ? "translate-x-0" : "-translate-x-full"
      )}
    >
      <div className="py-6 px-4 md:px-6 flex flex-col">
        {NAV_LINKS.map((link) => (
          <div
            key={link.href}
            onClick={() => handleNavigation(link.href)}
            className={`block pb-4 hover:text-yellow-600 transition-all duration-300 ease-in-out cursor-pointer ${
              link.href === pathName ? "text-yellow-600" : ""
            }`}
          >
            {link.name}
          </div>
        ))}

        {menuItems.map((item) => (
          <div key={item.id}>
            {item.children && item.children.length > 0 ? (
              <>
                <div
                  className="flex items-center justify-between pb-4 text-black hover:text-yellow-600 transition-all duration-300 ease-in-out cursor-pointer"
                  onClick={() => toggleExpanded(item.id)}
                >
                  <span>{item.name}</span>
                  <span
                    className={`size-4 transition-transform duration-300 ${
                      expandedItems.has(item.id) ? "rotate-180" : ""
                    }`}
                  >
                    {ChevronDownIcon}
                  </span>
                </div>
                {expandedItems.has(item.id) && (
                  <div className="ml-4 border-l border-gray-200 mb-6">
                    {item.children.map((child) => (
                      <div
                        key={child.id}
                        onClick={() =>
                          handleNavigation(child.url, child.metadata)
                        }
                        className="block py-3 pl-4 hover:text-yellow-600 transition-all duration-300 ease-in-out cursor-pointer text-sm"
                      >
                        {child.name}
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div
                onClick={() => handleNavigation(item.url, item.metadata)}
                className={`block pb-4 hover:text-yellow-600 transition-all duration-300 ease-in-out cursor-pointer ${
                  (pathName === "/contact" && item.name === "Contact") ||
                  (pathName === "/frequently-asked-questions" &&
                    item.name === "FAQ")
                    ? "text-yellow-600"
                    : ""
                }`}
              >
                {item.name}
              </div>
            )}
          </div>
        ))}

        {/* Account Section */}
        {isLoggedIn ? (
          <div className="mt-3 pt-3 border-t border-gray-400">
            <div
              onClick={() => handleNavigation("/account")}
              className="flex items-center gap-2 py-3 hover:bg-gray-100 hover:text-yellow-600 transition-all duration-300 ease-in-out cursor-pointer rounded"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-5 h-5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
                />
              </svg>
              <span>Account Dashboard</span>
            </div>
            <div
              onClick={handleLogout}
              className="flex items-center gap-2 py-3 hover:bg-gray-100 hover:text-yellow-600 transition-all duration-300 ease-in-out cursor-pointer rounded"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-5 h-5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9"
                />
              </svg>
              <span>{isLoggingOut ? "Logging out..." : "Logout"}</span>
            </div>
          </div>
        ) : (
          <div className="mt-6 pt-6 border-t border-gray-400">
            <Link href="/account/login" onClick={() => setIsHamMenuOpen(false)}>
              <SecondaryButton className="w-full text-base" content="LOGIN" />
            </Link>
          </div>
        )}

        {/* Find A Dealer Button */}
        {isDealerLocatorEnabled() && (
          <div className="mt-6 pt-6 border-t border-gray-400">
            <PrimaryButton
              className="w-full text-base"
              content="FIND A DEALER"
              onClick={() => handleNavigation("/locator")}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default HamMenuSlide;
