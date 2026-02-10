import { ReactNode } from "react";

interface HeadingProps {
  content: ReactNode;
  className?: string;
}

export default function Heading({ content, className }: HeadingProps) {
  return (
    <p
      style={{ color: "var(--color-secondary-75)" }}
      className={`text-2xl md:text-3xl lg:text-5xl uppercase font-primary -tracking-[0.12px] ${className}`}
    >
      {content}
    </p>
  );
}
