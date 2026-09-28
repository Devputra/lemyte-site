# GATE Content Playbook

Working reference for correcting GATE PYQ papers in Supabase and publishing them.
**Read this first; update it after every paper** (status table + any new gotcha).

## Status

| Subject | Papers in DB | Status | Notes |
|---|---|---|---|
| CS | 2014–2026 (24) + mock | PUBLISHED | Reference ("ideal") format. Not re-audited. |
| DA | 2024–2026 | PUBLISHED | Not re-audited. |
| **EC** | 2020–2026 (7) | **DONE + PUBLISHED 2026-09-28** | All verbatim, answers vs key, images linked. |
| EE | 2020–2026 (7) | 2026 **DONE** (DRAFT); 2020–2025 not started | 2026 was already verbatim + correct; only targeted fixes (see below). |
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
- `options_array`: `[{id:"a".."d", markdown, is_correct}]`; MSQ "A;D OR A;C;D" → `optional_correct: true` on extra option.
- NAT: `nat_lower_bound`/`nat_upper_bound`/`nat_precision`; `options_array` must be **null** (DB CHECK). Two-range keys can't be stored (only primary range) until a `nat_alt_ranges` column exists.
- "Marks to all" (MTA) → `grading_policy = MARKS_TO_ALL` (scoring honours it since f74dea0). For **NAT** MTA rows set nat_lower/upper/precision all **null** (CHECK `qv_nat_fields_complete` rejects MTA with bounds).
- Image name: `gate_pyq_<year>_<SUBJ>_<TOPICCODE>_q<NN>[a|b]_<stem|option-a..d>.v1.png`; CS/CE sets: `gate_pyq_<year>_set-<n>_<SUBJ>_…`. GA-* topics use token `GA`. Topic code = `topics.code` for that subject (user's names often deviate, e.g. EMT→EMAG, COM→COMM, EM→CALC/PROB — build.py renames by copying; S3 key can't delete).
- Markdown tables render (remark-gfm). KaTeX for math; `Ω` outside `$…$` or `\Omega` inside.

## Triage first (saves most tokens)

Before transcribing, check whether the paper even needs it (EE 2026 didn't):
1. Answers vs key (fetch + key.json compare).
2. Stem words vs PDF text (`gatepdf.question_text`) — ratio of PDF words missing from DB stem; ~0 = verbatim. Number-diff false positives come from superscripts (10^5 → "105").
3. Image refs vs S3 (missing / unused files) — unused files reveal missing option images or figures.
4. Explanations: flag short/hand-wavy ones ("depends on figure", "Official key", "Wait") and ones stating an answer ≠ key.
If all clean except a few rows, write a small targeted `fixes.py` in `.gate-work/<CODE>/` (PATCH only changed fields) instead of a full content.py.

## Per-paper procedure

```bash
# 1. backup + context (topics, S3 names). Folder = S3 path without bucket.
python3 scripts/gate-content/fetch.py GATE2024_EE EE 2024 EE/pyq/2024_ee
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
7. Update the status table above + tell the user. **Publish only when the user asks**:
   `PATCH question_versions?pyq_paper_code=eq.<CODE>&status=eq.DRAFT` with `{"status":"PUBLISHED","published_at":<now>}`.

## Token-saving rules

- Don't re-read CS reference rows, the schema, or scoring code — it's all here.
- View images only as downscaled sheets (API rejects >2000px in multi-image requests).
- Render pages 2-up (`page_sheets`) and read each once; solve while reading.
- Keep explanations short (worked result, not essays); stems verbatim.

## Paper log

- **EE 2026** (2026-09-28): stems verbatim, answers = key. Fixed: Q2/Q5 option images, Q41 missing figure, Q37 stem ($A_0 = 105$, not $10^5$ — only 105 gives key −16.67), Q58 missing sentence + MTA, Q28 explanation had physics reversed; 11 explanations rewritten. Backup: `EE/2026/db_backup_GATE2026_EE_2026-09-28.json`.

## Known open issues

- Shared GA topics (subject_id NULL) never show on `/gate/practice/topics` (page filters by subject).
- Vercel prod is missing Razorpay, SMTP, CRON_SECRET, APP_BASE_URL, NEXT_PUBLIC_SITE_URL env vars.
- NAT two-range keys: EC2026 Q64 (±34.5–36.5), EC2023 Q63 (250 or 500) — only primary range graded.
- ~60 superseded S3 images unreferenced (IAM user lacks DeleteObject).
- Test suite: `demo.test.ts` fails (missing `server-only`), pre-existing TS errors in nat/scoring tests.
