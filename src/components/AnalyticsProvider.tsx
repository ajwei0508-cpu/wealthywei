"use client";

import { useEffect, useCallback, createContext, useContext, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";

interface AnalyticsContextType {
  trackEvent: (action_type: string, metadata?: Record<string, any>) => void;
}

const AnalyticsContext = createContext<AnalyticsContextType>({
  trackEvent: () => {},
});

export const useAnalytics = () => useContext(AnalyticsContext);

function getVisitorId(): string {
  if (typeof window === "undefined") return "anon";
  try {
    let vid = localStorage.getItem("bw_visitor_id");
    if (!vid) {
      vid = "v_" + Math.random().toString(36).substring(2, 11) + "_" + Date.now().toString(36);
      localStorage.setItem("bw_visitor_id", vid);
    }
    return vid;
  } catch {
    return "anon";
  }
}

function getSessionId(): string {
  if (typeof window === "undefined") return "session";
  try {
    let sid = sessionStorage.getItem("bw_session_id");
    if (!sid) {
      sid = "s_" + Math.random().toString(36).substring(2, 11) + "_" + Date.now().toString(36);
      sessionStorage.setItem("bw_session_id", sid);
    }
    return sid;
  } catch {
    return "session";
  }
}

function getDeviceType(): "mobile" | "tablet" | "desktop" {
  if (typeof window === "undefined") return "desktop";
  const ua = navigator.userAgent.toLowerCase();
  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
    return "tablet";
  }
  if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/i.test(ua)) {
    return "mobile";
  }
  return "desktop";
}

export default function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();

  // Page dwell time tracking refs
  const pageStartTimeRef = useRef<number>(Date.now());
  const activeSecondsRef = useRef<number>(0);
  const lastActiveTimestampRef = useRef<number>(Date.now());
  const currentPathRef = useRef<string>("");
  const lastTrackedUrlRef = useRef<string>("");
  const currentTitleRef = useRef<string>("");
  const heartbeatTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Helper to send events to backend
  const trackEvent = useCallback(
    (action_type: string, metadata: Record<string, any> = {}) => {
      if (typeof window === "undefined") return;
      const url = `${pathname}${searchParams?.toString() ? `?${searchParams.toString()}` : ""}`;
      const visitorId = getVisitorId();
      const sessionId = getSessionId();
      const deviceType = getDeviceType();

      const payload = {
        user_email: session?.user?.email || "anonymous",
        // @ts-ignore
        user_role: session?.user?.role || (session?.user?.email ? "director" : "guest"),
        action_type,
        path: url,
        metadata: {
          visitor_id: visitorId,
          session_id: sessionId,
          device: deviceType,
          screen_width: window.innerWidth,
          screen_height: window.innerHeight,
          ...metadata,
        },
      };

      try {
        fetch("/api/analytics", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          keepalive: true,
        }).catch((err) => console.error("Analytics Error:", err));
      } catch (err) {
        console.error("Analytics fetch error:", err);
      }
    },
    [pathname, searchParams, session]
  );

  // Function to flush recorded dwell time for current page
  const sendDwellTime = useCallback(() => {
    if (typeof window === "undefined") return;
    const path = currentPathRef.current;
    if (!path) return;

    // Calculate elapsed active time up to now
    if (document.visibilityState === "visible") {
      const now = Date.now();
      const delta = Math.round((now - lastActiveTimestampRef.current) / 1000);
      if (delta > 0 && delta < 300) {
        activeSecondsRef.current += delta;
      }
      lastActiveTimestampRef.current = now;
    }

    const duration = activeSecondsRef.current;
    // Only send if stayed at least 1 second
    if (duration >= 1) {
      // Reset activeSeconds so we never double count the same duration
      activeSecondsRef.current = 0;

      const visitorId = getVisitorId();
      const sessionId = getSessionId();
      const deviceType = getDeviceType();

      const payload = {
        user_email: session?.user?.email || "anonymous",
        // @ts-ignore
        user_role: session?.user?.role || (session?.user?.email ? "director" : "guest"),
        action_type: "dwell_time",
        path,
        metadata: {
          visitor_id: visitorId,
          session_id: sessionId,
          device: deviceType,
          duration_seconds: duration,
          title: currentTitleRef.current || document.title,
        },
      };

      try {
        const bodyStr = JSON.stringify(payload);
        if (navigator.sendBeacon) {
          const blob = new Blob([bodyStr], { type: "application/json" });
          navigator.sendBeacon("/api/analytics", blob);
        } else {
          fetch("/api/analytics", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: bodyStr,
            keepalive: true,
          }).catch(() => {});
        }
      } catch (e) {
        console.error("sendDwellTime error:", e);
      }
    }
  }, [session]);

  // Handle visibility changes (pause timer if tab is hidden)
  useEffect(() => {
    const handleVisibilityChange = () => {
      const now = Date.now();
      if (document.visibilityState === "hidden") {
        const delta = Math.round((now - lastActiveTimestampRef.current) / 1000);
        if (delta > 0 && delta < 300) {
          activeSecondsRef.current += delta;
        }
        // Save dwell time on tab hide
        sendDwellTime();
      } else {
        lastActiveTimestampRef.current = now;
      }
    };

    const handleBeforeUnload = () => {
      sendDwellTime();
    };

    window.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("pagehide", handleBeforeUnload);

    return () => {
      window.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("pagehide", handleBeforeUnload);
    };
  }, [sendDwellTime]);

  // Track page views and initialize dwell time timer on route change
  useEffect(() => {
    // If NextAuth is still loading the session, wait for it unless it takes too long
    if (status === "loading") return;

    const currentFullUrl = `${pathname}${searchParams?.toString() ? `?${searchParams.toString()}` : ""}`;

    // Prevent duplicate track calls on re-renders for the exact same URL
    if (lastTrackedUrlRef.current === currentFullUrl) {
      return;
    }

    // Send previous page's dwell time before switching
    if (currentPathRef.current && currentPathRef.current !== pathname) {
      sendDwellTime();
    }

    lastTrackedUrlRef.current = currentFullUrl;
    currentPathRef.current = currentFullUrl;
    currentTitleRef.current = document.title;
    pageStartTimeRef.current = Date.now();
    activeSecondsRef.current = 0;
    lastActiveTimestampRef.current = Date.now();

    // Track page_view once per navigation
    trackEvent("page_view", {
      referrer: document.referrer,
      title: document.title,
    });

    // Clear previous heartbeat timer
    if (heartbeatTimerRef.current) {
      clearInterval(heartbeatTimerRef.current);
    }

    // Set heartbeat timer every 60s to periodically flush long dwells
    heartbeatTimerRef.current = setInterval(() => {
      if (document.visibilityState === "visible") {
        const now = Date.now();
        const delta = Math.round((now - lastActiveTimestampRef.current) / 1000);
        if (delta > 0 && delta < 300) {
          activeSecondsRef.current += delta;
        }
        lastActiveTimestampRef.current = now;

        // If user has stayed for more than 60 seconds, flush incrementally to keep database up to date
        if (activeSecondsRef.current >= 60) {
          sendDwellTime();
        }
      }
    }, 60000);

    return () => {
      if (heartbeatTimerRef.current) {
        clearInterval(heartbeatTimerRef.current);
      }
    };
  }, [pathname, searchParams, status, trackEvent, sendDwellTime]);

  return (
    <AnalyticsContext.Provider value={{ trackEvent }}>
      {children}
    </AnalyticsContext.Provider>
  );
}
