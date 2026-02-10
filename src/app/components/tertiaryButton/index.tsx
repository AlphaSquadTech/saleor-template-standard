import React from "react";
interface ButtonProps {
  content: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
}
const TertiaryButton = ({
  content,
  onClick,
  className = "",
  style = {},
}: ButtonProps) => {
  return (
    <button
      onClick={onClick}
      style={style}
      className={`font-secondary font-semibold uppercase underline cursor-pointer -tracking-[0.035px] text-sm text-white underline-offset-1 hover:underline-offset-4 transition-all ease-in-out duration-300 ${className}`}
    >
      {content}
    </button>
  );
};

export default TertiaryButton;
