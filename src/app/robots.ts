// src/app/robots.ts — /robots.txt. Public pages are open to search engines and to AI answer engines
// (ChatGPT search, Perplexity, Claude, Gemini, Apple), so they can cite Lemyte. Account pages, test
// screens, reports, certificates and APIs stay out of every index.
import type { MetadataRoute } from "next";

import { abs } from "@/lib/seo";

const PRIVATE = [
  "/api/",
  "/admin/",
  "/gate/attempt/",
  "/gate/report/",
  "/gate/dashboard",
  "/gate/auth/",
  "/verify/",
  "/coming-soon",
];

// Named explicitly so the policy is clear to each crawler; they get the same rules as everyone else.
const AI_AGENTS = [
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "PerplexityBot",
  "Perplexity-User",
  "ClaudeBot",
  "Claude-SearchBot",
  "Claude-User",
  "Google-Extended",
  "Applebot-Extended",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: PRIVATE },
      { userAgent: AI_AGENTS, allow: "/", disallow: PRIVATE },
    ],
    sitemap: abs("/sitemap.xml"),
    host: abs("/"),
  };
}
