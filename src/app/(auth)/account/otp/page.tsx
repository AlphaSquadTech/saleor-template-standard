"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import PrimaryButton from "@/app/components/reuseableUI/primaryButton";

export default function OtpPage() {
  const [otp, setOtp] = useState(new Array(6).fill(""));
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  const handleChange = (value: string, index: number) => {
    if (/[^0-9]/.test(value)) return; // only numbers allowed
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < 5) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert("Entered OTP: " + otp.join(""));
  };

  return (
    <div className="flex items-center justify-center min-h-screen w-full px-4 md:px-6 py-12 md:py-16 lg:py-24">
      <div className="flex w-full max-w-[756px] flex-col justify-center items-start gap-6">
        {/* Title */}
        <div className="flex flex-col items-start gap-2 self-stretch">
          <h1 className="text-base font-semibold leading-6 uppercase mb-1">
            ENTER CODE
          </h1>
          <p
            style={{ color: "var(--color-secondary-800)" }}
            className="text-sm leading-5 tracking-[-0.035px]"
          >
            Enter the 6-digit code we sent to{" "}
            <span
              style={{ color: "var(--color-secondary-800)" }}
              className="text-sm leading-5 tracking-[-0.035px] font-semibold"
            >
              jamescharles@gmail.com {/* original email here */}
            </span>
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6 w-full">
          <div className="flex justify-between gap-3">
            {otp.map((digit, index) => (
              <input
                key={index}
                type="text"
                value={digit}
                placeholder="-"
                onChange={(e) => handleChange(e.target.value, index)}
                onKeyDown={(e) => handleKeyDown(e, index)}
                maxLength={1}
                ref={(el) => {
                  inputsRef.current[index] = el;
                }}
                style={{ border: "1px solid var(--color-secondary-200)" }}
                className="w-12 h-12 text-center text-lg font-semibold"
                required
              />
            ))}
          </div>

          {/* Resend text */}
          <div className="w-full">
            <p className="text-sm mb-6">
              Didn&apos;t receive a code?{" "}
              <span className="font-medium cursor-pointer">Resend Code</span>
            </p>
          </div>

          {/* Buttons */}
          <div className="flex gap-3">
            <Link
              href="/account/login"
              style={{
                backgroundColor: "var(--color-secondary-200)",
                color: "var(--color-secondary-700)",
              }}
              className="w-1/2 text-center text-sm md:text-base py-2 md:py-3 px-4 font-semibold uppercase"
            >
              Back
            </Link>

            <PrimaryButton
              type="submit"
              content="Continue"
              className="w-1/2 text-sm md:text-base py-2 md:py-3 px-4 font-semibold  "
            />
          </div>
        </form>
      </div>
    </div>
  );
}
