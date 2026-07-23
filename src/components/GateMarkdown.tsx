"use client";

import type React from "react";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";

function toApiMediaPath(rawPath: string): string {
  const safePath = rawPath
    .replace(/^\/+/, "")
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");

  return `/api/gate/media/${safePath}`;
}

function normalizeGateMediaInContent(content: string): string {
  if (!content) return "";

  return content.replace(
    /gate-media:\/\/([^\s)]+)/g,
    (_match, rawPath: string) => toApiMediaPath(rawPath)
  );
}

function resolveMediaSrc(src: string | Blob | undefined): string | null {
  if (!src || typeof src !== "string") return null;

  const PROTOCOL = "gate-media://";

  if (src.startsWith(PROTOCOL)) {
    return toApiMediaPath(src.slice(PROTOCOL.length));
  }

  return src;
}

type ImageVariant = "question" | "option";

function GateImage({
  src,
  alt,
  variant = "question",
  ...rest
}: Omit<React.ImgHTMLAttributes<HTMLImageElement>, "src"> & {
  src?: string | Blob;
  variant?: ImageVariant;
}) {
  const resolvedSrc = resolveMediaSrc(src);

  if (!resolvedSrc) return null;

  const isOption = variant === "option";

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={resolvedSrc}
      alt={alt ?? "Question image"}
      loading="lazy"
      style={{
        display: "block",
        width: "100%",
        height: "auto",
        objectFit: "contain",
        borderRadius: "4px",
        margin: isOption ? "0" : "0.75rem auto",
        maxWidth: isOption ? "220px" : "420px",
        maxHeight: isOption ? "140px" : "320px",
      }}
      {...rest}
    />
  );
}

function createMarkdownComponents(variant: ImageVariant) {
  return {
    img: ({
      src,
      alt,
      ...props
    }: Omit<React.ImgHTMLAttributes<HTMLImageElement>, "src"> & {
      src?: string | Blob;
    }) => <GateImage src={src} alt={alt} variant={variant} {...props} />,

    code: ({ className, children, ...rest }: any) => {
      const isBlock = className?.startsWith("language-");

      if (isBlock) {
        return (
          <pre className="overflow-x-auto rounded bg-gray-900 p-3 text-sm text-white">
            <code className={className} {...rest}>
              {children}
            </code>
          </pre>
        );
      }

      return (
        <code
          className="rounded bg-gray-100 px-1.5 py-0.5 text-sm font-mono"
          {...rest}
        >
          {children}
        </code>
      );
    },
  };
}

interface GateMarkdownProps {
  content: string;
  className?: string;
}

export default function GateMarkdown({
  content,
  className,
}: GateMarkdownProps) {
  const normalizedContent = normalizeGateMediaInContent(content);

  return (
    <div className={`gate-markdown prose prose-sm max-w-none ${className ?? ""}`}>
      <ReactMarkdown
        remarkPlugins={[remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={createMarkdownComponents("question")}
      >
        {normalizedContent}
      </ReactMarkdown>
    </div>
  );
}

interface GateOptionMarkdownProps {
  content: string;
  className?: string;
}

export function GateOptionMarkdown({
  content,
  className,
}: GateOptionMarkdownProps) {
  const normalizedContent = normalizeGateMediaInContent(content);

  return (
    <div className={`gate-option-markdown ${className ?? ""}`}>
      <ReactMarkdown
        remarkPlugins={[remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          ...createMarkdownComponents("option"),
          p: ({ children }) => <>{children}</>,
        }}
      >
        {normalizedContent}
      </ReactMarkdown>
    </div>
  );
}