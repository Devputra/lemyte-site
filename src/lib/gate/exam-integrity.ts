// src/lib/gate/exam-integrity.ts — exam-condition safeguards for the test screen.
//
// What a website can do: block copy/cut/paste/right-click/selection and print, detect (not prevent)
// leaving the page, and use full screen. What it cannot do: stop OS screenshots or switching apps —
// so leaving is counted, warned about and sent to the server with the heartbeat, never punished
// automatically (a notification or OS pop-up must not cost an honest student their attempt).
"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const BLOCKED_KEYS = new Set(["c", "x", "v", "a", "p", "s", "u"]);
const isField = (t: EventTarget | null) => t instanceof HTMLElement && !!t.closest("input, textarea, select");

export function requestExamFullscreen() {
  const el = document.documentElement;
  if (!document.fullscreenElement && el.requestFullscreen) el.requestFullscreen().catch(() => {});
}

export function useExamIntegrity(active: boolean) {
  const [leftCount, setLeftCount] = useState(0);
  const [warning, setWarning] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const away = useRef<number | null>(null);
  const pending = useRef({ count: 0, seconds: 0 }); // not yet sent to the server

  useEffect(() => {
    if (!active) return;
    const html = document.documentElement;
    html.classList.add("exam-lock"); // print stylesheet blanks the page (globals.css)

    const block = (e: Event) => {
      if (e.type === "selectstart" && isField(e.target)) return; // typing in the answer box still works
      e.preventDefault();
    };
    const keys = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && BLOCKED_KEYS.has(e.key.toLowerCase())) e.preventDefault();
    };
    const leave = () => {
      if (away.current === null) away.current = Date.now();
    };
    const back = () => {
      if (away.current === null) return;
      const seconds = Math.round((Date.now() - away.current) / 1000);
      away.current = null;
      pending.current.count += 1;
      pending.current.seconds += seconds;
      setLeftCount((n) => n + 1);
      setWarning(true);
    };
    const vis = () => (document.hidden ? leave() : back());
    const fs = () => setFullscreen(Boolean(document.fullscreenElement));

    const events = ["copy", "cut", "paste", "contextmenu", "dragstart", "selectstart"] as const;
    events.forEach((t) => document.addEventListener(t, block));
    document.addEventListener("keydown", keys);
    document.addEventListener("visibilitychange", vis);
    window.addEventListener("blur", leave);
    window.addEventListener("focus", back);
    document.addEventListener("fullscreenchange", fs);
    fs();
    return () => {
      html.classList.remove("exam-lock");
      events.forEach((t) => document.removeEventListener(t, block));
      document.removeEventListener("keydown", keys);
      document.removeEventListener("visibilitychange", vis);
      window.removeEventListener("blur", leave);
      window.removeEventListener("focus", back);
      document.removeEventListener("fullscreenchange", fs);
    };
  }, [active]);

  /** Focus-loss since the last successful heartbeat (re-added if the send fails). */
  const takeFocusDelta = useCallback(() => {
    const d = pending.current;
    pending.current = { count: 0, seconds: 0 };
    return {
      delta: d.count ? d : undefined,
      restore: () => {
        pending.current.count += d.count;
        pending.current.seconds += d.seconds;
      },
    };
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else requestExamFullscreen();
  }, []);

  return {
    leftCount,
    warning,
    dismissWarning: () => setWarning(false),
    fullscreen,
    fullscreenSupported: typeof document !== "undefined" && !!document.documentElement.requestFullscreen,
    toggleFullscreen,
    takeFocusDelta,
  };
}
