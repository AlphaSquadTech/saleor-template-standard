import Image from "next/image";
import Link from "next/link";
import { navbarStyles } from "../styles/navbarStyles";

interface NavbarBrandProps {
  logo: string;
  brandName: string;
  width?: number;
  height?: number;
}

export const NavbarBrand = ({ logo, brandName, width = 133, height = 40 }: NavbarBrandProps) => {
  return (
    <Link 
      href="/" 
      prefetch={false} 
      className={navbarStyles.brandContainer}
      aria-label={`${brandName} Home`}
    >
      <Image
        src={logo}
        alt={brandName}
        width={width}
        height={height}
        priority
      />
    </Link>
  );
};