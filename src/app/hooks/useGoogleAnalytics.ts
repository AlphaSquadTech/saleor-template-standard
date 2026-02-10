"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { 
  trackPageView, 
  trackUserEngagement, 
  trackScrollDepth,
  trackTimingEvent,
  trackCustomEvent
} from "@/app/utils/googleAnalytics";

export const useGoogleAnalytics = (measurementId?: string | null) => {
  const pathname = usePathname();
  const pageStartTime = useRef<number>(Date.now());
  const lastScrollDepth = useRef<number>(0);
  const engagementInterval = useRef<NodeJS.Timeout | null>(null);
  const [timeOnPage, setTimeOnPage] = useState<number>(0);

  useEffect(() => {
    const currentTime = Date.now();
    pageStartTime.current = currentTime;
    setTimeOnPage(0);

    trackPageView(window.location.href, undefined, measurementId);

    const handleScroll = () => {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
      const scrollPercent = Math.round((scrollTop / scrollHeight) * 100);

      if (scrollPercent > lastScrollDepth.current && scrollPercent % 25 === 0) {
        lastScrollDepth.current = scrollPercent;
        trackScrollDepth(scrollPercent, measurementId);
      }
    };

    const handleBeforeUnload = () => {
      const timeSpent = Date.now() - pageStartTime.current;
      trackTimingEvent("time_on_page", timeSpent, "engagement", measurementId);
      trackUserEngagement(timeSpent, measurementId);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        const timeSpent = Date.now() - pageStartTime.current;
        trackUserEngagement(timeSpent, measurementId);
      } else {
        pageStartTime.current = Date.now();
      }
    };

    const updateTimeOnPage = () => {
      const currentTimeOnPage = Date.now() - pageStartTime.current;
      setTimeOnPage(currentTimeOnPage);
    };

    engagementInterval.current = setInterval(updateTimeOnPage, 1000);

    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      if (engagementInterval.current) {
        clearInterval(engagementInterval.current);
      }
      
      const timeSpent = Date.now() - pageStartTime.current;
      trackTimingEvent("time_on_page", timeSpent, "engagement", measurementId);
      trackUserEngagement(timeSpent, measurementId);

      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [pathname, measurementId]);

  return {
    timeOnPage: Math.floor(timeOnPage / 1000),
  };
};

export const useTrackEntrance = (measurementId?: string | null) => {
  const pathname = usePathname();

  useEffect(() => {
    const referrer = document.referrer;
    const isEntrance = !referrer || !referrer.includes(window.location.hostname);

    if (isEntrance) {
      trackPageView(window.location.href, undefined, measurementId);
      
      const urlParams = new URLSearchParams(window.location.search);
      const utmSource = urlParams.get("utm_source");
      const utmMedium = urlParams.get("utm_medium");
      const utmCampaign = urlParams.get("utm_campaign");

      if (utmSource || utmMedium || utmCampaign) {
        trackCustomEvent("entrance_with_utm", {
          utm_source: utmSource,
          utm_medium: utmMedium,
          utm_campaign: utmCampaign,
          page_location: window.location.href,
        }, measurementId);
      }

      trackCustomEvent("page_entrance", {
        entrance_page: pathname,
        referrer: referrer || "direct",
        is_new_session: true,
      }, measurementId);
    }
  }, [pathname, measurementId]);
};

export const useTrackExit = (measurementId?: string | null) => {
  const pathname = usePathname();

  useEffect(() => {
    const handleBeforeUnload = () => {
      trackCustomEvent("page_exit", {
        exit_page: pathname,
        time_on_page: Date.now() - performance.now(),
      }, measurementId);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        trackCustomEvent("page_exit", {
          exit_page: pathname,
          exit_type: "tab_hidden",
        }, measurementId);
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [pathname, measurementId]);
};