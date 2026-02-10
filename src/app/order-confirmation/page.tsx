import { Suspense } from "react";

import Summary from "./summary";
import LoadingUI from "../components/reuseableUI/loadingUI";

export default function OrderConfirmationPage() {
  return (
    <Suspense fallback={<LoadingUI />}>
      <Summary />
    </Suspense>
  );
}
