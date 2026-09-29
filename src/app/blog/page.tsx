// src/app/blog/page.tsx — placeholder until the first articles are published.
import type { Metadata } from "next";

import { SiteFooter, SiteHeader } from "@/components/site/SiteChrome";
import { ButtonLink, Container, Eyebrow, type } from "@/components/site/ui";

export const metadata: Metadata = { title: "Blog — Lemyte" };

export default function BlogPage() {
  return (
    <div className="bg-white text-ink">
      <SiteHeader />
      <main>
        <Container className="max-w-3xl py-20 sm:py-28">
          <Eyebrow>Blog</Eyebrow>
          <h1 className={`${type.h2} mt-3`}>Articles are on the way</h1>
          <p className={`${type.lead} mt-4`}>
            We&apos;re writing our first pieces on preparing for GATE: how to read a test report, how negative marking
            affects your strategy, and how to use past papers well. They&apos;ll appear here once they&apos;re ready.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <ButtonLink href="/gate/demo">Take a free GATE test</ButtonLink>
            <ButtonLink href="/gate" variant="secondary">
              About GATE assessment
            </ButtonLink>
          </div>
        </Container>
      </main>
      <SiteFooter />
    </div>
  );
}
