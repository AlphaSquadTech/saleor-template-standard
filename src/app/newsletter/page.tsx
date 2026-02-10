import { Suspense } from "react";
import { SpinnerIcon } from "../utils/svgs/spinnerIcon";
import { NewsLetterClient } from "./components/newsletterClient";


export default function NewsletterPage() {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto max-w-[1276px] py-24 text-center">
          <div className="flex items-center justify-center">{SpinnerIcon}</div>
        </div>
      }
    >
      <NewsLetterClient />
    </Suspense>
  );
}
