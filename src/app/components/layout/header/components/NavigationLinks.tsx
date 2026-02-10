import Link from "next/link";
import { ChevronDownIcon } from "@/app/utils/svgs/chevronDownIcon";
import MegaMenuDropdown from "../megaMenuDropdown";
import { MenuItemDropdown } from "./MenuItemDropdown";
import { useDropdown } from "../hooks/useDropdown";
import { navbarStyles } from "../styles/navbarStyles";
import type { CategoryNode, MenuItem } from "../hooks/useNavbarData";
import { useMemo } from "react";
import { usePathname } from "next/navigation";

interface NavigationLinksProps {
  categories: CategoryNode[];
  categoriesLoading: boolean;
  menuItems: MenuItem[];
  isActive: (href: string) => boolean;
}

const NAV_LINKS = [
  { name: "Products", href: "/products/all" },
  { name: "About", href: "/about" },
  { name: "Blog", href: "/blog" },
  { name: "Contact", href: "/contact" },
] as const;

export const NavigationLinks = ({
  categories,
  categoriesLoading,
  menuItems,
  isActive,
}: NavigationLinksProps) => {
  const productsDropdown = useDropdown(50);
  const pathName = usePathname();
  const memoizedMenuItems = useMemo(() => {
    return menuItems.map((item) => ({
      ...item,
      hasChildren: item.children && item.children.length > 0,
    }));
  }, [menuItems]);

  const getLinkClassName = (href: string) => {
    return `${navbarStyles.navLinkBase} ${
      isActive(href) ? navbarStyles.navLinkActive : navbarStyles.navLinkInactive
    } ${navbarStyles.navLinkWithUnderline}`;
  };

  const getTargetFromMetadata = (
    metadata?: Array<{ key: string; value: string }>
  ) => {
    const targetMetadata = metadata?.find((meta) => meta.key === "target");
    return targetMetadata?.value === "_blank" ? "_blank" : "_self";
  };
  return (
    <>
      {NAV_LINKS.map((link) =>
        link.name === "Products" ? (
          <div
            key={link.href}
            className="relative"
            onMouseEnter={productsDropdown.handleMouseEnter}
            onMouseLeave={productsDropdown.handleMouseLeave}
          >
            <Link
              href={link.href}
              className={`${navbarStyles.navLinkBase} ${
                isActive(link.href) || pathName.startsWith("/category")
                  ? navbarStyles.navLinkActive
                  : navbarStyles.navLinkInactive
              }`}
              aria-expanded={productsDropdown.isOpen}
              aria-haspopup="menu"
            >
              <div className="flex items-center gap-2 transition-all ease-in-out duration-300">
                <span>{link.name}</span>
                <span
                  className={`size-4 transition-transform duration-300 ${
                    productsDropdown.isOpen ? "rotate-180" : ""
                  }`}
                  aria-hidden="true"
                >
                  {ChevronDownIcon}
                </span>
              </div>
            </Link>

            <MegaMenuDropdown
              isOpen={productsDropdown.isOpen}
              categories={categories}
              categoriesLoading={categoriesLoading}
              onClose={productsDropdown.close}
              onMouseEnter={productsDropdown.handleMouseEnter}
              onMouseLeave={productsDropdown.handleMouseLeave}
            />
          </div>
        ) : memoizedMenuItems && memoizedMenuItems.length > 0 ? null : (
          <Link
            key={link.href}
            href={link.href}
            prefetch={false}
            className={getLinkClassName(link.href)}
          >
            {link.name}
          </Link>
        )
      )}

      {/* Dynamic menu items */}
      {memoizedMenuItems.map((item) =>
        item.hasChildren ? (
          <MenuItemDropdown key={item.id} item={item} isActive={isActive} />
        ) : item.url ? (
          <Link
            key={item.id}
            href={item.url}
            prefetch={false}
            target={getTargetFromMetadata(item.metadata)}
            rel={
              getTargetFromMetadata(item.metadata) === "_blank"
                ? "noopener noreferrer"
                : undefined
            }
            className={`${
              (pathName === "/contact" && item.name === "Contact") ||
              (pathName === "/frequently-asked-questions" &&
                item.name === "FAQ")
                ? "text-[var(--color-primary-500)]"
                : getLinkClassName(item.url)
            } whitespace-nowrap`}
          >
            {item.name}
          </Link>
        ) : null
      )}
    </>
  );
};
