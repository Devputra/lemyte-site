// src/components/site/Tracker.tsx — first-party analytics (shown on /admin/analytics).
//
// Records page views, clicks on buttons/links, and time a page was actually visible. Ids are random and
// first-party: lm_vid (visitor, 1 year) and lm_sid (session, ends after 30 minutes idle). Nothing is sent
// when the browser asks not to be tracked (Do Not Track / Global Privacy Control), for automated
// browsers, or on /admin. Clicks inside a test are not recorded (they would be answer choices).
// Give an element data-track="name" to label it explicitly.
"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

type Ev = { t: "pageview" | "click" | "engage"; p: string; l?: string; h?: string; r?: string; us?: string; um?: string; uc?: string; ms?: number };

const rid = () => Array.from(crypto.getRandomValues(new Uint8Array(12)), (b) => b.toString(36).padStart(2, "0")).join("").slice(0, 20);

function cookie(name: string, maxAge: number): string {
  const found = document.cookie.match(new RegExp(`(?:^|; )${name}=([a-z0-9]+)`))?.[1];
  const value = found ?? rid();
  document.cookie = `${name}=${value}; Path=/; Max-Age=${maxAge}; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
  return value;
}

const optedOut = () =>
  navigator.webdriver ||
  navigator.doNotTrack === "1" ||
  (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl === true;

function labelOf(el: HTMLElement): string | undefined {
  const text =
    el.dataset.track ||
    el.getAttribute("aria-label") ||
    el.innerText ||
    (el.querySelector("img") as HTMLImageElement | null)?.alt ||
    el.title;
  return text?.replace(/\s+/g, " ").trim().slice(0, 120) || undefined;
}

function targetOf(el: HTMLElement): string | undefined {
  const href = (el as HTMLAnchorElement).href;
  if (!href) return undefined;
  try {
    const u = new URL(href);
    return u.origin === location.origin ? u.pathname : u.host + u.pathname;
  } catch {
    return undefined;
  }
}

// One tracker per page load, so its state lives at module level.
const state: { queue: Ev[]; page: { path: string; visibleSince: number | null; ms: number } | null; firstView: boolean; off: boolean } = {
  queue: [],
  page: null,
  firstView: true,
  off: false,
};

// Send everything queued (sendBeacon survives page unload).
function flush() {
  if (state.off || !state.queue.length) return;
  const e = state.queue.splice(0, 20);
  const body = JSON.stringify({ v: cookie("lm_vid", 31_536_000), s: cookie("lm_sid", 1800), e });
  if (!navigator.sendBeacon?.("/api/track", new Blob([body], { type: "application/json" }))) {
    fetch("/api/track", { method: "POST", body, keepalive: true, headers: { "content-type": "application/json" } }).catch(() => {});
  }
  if (state.queue.length) flush();
}

// Close the current page's visible-time counter and queue it.
function endPage() {
  const p = state.page;
  if (!p) return;
  const ms = p.ms + (p.visibleSince ? Date.now() - p.visibleSince : 0);
  if (ms >= 1000) state.queue.push({ t: "engage", p: p.path, ms: Math.min(ms, 3_600_000) });
  state.page = null;
}

export function Tracker() {
  const pathname = usePathname();

  // Global listeners, once.
  useEffect(() => {
    state.off = optedOut();
    if (state.off) return;
    const onClick = (ev: MouseEvent) => {
      if (location.pathname.startsWith("/gate/attempt/") || location.pathname.startsWith("/admin")) return;
      const el = (ev.target as HTMLElement | null)?.closest<HTMLElement>("a, button, [role=button], [data-track], summary");
      if (!el) return;
      state.queue.push({ t: "click", p: location.pathname, l: labelOf(el), h: targetOf(el) });
      if (el.tagName === "A") flush(); // the page may be about to change
    };
    const onVisibility = () => {
      const p = state.page;
      if (document.visibilityState === "hidden") {
        if (p?.visibleSince) {
          p.ms += Date.now() - p.visibleSince;
          p.visibleSince = null;
        }
        const keep = state.page;
        endPage();
        flush();
        // Coming back continues the same page view with a fresh counter.
        if (keep) state.page = { path: keep.path, visibleSince: null, ms: 0 };
      } else if (p && !p.visibleSince) {
        p.visibleSince = Date.now();
      }
    };
    document.addEventListener("click", onClick, true);
    document.addEventListener("visibilitychange", onVisibility);
    const onPageHide = () => {
      endPage();
      flush();
    };
    window.addEventListener("pagehide", onPageHide);
    // Report visible time in 15-second chunks too, so it isn't lost when the last send on unload is dropped
    // (common on mobile). The dashboard sums the chunks per page view.
    const tick = () => {
      const p = state.page;
      if (p?.visibleSince && p.ms + Date.now() - p.visibleSince >= 15_000) {
        state.queue.push({ t: "engage", p: p.path, ms: Math.min(p.ms + Date.now() - p.visibleSince, 3_600_000) });
        p.ms = 0;
        p.visibleSince = Date.now();
      }
      flush();
    };
    const timer = window.setInterval(tick, 5000);
    return () => {
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onPageHide);
      window.clearInterval(timer);
    };
  }, []);

  // Each navigation: close the previous page, record the new one.
  useEffect(() => {
    if (state.off || optedOut() || pathname.startsWith("/admin")) return;
    endPage();
    const q = new URLSearchParams(location.search);
    const ref = state.firstView && document.referrer && !document.referrer.startsWith(location.origin) ? document.referrer : undefined;
    state.queue.push({
      t: "pageview",
      p: pathname,
      r: ref,
      us: q.get("utm_source") ?? undefined,
      um: q.get("utm_medium") ?? undefined,
      uc: q.get("utm_campaign") ?? undefined,
    });
    state.firstView = false;
    state.page = { path: pathname, visibleSince: document.visibilityState === "visible" ? Date.now() : null, ms: 0 };
    flush();
  }, [pathname]);

  return null;
}
