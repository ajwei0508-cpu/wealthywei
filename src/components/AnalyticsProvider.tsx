"use client";

import { useEffect, useCallback, createContext, useContext } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";

interface AnalyticsContextType {
  trackEvent: (action_type: string, metadata?: Record<string, any>) => void;
}

const AnalyticsContext = createContext<AnalyticsContextType>({
  trackEvent: () => {},
});

export const useAnalytics = () => useContext(AnalyticsContext);

export default function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { data: session } = useSession();

  // Helper to send events to our backend API
  const trackEvent = useCallback(
    (action_type: string, metadata: Record<string, any> = {}) => {
      const url = `${pathname}${searchParams?.toString() ? `?${searchParams.toString()}` : ""}`;
      
      // We do not await this, let it run in the background
      fetch("/api/analytics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_email: session?.user?.email || "anonymous",
          // @ts-ignore
          user_role: session?.user?.role || "guest",
          action_type,
          path: url,
          metadata,
        }),
      }).catch((err) => console.error("Analytics Error:", err));
    },
    [pathname, searchParams, session]
  );

  // Automatically track page views
  useEffect(() => {
    if (pathname) {
      trackEvent("page_view", { 
        referrer: document.referrer,
        title: document.title,
      });
    }
  }, [pathname, searchParams, trackEvent]);

  return (
    <AnalyticsContext.Provider value={{ trackEvent }}>
      {children}
    </AnalyticsContext.Provider>
  );
}
