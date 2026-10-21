"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { isPublicAnalyticsPath } from "@/lib/analytics/policy";

// Serialize hits so a fast navigation waits for the first response's session cookie.
let hitQueue: Promise<void> = Promise.resolve();

function sendDuration(id: string, startTime: number, endTime: number) {
  const duration = Math.round((endTime - startTime) / 1000);
  if (duration < 1) return;
  const payload = JSON.stringify({ id, duration });
  if (navigator.sendBeacon) {
    const sent = navigator.sendBeacon("/api/analytics/duration", new Blob([payload], { type: "application/json" }));
    if (sent) return;
  }
  void fetch("/api/analytics/duration", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: payload, keepalive: true,
  }).catch(() => {});
}

export default function AnalyticsTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (!isPublicAnalyticsPath(pathname)) return;
    let view: { id: string; start: number; end: number | null; registered: boolean };

    const finish = () => {
      if (view.end !== null) return;
      view.end = Date.now();
      if (view.registered) sendDuration(view.id, view.start, view.end);
    };
    const start = () => {
      const current = { id: crypto.randomUUID(), start: Date.now(), end: null as number | null, registered: false };
      view = current;
      const width = window.innerWidth;
      const deviceType = width < 768 ? "mobile" : width < 1024 ? "tablet" : "desktop";
      hitQueue = hitQueue.then(async () => {
        // StrictMode cleanup and pages left before their queued hit do not create visits.
        if (current.end !== null) return;
        const response = await fetch("/api/analytics/hit", {
          method: "POST", headers: { "Content-Type": "application/json" }, keepalive: true,
          body: JSON.stringify({ path: pathname, deviceType, pageViewId: current.id }),
        });
        const data = await response.json();
        if (data.success && data.pageViewId) {
          current.registered = true;
          current.id = data.pageViewId;
          // A late response belongs to its original page, never the next one.
          if (current.end !== null) sendDuration(current.id, current.start, current.end);
        }
      }).catch(error => console.error("Failed to register page view:", error));
    };
    const restore = (event: PageTransitionEvent) => {
      if (event.persisted) start();
    };

    start();
    window.addEventListener("pagehide", finish);
    window.addEventListener("pageshow", restore);
    return () => {
      finish();
      window.removeEventListener("pagehide", finish);
      window.removeEventListener("pageshow", restore);
    };
  }, [pathname]);

  return null;
}
