"use client";
// src/components/GateMarkdown.tsx — renders question / option / solution markdown (GFM + KaTeX).
//
// Images normally arrive as signed S3 URLs to WebP copies (see src/lib/gate/media.ts). Any
// leftover gate-media:// reference, or a WebP that fails to load, falls back to /api/gate/media,
// which streams the original PNG after an auth check.
import type React from "react";
import { memo } from "react";
import ReactMarkdown, { type Components, type Options } from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";

const PROTOCOL = "gate-media://";

const apiPath = (key: string) =>
  `/api/gate/media/${key.replace(/^\/+/, "").split("/").map(encodeURIComponent).join("/")}`;

/** For a signed S3 URL, the fallback route for the original PNG; null if not an S3 URL. */
function fallbackFor(src: string): string | null {
  try {
    const u = new URL(src);
    if (!u.hostname.endsWith(".amazonaws.com")) return null;
    return apiPath(decodeURIComponent(u.pathname).replace(/\.webp$/i, ".png"));
  } catch {
    return null;
  }
}

/** Every image URL in a markdown string (used to preload upcoming questions). */
export function imageUrls(markdown: string): string[] {
  return Array.from(markdown.matchAll(/!\[[^\]]*\]\(([^)\s]+)/g), (m) =>
    m[1].startsWith(PROTOCOL) ? apiPath(m[1].slice(PROTOCOL.length)) : m[1],
  );
}

type Variant = "question" | "option";
const SIZE: Record<Variant, React.CSSProperties> = {
  question: { margin: "0.75rem auto", maxWidth: 420, maxHeight: 320 },
  option: { margin: 0, maxWidth: 220, maxHeight: 140 },
};

function GateImage({ src, alt, variant }: { src?: string | Blob; alt?: string; variant: Variant }) {
  if (!src || typeof src !== "string") return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt || "Question image"}
      decoding="async"
      onError={(e) => {
        const img = e.currentTarget;
        const fb = fallbackFor(img.src);
        if (fb && !img.dataset.fellBack) {
          img.dataset.fellBack = "1";
          img.src = fb;
        }
      }}
      style={{ display: "block", width: "100%", height: "auto", objectFit: "contain", borderRadius: 4, ...SIZE[variant] }}
    />
  );
}

const shared: Components = {
  code: ({ className, children, ...rest }) =>
    className?.startsWith("language-") ? (
      <pre className="overflow-x-auto rounded bg-gray-900 p-3 text-sm text-white">
        <code className={className} {...rest}>
          {children}
        </code>
      </pre>
    ) : (
      <code className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-sm" {...rest}>
        {children}
      </code>
    ),
  table: ({ children, ...rest }) => (
    <div className="my-3 overflow-x-auto">
      <table className="border-collapse text-sm" {...rest}>
        {children}
      </table>
    </div>
  ),
  th: ({ children, ...rest }) => (
    <th className="border border-gray-300 bg-gray-50 px-3 py-1.5 text-left font-semibold" {...rest}>
      {children}
    </th>
  ),
  td: ({ children, ...rest }) => (
    <td className="border border-gray-300 px-3 py-1.5" {...rest}>
      {children}
    </td>
  ),
};

const COMPONENTS: Record<Variant, Components> = {
  question: { ...shared, img: ({ src, alt }) => <GateImage src={src} alt={alt} variant="question" /> },
  option: {
    ...shared,
    img: ({ src, alt }) => <GateImage src={src} alt={alt} variant="option" />,
    p: ({ children }) => <>{children}</>,
  },
};

// singleTilde off: "~" is common in question text (e.g. "~10 ms") and must not become strikethrough.
const REMARK_PLUGINS = [remarkMath, [remarkGfm, { singleTilde: false }]] satisfies Options["remarkPlugins"];
const REHYPE_PLUGINS = [rehypeKatex] satisfies Options["rehypePlugins"];

const Markdown = memo(function Markdown({ content, variant }: { content: string; variant: Variant }) {
  return (
    <ReactMarkdown remarkPlugins={REMARK_PLUGINS} rehypePlugins={REHYPE_PLUGINS} components={COMPONENTS[variant]}>
      {/* react-markdown drops unknown URL schemes, so resolve gate-media:// before parsing */}
      {(content ?? "").replace(/gate-media:\/\/([^\s)]+)/g, (_, key: string) => apiPath(key))}
    </ReactMarkdown>
  );
});

export default function GateMarkdown({ content, className }: { content: string; className?: string }) {
  return (
    <div className={`gate-markdown prose prose-sm max-w-none ${className ?? ""}`}>
      <Markdown content={content} variant="question" />
    </div>
  );
}

export function GateOptionMarkdown({ content, className }: { content: string; className?: string }) {
  return (
    <div className={`gate-option-markdown ${className ?? ""}`}>
      <Markdown content={content} variant="option" />
    </div>
  );
}
