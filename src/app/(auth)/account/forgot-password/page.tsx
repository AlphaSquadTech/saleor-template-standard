'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useMutation } from '@apollo/client';
import { REQUEST_PASSWORD_RESET_MUTATION, type RequestPasswordResetData, type RequestPasswordResetVariables } from '@/graphql/mutations/requestPasswordReset';
import Input from '@/app/components/reuseableUI/input';
import PrimaryButton from '@/app/components/reuseableUI/primaryButton';
import { SpinnerIcon } from '@/app/utils/svgs/spinnerIcon';
import { ErrorTag } from '@/app/components/reuseableUI/errorTag';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState('');
  const [requestReset, { loading }] = useMutation<RequestPasswordResetData, RequestPasswordResetVariables>(REQUEST_PASSWORD_RESET_MUTATION);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setApiError(null);
    setFieldError('');

    if (!email.trim()) {
      setFieldError('Email is required.');
      return;
    } else if (!/^\S+@\S+\.\S+$/.test(email)) {
      setFieldError('Invalid email address.');
      return;
    }

    try {
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || (typeof window !== 'undefined' ? window.location.origin : '');
      const redirectUrl = `${siteUrl}/account/reset-password`;

      const { data } = await requestReset({
        variables: { email, redirectUrl },
      });

      const errs = data?.requestPasswordReset.errors || [];
      if (errs.length) {
        setApiError(errs[0]?.message || 'Unable to send reset email.');
        return;
      }

      setMessage('If an account exists for this email, a password reset link has been sent. Please check your inbox and spam folder.');
    } catch (err) {
      console.error('Request password reset error', err);
      setApiError('Unable to send reset email. Please try again.');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-[var(--color-secondary-50)] px-4 md:px-6 py-12 md:py-16 lg:py-24">
      <div className="flex w-full max-w-[756px] flex-col justify-center items-start gap-6">
        {/* Title */}
        <div className="flex flex-col items-start gap-1 md:gap-2 self-stretch">
          <h1 className="text-lg md:text-xl font-semibold tracking-[-0.05px] uppercase mb-1">
            FORGOT PASSWORD
          </h1>
          <p
            style={{ color: "var(--color-secondary-600)" }}
            className="text-sm mb-6"
          >
            Please enter the email linked to your account, and we&apos;ll send
            you a code to reset your password.
          </p>
        </div>
        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6 w-full">
          {/* Email Field */}
          <div className="w-full">
            <Input
              label="EMAIL"
              type="email"
              name="email"
              placeholder="jamescharles@gmail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1.5 border border-[var(--color-secondary-200)] leading-5"
              hasError={!!fieldError}
            />
            {fieldError && (
              <div
                style={{ color: "var(--color-primary-600)" }}
                className="text-sm leading-5 tracking-[-0.035px] mt-1.5"
              >
                {fieldError}
              </div>
            )}
            {message && (
              <div
                style={{ color: "var(--color-secondary-700)" }}
                className="mb-2 text-xs md:text-sm mt-2"
                role="status"
              >
                {message}
              </div>
            )}
          </div>
          {apiError && <ErrorTag message={apiError} />}
          {/* Buttons */}
          <div className="flex gap-3">
            <Link
              href="/account/login"
              style={{
                backgroundColor: "var(--color-secondary-200)",
                color: "var(--color-secondary-700)",
              }}
              className="w-1/2 text-center text-sm lg:text-base py-2.5 md:py-3 px-4 font-semibold uppercase"
            >
              Cancel
            </Link>

            <PrimaryButton
              type="submit"
              disabled={loading}
              content={
                loading ? (
                  <span className="flex items-center justify-center w-full">
                    {SpinnerIcon}
                  </span>
                ) : (
                  "Send Email"
                )
              }
              className="w-1/2 text-sm lg:text-base py-2.5 md:py-3 px-4 font-semibold  "
            />
          </div>
        </form>
      </div>
    </div>
  );
}
