import React from "react";

type SectionProps = {
  title: string;
  description: React.ReactNode; // allows both string & JSX (like <Image/>)
  className?: string;
};

export default function Section({ title, description, className = "" }: SectionProps) {
  return (
    <div className={`flex gap-6 ${className}`}>
      <div className="w-full max-w-[366px]">
      <p className="text-2xl font-bold uppercase leading-8 tracking-[-0.06px]">
        {title}
      </p>
      </div>
      <div className="flex flex-col gap-4 leading-7 text-lg tracking-[-0.045px] items-center w-full">{description}</div>
    </div>
  );
}
