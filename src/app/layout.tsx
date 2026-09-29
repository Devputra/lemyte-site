import type { Metadata } from "next";
import { Geist_Mono, Inter } from "next/font/google";
import "./globals.css";
import Script from "next/script";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Lemyte — Practice tests for competitive exams",
  description:
    "Exam-style online tests for GATE, built from official past papers and marked the way GATE marks them. See which topics cost you marks and practise those first.",
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
        {children}
        {/* Vercel Web Analytics + Speed Insights (script-tag setup; no npm packages needed).
            Both must be switched on in the Vercel project dashboard, and only run in production. */}
        {process.env.VERCEL_ENV === "production" && (
          <>
            <Script src="/_vercel/insights/script.js" strategy="afterInteractive" />
            <Script src="/_vercel/speed-insights/script.js" strategy="afterInteractive" />
          </>
        )}
      </body>
    </html>
  );
}
