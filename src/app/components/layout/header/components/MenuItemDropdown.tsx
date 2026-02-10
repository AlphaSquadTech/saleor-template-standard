import { ChevronDownIcon } from "@/app/utils/svgs/chevronDownIcon";
import Link from "next/link";
import { useState } from "react";
import { useDropdown } from "../hooks/useDropdown";
import type { MenuItem } from "../hooks/useNavbarData";
import { navbarStyles } from "../styles/navbarStyles";

interface MenuItemDropdownProps {
  item: MenuItem;
  isActive: (href: string) => boolean;
}

export const MenuItemDropdown = ({ item, isActive }: MenuItemDropdownProps) => {
  const { isOpen, handleMouseEnter, handleMouseLeave } = useDropdown(50);
  const [openChildId, setOpenChildId] = useState<string | null>(null);

  return (
    <div
      className="relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={() => {
        handleMouseLeave();
        setOpenChildId(null);
      }}
    >
      <Link
        href={item.url}
        prefetch={false}
        className={`${navbarStyles.navLinkBase} ${
          isActive(item.url)
            ? navbarStyles.navLinkActive
            : navbarStyles.navLinkInactive
        } whitespace-nowrap`}
        aria-expanded={isOpen}
        aria-haspopup="menu"
      >
        <div className="flex items-center text-white hover:text-[var(--color-primary-500)] gap-2 transition-all ease-in-out duration-300">
          <span>{item.name}</span>
          <span
            className={`size-4 transition-transform duration-300 ${
              isOpen ? "rotate-180" : ""
            }`}
            aria-hidden="true"
          >
            {ChevronDownIcon}
          </span>
        </div>
      </Link>

      {isOpen && (
        <div
          className={`${navbarStyles.dropdown.container} animate-fadeIn`}
          role="menu"
          aria-label={`${item.name} submenu`}
        >
          {item.children?.map((child) => (
            <div key={child.id}>
              <div
                className={`relative flex flex-col items-start justify-between cursor-pointer ${navbarStyles.dropdown.item}`}
              >
                <div className="flex items-center w-full">
                  <Link
                    href={child.url}
                    prefetch={false}
                    role="menuitem"
                    className="w-full"
                  >
                    <span>{child.name}</span>
                  </Link>
                  <div className="w-full">
                    {child.children && child.children.length > 0 && (
                      <span
                        onClick={() => {
                          setOpenChildId((prevId) =>
                            prevId === child.id ? null : child.id
                          );
                        }}
                        className={`[&>svg]:size-3 [&>svg]:ml-auto [&>svg]:transition-transform [&>svg]:duration-300 ${
                          openChildId === child.id ? "[&>svg]:rotate-180" : ""
                        }`}
                        aria-hidden="true"
                      >
                        {ChevronDownIcon}
                      </span>
                    )}
                  </div>
                </div>

                {child.children &&
                  child.children.length > 0 &&
                  openChildId === child.id && (
                    <div className="pl-5 animate-slideDown pb-4">
                      <div className="border-l border-zinc-400 pl-1">
                        {child.children.map((subChild) => (
                          <Link
                            key={subChild.id}
                            href={subChild.url}
                            prefetch={false}
                            className="block px-2 py-2 text-gray-800 hover:bg-gray-100 hover:text-zinc-600 transition-colors w-full"
                            role="menuitem"
                          >
                            {subChild.name}
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
