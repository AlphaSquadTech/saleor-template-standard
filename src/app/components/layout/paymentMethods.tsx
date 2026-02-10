import { paymentProvidersIconsConfig } from "@/app/utils/constant";
import {
  fetchPaymentMethods,
  PaymentMethodFlagKey,
} from "@/graphql/queries/getPaymentMethods";
import Image from "next/image";
import Link from "next/link";

export type PaymentIconKey = keyof typeof paymentProvidersIconsConfig;

const apiKeyToIconKey: Record<PaymentMethodFlagKey, PaymentIconKey> = {
  VISA: "Visa",
  MasterCard: "Mastercard",
  Amex: "Americanexpress",
  PayPal: "Paypal",
  GooglePay: "Gpay",
  ApplePay: "Applepay",
  Discover: "Discover",
};

const normalizeBool = (v: string | null | undefined) =>
  String(v).trim().toLowerCase() === "true";

export default async function PaymentMethods({
  fallback,
}: {
  fallback?: { name: string; href: string; icon: PaymentIconKey }[];
}) {
  const page = await fetchPaymentMethods();

  let items: { name: string; href: string; icon: PaymentIconKey }[] | null =
    null;

  if (page?.metadata?.length) {
    const enabled = page.metadata
      .filter((m) => normalizeBool(m.value))
      .map((m) => m.key);

    items = enabled
      .map((key) => {
        const icon = apiKeyToIconKey[key as PaymentMethodFlagKey];
        if (!icon || !(icon in paymentProvidersIconsConfig)) return null;
        // Use brand websites as generic hrefs; can be refined later per business rules
        const brandHref: Record<PaymentIconKey, string> = {
          Visa: "https://visa.com",
          Mastercard: "https://mastercard.com",
          Americanexpress: "https://americanexpress.com",
          Paypal: "https://paypal.com",
          Gpay: "https://pay.google.com",
          Applepay: "https://www.apple.com/apple-pay/",
          Discover: "https://discover.com",
        };
        return { name: icon, href: brandHref[icon], icon };
      })
      .filter(Boolean) as {
      name: string;
      href: string;
      icon: PaymentIconKey;
    }[];
  }

  const list = items && items.length > 0 ? items : fallback || [];

  if (!list.length) return null;

  return (
    <div className="flex gap-2 items-center justify-center lg:justify-end flex-wrap w-fit">
      {list.map((p) => {
        const Icon = paymentProvidersIconsConfig[p.icon];
        if (!Icon) return null;
        return (
          <Link
            key={p.name}
            href={p.href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={p.name}
            className="hover:opacity-80 transition-opacity"
          >
            <span className="w-8 h-7">{Icon}</span>
          </Link>
        );
      })}
      <Link
        href={"https://www.affirm.com/"}
        target="_blank"
        rel="noopener noreferrer"
      >
        <Image
          src={"https://cdn-assets.affirm.com/images/black_logo-white_bg.svg"}
          alt="Badge"
          width={50}
          height={30}
          quality={85}
          sizes="100vw"
          className="px-1 rounded-sm h-7 object-contain bg-white hover:opacity-80 transition-opacity"
        />
      </Link>
    </div>
  );
}
