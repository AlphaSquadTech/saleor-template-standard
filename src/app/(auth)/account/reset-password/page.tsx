"use client";

import { Suspense, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useMutation } from "@apollo/client";
import {
  SET_PASSWORD_MUTATION,
  type SetPasswordData,
  type SetPasswordVariables,
} from "@/graphql/mutations/setPassword";
import { useGlobalStore } from "@/store/useGlobalStore";
import Input from "@/app/components/reuseableUI/input";
import PrimaryButton from "@/app/components/reuseableUI/primaryButton";
import { SpinnerIcon } from "@/app/utils/svgs/spinnerIcon";
import { PasswordRules } from "@/app/components/reuseableUI/passwordRules/passwordRules";
import { ErrorTag } from "@/app/components/reuseableUI/errorTag";

function ResetPasswordInner() {
  const searchParams = useSearchParams();
  const prefilledEmail = searchParams.get("email") || "";
  const prefilledToken = searchParams.get("token") || "";

  const [formData, setFormData] = useState({
    password: "",
    confirmPassword: "",
  });
  const [apiError, setApiError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState({
    password: "",
    confirmPassword: "",
  });
  const [message, setMessage] = useState<string | null>(null);
  const [setPassword, { loading }] = useMutation<
    SetPasswordData,
    SetPasswordVariables
  >(SET_PASSWORD_MUTATION);
  const [email] = useState<string>(prefilledEmail);
  const [token] = useState<string>(prefilledToken);
  const router = useRouter();
  const { login } = useGlobalStore();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError(null);
    setMessage(null);
    setFieldErrors({ password: "", confirmPassword: "" });

    const passwordRegex = {
      length: /^.{8,}$/,
      uppercase: /[A-Z]/,
      lowercase: /[a-z]/,
      number: /[0-9]/,
      specialChar: /[^A-Za-z0-9]/,
    };
    const errors = { password: "", confirmPassword: "" };
    let hasError = false;

    if (
      !passwordRegex.length.test(formData.password) ||
      !passwordRegex.uppercase.test(formData.password) ||
      !passwordRegex.lowercase.test(formData.password) ||
      !passwordRegex.number.test(formData.password) ||
      !passwordRegex.specialChar.test(formData.password)
    ) {
      errors.password = "Password Validation Failed";
      hasError = true;
    }

    if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = "Passwords do not match.";
      hasError = true;
    }

    // if (!email || !token) {
    //   setFieldErrors({ email: 'Invalid or missing reset link. Please request a new one.', token: '' });
    //   return;
    // }

    if (hasError) {
      setFieldErrors(errors);
      return;
    }

    try {
      const { data } = await setPassword({
        variables: {
          email,
          token,
          password: formData.password,
        },
      });

      const result = data?.setPassword;
      const errs = result?.errors || [];
      if (!result || errs.length) {
        setApiError(errs[0]?.message || "Unable to reset password.");
        return;
      }

      // Save tokens (auto-login after reset if provided)
      if (result.token) localStorage.setItem("token", result.token);
      if (result.refreshToken)
        localStorage.setItem("refreshToken", result.refreshToken);
      try {
        await fetch("/api/auth/set", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            token: result.token,
            refreshToken: result.refreshToken,
          }),
        });
      } catch {}

      if (result.user) {
        const { id, email: uEmail, firstName, lastName } = result.user;
        const displayName =
          [firstName, lastName].filter(Boolean).join(" ") || uEmail;
        login({ id, email: uEmail, name: displayName });
      }

      setMessage("Password has been reset successfully. Redirecting...");
      // Redirect to account or login based on whether token exists
      setTimeout(() => {
        if (result.token) router.push("/account");
        else router.push("/account/login");
      }, 1000);
    } catch (err) {
      console.error("Set password error", err);
      setApiError("Unable to reset password. Please try again.");
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen w-full px-4 md:px-6 py-12 md:py-16 lg:py-24px-4 sm:px-6">
      <div className="flex w-full max-w-[756px] flex-col justify-center items-start gap-6">
        <div className="flex flex-col items-start gap-1 md:gap-2 self-stretch">
          <p
            style={{ color: "var(--color-secondary-800)" }}
            className="text-lg md:text-xl font-semibold tracking-[-0.05px] uppercase"
          >
            Reset Password
          </p>
          <p className="text-sm leading-5 tracking-[-0.035px]">
            Please choose a new password for your account.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="w-full flex flex-col gap-6">
          {message && (
            <div
              style={{ color: "var(--color-secondary-800)" }}
              className="mb-4 text-sm"
              role="status"
            >
              {message}
            </div>
          )}
          <div className="w-full">
            <Input
              label="NEW PASSWORD"
              type="password"
              name="password"
              placeholder="Aero@1234"
              value={formData.password}
              hasError={!!fieldErrors.password}
              onChange={handleChange}
              className="mt-1.5 py-3 px-4 text-sm leading-5 tracking-[-0.035px]"
            />
            <PasswordRules value={formData.password} />
          </div>
          <div className="w-full relative">
            <Input
              label="RE-ENTER NEW PASSWORD"
              type="password"
              name="confirmPassword"
              placeholder="*******"
              value={formData.confirmPassword}
              onChange={handleChange}
              className="mt-1.5 py-3 px-4 text-sm leading-5 tracking-[-0.035px]"
              hasError={!!fieldErrors.confirmPassword}
              errorMessage={fieldErrors.confirmPassword}
            />
          </div>
          {apiError && <ErrorTag message={apiError} />}

          <PrimaryButton
            type="submit"
            disabled={loading}
            content={
              loading ? (
                <span className="flex items-center justify-center w-full">
                  {SpinnerIcon}
                </span>
              ) : (
                "Reset Password"
              )
            }
            className="w-full text-sm lg:text-base font-semibold tracking-[-0.04px] py-2 md:py-3 px-4 "
          />
        </form>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={<div className="max-w-7xl mx-auto px-4 py-8">Loading...</div>}
    >
      <ResetPasswordInner />
    </Suspense>
  );
}
