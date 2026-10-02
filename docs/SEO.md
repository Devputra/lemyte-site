# Search, answer engines and discovery

How lemyte.com is set up for Google/Bing (SEO), AI answer engines (GEO/AEO: ChatGPT search, Perplexity,
Gemini, Claude, Copilot) and other places students search. Code lives in `src/lib/seo.tsx`.

## What is in place
| Piece | Where | Notes |
|---|---|---|
| Titles, descriptions, canonical, Open Graph / X cards | `pageMeta()` in `src/lib/seo.tsx` | Every public page. Canonicals always point at https://lemyte.com. Full titles are built there (no `title.template`). |
| Private pages kept out of search | `robots.ts` + `noindex` layouts | Tests, reports, dashboard, auth, certificates, admin, APIs. `/blog` is noindex until it has articles. |
| Sitemap | `src/app/sitemap.ts` | Marketing pages + one page per paper. |
| AI crawlers | `robots.ts` | GPTBot, OAI-SearchBot, PerplexityBot, ClaudeBot, Google-Extended, Applebot-Extended… explicitly allowed on public pages. |
| `/llms.txt` | `src/app/llms.txt/route.ts` | Markdown map of the site with live facts (papers, subjects, prices). |
| Structured data | `JsonLd` | Organization + WebSite (all pages), Person (/about), FAQPage (/gate, /gate/papers, paper pages, pricing), Product + Offers (pricing), BreadcrumbList + Quiz (paper pages). |
| Paper pages | `/gate/papers/[slug]` (`papers.server.ts`) | 71 pages: structure, topic-wise marks, full official key, 5 solved questions. |
| Share images | `opengraph-image.tsx` (`src/lib/og.tsx`) | Site default + one per paper with real numbers. |
| Image search | `/gate/papers/media/<sig>/<key>` | Stable, signed URLs on our domain for sample figures, with descriptive alt text. |
| Prices in HTML | `/gate/pricing` | Plans load on the server, so crawlers see prices. |

## Rules (E-E-A-T and anti-spam)
- **Structured data must describe what is visible.** FAQ answers are rendered on the page (`FaqList` does both).
- **Every number comes from the database or `exam-facts.ts`.** No hand-typed counts that go stale.
- **No thin or near-duplicate pages.** A new page type needs real, page-specific data (like the paper pages). Don't
  generate pages per keyword. The blog stays noindex until there are articles written or edited by a person.
- **Sources stated:** answers "from the official key published by <organising institute>"; non-affiliation line in the footer.
- **Who is behind it:** /about (founder, real photo), /contact (address, phone, grievance officer), company name in the footer.
- **Solutions were AI-drafted and are being cross-checked** (`scripts/gate-content/xcheck.py`, flags reviewed by a person).
  Public samples use the same explanations as the app; finish the cross-check before making more solutions public.

## Checklist (done by a person)
- [ ] Google Search Console: verify lemyte.com (set `GOOGLE_SITE_VERIFICATION` on Vercel or use DNS), submit `/sitemap.xml`.
- [ ] Bing Webmaster Tools: import from Search Console (or set `BING_SITE_VERIFICATION`). Bing also feeds ChatGPT search and Copilot.
- [ ] Google Business Profile for the Chennai office (brand searches, Maps).
- [ ] Create brand profiles and add each URL to `SAME_AS` in `src/lib/seo.tsx`: YouTube, LinkedIn (company page),
      Instagram, X, Telegram channel. Add the founder's LinkedIn to `FOUNDER.linkedin` in `src/lib/about.ts`.
- [ ] YouTube: short walkthroughs of solved PYQs (link each to its paper page). Video is the second search engine for GATE.
- [ ] Answer GATE questions where students ask them (Reddit r/GATE, Quora, Telegram groups) as a person, linking only when it helps.
- [ ] Write the first blog articles (by a person), then remove `noindex` from `/blog` and add them to the sitemap.
- [ ] After each deploy that adds pages: re-submit the sitemap in Search Console / Bing.
