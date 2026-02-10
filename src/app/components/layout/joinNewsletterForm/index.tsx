"use client";
import Image from "next/image";
import Link from "next/link";
import React, { useState } from "react";
import CommonButton from "../../reuseableUI/commonButton";
import Input from "../../reuseableUI/input";

type FormData = {
  email: string;
};

const JoinNewsletterForm: React.FC = () => {
  const [formData, setFormData] = useState<FormData>({ email: "" });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
  };
  const TENANT_NAME = process.env.NEXT_PUBLIC_TENANT_NAME || "default";
  const brandName = TENANT_NAME || "WSM";
  const logo =
    process.env.NEXT_PUBLIC_LOGO_URL ||
    "https://webshopmanager.com/files/images/logo.png";
  return (
    <div className="w-full lg:max-w-[544px]">
      <Link className="hidden lg:flex items-center justify-start" href="/">
        <Image
          src={logo}
          alt={brandName}
          width={133}
          height={40}
        />
      </Link>
      <p
        style={{ color: "var(--color-secondary-100)" }}
        className="font-secondary -tracking-wide text-2xl font-semibold mt-10 mb-5"
      >
        JOIN OUR NEWSLETTER
      </p>

      <form onSubmit={handleSubmit}>
        <div className="w-full flex gap-3 items-end">
          <Input
            label="EMAIL"
            name="email"
            type="email"
            darkTheme={true}
            disabled
            placeholder="Enter your Email Address"
            value={formData.email}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setFormData({ ...formData, email: e.target.value })
            }
            autoComplete="email"
            parentClassName="w-full"
            required
          />

          <CommonButton disabled variant="primary" className="py-3" content="SUBMIT" />
        </div>
      </form>

      <p
        style={{ color: "var(--color-secondary-400)" }}
        className="mt-5 font-secondary text-xs lg:text-base font-semibold -tracking-wide"
      >
        By subscribing you agree to the Terms of Services and Privacy Policy.
      </p>
    </div>
  );
};

export default JoinNewsletterForm;
