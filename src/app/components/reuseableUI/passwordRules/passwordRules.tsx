"use client";
import { SuccessIcon } from "@/app/utils/svgs/passwordIcons/successIcon";
import { ErrorIcon } from "@/app/utils/svgs/passwordIcons/errorIcon";
import { DotListIcon } from "@/app/utils/svgs/account/myAccount/listDotIcon";

export const PasswordRules = ({ value }: { value: string }) => {
  const rules = [
    {
      label: "At least 8 characters long",
      test: (val: string) => val.length >= 8,
    },
    {
      label: "At least 1 uppercase letter (A-Z)",
      test: (val: string) => /[A-Z]/.test(val),
    },
    {
      label: "At least 1 lowercase letter (a-z)",
      test: (val: string) => /[a-z]/.test(val),
    },
    {
      label: "At least 1 number (0-9)",
      test: (val: string) => /\d/.test(val),
    },
    {
      label: "At least 1 special character",
      test: (val: string) => /[^A-Za-z0-9]/.test(val),
    },
  ];

  return (
    <div className="w-full">
      <ul
        style={{ color: "var(--color-secondary-500)" }}
        className="mt-2 text-sm list-disc list-inside"
      >
        {rules.map((rule, idx) => {
          const passed = rule.test(value);
          return (
            <div key={idx} className="flex items-center gap-1">
            {value ? (
              <span className="w-4 h-4 flex items-center justify-center">
                {passed ? SuccessIcon : ErrorIcon}
              </span>
            ) : (
              <span className="w-4 h-4 flex items-center justify-center">
                {DotListIcon}
              </span>
            )}
              <span>{rule.label}</span>
            </div>
          );
        })}
      </ul>
    </div>
  );
};
