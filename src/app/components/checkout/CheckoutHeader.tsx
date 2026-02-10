"use client";

import { useRouter } from "next/navigation";
import Breadcrumb from "../reuseableUI/breadcrumb";
import CommonButton from "../reuseableUI/commonButton";
import { ArrowIcon } from "@/app/utils/svgs/arrowIcon";

const breadcrumbItems = [
  { text: "HOME", link: "/" },
  { text: "CART", link: "/cart" },
  { text: "CHECKOUT" },
];

interface CheckoutHeaderProps {
  isLoggedIn: boolean;
}

export default function CheckoutHeader({ isLoggedIn }: CheckoutHeaderProps) {
  const router = useRouter();

  return (
    <div className="space-y-6 lg:space-y-10">
      <div className="font-semibold text-sm font-secondary text-[var(--color-secondary-400)] flex items-center w-full justify-between">
        <Breadcrumb items={breadcrumbItems} />
        <div className="flex items-center gap-1 cursor-pointer">
          {isLoggedIn ? (
            <CommonButton
              onClick={() => router.push("/")}
              className="p-0 text-xs md:text-sm lg:text-base"
              content="CONTINUE SHOPPING"
              variant="tertiary"
            />
          ) : (
            <CommonButton
              onClick={() => router.push("/account/login")}
              className="p-0 text-xs md:text-sm lg:text-base"
              content="LOG IN"
              variant="tertiary"
            />
          )}
          <span className="size-5 text-[var(--color-primary-600)]">
            {ArrowIcon}
          </span>
        </div>
      </div>
      <h1 className="font-primary font-normal text-2xl md:text-3xl lg:text-4xl uppercase text-[var(--color-secondary-800)p-0]">
        Checkout
      </h1>
    </div>
  );
}