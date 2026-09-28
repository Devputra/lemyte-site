# GATE Content Playbook

Working reference for correcting GATE PYQ papers in Supabase and publishing them.
**Read this first; update it after every paper** (status table + any new gotcha).

## Status

| Subject | Papers in DB | Status | Notes |
|---|---|---|---|
| CS | 2014–2026 (24) + mock | PUBLISHED | Reference ("ideal") format. Not re-audited. |
| DA | 2024–2026 | PUBLISHED | Not re-audited. |
| **EC** | 2020–2026 (7) | **DONE + PUBLISHED 2026-09-28** | All verbatim, answers vs key, images linked. |
| **EE** | 2020–2026 (7) | **DONE + PUBLISHED 2026-09-28** (455 rows) | ChatGPT cross-check pending: EE 2020 Q52–65, EE 2022–2026 (fix via targeted PATCH — apply.py only touches DRAFT rows). |
| CE | 2020–2026, sets 1–2 (14) | DRAFT, not started | Image names use `CE_CORE`/`CE_GE` style. |
| AE | 2020–2026 (7) | DRAFT, not started | No image links at all. |
| ME | none | — | Topics exist, no questions. |

Expect every draft paper to be wrong: EC had paraphrased stems, "STEM PENDING" rows, 6–9 wrong
answers per paper, and one paper (2020) had content shifted by one question.

## Where things are

- **Source PDFs**: `/media/devputra/F414D25114D21708/OFFICE/DXOCTAGON/Products/Lemyte/Product/GATE/Questions/<SUBJ>/<YEAR>/` (paper + key PDF; `images/` folder)
- **Images**: user usually uploads them to `images/` **and** S3 `s3://learnamyte-gate-media/<SUBJ>/pyq/<year>_<subj>[_<set>]/`. If missing, crop them ourselves.
- **DB**: Supabase `rqmgmlhltjylgkvgnokh`, schema `gate`, table `question_versions` (one row per question). Keys in `.env.local`. Repo `db/gate/schema.sql` is **stale**.
- **Toolkit**: `scripts/gate-content/` (below). Work files: `.gate-work/<PAPER_CODE>/` (gitignored, survives sessions).
- **Site**: Vercel project `lemyte-site` → https://lemyte.com. Push to `main` auto-deploys. Content changes need no deploy.

## Row format (match CS)

- `markdown_content`: `"\n[gate-source-<CODE>-Qnn]: #\n\n<stem>\n\n(A) …  \n(B) …\n"` — tag on its **own line** (inline = visible to students).
- Figures: `![Figure for Qn](gate-media://<folder>/<file>)`; option images also go in `options_array[i].markdown`.
- `options_array`: `[{id:"a".."d", markdown, is_correct}]`; MSQ "A;D OR A;C;D" → `optional_correct: true` on extra option. MCQ "B OR D" → same (MCQ scoring accepts optional_correct since EE 2022).
- NAT: `nat_lower_bound`/`nat_upper_bound`/`nat_precision`; `options_array` must be **null** (DB CHECK). Two-range keys can't be stored (only primary range) until a `nat_alt_ranges` column exists.
- "Marks to all" (MTA) → `grading_policy = MARKS_TO_ALL` (scoring honours it since f74dea0). For **NAT** MTA rows set nat_lower/upper/precision all **null** (CHECK `qv_nat_fields_complete` rejects MTA with bounds).
- Image name: `gate_pyq_<year>_<SUBJ>_<TOPICCODE>_q<NN>[a|b]_<stem|option-a..d>.v1.png`; CS/CE sets: `gate_pyq_<year>_set-<n>_<SUBJ>_…`. GA-* topics use token `GA`. Topic code = `topics.code` for that subject (user's names often deviate, e.g. EMT→EMAG, COM→COMM, EM→CALC/PROB — build.py renames by copying; S3 key can't delete).
- Markdown tables render (remark-gfm). KaTeX for math; `Ω` outside `$…$` or `\Omega` inside.

## Triage first (saves most tokens)

