import React from "react";
interface tag {
  content: string;
}
const SaleTag = ({ content }: tag) => {
  return (
    <div
      style={{
        backgroundColor: "var(--color-primary-600)",
        color: "var(--color-secondary-100)",
      }}
      className="px-3 py-1"
    >
      {content}
    </div>
  );
};

export default SaleTag;
