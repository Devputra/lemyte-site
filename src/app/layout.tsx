import type { Metadata, Viewport } from "next";
import { Geist_Mono, Inter } from "next/font/google";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next";
import Script from "next/script";

import { LEGAL } from "@/lib/legal";
import { CANONICAL_ORIGIN, JsonLd, organizationLd, websiteLd } from "@/lib/seo";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// The site is designed light-only: stop browsers' "auto dark mode" from force-darkening it
// (which turned the white-background logo into a white box and would hide dark text).
export const viewport: Viewport = { colorScheme: "only light", themeColor: "#ffffff" };

// Defaults for every page; pages override title/description/canonical through pageMeta() (src/lib/seo.tsx).
export const metadata: Metadata = {
  metadataBase: new URL(CANONICAL_ORIGIN),
  title: "Lemyte — Practice tests for competitive exams",
  description:
    "Exam-style online tests for GATE, built from official past papers and marked the way GATE marks them. See which topics cost you marks and practise those first.",
  applicationName: "Lemyte",
  authors: [{ name: "Lemyte", url: CANONICAL_ORIGIN }],
  publisher: LEGAL.company,
  formatDetection: { telephone: false, email: false, address: false },
  openGraph: { type: "website", siteName: "Lemyte", locale: "en_IN" },
  twitter: { card: "summary_large_image" },
  // Ownership tokens from Google Search Console / Bing Webmaster Tools, set as env vars on Vercel.
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION,
    other: process.env.BING_SITE_VERIFICATION ? { "msvalidate.01": process.env.BING_SITE_VERIFICATION } : undefined,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${geistMono.variable} font-sans antialiased`}
      >
        {/* Without JavaScript, show everything framer-motion would have faded in. */}
        <noscript>
          <style>{`[data-motion]{opacity:1!important;transform:none!important;stroke-dasharray:none!important;stroke-dashoffset:0!important}`}</style>
        </noscript>
        <JsonLd data={[organizationLd, websiteLd]} />
        {children}
        {/* Vercel Web Analytics (@vercel/analytics) + Speed Insights (script tag).
            Switch both on in the Vercel dashboard first, then set VERCEL_ANALYTICS=on (else the scripts 404). */}
        {process.env.VERCEL_ANALYTICS === "on" && (
          <>
            <Analytics />
            <Script src="/_vercel/speed-insights/script.js" strategy="afterInteractive" />
          </>
        )}
      </body>
    </html>
  );
}
