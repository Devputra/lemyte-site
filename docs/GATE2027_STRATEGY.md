# GATE 2027 search strategy

Goal: "GATE 2027 Lemyte" (and "Lemyte GATE") shows lemyte.com first, and Lemyte earns a place for the big
non-branded GATE 2027 searches through data nobody else publishes. Researched 2 October 2026.

## Where we start
- Brand: a web search for "Lemyte GATE" returned "Lemnis Gate" (a video game). Search engines don't know the
  word yet. Branded ranking is the quickest win, but it needs the entity to exist: consistent name, Search Console,
  profiles that link back, and mentions.
- Site: 94 indexable pages since 2 Oct 2026 (paper pages, subject hubs, GATE 2027 hub). Not indexed yet.

## Competitors (what ranks today)
| Type | Examples | What they do | Our answer |
|---|---|---|---|
| Exam portals | Careers360, Collegedunia, Shiksha, Jagran Josh | Long "GATE 2027 …" articles, refreshed dates, FAQ schema, author + date, heavy internal links | Can't outrank on authority now; win on precision (official source cited, line-by-line syllabus diff) and on long-tail subject pages |
| Coaching brands | MADE EASY, PW, Testbook, BYJU'S, GO Classes, Engineers Institute | Weightage blogs with expected 2027 tables, test-series landing pages, apps, YouTube | Our weightage is computed from 71 official papers (not "expected"), with methodology stated |
| PYQ archives | ExamSIDE, GATE Overflow, practicepaper.in | One page per chapter/question, huge long-tail coverage, community answers | Paper pages now; topic pages next (see roadmap), each with real counts |
| Data niche sites | ProSyllabus | Topic counts with method notes and a "checked on" date | Same angle with more years and every subject; we also run the tests |
| Free official mocks | NPTEL/IIT Madras weekly GATE mocks (free, Sundays) | Strong, free, official | Don't compete on "free mock"; position as official-key-marked full papers + reports |

Common patterns that work: the year in titles ("GATE 2027 …"), FAQ blocks, tables, dated updates, author bylines,
subject × topic pages, and YouTube/Telegram as a second channel.

## What we built (2 Oct 2026)
- `/gate/2027`: official dates, pattern and timeline from the IIT Madras brochure (linked), countdown,
  per-subject syllabus status, "Until GATE 2027" plan, FAQ. Title carries "GATE 2027" and "Lemyte".
- `/gate/{ae,ce,cs,da,ec,ee,me}`: topic-wise marks by year from every official paper (Dataset markup),
  GATE 2027 syllabus changes (compared line by line with 2026), paper list, FAQ.
- Home and /gate titles now name GATE 2027; nav and footer link to /gate/2027 site-wide; paper pages link up to
  their subject page; Organization `alternateName` = "Lemyte GATE"; llms.txt carries the 2027 facts.

Source data: `src/lib/gate/gate2027.ts` (official facts + syllabus changes). Re-check it whenever IIT Madras
revises the brochure, and update `checked`.

## Roadmap
**Next 2 weeks (on-site)**
1. Mark questions whose topic left the 2027 syllabus (CS networks/storage, CE prestressed/remote sensing/…,
   AE wind tunnel/…, ME Lagrange/Heisler). Needs a per-question sub-topic tag; then show "Not in GATE 2027
   syllabus" on paper pages and in topic practice, and offer a "2027 syllabus only" filter. Real product value.
2. Topic pages `/gate/{subject}/{topic}`: marks by year, question types, 3 solved examples, link to topic practice
   (~90 pages, each with real counts — not keyword stuffing).
3. A "GATE 2027 study plan" page built from the weightage (weeks left × marks per topic), updated weekly.
4. When IIT Madras publishes the paper-wise schedule and admit cards, update `/gate/2027` the same day.

**Off-site (owner)**
1. Google Search Console + Bing Webmaster Tools: verify, submit sitemap, request indexing for /gate/2027,
   /gate/{subject}, /gate/papers. Bing feeds ChatGPT search and Copilot.
2. Create and link brand profiles (put URLs in `SAME_AS`, src/lib/seo.tsx): YouTube, LinkedIn company page,
   Instagram, X, Telegram channel. Use the exact name "Lemyte" and link lemyte.com everywhere.
3. YouTube: one short per subject — "GATE 2027 {subject} syllabus: what changed" — linking the subject page.
   Then weekly solved-PYQ shorts linking paper pages.
4. Telegram: a GATE 2027 channel posting the daily countdown and one PYQ a day with a link.
5. Reddit (r/GATE), Quora: answer syllabus-change and weightage questions as a person, citing our tables when
   they genuinely help. No spam.
6. Ask college placement cells / professors to link the syllabus comparison (it is a useful, neutral resource).

## Measuring
- Search Console: impressions/clicks for queries containing "lemyte", "gate 2027", "gate {code} weightage",
  "gate 2027 {code} syllabus"; indexed pages count (target: all 94 within 3 weeks).
- Brand: "Lemyte GATE" returns lemyte.com first (check weekly in an incognito window, India).
- Conversions: demo starts and plan purchases from /gate/2027 and subject pages (Vercel Analytics).

## Sources consulted
- GATE 2027 Information Brochure, IIT Madras: https://gate2027ib.iitm.ac.in/GATE2027-IB.pdf
- GATE 2026 ME syllabus, IIT Guwahati: https://gate2026.iitg.ac.in/doc/GATE2026_Syllabus/ME_2026_Syllabus.pdf
- Competitor pages: Careers360 (gate-exam-dates, syllabus changes), PW (EE weightage), ProSyllabus (EE topic-wise),
  ExamSIDE, GATE Overflow, practicepaper.in, MADE EASY test series, NPTEL GATE mocks, Shiksha and GO Classes
  syllabus-change articles.
