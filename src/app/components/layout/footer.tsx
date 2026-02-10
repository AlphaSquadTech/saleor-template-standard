import Link from "next/link";
import PaymentMethods from "./paymentMethods";
import SocialLinks from "./socialLinks";
import SiteInfo from "./siteInfo";
import Image from "next/image";
import { fetchMenuBySlug } from "@/graphql/queries/getMenuBySlug";
import { X } from "../../../../public/footer/x";
import { facebook } from "../../../../public/footer/facebook";
import { Instagram } from "../../../../public/footer/instagram";
import { Youtube } from "../../../../public/footer/youtube";

// Define types for footer sections and menu items
type FooterChild = {
  id: string;
  name: string;
  href?: string;
  url?: string;
  metadata?: Array<{
    key: string;
    value: string;
  }>;
};

type FooterSection = {
  id: string;
  name: string;
  url?: string;
  children: FooterChild[];
};

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <span
    style={{ color: "var(--color-primary-600)" }}
    className="font-semibold text-lg text-center md:text-left lg:text-right"
  >
    {children}
  </span>
);

const SocialIcons = [
  {
    icon: facebook,
    link: "https://www.facebook.com/BajaKits/",
  },
  {
    icon: X,
    link: "https://x.com/BajaKits/",
  },
  {
    icon: Youtube,
    link: "https://www.youtube.com/channel/UCRYvqa_0Lscc-ieV6e-hp2w",
  },
  {
    icon: Instagram,
    link: "https://www.instagram.com/bajakits/#",
  },
];

// ---------- STATIC SECTIONS ----------
const STATIC_SECTIONS: FooterSection[] = [
  {
    id: "learn-more",
    name: "LEARN MORE",
    children: [
      { id: "about", name: "About Us", href: "/about" },
      { id: "faqs", name: "FAQ", href: "/frequently-asked-questions" },
      { id: "privacy-policy", name: "Privacy Policy", href: "/privacy-policy" },
      {
        id: "terms-and-conditions",
        name: "Terms & Conditions",
        href: "/terms-and-conditions",
      },
    ],
  },
  {
    id: "support",
    name: "SUPPORT",
    children: [
      { id: "contact-us", name: "Contact Us", href: "/contact-us" },
      { id: "warranty", name: "Warranty", href: "/warranty" },
      {
        id: "shipping-returns",
        name: "Shipping & Returns",
        href: "/shipping-returns",
      },
    ],
  },
];

const getTargetFromMetadata = (
  metadata?: Array<{ key: string; value: string }>
) => {
  const targetMetadata = metadata?.find((meta) => meta.key === "target");
  return targetMetadata?.value === "_blank" ? "_blank" : "_self";
};

const Footer = async () => {
  const currentYear = new Date().getFullYear();
  // Fetch footer menu data from backend
  const footerMenu = await fetchMenuBySlug("footer");
  // Always show static data, add dynamic data if available
  const dynamicSections: FooterSection[] =
    footerMenu &&
    typeof footerMenu === "object" &&
    "items" in footerMenu &&
    Array.isArray(footerMenu.items) &&
    footerMenu.items.length > 0
      ? (
          footerMenu.items as Array<{
            id: string;
            name: string;
            url: string;
            children?: Array<{
              id: string;
              name: string;
              href: string;
              url: string;
              metadata?: Array<{
                key: string;
                value: string;
              }>;
            }>;
          }>
        ).map((item) => ({
          id: item.id,
          name: item.name,
          url: item.url,
          children:
            item.children?.map((child) => ({
              id: child.id,
              name: child.name,
              href: child.href,
              url: child.url,
              metadata: child.metadata,
            })) || [],
        }))
      : [];

  // Combine static sections with dynamic sections
  const sectionsToRender: FooterSection[] =
    dynamicSections.length > 0 ? dynamicSections : STATIC_SECTIONS;
  return (
    <footer style={{ backgroundColor: "var(--color-secondary-950)" }}>
      <div className="bg-[url('/images/footer-background.png')] container mx-auto px-6 pt-6 md:pt-14 pb-6">
        <div className="flex flex-col lg:flex-row justify-between gap-8 lg:gap-24 pb-20">
          <div className="flex items-center justify-center gap-3">
            <Image
              src="/Logo.png"
              alt="footer-icon"
              width={80}
              height={80}
              quality={85}
              sizes="100vw"
              className="w-20 h-20 md:w-28 md:h-28 lg:w-44 lg:h-44 object-contain"
            />
            <Image
              src="/sema-logo.jpg"
              alt="sema-logo"
              width={0}
              height={0}
              quality={85}
              sizes="100vw"
              className="w-20 h-24"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 font-secondary gap-6 lg:gap-4 w-full -tracking-wide">
            {sectionsToRender.map((section) => (
              <div key={section.id} className="flex flex-col w-full gap-3">
                <SectionTitle>
                  <Link href={section.url || ""}>{section.name}</Link>
                </SectionTitle>
                <div className="flex flex-col gap-2">
                  {section.children.map((child) => {
                    return (
                      <Link
                        prefetch={false}
                        key={child.id}
                        href={child.url ? child.url : child.href || "#"}
                        target={getTargetFromMetadata(child.metadata)}
                        rel={
                          getTargetFromMetadata(child.metadata) === "_blank"
                            ? "noopener noreferrer"
                            : undefined
                        }
                        className="text-base text-[var(--color-secondary-50)] hover:text-[var(--color-primary)] transition-all ease-in-out duration-300 cursor-pointer text-center md:text-left lg:text-right"
                      >
                        {child.name}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
            <SiteInfo />
          </div>
        </div>

        <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
          <div className=" flex gap-3 2xl:min-w-[422px]">
            {SocialIcons.map((item) => (
              <Link
                key={item.link}
                href={item.link}
                target="_blank"
                rel="noopener noreferrer"
                className="[&>svg]:size-5 [&>svg]:block [&>svg]:shrink-0 [&>svg]:text-white block bg-white hover:scale-105 transition-all ease-in-out duration-300 p-1.5 rounded-full"
              >
                {item.icon}
              </Link>
            ))}
          </div>
          <p className="font-normal text-center text-xs font-secondary text-[var(--color-secondary-50)] uppercase">
            <strong>
              {" "}
              Copyright © {currentYear} Baja Kits. All Rights Reserved. <br />
              &nbsp;
            </strong>
            <Link
              href={"https://www.webshopmanager.com/"}
              target="_blank"
              rel="nofollow"
              className="hover:underline"
            >
              Powered by&nbsp;Web Shop Manager.
            </Link>
          </p>
          <PaymentMethods />
        </div>
      </div>
    </footer>
  );
};

export default Footer;
