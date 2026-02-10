"use client";

import Input from "../reuseableUI/input";

interface ContactDetailsSectionProps {
  isLoggedIn: boolean;
  userEmail?: string;
  guestEmail: string;
  onEmailChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  emailError?: string | null;
}

export default function ContactDetailsSection({
  isLoggedIn,
  userEmail,
  guestEmail,
  onEmailChange,
  emailError,
}: ContactDetailsSectionProps) {
  if (isLoggedIn) {
    return (
      <div className="space-y-5">
   
        <Input
          disabled
          readOnly
          label="EMAIL"
          name="email"
          type="email"
          value={userEmail || ""}
          className="py-1"
        />
      </div>
    );
  }

  return (
    <div>
      <Input
        label="EMAIL"
        name="email"
        type="email"
        value={guestEmail}
        onChange={onEmailChange}
        required
        hasError={!!emailError}
        errorMessage={emailError || undefined}
          className="py-1"
      />
    </div>
  );
}