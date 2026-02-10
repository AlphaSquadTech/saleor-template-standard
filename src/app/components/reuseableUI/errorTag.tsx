import { WarningCircleIcon } from "@/app/utils/svgs/warningCircleIcon";
import React from "react";

export const ErrorTag = ({ message }: { message: string }) => {
  return (
    <div
      style={{ color: "var(--color-secondary-800)", backgroundColor: "var(--color-primary-50)" }}
      className="flex items-center text-base gap-2 ring-1 ring-[var(--color-primary-50)] px-3 py-2"
      role="alert"
    >
      {WarningCircleIcon}
      <p className="text-base leading-6 tracking[-0.04px]">{message}</p>
    </div>
  );
};
