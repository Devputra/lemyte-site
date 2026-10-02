// src/components/site/FaqList.tsx — questions and answers shown on the page, with the same text as
// FAQPage structured data (answer engines quote these; the markup must match what readers see).
import { ChevronDown } from "lucide-react";

import { type Faq, faqLd, JsonLd } from "@/lib/seo";

export function FaqList({ faqs, className = "" }: { faqs: Faq[]; className?: string }) {
  return (
    <div className={`divide-y divide-zinc-200 rounded-2xl border border-zinc-200 bg-white ${className}`}>
      {faqs.map((f) => (
        <details key={f.q} className="group px-5 py-4 sm:px-6">
          <summary className="flex cursor-pointer list-none items-start justify-between gap-4 text-[15px] font-medium text-ink [&::-webkit-details-marker]:hidden">
            <h3>{f.q}</h3>
            <ChevronDown className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400 transition-transform group-open:rotate-180" />
          </summary>
          <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-zinc-600">{f.a}</p>
        </details>
      ))}
      <JsonLd data={faqLd(faqs)} />
    </div>
  );
}
