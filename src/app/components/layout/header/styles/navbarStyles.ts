export const navbarStyles = {
  navLinkBase: "font-secondary font-medium w-auto hover:text-[var(--color-primary-500)] transition-all ease-in-out duration-300 relative group",
  
  navLinkActive: "text-[var(--color-primary-500)] after:w-full",
  
  navLinkInactive: "text-[var(--color-secondary-50)]",
  
  navLinkWithUnderline: "after:bg-[var(--color-primary-500)] after:transition-all after:duration-300",
  
  iconBtnBase: "cursor-pointer transition-all ease-in-out duration-300 hover:bg-[var(--color-secondary-900)] hover:text-[var(--color-primary-500)]",
  
  mobileContainer: "xl:hidden flex items-center py-5 px-6 bg-[var(--color-secondary-950)] text-sm font-semibold",

  desktopContainer: "hidden xl:flex w-full items-center justify-between gap-10 py-5 px-20 bg-[var(--color-secondary-950)] text-sm font-semibold",
  
  linksContainer: "grid auto-cols-auto grid-flow-col gap-10 items-center w-auto",
  
  actionsContainer: "ml-auto flex w-full items-center gap-3",
  
  brandContainer: "flex-shrink-0 relative w-[133px] flex items-center h-[40px]",
  
  dropdown: {
    container: "absolute top-full left-0 mt-2 p-2 bg-white shadow-lg overflow-y-auto min-w-84 max-h-80 z-50",
    item: "block px-4 py-2 text-gray-800 hover:bg-gray-100 hover:text-zinc-600 transition-colors"
  },
  cartBadge: "absolute -right-0.5 -top-1.5 lg:-right-1 lg:-top-1.5 flex size-5 items-center justify-center rounded-full text-xs bg-[var(--color-primary-600)] text-[var(--color-secondary-800)]"
} as const;