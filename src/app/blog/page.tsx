// src/app/blog/page.tsx — placeholder until the first articles are published.
import type { Metadata } from "next";

import { SiteFooter, SiteHeader } from "@/components/site/SiteChrome";
import { PaperStackScene } from "@/components/motion/scenes";
import { PageHero } from "@/components/site/PageHero";
import { ButtonLink } from "@/components/site/ui";

export const metadata: Metadata = { title: "Blog — Lemyte" };

export default function BlogPage() {
  return (
    <div className="bg-white text-ink">
      <SiteHeader />
      <main>
        <PageHero
          eyebrow="Blog"
          title="Articles are on the way"
          lead="We're writing our first pieces on preparing for GATE: how to read a test report, how negative marking affects your strategy, and how to use past papers well. They'll appear here once they're ready."
          art={<PaperStackScene />}
        >
          <div className="mt-8 flex flex-wrap gap-3">
            <ButtonLink href="/gate/demo">Take a free GATE test</ButtonLink>
            <ButtonLink href="/gate" variant="secondary">
              About GATE assessment
            </ButtonLink>
          </div>
        </PageHero>
      </main>
      <SiteFooter />
    </div>
  );
}
