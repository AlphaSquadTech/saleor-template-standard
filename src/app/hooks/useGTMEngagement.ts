"use client";

import { useEffect, useRef } from 'react';
import { gtmScrollDepth, gtmEngagementTime } from '../utils/googleTagManager';

export function useGTMEngagement(gtmId?: string | null) {
  const startTimeRef = useRef<number>(Date.now());
  const scrollThresholdsRef = useRef<Set<number>>(new Set());
  const lastScrollTimeRef = useRef<number>(Date.now());
  const engagementTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Don't track if GTM ID is not provided
    if (!gtmId) return;
    startTimeRef.current = Date.now();
    
    // Track scroll depth
    const handleScroll = () => {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const scrollPercent = Math.round((scrollTop / docHeight) * 100);
      
      // Track scroll milestones: 25%, 50%, 75%, 90%
      const milestones = [25, 50, 75, 90];
      for (const milestone of milestones) {
        if (scrollPercent >= milestone && !scrollThresholdsRef.current.has(milestone)) {
          scrollThresholdsRef.current.add(milestone);
          gtmScrollDepth(milestone, window.location.pathname, gtmId);
        }
      }
      
      lastScrollTimeRef.current = Date.now();
    };

    // Track engagement time every 15 seconds
    const trackEngagementTime = () => {
      const currentTime = Date.now();
      const timeSinceLastScroll = currentTime - lastScrollTimeRef.current;
      
      // Only track if user has been active recently (scrolled within last 30 seconds)
      if (timeSinceLastScroll < 30000) {
        const engagementTime = currentTime - startTimeRef.current;
        gtmEngagementTime(engagementTime, gtmId);
      }
    };

    // Set up event listeners
    window.addEventListener('scroll', handleScroll, { passive: true });
    
    // Track engagement time every 15 seconds
    engagementTimerRef.current = setInterval(trackEngagementTime, 15000);

    // Cleanup
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (engagementTimerRef.current) {
        clearInterval(engagementTimerRef.current);
      }
      
      // Track final engagement time on unmount
      const finalEngagementTime = Date.now() - startTimeRef.current;
      if (finalEngagementTime > 1000) { // Only track if user spent more than 1 second
        gtmEngagementTime(finalEngagementTime, gtmId);
      }
    };
  }, [gtmId]);

  return null; // This hook doesn't return anything, just tracks events
}

export default useGTMEngagement;