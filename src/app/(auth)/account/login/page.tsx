"use client";

import React, { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";
import { useGlobalStore } from "@/store/useGlobalStore";
import { useMutation } from "@apollo/client";
import {
  SIGN_IN_MUTATION,
  type SignInData,
  type SignInVariables,
} from "@/graphql/mutations/signIn";
import client from "@/graphql/client";
import AccountTabs from "@/app/components/account/AccountTabs";
import Input from "@/app/components/reuseableUI/input";
import PrimaryButton from "@/app/components/reuseableUI/primaryButton";
import { SpinnerIcon } from "@/app/utils/svgs/spinnerIcon";
import { ErrorTag } from "@/app/components/reuseableUI/errorTag";
import { useRecaptcha } from "@/hooks/useRecaptcha";
import ReCAPTCHA from "react-google-recaptcha";
import { useAppConfiguration } from "@/app/components/providers/ServerAppConfigurationProvider";

function LoginInner() {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [apiError, setApiError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState({
    email: "",
    password: "",
    recaptcha: "",
  });
  const [recaptchaValue, setRecaptchaValue] = useState<string | null>(null);

  const searchParams = useSearchParams();
  const sessionExpired = searchParams.get("sessionExpired") === "true";

  const router = useRouter();
  const { login } = useGlobalStore();
  const { recaptchaRef, resetRecaptcha } = useRecaptcha();
  const config = useAppConfiguration();
  const [signIn, { loading }] = useMutation<SignInData, SignInVariables>(
    SIGN_IN_MUTATION
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError(null);
    setFieldErrors({ email: "", password: "", recaptcha: "" });
    const errors = { email: "", password: "", recaptcha: "" };

    let hasError = false;

    if (!formData.email.trim()) {
      errors.email = "Email is required.";
      hasError = true;
    }
    if (!formData.password.trim()) {
      errors.password = "Password is required.";
      hasError = true;
    }

    // Only validate reCAPTCHA if enabled for login
    if (config.isRecaptchaEnabledFor('login') && !recaptchaValue) {
      errors.recaptcha = "Please complete the reCAPTCHA verification.";
      hasError = true;
    }

    if (hasError) {
      setFieldErrors(errors);
      return;
    }

    try {
      const { data } = await signIn({
        variables: {
          email: formData.email,
          password: formData.password,
        },
      });

      const result = data?.tokenCreate;
      if (!result) {
        setApiError("Unexpected error. Please try again.");
        return;
      }

      if (result.errors && result.errors.length > 0) {
        // Prefer first error message
        setApiError(
          result.errors[0]?.message ||
            "Seems like your entered Incorrect Email or Password. Please try again."
        );
        return;
      }

      // Save tokens for subsequent requests
      if (result.token) localStorage.setItem("token", result.token);
      if (result.refreshToken)
        localStorage.setItem("refreshToken", result.refreshToken);
      // Set HttpOnly cookies via API for middleware/SSR
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

      // Update global user state
      if (result.user) {
        const { id, email, firstName, lastName } = result.user;
        const displayName =
          [firstName, lastName].filter(Boolean).join(" ") || email;
        login({ id, email, name: displayName });
      }

      // IMPORTANT: clear Apollo cache so user-specific queries (e.g., me) don't show stale data
      try {
        await client.clearStore();
      } catch (e) {
        // non-fatal; proceed with navigation
        console.warn("Apollo clearStore failed", e);
      }

      const next = searchParams.get("next") || "/";
      router.push(next);
    } catch (err) {
      console.error("Sign-in error", err);
      setApiError("Unable to sign in. Please try again.");
      
      // Reset reCAPTCHA on error
      if (config.isRecaptchaEnabledFor('login')) {
        setRecaptchaValue(null);
        resetRecaptcha();
      }
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen w-full px-4 md:px-6 py-12 md:py-16 lg:py-24 ">
      <div className="flex w-full max-w-[756px] flex-col justify-center items-start gap-6">
        {/* Session expired message */}
        {sessionExpired && (
          <div className="w-full p-4 mb-4 text-red-700 bg-red-100 rounded-md">
            Your session has expired. Please log in again to continue.
          </div>
        )}

        {/* Tabs */}
        <AccountTabs />
        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="flex flex-col items-start gap-4 md:gap-5 self-stretch"
        >
          <div className="w-full">
            <Input
              label="EMAIL"
              type="email"
              name="email"
              placeholder="jamescharles@gmail.com"
              value={formData.email}
              onChange={handleChange}
              hasError={!!fieldErrors.email}
              className="mt-1.5 py-3 px-4 text-sm leading-5 tracking-[-0.035px]"
            />
            {fieldErrors.email && (
              <div
                style={{ color: "var(--color-primary-600)" }}
                className="text-sm leading-5 tracking-[-0.035px] mt-1.5"
              >
                {fieldErrors.email}
              </div>
            )}
          </div>
          <div className="w-full relative">
            <Input
              label="PASSWORD"
              type="password"
              name="password"
              placeholder="********"
              value={formData.password}
              onChange={handleChange}
              hasError={!!fieldErrors.password}
              className="w-full mt-1.5 py-3 px-4 text-sm leading-5 tracking-[-0.035px]"
            />
            {fieldErrors.password && (
              <div
                style={{ color: "var(--color-primary-600)" }}
                className="text-sm leading-5 tracking-[-0.035px] mt-1.5"
              >
                {fieldErrors.password}
              </div>
            )}
          </div>
          <div className="text-right w-full">
            <Link
              href="/account/forgot-password"
              style={{ color: "var(--color-secondary-800)" }}
              className="font-secondary text-xs md:text-sm font-semibold leading-5 tracking-[-0.035px]"
            >
              FORGOT PASSWORD?
            </Link>
          </div>

          {/* Conditional reCAPTCHA for login */}
          {config.isRecaptchaEnabledFor('login') && (
            <div className="w-full flex flex-col items-start">
              <ReCAPTCHA
                ref={recaptchaRef}
                sitekey={config.getGoogleRecaptchaConfig()?.site_key || ''}
                theme="light"
                size="normal"
                onChange={(value) => {
                  setRecaptchaValue(value);
                  // Clear recaptcha error when user completes it
                  if (value && fieldErrors.recaptcha) {
                    setFieldErrors(prev => ({
                      ...prev,
                      recaptcha: ""
                    }));
                  }
                }}
                onExpired={() => {
                  setRecaptchaValue(null);
                  resetRecaptcha();
                }}
                onError={() => {
                  setRecaptchaValue(null);
                  resetRecaptcha();
                }}
              />
              {fieldErrors.recaptcha && (
                <div
                  style={{ color: "var(--color-primary-600)" }}
                  className="text-sm leading-5 tracking-[-0.035px] mt-1.5"
                >
                  {fieldErrors.recaptcha}
                </div>
              )}
            </div>
          )}

           {apiError && (
            <ErrorTag message={apiError } />
          )}
          <PrimaryButton
            type="submit"
            disabled={loading}
            content={
              loading ? (
                <span className="flex items-center justify-center w-full">
                  {SpinnerIcon}
                </span>
              ) : (
                "Login"
              )
            }
            className="w-full text-sm lg:text-base font-semibold leading-[24px] tracking-[-0.04px] py-2 md:py-3 px-4 mt-1"
          />
        </form>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={<div className="max-w-7xl mx-auto px-4 py-8">Loading...</div>}
    >
      <LoginInner />
    </Suspense>
  );
}
