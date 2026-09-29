// src/lib/gate/preload-images.ts — warm the browser cache with every image in a test, starting from
// the current question, so moving between questions never waits on the network.
"use client";

import { useEffect } from "react";

import { imageUrls } from "@/components/GateMarkdown";

type Q = { markdown: string; options: { markdown: string }[] };

const CONCURRENCY = 4;

export function usePreloadImages(questions: Record<string, Q>, order: string[], fromIdx: number) {
  const ready = order.length > 0 && Object.keys(questions).length > 0;
  useEffect(() => {
    if (!ready) return;
    const start = Math.max(0, fromIdx);
    const rotated = [...order.slice(start), ...order.slice(0, start)];
    const queue = [
      ...new Set(
        rotated.flatMap((id) => {
          const q = questions[id];
          return q ? [q.markdown, ...q.options.map((o) => o.markdown)].flatMap(imageUrls) : [];
        }),
      ),
    ];
    let cancelled = false;
    const next = () => {
      const url = queue.shift();
      if (!url || cancelled) return;
      const img = new Image();
      img.decoding = "async";
      img.onload = img.onerror = next;
      img.src = url;
    };
    for (let i = 0; i < CONCURRENCY; i++) next();
    return () => {
      cancelled = true;
    };
    // Run once per loaded test; later navigation hits the warmed cache.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, questions]);
}
