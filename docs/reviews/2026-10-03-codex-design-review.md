# Design & behavioural review (Codex, 3 Oct 2026)

Reviewer: Codex (gpt via Codex CLI), from 16 full-page screenshots (desktop 1280 px, phone 390 px) and read-only code access. Not yet acted on; see the notes at the end.

### 1. Verdict

Lemyte looks credible enough to investigate, but it makes students work too hard to experience the reason to pay. The strongest proposition—official papers, reliable marking and a useful next step—is diluted by long explanations, illustrative product scenes and overlapping routes. The biggest conversion risks are the effort before the demo, an underdeveloped transition from report to purchase, and pricing that requires too much interpretation. Keep the visual identity; improve the path from “show me” to “this is worth ₹999.”

*Basis: supplied screenshots, design rules and relevant source code. The live homepage fetch failed; I did not complete a live test or payment. Rankings are hypotheses about expected impact, not measured conversion losses.*

### 2. What works

- **“Practice tests that show you what to study next” states a useful outcome.** Principle: **goal relevance**. It connects assessment to the student’s immediate problem.
- **Official keys and freely visible solved questions provide inspectable evidence.** Principle: **uncertainty reduction**. Students can judge some of the content before buying.
- **“No account or card needed” lowers the demo’s perceived cost.** Principle: **reduced behavioural friction**. Preserve that promise throughout the demo.
- **“Simple plans, paid once” and “Plans don’t renew” answer a real payment concern.** Principle: **predictability and user control**.
- **Subject/year organisation matches how students look for papers.** Principle: **recognition over recall**. The PYQ catalogue is more useful than a generic feature catalogue.
- **The founder photograph, named company and contact details create accountability.** Principle: **verifiable identity**. They support trust without borrowing prestige from invented endorsements.

### 3. Problems, ranked by expected impact

Effort: **S** = local copy/layout change; **M** = component or flow change; **L** = substantial product work and validation. Research supports the principles; the proposed applications remain hypotheses for Lemyte.

### 1. Demo: too much commitment before experiencing value — **M**

**What is wrong:** “Try a short GATE test, free” leads to a 30-minute allowance, “works best on a laptop or desktop,” and—confirmed in code—two instruction screens with a declaration. For a phone visitor sampling an unfamiliar service, that feels like preparation for an exam before they have decided to trust the product.

