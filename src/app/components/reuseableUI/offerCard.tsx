"use client";
import CommonButton from "./commonButton";
import PrimaryButton from "./primaryButton";

export interface OfferCardProps {
  title: string;
  subtitle: string;
  image: string;
  buttonText: string;
}

export const OfferCard = ({
  title,
  subtitle,
  image,
  buttonText,
}: OfferCardProps) => {
  return (
    <div
      style={{
        backgroundImage: `url('${image}')`,
        color: "var(--color-secondary-50)",
      }}
      className="p-6 lg:p-10 bg-cover bg-center relative"
    >
      <div className="flex flex-col gap-20  z-[5] relative">
        <div>
          <p className="font-secondary font-light text-xs md:text-sm lg:text-base tracking-[-0.04px]">
            {subtitle}
          </p>
          <p className="font-secondary text-2xl md:text-3xl font-bold tracking-[-0.075px]">
            {title}
          </p>
        </div>
        <div>
          <CommonButton variant="primary" content={buttonText} className="uppercase py-2 md:py-3" />
        </div>
      </div>
      <div className="bg-black/40 absolute inset-0 w-full h-full z-[2] pointer-events-none" />
    </div>
  );
};
