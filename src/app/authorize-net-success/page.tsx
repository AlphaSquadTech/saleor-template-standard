import { Suspense } from "react";

import AuthorizeNetSummary from "./summary";
import LoadingUI from "../components/reuseableUI/loadingUI";

export default function AuthorizeNetSuccessPage() {
  return (
    <Suspense fallback={<LoadingUI />}>
      <AuthorizeNetSummary />
    </Suspense>
  );
}