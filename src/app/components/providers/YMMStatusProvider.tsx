"use client";

import { useEffect } from "react";
import { useGlobalStore } from "@/store/useGlobalStore";

export default function YMMStatusProvider() {
  const checkYMMStatus = useGlobalStore((state) => state.checkYMMStatus);

  useEffect(() => {
    // Check YMM API status on app load
    checkYMMStatus();
  }, [checkYMMStatus]);

  return null;
}
