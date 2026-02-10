"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useGlobalStore } from "@/store/useGlobalStore";
import { useMutation } from "@apollo/client";
import {
  REGISTER_ACCOUNT_MUTATION,
  type RegisterAccountData,
  type RegisterAccountVariables,
} from "@/graphql/mutations/registerAccount";
import {
  SIGN_IN_MUTATION,
  type SignInData,
  type SignInVariables,
} from "@/graphql/mutations/signIn";
import AccountTabs from "@/app/components/account/AccountTabs";
import Input from "@/app/components/reuseableUI/input";
import PrimaryButton from "@/app/components/reuseableUI/primaryButton";
import { SpinnerIcon } from "@/app/utils/svgs/spinnerIcon";
import { PasswordRules } from "@/app/components/reuseableUI/passwordRules/passwordRules";
import { ErrorTag } from "@/app/components/reuseableUI/errorTag";
import { useRecaptcha } from "@/hooks/useRecaptcha";
import ReCAPTCHA from "react-google-recaptcha";
import { useAppConfiguration } from "@/app/components/providers/ServerAppConfigurationProvider";
import Link from "next/link";

const RegisterInner: React.FC = () => {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [apiError, setApiError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    recaptcha: "",
  });
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [agreed, setAgreed] = useState(false);
  const [recaptchaValue, setRecaptchaValue] = useState<string | null>(null);
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);

  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useGlobalStore();
  const { recaptchaRef, resetRecaptcha } = useRecaptcha();
  const config = useAppConfiguration();
  const [registerAccount, { loading }] = useMutation<
    RegisterAccountData,
    RegisterAccountVariables
  >(REGISTER_ACCOUNT_MUTATION);
  const [signIn] = useMutation<SignInData, SignInVariables>(SIGN_IN_MUTATION);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    let filteredValue = value;
    if (name === "firstName" || name === "lastName") {
      filteredValue = value.replace(/[^A-Za-z ]/g, "");
    }
    setFormData({
      ...formData,
      [name]: filteredValue,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError(null);
    setSuccessMsg(null);
    setFieldErrors({
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      confirmPassword: "",
      recaptcha: "",
    });

    const errors = {
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      confirmPassword: "",
      recaptcha: "",
    };
    let hasError = false;

    if (!formData.firstName.trim()) {
      errors.firstName = "First name is required.";
      hasError = true;
    }
    if (!formData.lastName.trim()) {
      errors.lastName = "Last name is required.";
      hasError = true;
    }
    if (!formData.email.trim()) {
      errors.email = "Email is required.";
      hasError = true;
    } else if (!/^\S+@\S+\.\S+$/.test(formData.email)) {
      errors.email = "Invalid email address.";
      hasError = true;
    }

    const passwordRegex = {
      // for Border color
      length: /^.{8,}$/,
      uppercase: /[A-Z]/,
      lowercase: /[a-z]/,
      number: /[0-9]/,
      specialChar: /[^A-Za-z0-9]/,
    };
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

    // Only validate reCAPTCHA if enabled for signup
    if (config.isRecaptchaEnabledFor("signup") && !recaptchaValue) {
      errors.recaptcha = "Please complete the reCAPTCHA verification.";
      hasError = true;
    }

    if (hasError) {
      setFieldErrors(errors);
      return;
    }
    if (!agreed) {
      setApiError(
        "You must agree to the Terms and Conditions and Privacy Policy."
      );
      return;
    }

    try {
      const origin =
        typeof window !== "undefined" ? window.location.origin : "";
      const redirectUrl = `${origin}/account/confirm`;

      const { data } = await registerAccount({
        variables: {
          email: formData.email,
          password: formData.password,
          firstName: formData.firstName || undefined,
          lastName: formData.lastName || undefined,
          redirectUrl,
        },
      });

      const result = data?.accountRegister;
      if (!result) {
        setApiError("Unexpected error. Please try again.");
        return;
      }

      if (result.errors && result.errors.length > 0) {
        setApiError(result.errors[0]?.message || "Unable to register.");
        return;
      }

      if (result.requiresConfirmation) {
        setSuccessMsg(
          "Account created. Please check your email to confirm your account."
        );
        return; // do not auto-login
      }

      // Auto-login by creating token, then set storage + cookies
      const { data: signInData } = await signIn({
        variables: { email: formData.email, password: formData.password },
      });
      const signInResult = signInData?.tokenCreate;
      if (!signInResult || signInResult.errors?.length) {
        // Fallback: show success but do not log in silently
        setSuccessMsg("Account created successfully. Please sign in.");
        return;
      }

      if (signInResult.token) localStorage.setItem("token", signInResult.token);
      if (signInResult.refreshToken)
        localStorage.setItem("refreshToken", signInResult.refreshToken);
      try {
        await fetch("/api/auth/set", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            token: signInResult.token,
            refreshToken: signInResult.refreshToken,
          }),
        });
      } catch {}

      const authUser = signInResult.user ?? result.user;
      if (authUser) {
        const { id, email, firstName, lastName } = authUser;
        const displayName =
          [firstName, lastName].filter(Boolean).join(" ") || email;
        login({ id, email, name: displayName });
      }

      const next = searchParams.get("next") || "/account";
      router.push(next);
    } catch (err) {
      console.error("Registration error", err);
      setApiError("Unable to register. Please try again.");

      // Reset reCAPTCHA on error
      if (config.isRecaptchaEnabledFor("signup")) {
        setRecaptchaValue(null);
        resetRecaptcha();
      }
    }
  };
  return (
    <div className="flex items-center justify-center min-h-screen w-full px-4 md:px-6 py-12 md:py-16 lg:py-24">
      <div className="flex w-full max-w-[756px] flex-col justify-center items-start gap-6">
        {/* Tabs */}
        <AccountTabs />
        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="flex flex-col items-start gap-4 md:gap-5 self-stretch w-full"
        >
          {successMsg && (
            <div
              style={{ color: "var(--color-secondary-800)" }}
              className="mb-4 text-sm"
              role="status"
            >
              {successMsg}
            </div>
          )}
          {/* First Name */}
          <div className="w-full">
            <Input
              label="FIRST NAME"
              type="text"
              name="firstName"
              placeholder="Enter your First Name"
              value={formData.firstName}
              onChange={handleChange}
              hasError={!!fieldErrors.firstName}
              className="mt-1.5 py-3 px-4 text-sm leading-5 tracking-[-0.035px]"
              errorMessage={fieldErrors.firstName}
            />
          </div>

          {/* Last Name */}
          <div className="w-full">
            <Input
              label="LAST NAME"
              type="text"
              name="lastName"
              placeholder="Enter your Last Name"
              value={formData.lastName}
              onChange={handleChange}
              hasError={!!fieldErrors.lastName}
              className="mt-1.5 py-3 px-4 text-sm leading-5 tracking-[-0.035px]"
              errorMessage={fieldErrors.lastName}
            />
          </div>

          {/* Email */}
          <div className="w-full">
            <Input
              label="EMAIL"
              type="email"
              name="email"
              placeholder="Enter your Email Address"
              value={formData.email}
              onChange={handleChange}
              hasError={!!fieldErrors.email}
              className="mt-1.5 py-3 px-4 text-sm leading-5 tracking-[-0.035px]"
              errorMessage={fieldErrors.email}
            />
          </div>
          {/* Password */}
          <div className="w-full relative">
            <Input
              label="PASSWORD"
              type="password"
              name="password"
              placeholder="********"
              value={formData.password}
              hasError={!!fieldErrors.password}
              onChange={handleChange}
              onFocus={() => setIsPasswordFocused(true)}
              onBlur={() => setIsPasswordFocused(false)}
              className="mt-1.5 py-3 px-4 text-sm leading-5 tracking-[-0.035px]"
            />
            <div
              className={`z-5 border border-zinc-400 p-4 w-full mt-2 absolute transition-all ease-in-out duration-300 bg-white ${
                isPasswordFocused
                  ? "opacity-100"
                  : "opacity-0 pointer-events-none"
              }`}
            >
              <PasswordRules value={formData.password} />
            </div>
          </div>
          {/* Confirm Password */}
          <div className="w-full relative">
            <Input
              label="CONFIRM PASSWORD"
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              hasError={!!fieldErrors.confirmPassword}
              className="w-full mt-1.5 py-3 px-4 text-sm leading-5 tracking-[-0.035px]"
              errorMessage={fieldErrors.confirmPassword}
            />
          </div>
          {/* Terms & Conditions */}
          <div className="flex items-center mt-1 gap-2 w-full">
            <input
              style={{ accentColor: "var(--color-primary-600)" }}
              type="checkbox"
              className="w-5 h-5 cursor-pointer"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
            />
            <p
              style={{ color: "var(--color-secondary-600)" }}
              className="text-sm lg:text-base/none tracking-[-0.04px] uppercase"
            >
              I AGREE TO THE{" "}
              <Link
                href={"/terms-and-conditions"}
                className="font-semibold hover:underline"
              >
                TERMS AND CONDITIONS
              </Link>{" "}
              &{" "}
              <Link
                href={"/privacy-policy"}
                style={{ color: "var(--color-secondary-600)" }}
                className="font-semibold hover:underline"
              >
                PRIVACY POLICY
              </Link>
            </p>
          </div>

          {/* Conditional reCAPTCHA for signup */}
          {config.isRecaptchaEnabledFor("signup") && (
            <div className="w-full flex flex-col items-start">
              <ReCAPTCHA
                ref={recaptchaRef}
                sitekey={config.getGoogleRecaptchaConfig()?.site_key || ""}
                theme="light"
                size="normal"
                onChange={(value) => {
                  setRecaptchaValue(value);
                  // Clear recaptcha error when user completes it
                  if (value && fieldErrors.recaptcha) {
                    setFieldErrors((prev) => ({
                      ...prev,
                      recaptcha: "",
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

          {apiError && <ErrorTag message={apiError} />}
          <PrimaryButton
            type="submit"
            disabled={
              loading ||
              !formData.firstName.trim() ||
              !formData.lastName.trim() ||
              !formData.email.trim() ||
              !formData.password.trim() ||
              !formData.confirmPassword.trim() ||
              !agreed ||
              (config.isRecaptchaEnabledFor("signup") && !recaptchaValue)
            }
            content={
              loading ? (
                <span className="flex items-center justify-center w-full">
                  {SpinnerIcon}
                </span>
              ) : (
                "Create Account"
              )
            }
            className="w-full text-sm lg:text-base font-semibold tracking-[-0.04px] py-2 md:py-3 px-4 mt-1"
          />
        </form>
      </div>
    </div>
  );
};
export default function RegisterPage() {
  return (
    <Suspense
      fallback={<div className="max-w-7xl mx-auto px-4 py-8">Loading...</div>}
    >
      <RegisterInner />
    </Suspense>
  );
}
