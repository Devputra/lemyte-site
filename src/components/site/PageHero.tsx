// src/components/site/PageHero.tsx — the standard top section for inner pages: constellation
// background, word-by-word headline, and an optional animated scene on the right.
import type { ReactNode } from "react";

import { Constellation, Reveal, SplitWords } from "@/components/motion";
import { Container, Eyebrow, type } from "@/components/site/ui";

export function PageHero({
  eyebrow,
  title,
  lead,
  children,
  art,
  center = false,
  tone = "white",
}: {
  eyebrow?: ReactNode;
  title: string;
  lead?: ReactNode;
  children?: ReactNode; // CTAs, stats, small print
  art?: ReactNode; // animated scene shown beside the text (below it on mobile)
  center?: boolean;
  tone?: "white" | "zinc";
}) {
  return (
    <section className={`relative overflow-hidden border-b border-zinc-100 ${tone === "zinc" ? "bg-zinc-50" : "bg-white"}`}>
      <Constellation className="opacity-60 [mask-image:radial-gradient(ellipse_at_30%_40%,#000_25%,transparent_75%)]" density={0.00007} />
      <Container
        className={`relative py-14 sm:py-20 ${art ? "grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]" : ""} ${center ? "text-center" : ""}`}
      >
        <div className={center ? "mx-auto max-w-2xl" : "max-w-2xl"}>
          {eyebrow && (
            <Reveal>
              <Eyebrow>{eyebrow}</Eyebrow>
            </Reveal>
          )}
          <h1 className={`${type.display} mt-3 !text-[2.25rem] sm:!text-5xl`}>
            <SplitWords text={title} />
          </h1>
          {lead && (
            <Reveal delay={0.25}>
              <div className={`${type.lead} mt-5 ${center ? "mx-auto" : ""} max-w-2xl`}>{lead}</div>
            </Reveal>
          )}
          {children && <Reveal delay={0.4}>{children}</Reveal>}
        </div>
        {art && <Reveal delay={0.2}>{art}</Reveal>}
      </Container>
    </section>
  );
}