**Principle/source:** Behaviour becomes easier when time and effort requirements fall: [Fogg’s behaviour model, 2009](https://behaviordesign.stanford.edu/resources/fogg-behavior-model).

**Fix:** Give the demo one concise preparation screen: question count, time limit, saving answers, submission and marking. Keep detailed instructions expandable. Put “10 questions · No signup · Free report” beside the first CTA. Explain early submission if supported; do not imply everyone must spend 30 minutes. Offer a sample report for visitors who cannot start now.

### 2. Report: the purchase bridge is generic — **M**

**What is wrong:** The report code offers “Back to dashboard,” “Review Answers” and “Take another test.” It does not provide a demo-specific explanation of the paid next step. This is where the student has finally experienced the product, yet the interface sends them back into navigation.

**Principle/source:** A prompt should arrive when motivation and ability coincide: [Fogg, 2009](https://behaviordesign.stanford.edu/resources/fogg-behavior-model).

**Fix:** After the demo summary, add a restrained block: “Try a full paper in your subject,” followed by subject selection, available-paper count and a clear paid-plan route. Keep answer review freely accessible. Explain that the General Aptitude sample cannot assess readiness in their engineering subject.

### 3. Plans: buying interrupts the decision and loses its context — **M**

**What is wrong:** In `PricingClient`, a signed-out purchase returns through `/gate/auth/sign-in?next=/gate/pricing`. The selected plan is not included in that return URL. The student clicks “Buy until GATE 2027,” then encounters authentication and returns to the plan-selection page.

**Principle/source:** Account interruptions create checkout friction: [Scott/Baymard, 2023](https://baymard.com/research-articles/make-guest-checkout-prominent). Its ecommerce findings are directional evidence, not a conversion estimate for Indian students.

**Fix:** Preserve the selected plan through authentication. Display its name, total and expiry during that step, explaining why an account is needed. Return to a reviewable checkout for that plan, with “Change plan” available; do not automatically charge.

### 4. Home/GATE/demo: the promised report is insufficiently demonstrated — **M**

**What is wrong:** The site promises “show you what to study next,” but the hero scenes mostly present small scores, palettes and schematic visuals. Visitors must infer how the report turns mistakes into useful practice.

**Principle/source:** Make expertise and claims verifiable: [Fogg/Stanford credibility guidelines, 2002](https://credibility.stanford.edu/guidelines/index.html).

**Fix:** Put a readable, inspectable sample report near the first CTA. Show one coherent sequence: missed question → worked solution → topic summary → relevant practice. Clearly label illustrative data. Replace one explanatory section with this evidence.

### 5. Plans: two competing recommendations and avoidable arithmetic — **S–M**

**What is wrong:** “For GATE 2027” highlights ₹999 while “Best value” highlights ₹1,099. “Best value” actually means lowest monthly price among the rolling plans, not necessarily best fit for February. Meanwhile, “The price drops as the exam gets closer” makes waiting financially salient without equally explaining the practice time forfeited.

**Principle/source:** Externalise comparisons instead of requiring mental calculation: [Budiu, 2024, recognition versus recall](https://www.nngroup.com/articles/recognition-and-recall/).

**Fix:** Show **total today, access end date and purpose** together. Label six months “Lowest monthly cost,” and the exam plan “Access through GATE 2027.” Keep future prices available under “Future prices and access dates,” explaining that the fixed expiry stays the same. Avoid fabricated savings or urgency.

### 6. Mobile Plans: an affordable option becomes almost invisible — **S**

**What is wrong:** The phone screenshot shows the ₹299 card almost entirely washed out. Code confirms plan cards use `Reveal`, beginning at opacity zero and fading in over 0.7 seconds. The screenshot may capture a transition; it does not prove a persistent rendering failure.

**Principle/source:** Motion should communicate without obstructing the task: [Laubheimer, 2020](https://www.nngroup.com/articles/animation-purpose-ux/).

**Fix:** Render prices, plan descriptions and purchase controls fully visible immediately. Remove entrance fades from decision-critical content. Verify fast scrolling, slow devices, reduced motion and hydration failures.

### 7. Navigation: two different meanings of “PYQ” are hard to distinguish — **M**

**What is wrong:** “PYQs,” “Test series > PYQ,” “PYQ tests” and “Full GATE PYQ papers” describe closely related destinations. The mobile row flattens these categories and scrolls the active item into view, hiding earlier destinations.

**Principle/source:** Consistent labels and visible options reduce interpretation: [Nielsen, 1994, usability heuristics](https://www.nngroup.com/articles/ten-usability-heuristics/).

**Fix:** Use explicit task labels: **“Papers & answer keys”** and **“Take a test.”** Cross-link the same paper between reading and testing. On phones, provide a stable, labelled navigation menu rather than relying on a horizontally scrolled row for the full hierarchy.

### 8. Topic-wise: setup work happens before the access requirement is clear — **M**

**What is wrong:** “Start practice” follows subject, topic and count selection, but code can then redirect visitors to sign-in or pricing. Those selections are not carried in the return URL. On narrow screens, the practice-set controls also follow the entire topic list.

**Principle/source:** Predictable outcomes and preserved context: [Nielsen, 1994](https://www.nngroup.com/articles/ten-usability-heuristics/).

**Fix:** State “Included with a paid plan” before configuration for visitors without access. Preserve subject/topic/count through sign-in and purchase. On mobile, show the selected topic, count and action together in a compact bottom panel after selection.

### 9. Demo illustration: it teaches the wrong palette model — **S**

**What is wrong:** The demo scene combines a running timer with “Correct” and “Wrong.” Actual test instructions describe visited, answered and review states. The image can imply that correctness is revealed during the test.

**Principle/source:** Interface representations should match actual behaviour: [Nielsen, 1994](https://www.nngroup.com/articles/ten-usability-heuristics/).

**Fix:** Use actual exam states in the timed preview. Put correctness colours in a separately labelled “After submission” report preview. Do not require colour alone to communicate status.

### 10. Home/GATE: explanation delays proof and selection — **M**

**What is wrong:** “Testing yourself is how learning sticks,” “From one test to a clear next step” and “After every test” create a lengthy education sequence. The student needs to establish subject coverage, quality and cost before reading a case for testing itself.

**Principle/source:** Relevant information should dominate the interface: [Nielsen, 1994, aesthetic and minimalist design](https://www.nngroup.com/articles/ten-usability-heuristics/).

**Fix:** Order the page around: proposition → demo/sample report → subject coverage → plans → supporting detail. Compress the learning explanation. Keep future exams in About; the current homepage can clearly lead with GATE while retaining the broader brand.

### 11. Paper/subject pages: useful evidence is difficult to navigate — **S–M**

**What is wrong:** The paper page puts five lengthy solutions before the full answer key. Someone arriving specifically for an answer key must scroll through a different task. The subject page’s historical table is informative but demands substantial comparison.

**Principle/source:** Visible shortcuts reduce memory and navigation effort: [Budiu, 2024](https://www.nngroup.com/articles/recognition-and-recall/).

**Fix:** Add “Topic marks · Solved examples · Answer key · Take this paper” anchors near the title. Put a relevant test CTA after the examples. On subject pages, retain the table but offer a concise summary and year selection on phones. Label historical weightage as descriptive, not a prediction.

### 12. Plans: ranked-test availability is too vague to value — **S**, assuming availability data exists

**What is wrong:** “Ranked tests when they are open” is honest but leaves buyers unable to tell whether this advertised benefit is available now, for their subject, or soon.

**Principle/source:** Concrete, verifiable information supports credibility: [Fogg/Stanford, 2002](https://credibility.stanford.edu/guidelines/index.html).

**Fix:** Show the next confirmed event and covered subject, or explicitly say none is scheduled. Explain the ranking cohort and display its size in results. Avoid letting students interpret a small participant percentile as a national GATE prediction.

### 4. Trust and credibility for this audience

The site already establishes **identity** reasonably well. What is missing is stronger evidence of **product quality and dependable delivery**.

- **Social proof:** Add consented feedback from real users describing a specific experience: a report they understood, a solution they checked, or a practice decision they made. Include subject and date where permitted. Identify beta testers and incentives. If there are no meaningful testimonials yet, demonstrate the product instead.
- **Content authority:** Distinguish official question papers and keys from Lemyte-authored solutions and topic classifications. Link originals where available, explain review responsibility, and provide “Report an error.” The founder’s story establishes accountability, not technical validation by itself.
- **Risk reversal:** Keep “Full refund within 7 days if you have started no more than 2 tests” beside purchase decisions. Explain what counts as a started test, whether the demo counts, how to request a refund and the expected processing time.
- **Payment confidence:** UPI and Razorpay are already mentioned. Bring payment methods, the final payable amount and access-start expectations closer to the selected plan. Provide a clear recovery route for “paid but access missing.”
- **Time-sensitive authority:** GATE 2027 pages already cite a brochure. Add a visible last-checked date and maintain the links. This review does not independently validate the displayed schedule or syllabus claims.
- **Learning claims:** Label the recall graph as conceptual unless it represents cited data. Avoid implying that its curves quantify Lemyte’s effect.

These are practical applications of [Stanford’s credibility guidance, Fogg, 2002](https://credibility.stanford.edu/guidelines/index.html): enable verification, show accountable people and make contact easy.

### 5. Mobile-specific issues

- **Resolve the device ambiguity.** “Works best on a laptop or desktop” leaves phone users unsure whether continuing is sensible. Validate the actual phone test experience, then state the specific limitation. If necessary, offer a sample report and a copyable link for later desktop use.
- **Stop shifting the navigation’s apparent starting point.** The clipped “PYQ” in the demo/plans captures is consistent with active-item auto-scrolling. Keep orientation stable.
- **Make plan comparison compact.** Stacking five large cards separates prices and terms by several screens. Use a short comparison list with expandable descriptions.
- **Keep topic selection and its action connected.** Code confirms that the mobile practice controls come after the topic list. A persistent selected-topic summary would reduce backtracking.
- **Make equations and figures inspectable.** Provide accessible figure enlargement and explicit horizontal-scroll cues for wide material. Do not shrink mathematical content to fit the viewport.
- **Reduce footer dominance.** The demo footer becomes a long single-column directory. Use a compact grid or accessible disclosure groups while keeping contact and policies easy to reach.
- **Recheck actual targets and contrast.** Navigation uses 44px minimum targets, which is good; topic-count controls lack an explicit equivalent minimum. The compressed screenshots cannot establish font-size or contrast failures. The documented axe result also cannot settle every interaction issue.

The black/white section alternation and blue brand colour are matters of taste here. I see no conversion-based reason to replace them.

### 6. The 5 changes I would ship first

1. **Make pricing and CTAs immediately visible.** Remove reveal animation from essential decision content.
2. **Shorten demo onboarding.** One concise preparation screen, clear commitment and an accessible sample report.
3. **Add a demo-specific next step to the report.** Connect demonstrated value to a full paper in the student’s subject.
4. **Preserve the selected plan through authentication.** Return to that plan’s checkout with total and expiry visible.
5. **Simplify pricing comparison.** Show total, expiry and fit together; replace ambiguous “Best value.”

Measure **actual attempt creation**, report views and successful paid access—not just button clicks. Segment by device and entry page, and watch demo completion and refunds alongside conversion. Those results should determine whether the larger navigation and homepage changes come next.
---
### Checked by Claude before acting
- #3 confirmed: signed-out checkout redirects to `/gate/auth/sign-in?next=/gate/pricing`; the chosen plan is lost.
- #6 partly: `Reveal` already respects reduced motion; the faded ₹299 card is a mid-fade capture. Still worth removing
  entrance fades from prices and buy buttons.
- #7 matches the earlier note: "PYQs" (answer keys) vs "Test series › PYQ" is the weakest part of the nav.

### Implemented (3 Oct 2026)
1 one-screen demo intro, no declaration · 2 demo report next step (subject chips, plans, refund) · 3 chosen plan kept
through sign-in with a confirm bar (never auto-charged) · 4 readable sample report on the home page (real GATE 2024 CS
Set 2 Q37, example scores labelled) · 5 "Lowest monthly cost", one featured plan, end date on every card · 6 no entrance
fades on plan cards · 7 PYQs ↔ Test series › PYQ cross-links (labels kept as chosen) · 8 Topic-wise plan notice +
selection kept through sign-in/plans · 9 answer-sheet scene uses exam palette states · 10 home reordered (sample
report and subjects/prices before the explanations) · 11 paper-page jump links + test CTA after samples · 12 ranked-test
wording follows the data (none scheduled yet). Also: scroll-depth tracking on /admin/analytics, "last checked" date on
/gate/2027, debug "Order:" badge removed from reports.
