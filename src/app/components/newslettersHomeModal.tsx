"use client";

import { useState, useEffect } from "react";
import { NewsLetterClient } from "../newsletter/components/newsletterClient";
import ModalLayout from "./reuseableUI/modalLayout";
import Image from "next/image";
import { ModalCrossIcon } from "../utils/svgs/paymentProcessingIcons/modalCrossIcon";

const NewslettersHomeModal = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [hasClosedOnce, setHasClosedOnce] = useState(false);
  const [isPermanentlyClosed, setIsPermanentlyClosed] = useState(false);

  // Check localStorage and show modal on initial mount
  useEffect(() => {
    const hasSeenNewsletter = localStorage.getItem("hasSeenNewsletterModal");
    const isPermanentlyClosed = localStorage.getItem(
      "newsletterPermanentlyClosed",
    );

    if (isPermanentlyClosed === "true") {
      setIsPermanentlyClosed(true);
      return;
    }

    if (!hasSeenNewsletter) {
      // Small delay to ensure smooth animation
      const timer = setTimeout(() => {
        setIsModalOpen(true);
      }, 500);

      return () => clearTimeout(timer);
    } else {
      // User has seen/closed the modal before
      setHasClosedOnce(true);
    }
  }, []);

  const handleClose = () => {
    setIsModalOpen(false);
    setHasClosedOnce(true);
    // Save to localStorage that user has seen the modal
    localStorage.setItem("hasSeenNewsletterModal", "true");
  };

  const handlePermanentClose = () => {
    setIsModalOpen(false);
    setIsPermanentlyClosed(true);
    localStorage.setItem("newsletterPermanentlyClosed", "true");
  };

  const handleOpen = () => {
    setIsModalOpen(true);
  };

  if (isPermanentlyClosed) {
    return null;
  }

  return (
    <>
      <ModalLayout
        isModalOpen={isModalOpen}
        onClose={handleClose}
        removeCrossIcon={true}
        className="!h-fit !p-0 lg:rounded-3xl lg:!max-w-4xl"
      >
        <button
          onClick={handleClose}
          className="text-black absolute top-5 right-5 [&>svg]:size-4 size-6 p-1 rounded-full bg-[var(--color-secondary-200)] cursor-pointer"
        >
          {ModalCrossIcon}
        </button>
        <div className="grid grid-cols-1 lg:grid-cols-2">
          <Image
            width={0}
            height={0}
            sizes="100vw"
            src="http://wsm-saleor-assets.s3.us-west-2.amazonaws.com/baja-kits/newsletter-signup/9dcf73fa-20fc-4a2e-8159-93e1f964d643.jpeg"
            alt="Newsletter Sign Up"
            className="w-full h-full object-cover hidden lg:block"
          />
          <div className="[&>main>div]:px-0 [&>main>div>div]:py-8 [&>main>div>div>div]:!hidden px-6 py-12">
            <h1 className="text-center font-secondary text-3xl">
              WANT ACCESS TO EXCLUSIVE NEWS?
            </h1>
            <p className="font-secondary text-center text-base pt-4 px-3">
              Sign up to receive access to our latest updates and best offers.
            </p>
            <NewsLetterClient
              handleClose={handlePermanentClose}
              isModalNewsletter={true}
            />
          </div>
        </div>
      </ModalLayout>

      {/* Bottom-left sign-up tag - only show after user has closed modal once */}
      {hasClosedOnce && !isModalOpen && (
        <div className="fixed bottom-0 left-6 z-[110] hover:bg-[var(--color-secondary-700)] transition-all duration-300 hover:scale-105 animate-fadeIn">
          <button
            onClick={handleOpen}
            className="bg-[var(--color-secondary-800)] cursor-pointer text-white px-12 py-3 rounded-t-2xl font-semibold shadow-lg"
          >
            SIGN UP!
          </button>
          <span
            onClick={handlePermanentClose}
            className="text-black absolute -top-2 -right-2 [&>svg]:size-4 p-1 rounded-full bg-white ring-1 ring-black/40 cursor-pointer"
          >
            {ModalCrossIcon}
          </span>
        </div>
      )}

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </>
  );
};

export default NewslettersHomeModal;
