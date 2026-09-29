// src/components/site/ui.tsx — Lemyte design-system primitives (see docs/DESIGN.md).
import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

function cx(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(" ");
}

/* Type scale — one place, reused everywhere. */
export const type = {
  display: "text-[2.5rem] font-semibold leading-[1.08] tracking-[-0.03em] text-ink sm:text-5xl lg:text-[3.5rem]",
  h2: "text-3xl font-semibold leading-tight tracking-[-0.02em] text-ink sm:text-4xl",
  h3: "text-lg font-semibold tracking-[-0.01em] text-ink",
  lead: "text-lg leading-relaxed text-zinc-600",
  body: "text-[15px] leading-relaxed text-zinc-600",
  small: "text-sm leading-6 text-zinc-500",
};

export function Container({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cx("mx-auto w-full max-w-6xl px-5 sm:px-6", className)}>{children}</div>;
}

export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cx("text-sm font-medium text-brand", className)}>{children}</p>;
}

export function SectionHeader({
  eyebrow,
  title,
  lead,
  center,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  lead?: ReactNode;
  center?: boolean;
}) {
  return (
    <div className={cx("max-w-2xl", center && "mx-auto text-center")}>
      {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
      <h2 className={cx(type.h2, eyebrow ? "mt-3" : undefined)}>{title}</h2>
      {lead && <p className={cx(type.lead, "mt-4")}>{lead}</p>}
    </div>
  );
}

const buttonBase =
  "inline-flex items-center justify-center gap-2 rounded-[10px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50";
const buttonVariant = {
  primary: "bg-brand text-white hover:bg-brand-700",
  secondary: "border border-zinc-300 bg-white text-ink hover:border-zinc-400 hover:bg-zinc-50",
  dark: "bg-ink text-white hover:bg-zinc-800",
  ghost: "text-brand hover:text-brand-700",
};
const buttonSize = { sm: "h-9 px-3.5 text-sm", md: "h-11 px-5 text-[15px]", lg: "h-12 px-6 text-base" };

export type ButtonStyle = { variant?: keyof typeof buttonVariant; size?: keyof typeof buttonSize };

export function buttonClass({ variant = "primary", size = "md" }: ButtonStyle = {}, extra?: string) {
  return cx(buttonBase, buttonVariant[variant], variant === "ghost" ? "px-0" : buttonSize[size], extra);
}

export function ButtonLink({
  variant,
  size,
  className,
  ...props
}: ComponentProps<typeof Link> & ButtonStyle) {
  return <Link {...props} className={buttonClass({ variant, size }, className)} />;
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cx("rounded-2xl border border-zinc-200 bg-white p-6", className)}>{children}</div>;
}
