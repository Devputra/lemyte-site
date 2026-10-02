// src/lib/seo.tsx — page metadata and structured data (schema.org JSON-LD) in one place.
//
// Canonical URLs always point at the production domain, so preview deployments and localhost never
// compete with lemyte.com in search results. Structured data must describe what is visible on the
// page — search engines and AI answer engines treat mismatches as spam.
import type { Metadata } from "next";

import { FOUNDER } from "@/lib/about";
import { LEGAL } from "@/lib/legal";

export const CANONICAL_ORIGIN = LEGAL.website; // https://lemyte.com
export const abs = (path: string) => new URL(path, CANONICAL_ORIGIN).toString();

/** Public profiles of Lemyte elsewhere (YouTube, LinkedIn, …): add each one here once it exists. */
export const SAME_AS: string[] = [];

/** Metadata for one page: title, description, canonical URL and matching Open Graph / X cards. */
export function pageMeta({
  title,
  description,
  path,
  noindex = false,
  exactTitle = false,
}: {
  title: string;
  description: string;
  path: string;
  noindex?: boolean;
  exactTitle?: boolean; // use the title as given, without " — Lemyte" (home page)
}): Metadata {
  // Full titles are built here rather than with a title.template: a template doesn't reach a page in the
  // same folder as the layout that defines it, which produced doubled or missing suffixes.
  const full = exactTitle ? title : `${title} — Lemyte`;
  return {
    title: { absolute: full },
    description,
    alternates: { canonical: path },
    openGraph: { title: full, description, url: path, type: "website", siteName: "Lemyte", locale: "en_IN" },
    twitter: { card: "summary_large_image", title: full, description },
    ...(noindex && { robots: { index: false, follow: true } }),
  };
}

const ORG_ID = `${CANONICAL_ORIGIN}/#organization`;
const FOUNDER_ID = `${CANONICAL_ORIGIN}/about#founder`;

export const organizationLd = {
  "@context": "https://schema.org",
  "@type": "EducationalOrganization",
  "@id": ORG_ID,
  name: LEGAL.brand,
  alternateName: ["Lemyte GATE", "Lemyte.com"],
  legalName: LEGAL.company,
  url: CANONICAL_ORIGIN,
  logo: abs("/icon.png"),
  email: LEGAL.email,
  telephone: LEGAL.phone,
  description:
    "Lemyte builds exam-style online tests for competitive exams in India, starting with GATE: official past papers marked with the official answer key.",
  address: {
    "@type": "PostalAddress",
    streetAddress: "KCG Innovation Incubation and Entrepreneurship Centre, KCG College of Technology, Karapakkam",
    addressLocality: "Chennai",
    postalCode: "600097",
    addressRegion: "Tamil Nadu",
    addressCountry: "IN",
  },
  founder: { "@id": FOUNDER_ID },
  contactPoint: {
    "@type": "ContactPoint",
    contactType: "customer support",
    email: LEGAL.email,
    telephone: LEGAL.phone,
    areaServed: "IN",
    availableLanguage: ["en", "ta"],
  },
  ...(SAME_AS.length && { sameAs: SAME_AS }),
};

export const websiteLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": `${CANONICAL_ORIGIN}/#website`,
  url: CANONICAL_ORIGIN,
  name: LEGAL.brand,
  inLanguage: "en-IN",
  publisher: { "@id": ORG_ID },
};

export const founderLd = {
  "@context": "https://schema.org",
  "@type": "Person",
  "@id": FOUNDER_ID,
  name: FOUNDER.name,
  jobTitle: FOUNDER.role,
  image: abs(FOUNDER.photo),
  worksFor: { "@id": ORG_ID },
  ...(FOUNDER.linkedin && { sameAs: [FOUNDER.linkedin] }),
};

export function breadcrumbLd(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({ "@type": "ListItem", position: i + 1, name: it.name, item: abs(it.path) })),
  };
}

export type Faq = { q: string; a: string };

export function faqLd(faqs: Faq[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  };
}

/** Renders schema.org data. `<` is escaped so text inside can never close the script tag. */
export function JsonLd({ data }: { data: object | object[] }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}