Before transcribing, check whether the paper even needs it (EE 2026 didn't):
1. Answers vs key (fetch + key.json compare).
2. Stem words vs PDF text (`gatepdf.question_text`) — ratio of PDF words missing from DB stem; ~0 = verbatim. Number-diff false positives come from superscripts (10^5 → "105").
3. Image refs vs S3 (missing / unused files) — unused files reveal missing option images or figures; refs to non-existent files are usually **fabricated** figures (remove them).
3b. Overbars: count `\u0305` per question in PDF text vs `\bar`/`\overline` in DB — Boolean stems lose bars.
3c. Explanations containing "solving gives", "from the figure", "reduce to" without working are usually unverified — rewrite them.
4. Explanations: flag short/hand-wavy ones ("depends on figure", "Official key", "Wait") and ones stating an answer ≠ key.
If all clean except a few rows, write a small targeted `fixes.py` in `.gate-work/<CODE>/` (PATCH only changed fields) instead of a full content.py.

## Per-paper procedure

```bash
# 1. backup + context (topics, S3 names). Folder = S3 path without bucket.
python3 scripts/gate-content/fetch.py GATE2024_EE EE 2024 EE/pyq/2024_ee
# 1b. after writing key.json: one-shot triage report (+ .gate-work/<CODE>/audit.txt)
cd scripts/gate-content && python3 triage.py GATE2024_EE <questions.pdf>
```
2. **Key** → write `.gate-work/<CODE>/key.json` as `{"1": {"type":"MCQ","key":"B","marks":1}, …, "27": {"type":"NAT","key":"2047 to 2047","marks":1}}`
   (MSQ key `A;C`, MTA key `MTA`, alt `A;D OR A;C;D`). Key PDFs vary: text-extractable (parse), scanned (read visually),
   or numbered GA 1–10 then section 1–55 (**DB Q = 10 + n**). Compare with DB rows to list wrong answers.
3. **Read the paper** (render pages to PNG ≤1900px, `gatepdf.page_sheets`), solve every question, write
   `.gate-work/<CODE>/content.py`: `Q[n] = dict(topic="NSS", stem=r"""… {FIG}""", opts=[…4 strings…] | "IMG" | None, expl=r"""…""")`.
   Mixed options: list with `"IMG"` entries. Optional `FIXQ = {("EMT",48): 49}` when an uploaded image has the wrong q number.
4. `python3 scripts/gate-content/build.py <CODE> <image-prefix>` → asserts every figure used, answers consistent.
5. `node scripts/gate-content/check_render.mjs <CODE>` → must print `render problems: 0`.
6. `python3 scripts/gate-content/apply.py <CODE> [--upload]` → S3 renames, PATCH DRAFT rows, verify vs key + S3.
6b. **Second opinion (ChatGPT via Codex, subscription — no API credit):** `cd scripts/gate-content && python3 crosscheck.py <CODE> --via codex` (~3 min/paper, 3 parallel; the ChatGPT plan has a usage cap — ~50 questions hit it, the script then skips the rest; rerun later with `--q`). Solves each row independently (figures attached), compares with the stored key, reviews the explanation; prints only flagged rows → verify each yourself, fix real ones (EE 2021: 2 valid explanation flags). `--via api` uses the OpenAI key in `.env.local` (needs paid credit). Needs `codex login` (ChatGPT).
7. Update the status table above + tell the user. **Publish only when the user asks**:
   `PATCH question_versions?pyq_paper_code=eq.<CODE>&status=eq.DRAFT` with `{"status":"PUBLISHED","published_at":<now>}`.

## Token-saving rules

- Don't re-read CS reference rows, the schema, or scoring code — it's all here.
- View images only as downscaled sheets (API rejects >2000px in multi-image requests).
- Render pages 2-up (`page_sheets`) and read each once; solve while reading.
- Keep explanations short (worked result, not essays); stems verbatim.

## Paper log

- **EE 2026** (2026-09-28): stems verbatim, answers = key. Fixed: Q2/Q5 option images, Q41 missing figure, Q37 stem ($A_0 = 105$, not $10^5$ — only 105 gives key −16.67), Q58 missing sentence + MTA, Q28 explanation had physics reversed; 11 explanations rewritten. Backup: `EE/2026/db_backup_GATE2026_EE_2026-09-28.json`.

- **EE 2025** (2026-09-28): full rewrite needed — DB image links were fabricated (names from other papers, fake figure on a matrix question), 9 real figures unlinked, 4 wrong answers (Q4 none, Q14, Q18, Q45), guessed figure explanations. All 65 rewritten verbatim; user's 44 images linked as-is. Q59 key has ± ranges (stored −2.00…−1.94). Buffer questions after Q65 in the PDF are ignored.

- **EE 2024** (2026-09-28): targeted (29 rows). Q8 wrong answer (→C); **Q24/Q26 had lost overbars** in stem/options (stored functions ≠ paper) — check `\u0305` count in PDF text vs `\bar` in DB; fake stem images on Q2/Q18/Q40/Q43 removed, Q2 option images linked, Q41 relinked; ~22 hand-wavy/wrong explanations rewritten (e.g. Q34, Q65 had wrong numbers).

- **EE 2023** (2026-09-28): full rewrite — DB rows were scrambled (Q16=dup of Q25, Q21=dup of Q41, Q50=dup of Q34, Q60=dup of Q47; Q17/Q29/Q48/Q49 from other papers; fabricated options on Q7/Q24/Q26). No user images → cropped 36 myself. **Cropping tip:** this PDF's table columns sit at x≈67/72/107/116/523 (not 72/114/523); override `gatepdf.COLS`/`_is_rule`, then crop the whole table **cell** containing each detected cluster (horizontal rules >300pt wide bound the cell) — cluster bboxes alone clip labels. See `.gate-work/GATE2023_EE/crops.py`. Key PDF format: "Qno \n session QT \n section \n key \n marks" (5 tokens).

- **EE 2022** (2026-09-28): full rewrite (inline tags, wrong answer Q49, weak explanations). No user images → cropped 31 myself with explicit PDF rects (`.gate-work/GATE2022_EE/crops.py`). **Layout:** GA pages (1–10) are tables (cols x≈94/144/517); Q11+ are plain two-per-page text, option labels end at x≈117 (crop option images from x=119). Q11 key "B OR D" (MCQ) → D `optional_correct`. Q37 printed $s^2+0.1s+10$ but key (A) needs $+100$ (typo noted in explanation). Two-range NAT: Q56 stored 198–202 (alt 188–192), Q63 stored 1725–1740 (alt 675–700, KE only) — key.json reordered so the worked answer is primary.

- **EE 2021** (2026-09-28): full rewrite (inline tags, Q11/Q12 wrong answers, PENDING Q46, rows' topics misaligned). No user images → cropped 30 (`.gate-work/GATE2021_EE/crops.py`). Codex cross-check: 65/65 agree; fixed Q10 (option D not addressed) and Q51 (wrongly assumed y = 0) explanations. **Layout (IIT Bombay, A4):** table cols x≈72/125/523; figures are embedded images → crop their bboxes directly, but first delete the full-page watermark image (w,h>400) and header images (y1<80). Key PDF: 7 tokens per row (Q, session, type, section, key, marks, neg), EE section numbered 1–55 (DB Q = 10 + n). Q18 match-table rendered as a markdown table.

- **EE 2020** (2026-09-28): full rewrite — DB stems were placeholders ("Circuit value."). **The paper PDF is all images** (no text layer) → transcribed visually; figures cropped from rendered pages (`.gate-work/GATE2020_EE/crops.py`). Key PDF: 6 tokens per row, GA 1–10 then EE 1–55 (DB Q = 10 + n). MTA: Q22, Q52 (MCQ), Q58, Q63 (NAT, bounds null — build.py/apply.py now handle NAT MTA). Q11 "A OR D". Codex cross-check (Q1–51 before the ChatGPT usage limit): fixed Q11/Q16/Q22/Q49 explanations; **Q52–Q65 still to cross-check**.

## Known open issues

- Shared GA topics (subject_id NULL) never show on `/gate/practice/topics` (page filters by subject).
- Vercel prod is missing Razorpay, SMTP, CRON_SECRET, APP_BASE_URL, NEXT_PUBLIC_SITE_URL env vars.
- NAT two-range keys: EC2026 Q64 (±34.5–36.5), EC2023 Q63 (250 or 500), EE2025 Q59, EE2022 Q56/Q63 — only primary range graded.
- ~60 superseded S3 images unreferenced (IAM user lacks DeleteObject).
- Test suite: `demo.test.ts` fails (missing `server-only`), pre-existing TS errors in nat/scoring tests.
