import Link from "next/link";
import React from "react";

const Breadcrumb = ({
  items = [],
}: {
  items: { text: string; link?: string }[];
}) => {
  return (
    <div className="font-semibold uppercase text-xs md:text-sm font-secondary text-[var(--color-secondary-400)]">
      {items.map((item, index) => (
        <React.Fragment key={index}>
          {item.link && index < items.length - 1 ? (
            <Link
              href={item.link}
              className="hover:text-[#e6c200] transition-colors"
            >
              {item.text}
            </Link>
          ) : (
            <span
              className={
                index === items.length - 1
                  ? "text-[#e6c200]"
                  : ""
              }
            >
              {item.text}
            </span>
          )}
          {index < items.length - 1 && <span> / </span>}
        </React.Fragment>
      ))}
    </div>
  );
};

export default Breadcrumb;
