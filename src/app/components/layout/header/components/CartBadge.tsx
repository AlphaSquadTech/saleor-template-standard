import { navbarStyles } from "../styles/navbarStyles";

interface CartBadgeProps {
  count: number;
}

export const CartBadge = ({ count }: CartBadgeProps) => {
  if (count <= 0) return null;
  
  return (
    <span
      className={navbarStyles.cartBadge}
      aria-label={`${count} items in cart`}
    >
      {count}
    </span>
  );
};