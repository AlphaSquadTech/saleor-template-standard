import { useAppConfiguration } from "@/app/components/providers/ServerAppConfigurationProvider";
import { ErrorTag } from "@/app/components/reuseableUI/errorTag";
import ModalLayout from "@/app/components/reuseableUI/modalLayout";
import PrimaryButton from "@/app/components/reuseableUI/primaryButton";
import Toast from "@/app/components/reuseableUI/Toast";
import { SpinnerIcon } from "@/app/utils/svgs/spinnerIcon";
import {
  GET_PRODUCT_INQUIRY_FORM,
  InquiryPageData,
} from "@/graphql/queries/productInquiry";
import { useRecaptcha } from "@/hooks/useRecaptcha";
import { useQuery } from "@apollo/client";
import { usePathname } from "next/navigation";
import React, { useEffect, useState } from "react";
import ReCAPTCHA from "react-google-recaptcha";

const ItemInquiryModal = ({
  isModalOpen,
  onClose,
}: {
  isModalOpen: boolean;
  onClose: () => void;
}) => {
  const {
    data,
    loading: queryLoading,
    error,
  } = useQuery(GET_PRODUCT_INQUIRY_FORM, {
    variables: { first: 1 },
  });
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [loading, setLoading] = useState(false);
  const { recaptchaRef, resetRecaptcha } = useRecaptcha();
  const config = useAppConfiguration();
  const [recaptchaValue, setRecaptchaValue] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const pathname = usePathname();

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const getFieldKey = (field: string): string => {
    return field.toLowerCase().replace(/[^a-z0-9]/g, "");
  };

  const getFieldPlaceholder = (field: string): string => {
    const placeholders: Record<string, string> = {
      name: "Enter Your Full Name",
      email: "Enter Your Email",
      phone: "Enter Your Phone Number",
      subject: "Enter Subject",
      message: "Type your message here...",
    };
    const key = getFieldKey(field);
    return placeholders[key] || `Enter ${field}`;
  };

  const productInquiryPageData: InquiryPageData | null = React.useMemo(() => {
    if (!data?.pages?.edges?.length) return null;
    const node = data.pages.edges[0].node;
    const metadata = node.metadata.reduce(
      (acc: Record<string, string>, item: { key: string; value: string }) => {
        acc[item.key] = item.value;
        return acc;
      },
      {}
    );

    return {
      id: node.id,
      title: node.title,
      contactFormEnabled: metadata.contact_form === "true",
      isPublished: node.isPublished,
      productInquiryFormEnabled: metadata.product_inquiry_form === "true",
      recaptchaEnabled: metadata.reCAPTCHA === "true",
      fields: metadata.fields
        ? metadata.fields.split(",").map((f: string) => f.trim())
        : [],
      description: metadata.description || null,
      emailTo: metadata.email_to || null,
      emailCc: metadata.email_cc || null,
      emailBcc: metadata.email_bcc || null,
      emailSubject: metadata.email_subject || null,
      successMessage: metadata.success_message || null,
    };
  }, [data]);

  useEffect(() => {
    if (productInquiryPageData?.fields) {
      const initialFormData: Record<string, string> = {};
      productInquiryPageData.fields.forEach((field) => {
        const fieldKey = field.toLowerCase().replace(/[^a-z0-9]/g, "");
        initialFormData[fieldKey] = "";
      });
      setFormData(initialFormData);
    }
  }, [productInquiryPageData]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    // Clear field error when user starts typing
    if (fieldErrors[e.target.name]) {
      setFieldErrors({
        ...fieldErrors,
        [e.target.name]: "",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setApiError(null);
    setShowSuccessToast(false);
    setFieldErrors({});

    const errors: Record<string, string> = {};
    let hasError = false;

    // Validate all fields
    productInquiryPageData?.fields
      .filter((field) => field.endsWith("*"))
      .forEach((field) => {
        const fieldKey = getFieldKey(field);
        const value = formData[fieldKey];

        if (!value || !value.trim()) {
          errors[fieldKey] = `${field} is required.`;
          hasError = true;
        } else if (fieldKey === "email" && !validateEmail(value)) {
          errors[fieldKey] = "Please enter a valid email address.";
          hasError = true;
        }
      });

    // Validate reCAPTCHA if enabled
    if (productInquiryPageData?.recaptchaEnabled && !recaptchaValue) {
      errors.recaptcha = "Please complete the reCAPTCHA verification.";
      hasError = true;
    }

    if (hasError) {
      setFieldErrors(errors);
      return;
    }

    setLoading(true);

    try {
      // Prepare email message
      const emailMessage: Record<string, string> = {
        productUrl:
          typeof window !== "undefined" ? window.location.href : pathname,
      };
      productInquiryPageData?.fields.forEach((field) => {
        const fieldKey = getFieldKey(field);
        emailMessage[fieldKey] = formData[fieldKey];
      });

      // Prepare email recipients
      const recipients: string[] = [];
      if (productInquiryPageData?.emailTo) {
        recipients.push(
          ...productInquiryPageData.emailTo.split(",").map((e) => e.trim())
        );
      }

      const ccRecipients: string[] = [];
      if (productInquiryPageData?.emailCc) {
        ccRecipients.push(
          ...productInquiryPageData.emailCc.split(",").map((e) => e.trim())
        );
      }

      const bccRecipients: string[] = [];
      if (productInquiryPageData?.emailBcc) {
        bccRecipients.push(
          ...productInquiryPageData.emailBcc.split(",").map((e) => e.trim())
        );
      }

      const response = await fetch("/api/form-submission", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          formType: "item_inquiry",
          pageSlug: "item-inquiry",
          data: {
            ...emailMessage,
            _to: recipients,
            _cc: ccRecipients.length > 0 ? ccRecipients : undefined,
            _bcc: bccRecipients.length > 0 ? bccRecipients : undefined,
            _subject:
              productInquiryPageData?.emailSubject || "Inquiry Form Submission",
          },
          metadata: {},
          timestamp: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to send email");
      }
      onClose();

      // Show success toast
      setShowSuccessToast(true);

      // Reset form
      const resetFormData: Record<string, string> = {};
      productInquiryPageData?.fields.forEach((field) => {
        const fieldKey = getFieldKey(field);
        resetFormData[fieldKey] = "";
      });
      setFormData(resetFormData);

      // Reset reCAPTCHA
      if (productInquiryPageData?.recaptchaEnabled) {
        setRecaptchaValue(null);
        resetRecaptcha();
      }

      // Scroll to top to see the toast
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      console.error("Contact form submission error:", err);
      setApiError("Failed to send your message. Please try again later.");

      // Reset reCAPTCHA on error
      if (productInquiryPageData?.recaptchaEnabled) {
        setRecaptchaValue(null);
        resetRecaptcha();
      }
    } finally {
      setLoading(false);
    }
  };

  if (queryLoading) {
    return (
      <main className="h-full w-full">
        <div className="container mx-auto max-w-[1276px] py-24 text-center">
          <div className="flex items-center justify-center">{SpinnerIcon}</div>
        </div>
      </main>
    );
  }

  if (error || !productInquiryPageData) {
    return (
      <main className="h-full w-full">
        <div className="container mx-auto max-w-[1276px] py-24">
          <div className="text-center text-[var(--color-secondary-800)]">
            <p>Unable to load contact page. Please try again later.</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <>
      <ModalLayout isModalOpen={isModalOpen} onClose={onClose}>
        <div className="space-y-1 pb-6">
          <h1 className="text-2xl font-semibold ">{"Product Inquiry"}</h1>
          <p className="text-base font-normal">
            {productInquiryPageData.description}
          </p>
        </div>
        <form
          onSubmit={handleSubmit}
          className="flex flex-col items-start gap-5 self-stretch w-full"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 w-full gap-5">
            {productInquiryPageData.fields.map((field) => {
              const fieldKey = getFieldKey(field);
              const isMessageField = fieldKey === "message";

              if (isMessageField) return null;

              return (
                <div key={fieldKey} className="w-full">
                  <label className="block uppercase text-sm font-medium text-[var(--color-secondary-800)] leading-5 tracking-[-0.035px] mb-1.5">
                    {field}
                  </label>
                  <input
                    type={fieldKey === "email" ? "email" : "text"}
                    name={fieldKey}
                    placeholder={getFieldPlaceholder(field)}
                    value={formData[fieldKey] || ""}
                    onChange={handleChange}
                    required={field.endsWith("*") ? true : false}
                    className={`w-full py-3 px-4 text-sm leading-5 tracking-[-0.035px] text-[var(--color-secondary-800)] border outline-none bg-white disabled:bg-[var(--color-secondary-200)] disabled:pointer-events-none ${
                      fieldErrors[fieldKey]
                        ? "border-[var(--color-primary-600)]"
                        : "border-[var(--color-secondary-300)] focus:border-[var(--color-secondary-600)]"
                    }`}
                  />
                  {fieldErrors[fieldKey] && (
                    <div
                      style={{ color: "var(--color-primary-600)" }}
                      className="text-sm leading-5 tracking-[-0.035px] mt-1.5"
                    >
                      {fieldErrors[fieldKey]}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {productInquiryPageData.fields.some(
            (field) => getFieldKey(field) === "message"
          ) && (
            <div className="w-full">
              <label className="block uppercase text-sm font-medium text-[var(--color-secondary-800)] leading-5 tracking-[-0.035px] mb-1.5">
                Message
              </label>
              <textarea
                name="message"
                placeholder={getFieldPlaceholder("message")}
                value={formData.message || ""}
                onChange={handleChange}
                required={productInquiryPageData.fields.some(
                  (field) =>
                    field.toLowerCase().replace(/[^a-z0-9]/g, "") ===
                      "message" && field.endsWith("*")
                )}
                rows={9}
                className={`w-full min-h-[50px] py-3 px-4 text-sm leading-5 tracking-[-0.035px] text-[var(--color-secondary-800)] border outline-none bg-white disabled:bg-[var(--color-secondary-200)] disabled:pointer-events-none ${
                  fieldErrors.message
                    ? "border-[var(--color-primary-600)]"
                    : "border-[var(--color-secondary-300)] focus:border-[var(--color-secondary-600)]"
                }`}
              />
              {fieldErrors.message && (
                <div
                  style={{ color: "var(--color-primary-600)" }}
                  className="text-sm leading-5 tracking-[-0.035px] mt-1.5"
                >
                  {fieldErrors.message}
                </div>
              )}
            </div>
          )}

          {productInquiryPageData.recaptchaEnabled &&
            config.getGoogleRecaptchaConfig()?.site_key && (
              <div className="w-full">
                <label className="block uppercase text-sm font-medium text-[var(--color-secondary-800)] leading-5 tracking-[-0.035px] mb-3">
                  reCAPTCHA
                </label>
                <div className="flex flex-col items-start">
                  <ReCAPTCHA
                    ref={recaptchaRef}
                    sitekey={config.getGoogleRecaptchaConfig()?.site_key || ""}
                    theme="light"
                    size="normal"
                    onChange={(value) => {
                      setRecaptchaValue(value);
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
              </div>
            )}

          {apiError && (
            <div className="w-full">
              <ErrorTag message={apiError} />
            </div>
          )}

          <div className="flex items-end justify-end w-full">
            <PrimaryButton
              type="submit"
              disabled={loading}
              content={
                loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="animate-spin">{SpinnerIcon}</span>
                    <span>Sending...</span>
                  </span>
                ) : (
                  "SUBMIT"
                )
              }
              className="py-3 px-8"
            />
          </div>
        </form>
      </ModalLayout>
      {showSuccessToast && (
        <>
          <style jsx global>{`
            @keyframes slideInRight {
              from {
                transform: translateX(100%);
                opacity: 0;
              }
              to {
                transform: translateX(0);
                opacity: 1;
              }
            }
            .animate-slide-in {
              animation: slideInRight 0.3s ease-out;
            }
          `}</style>
          <div className="fixed top-4 right-4 z-50 animate-slide-in">
            <Toast
              message="Inquiry message sent Successfully!"
              subParagraph={
                productInquiryPageData?.successMessage
                  ? productInquiryPageData.successMessage.replace(
                      /<[^>]*>/g,
                      ""
                    )
                  : "Thank you for contacting us. We will get back to you soon."
              }
              type="success"
              duration={5000}
              onClose={() => setShowSuccessToast(false)}
            />
          </div>
        </>
      )}
    </>
  );
};

export default ItemInquiryModal;
