"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import {
  GTM_ID,
  isValidGtmId,
  pushToDataLayer,
} from "@/lib/gtm";

const ANALYTICS_QUERY_PARAMETERS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
] as const;

export default function GtmRouteTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lastTrackedPath = useRef<string | null>(null);

  const analyticsSearchParams = new URLSearchParams();
  for (const parameter of ANALYTICS_QUERY_PARAMETERS) {
    const value = searchParams.get(parameter);
    if (value) {
      analyticsSearchParams.set(parameter, value);
    }
  }

  const queryString = analyticsSearchParams.toString();
  const trackedPath = queryString ? `${pathname}?${queryString}` : pathname;

  useEffect(() => {
    if (pathname.startsWith("/admin")) {
      lastTrackedPath.current = null;
      return;
    }

    if (!isValidGtmId(GTM_ID) || lastTrackedPath.current === trackedPath) {
      return;
    }

    lastTrackedPath.current = trackedPath;
    pushToDataLayer({
      event: "virtual_page_view",
      page_location: `${window.location.origin}${trackedPath}`,
      page_path: trackedPath,
      page_title: document.title,
    });
  }, [pathname, trackedPath]);

  return null;
}
