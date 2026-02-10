"use client";

import { useAppConfiguration } from "@/app/components/providers/ServerAppConfigurationProvider";
import Breadcrumb from "@/app/components/reuseableUI/breadcrumb";
import { ErrorTag } from "@/app/components/reuseableUI/errorTag";
import Heading from "@/app/components/reuseableUI/heading";
import PrimaryButton from "@/app/components/reuseableUI/primaryButton";
import SecondaryButton from "@/app/components/reuseableUI/secondaryButton";
import Toast from "@/app/components/reuseableUI/Toast";
import { SpinnerIcon } from "@/app/utils/svgs/spinnerIcon";
import {
  GET_NEWSLETTER,
  NewsLetterPageData,
} from "@/graphql/queries/getNewsletter";
import { useRecaptcha } from "@/hooks/useRecaptcha";
import { useQuery } from "@apollo/client";
import React, { useEffect, useState } from "react";
import ReCAPTCHA from "react-google-recaptcha";

export const NewsLetterClient = ({
  isModalNewsletter = false,
  handleClose,
}: {
  isModalNewsletter?: boolean;
  handleClose?: () => void;
}) => {
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [loading, setLoading] = useState(false);
  const [recaptchaValue, setRecaptchaValue] = useState<string | null>(null);

  const { recaptchaRef, resetRecaptcha } = useRecaptcha();
  const config = useAppConfiguration();

  const {
    data,
    loading: queryLoading,
    error,
  } = useQuery(GET_NEWSLETTER, {
    variables: { first: 1 },
  });

  const newsletterPageData: NewsLetterPageData | null = React.useMemo(() => {
    if (!data?.pages?.edges?.length) return null;
    const node = data.pages.edges[0].node;
    const metadata = node.metadata.reduce(
      (acc: Record<string, string>, item: { key: string; value: string }) => {
        acc[item.key] = item.value;
        return acc;
      },
      {},
    );

    return {
      id: node.id,
      title: node.title,
      content: node.content,
      isPublished: node.isPublished,
      contactFormEnabled: metadata.contact_form === "true",
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
    if (newsletterPageData?.fields) {
      const initialFormData: Record<string, string> = {};
      newsletterPageData.fields.forEach((field) => {
        const fieldKey = field.toLowerCase().replace(/[^a-z0-9]/g, "");
        initialFormData[fieldKey] = "";
      });
      setFormData(initialFormData);
    }
  }, [newsletterPageData]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    if (e.target.type === "number" && e.target.value.length <= 17) {
      setFormData({
        ...formData,
        [e.target.name]: e.target.value,
      });
    } else if (e.target.type !== "number") {
      setFormData({
        ...formData,
        [e.target.name]: e.target.value,
      });
    }
    // Clear field error when user starts typing
    if (fieldErrors[e.target.name]) {
      setFieldErrors({
        ...fieldErrors,
        [e.target.name]: "",
      });
    }
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

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setApiError(null);
    setShowSuccessToast(false);
    setFieldErrors({});

    const errors: Record<string, string> = {};
    let hasError = false;

    // Validate all fields

    newsletterPageData?.fields
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
    if (newsletterPageData?.recaptchaEnabled && !recaptchaValue) {
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
      const emailMessage: Record<string, string> = {};
      newsletterPageData?.fields.forEach((field) => {
        const fieldKey = getFieldKey(field);
        emailMessage[fieldKey] = formData[fieldKey];
      });

      // Prepare email recipients
      const recipients: string[] = [];
      if (newsletterPageData?.emailTo) {
        recipients.push(
          ...newsletterPageData.emailTo.split(",").map((e) => e.trim()),
        );
      }

      const ccRecipients: string[] = [];
      if (newsletterPageData?.emailCc) {
        ccRecipients.push(
          ...newsletterPageData.emailCc.split(",").map((e) => e.trim()),
        );
      }

      const bccRecipients: string[] = [];
      if (newsletterPageData?.emailBcc) {
        bccRecipients.push(
          ...newsletterPageData.emailBcc.split(",").map((e) => e.trim()),
        );
      }

      const response = await fetch("/api/form-submission", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          formType: "newsletter",
          pageSlug: "newsletter",
          data: {
            ...emailMessage,
            _to: recipients,
            _cc: ccRecipients.length > 0 ? ccRecipients : undefined,
            _bcc: bccRecipients.length > 0 ? bccRecipients : undefined,
            _subject:
              newsletterPageData?.emailSubject || "Newsletter Form Submission",
          },
          metadata: {},
          timestamp: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to send email");
      }

      // Show success toast
      if (isModalNewsletter) {
        handleClose && handleClose();
      } else {
        setShowSuccessToast(true);
      }

      // Reset form
      const resetFormData: Record<string, string> = {};
      newsletterPageData?.fields.forEach((field) => {
        const fieldKey = getFieldKey(field);
        resetFormData[fieldKey] = "";
      });
      setFormData(resetFormData);

      // Reset reCAPTCHA
      if (newsletterPageData?.recaptchaEnabled) {
        setRecaptchaValue(null);
        resetRecaptcha();
      }

      // Scroll to top to see the toast
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      console.error("Newsletter form submission error:", err);
      setApiError("Failed to send your message. Please try again later.");

      // Reset reCAPTCHA on error
      if (newsletterPageData?.recaptchaEnabled) {
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

  if (error || !newsletterPageData) {
    return (
      <main className="h-full w-full">
        <div className="container mx-auto max-w-[1276px] py-24">
          <div className="text-center text-[var(--color-secondary-800)]">
            <p>Unable to load newsletter page. Please try again later.</p>
          </div>
        </div>
      </main>
    );
  }

  // Function to check if description contains unrendered template variables
  const hasTemplateVariables = (html: string | null): boolean => {
    if (!html) return false;
    // Check for common template syntax patterns
    return /\{\{[^}]+\}\}|\$\{[^}]+\}|\{%[^%]+%\}/.test(html);
  };

  // Clean description of template variables for display
  const cleanDescription = (html: string | null): string | null => {
    if (!html) return null;
    if (!hasTemplateVariables(html)) return html;

    // Remove lines containing template variables
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = html;

    // Remove elements containing template syntax
    const walker = document.createTreeWalker(tempDiv, NodeFilter.SHOW_TEXT);

    const nodesToRemove: Node[] = [];
    let node: Node | null = walker.nextNode();
    while (node !== null) {
      if (node.textContent && hasTemplateVariables(node.textContent)) {
        let parent = node.parentElement;
        while (parent && parent !== tempDiv) {
          if (parent.tagName === "LI") {
            nodesToRemove.push(parent);
            break;
          }
          parent = parent.parentElement;
        }
        if (!nodesToRemove.find((n) => n === node?.parentElement)) {
          nodesToRemove.push(node.parentElement || node);
        }
      }
      node = walker.nextNode();
    }

    nodesToRemove.forEach((n) => n.parentElement?.removeChild(n));

    return tempDiv.innerHTML || null;
  };

  const displayDescription = cleanDescription(newsletterPageData.description);

  return (
    <main className="h-full w-full">
      {/* Success Toast */}
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
              message="Message Sent Successfully!"
              subParagraph={
                newsletterPageData?.successMessage
                  ? newsletterPageData.successMessage.replace(/<[^>]*>/g, "")
                  : "Thank you for applying. We will get back to you soon."
              }
              type="success"
              duration={5000}
              onClose={() => setShowSuccessToast(false)}
            />
          </div>
        </>
      )}

      <div className="container mx-auto max-w-[1276px] px-4">
        <div className="flex flex-col items-start w-full gap-8 py-12 md:py-16 lg:py-24">
          <div className="flex flex-col items-start gap-5 w-full">
            <Breadcrumb
              items={[
                { text: "Home", link: "/" },
                { text: "Newsletter", link: "/newsletter" },
              ]}
            />
            <Heading content={newsletterPageData.title} />
          </div>

          {displayDescription && (
            <>
              <style jsx>{`
                .contact-description {
                  line-height: 1.6;
                }
                .contact-description h3 {
                  font-weight: 600;
                  margin-bottom: 1rem;
                  font-size: 1.125rem;
                }
                .contact-description ul {
                  list-style: none;
                  padding: 0;
                  margin: 0;
                }
                .contact-description ul li {
                  display: flex;
                  align-items: flex-start;
                  margin-bottom: 0.75rem;
                }
                .contact-description ul li i {
                  margin-right: 0.75rem;
                  color: var(--color-primary-600);
                  min-width: 1.25rem;
                  display: inline-flex;
                  align-items: center;
                  justify-content: center;
                }
                .contact-description strong {
                  font-weight: 600;
                  margin-right: 0.25rem;
                }
                .contact-description a {
                  color: var(--color-primary-600);
                  text-decoration: none;
                }
                .contact-description a:hover {
                  text-decoration: underline;
                }
                .contact-description .row {
                  display: grid;
                  grid-template-columns: 1fr;
                  gap: 2rem;
                  margin-bottom: 2rem;
                }
                @media (min-width: 640px) {
                  .contact-description .row {
                    grid-template-columns: 1fr 1fr;
                  }
                }
                .contact-description hr {
                  border: none;
                  border-top: 1px solid var(--color-secondary-200);
                  margin: 1.5rem 0;
                }
              `}</style>
              <div
                className="w-full text-[var(--color-secondary-800)] contact-description"
                dangerouslySetInnerHTML={{ __html: displayDescription }}
              />
            </>
          )}
          {newsletterPageData.isPublished && (
            <form
              onSubmit={handleSubmit}
              className="flex flex-col items-start gap-5 self-stretch w-full"
            >
              <div
                className={`grid w-full gap-5 ${
                  isModalNewsletter
                    ? "grid-cols-1"
                    : "grid-cols-1 md:grid-cols-2"
                }`}
              >
                {newsletterPageData.fields
                  .slice(
                    isModalNewsletter ? 2 : 0, // Skip first two fields if not modal newsletter
                  )
                  .map((field) => {
                    const fieldKey = getFieldKey(field);
                    const isMessageField = fieldKey === "message";

                    if (isMessageField) return null;
                    return (
                      <div key={fieldKey} className="w-full">
                        <label className="block uppercase text-sm font-medium text-[var(--color-secondary-800)] leading-5 tracking-[-0.035px] mb-1.5">
                          {field}
                        </label>
                        <input
                          type={
                            fieldKey === "email"
                              ? "email"
                              : field.toLowerCase().includes("phone")
                                ? "number"
                                : "text"
                          }
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

              {newsletterPageData.fields.some(
                (field) => getFieldKey(field) === "message",
              ) && (
                <div className="w-full">
                  <label className="block uppercase text-sm font-medium text-[var(--color-secondary-800)] leading-5 tracking-[-0.035px] mb-1.5">
                    Message{" "}
                  </label>
                  <textarea
                    name="message"
                    placeholder={getFieldPlaceholder("message")}
                    value={formData.message || ""}
                    onChange={handleChange}
                    required={newsletterPageData.fields.some(
                      (field) =>
                        field.toLowerCase().replace(/[^a-z0-9]/g, "") ===
                          "message" && field.endsWith("*"),
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

              {newsletterPageData.recaptchaEnabled &&
                config.getGoogleRecaptchaConfig()?.site_key && (
                  <div className="w-full">
                    <label className="block uppercase text-sm font-medium text-[var(--color-secondary-800)] leading-5 tracking-[-0.035px] mb-3">
                      reCAPTCHA
                    </label>
                    <div className="flex flex-col items-start">
                      <ReCAPTCHA
                        ref={recaptchaRef}
                        sitekey={
                          config.getGoogleRecaptchaConfig()?.site_key || ""
                        }
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
                {isModalNewsletter ? (
                  <SecondaryButton
                    type="submit"
                    disabled={loading}
                    content={
                      loading ? (
                        <span className="flex items-center justify-center gap-2">
                          <span className="animate-spin">{SpinnerIcon}</span>
                          <span>Sending...</span>
                        </span>
                      ) : (
                        "SIGN ME UP!"
                      )
                    }
                    className="py-2 px-8 w-full rounded-full font-primary font-normal text-base"
                  />
                ) : (
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
                )}
              </div>
            </form>
          )}
        </div>
      </div>
    </main>
  );
};
