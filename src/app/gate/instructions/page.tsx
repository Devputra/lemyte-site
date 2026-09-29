// src/app/gate/instructions/page.tsx — GATE-style instructions shown before every test.
//   /gate/instructions?test=<testVersionId>&mode=PRACTICE|RANKED     (full papers, topic practice, ranked)
//   /gate/instructions?mode=DEMO                                      (free demo)
// Step 1: general instructions. Step 2: paper-specific instructions + declaration → starts the attempt.
"use client";

export const dynamic = "force-dynamic";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, UserRound } from "lucide-react";

import { useAccess } from "@/components/site/AccessCta";
import { buttonClass } from "@/components/site/ui";
import { safeJson } from "@/lib/fetch-helpers";

type Mode = "PRACTICE" | "RANKED" | "DEMO";
type TestInfo = {
  id: string;
  title: string;
  kind: string;
  isDemo: boolean;
  subject: string | null;
  durationSeconds: number;
  questions: number;
  totalMarks: number;
  types: Record<string, number>;
  sections: { name: string; one: number; two: number }[];
};

const SECTION_NAME: Record<string, string> = { GA: "General Aptitude", CORE: "Subject-specific section", FOUNDATION: "Engineering Mathematics" };

const PALETTE = [
  { bg: "#FFFFFF", fg: "#000", border: "#ccc", n: 1, text: <>You have <b>not visited</b> the question yet.</> },
  { bg: "#FF0000", fg: "#000", border: "#FF0000", n: 2, text: <>You have <b>not answered</b> the question.</> },
  { bg: "#00A86B", fg: "#FFF", border: "#00A86B", n: 3, text: <>You have answered the question. <b>This will be evaluated.</b></> },
  { bg: "#9932CC", fg: "#FFF", border: "#9932CC", n: 4, text: <>You have <b>not answered</b> the question but have marked it for review.</> },
  { bg: "#9932CC", fg: "#FFF", border: "#9932CC", n: 5, dot: true, text: <>You have answered the question and marked it for review. <b>This will also be evaluated.</b></> },
];

export default function InstructionsPage() {
  const router = useRouter();
  const access = useAccess();
  const [params, setParams] = useState<{ test: string | null; mode: Mode } | null>(null);
  const [info, setInfo] = useState<TestInfo | null>(null);
  const [step, setStep] = useState<1 | 2>(1);
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const mode = (q.get("mode")?.toUpperCase() as Mode) || "PRACTICE";
    setParams({ test: q.get("test"), mode });
  }, []);

  useEffect(() => {
    if (!params) return;
    const id = params.mode === "DEMO" ? "demo" : params.test;
    if (!id) {
      setError("No test was selected. Please go back and choose a test.");
      return;
    }
    fetch(`/api/gate/tests/${id}`, { cache: "no-store" })
      .then(async (r) => {
        const j = await r.json();
        if (!r.ok) throw new Error(j.error ?? "Test not found");
        setInfo(j);
      })
      .catch(() => setError("We couldn't find this test. Please go back and choose it again."));
  }, [params]);

  async function begin() {
    if (!params || !info) return;
    setBusy(true);
    setError(null);
    try {
      const body = params.mode === "DEMO" ? { mode: "DEMO" } : { mode: params.mode, testVersionId: info.id };
      const res = await fetch("/api/gate/attempts/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await safeJson(res);
      if (res.status === 401) return router.push(`/gate/auth/sign-in?next=${encodeURIComponent(window.location.pathname + window.location.search)}`);
      if (res.status === 403) return router.push("/gate/pricing");
      if ((res.ok || res.status === 409) && data.attemptId) return router.replace(`/gate/attempt/${data.attemptId}`);
      throw new Error(data.error ?? `We couldn't start your test (${res.status}).`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "We couldn't start your test. Please try again.");
      setBusy(false);
    }
  }

  const minutes = info ? Math.round(info.durationSeconds / 60) : null;
  const name = access?.name ?? (access ? "Guest" : "");

  return (
    <div className="flex h-screen flex-col bg-white text-ink">
      {/* Top bar */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-zinc-200 px-4 sm:px-6">
        <Link href="/gate" aria-label="Lemyte">
          <Image src="/white_lemyte_logo.png" alt="Lemyte" width={6000} height={3375} className="h-8 w-auto" />
        </Link>
        <p className="truncate pl-4 text-sm font-medium text-zinc-600">{info?.title ?? ""}</p>
      </header>
      <div className="flex h-11 shrink-0 items-center bg-brand-50 px-4 sm:px-6">
        <h1 className="text-base font-semibold text-brand">{step === 1 ? "Instructions" : "Other important instructions"}</h1>
      </div>

      <div className="flex min-h-0 flex-1">
        {/* Instructions panel */}
        <main className="flex min-w-0 flex-1 flex-col border-r border-zinc-200">
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-8 sm:px-10">
            <div className="mx-auto max-w-3xl text-[15px] leading-7 text-zinc-700">
              {error && <p className="mb-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}
              {step === 1 ? <General minutes={minutes} /> : <PaperSpecific info={info} mode={params?.mode ?? "PRACTICE"} />}
            </div>
          </div>

          {/* Action bar */}
          <div className="shrink-0 border-t border-zinc-200 px-5 py-4 sm:px-10">
            {step === 1 ? (
              <div className="flex justify-end">
                <button onClick={() => setStep(2)} className={buttonClass({ variant: "secondary" })}>
                  Next <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <label className="flex cursor-pointer items-start gap-3 text-sm leading-6 text-zinc-600">
                  <input
                    type="checkbox"
                    checked={agreed}
                    onChange={(e) => setAgreed(e.target.checked)}
                    className="mt-1 h-4 w-4 shrink-0 accent-brand"
                  />
                  I have read and understood the instructions. I will take this test on my own, without help from other
                  people or material that is not allowed in the GATE examination hall.
                </label>
                <div className="flex items-center justify-between gap-3">
                  <button onClick={() => setStep(1)} className={buttonClass({ variant: "secondary" })}>
                    <ChevronLeft className="h-4 w-4" /> Previous
                  </button>
                  <button onClick={begin} disabled={!agreed || !info || busy} className={buttonClass({ size: "lg" })}>
                    {busy ? "Starting…" : "I am ready to begin"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </main>

        {/* Candidate panel */}
        <aside className="hidden w-64 shrink-0 flex-col items-center bg-zinc-50 px-6 pt-10 md:flex">
          <span className="flex h-24 w-24 items-center justify-center rounded-full bg-white ring-1 ring-zinc-200">
            <UserRound className="h-12 w-12 text-zinc-400" strokeWidth={1.5} />
          </span>
          <p className="mt-4 text-center font-semibold capitalize text-ink">{name}</p>
          {info && (
            <dl className="mt-8 w-full space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-zinc-500">Duration</dt>
                <dd className="font-medium tabular-nums">{minutes} min</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-zinc-500">Questions</dt>
                <dd className="font-medium tabular-nums">{info.questions}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-zinc-500">Total marks</dt>
                <dd className="font-medium tabular-nums">{info.totalMarks}</dd>
              </div>
            </dl>
          )}
        </aside>
      </div>
    </div>
  );
}

function General({ minutes }: { minutes: number | null }) {
  return (
    <>
      <h2 className="text-center text-lg font-semibold text-ink">General instructions</h2>
      <p className="mt-6 font-semibold text-ink">Please read the following carefully.</p>
      <ol className="mt-4 list-decimal space-y-3 pl-5">
        <li>
          The duration of this test is <b>{minutes ?? "—"} minutes</b>. The clock is kept on the server, and the countdown timer at
          the top of your screen shows the time you have left.
        </li>
        <li>When the timer reaches zero, the test ends and is submitted automatically. You do not need to submit it yourself.</li>
        <li>
          The screen has two panels. The panel on the left shows one question at a time. The panel on the right has the
          question palette with every question number.
        </li>
        <li>
          The question palette shows the status of each question with these symbols:
          <table className="mt-3 w-full max-w-xl border border-zinc-300 text-sm">
            <tbody>
              {PALETTE.map((p) => (
                <tr key={p.n} className="border-b border-zinc-300 last:border-0">
                  <td className="w-12 border-r border-zinc-300 p-2 text-center">
                    <span
                      className="relative inline-flex h-7 w-7 items-center justify-center rounded border text-xs font-bold"
                      style={{ backgroundColor: p.bg, color: p.fg, borderColor: p.border }}
                    >
                      {p.n}
                      {p.dot && <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border border-white bg-[#00A86B]" />}
                    </span>
                  </td>
                  <td className="p-2">{p.text}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </li>
        <li>
          A <b>scientific calculator</b> opens from the <b>Calculator</b> button at the top of the screen. The{" "}
          <b>Question Paper</b> button shows all the questions at once.
        </li>
        <li>
          <b>Marking:</b> each question carries one or two marks, as shown on the screen. Questions you don&apos;t attempt get
          zero marks.
        </li>
      </ol>

      <h3 className="mt-8 font-semibold text-ink">Moving between questions</h3>
      <ol start={7} className="mt-3 list-decimal space-y-3 pl-5">
        <li>
          Click <b>Save &amp; Next</b> to save your answer to the current question and go to the next one.
        </li>
        <li>
          Click <b>Mark for Review</b> to flag the current question so you can come back to it before the test ends.
        </li>
        <li>To go to any question, click its number in the question palette. Save your answer first if you want to keep it.</li>
      </ol>

      <h3 className="mt-8 font-semibold text-ink">Answering a question</h3>
      <ol start={10} className="mt-3 list-decimal space-y-3 pl-5">
        <li>
          Each <b>Multiple Choice Question (MCQ)</b> and <b>Multiple Select Question (MSQ)</b> has four options.
        </li>
        <li>
          <b>MCQ:</b> only one option is correct. Choose it with the round button next to it. A wrong answer carries a
          negative mark: ⅓ for a 1-mark question and ⅔ for a 2-mark question. To change your answer, choose another
          option; to remove it, click <b>Clear Response</b>.
        </li>
        <li>
          <b>MSQ:</b> one or more options are correct. Tick every correct option with the square boxes. There is no
          negative marking, and no marks are given unless you choose exactly the right options.
        </li>
        <li>
          <b>Numerical Answer Type (NAT):</b> type the answer using the on-screen keypad below the question. There is no
          negative marking. To remove your answer, click <b>Clear Response</b>.
        </li>
      </ol>
    </>
  );
}

function PaperSpecific({ info, mode }: { info: TestInfo | null; mode: Mode }) {
  if (!info) return <p className="text-center text-zinc-500">Loading test details…</p>;
  const sections = [...info.sections].sort((a, b) => (a.name === "GA" ? -1 : b.name === "GA" ? 1 : 0));
  const marks = (s: { one: number; two: number }) => s.one + 2 * s.two;
  return (
    <>
      <h2 className="text-center text-lg font-semibold text-ink">Paper-specific instructions</h2>
      <p className="mt-6 font-semibold text-ink">Please read the following carefully.</p>
      <p className="mt-4">
        <b>{info.title}</b>. This test has <b>{info.questions} questions</b> for a total of <b>{info.totalMarks} marks</b>
        {sections.length > 1 ? (
          <>
            , in {sections.length} sections:{" "}
            {sections.map((s, i) => (
              <span key={s.name}>
                {i > 0 && (i === sections.length - 1 ? " and " : ", ")}
                {SECTION_NAME[s.name] ?? s.name} for {marks(s)} marks
              </span>
            ))}
            . All sections are compulsory.
          </>
        ) : (
          "."
        )}
      </p>
      <table className="mx-auto mt-6 w-full max-w-lg border border-zinc-300 text-sm">
        <thead className="bg-zinc-50">
          <tr>
            <th className="border border-zinc-300 px-3 py-2 text-left font-semibold">Section</th>
            <th className="border border-zinc-300 px-3 py-2 font-semibold">1-mark questions</th>
            <th className="border border-zinc-300 px-3 py-2 font-semibold">2-mark questions</th>
          </tr>
        </thead>
        <tbody>
          {sections.map((s) => (
            <tr key={s.name}>
              <td className="border border-zinc-300 px-3 py-2">{SECTION_NAME[s.name] ?? s.name}</td>
              <td className="border border-zinc-300 px-3 py-2 text-center tabular-nums">{s.one}</td>
              <td className="border border-zinc-300 px-3 py-2 text-center tabular-nums">{s.two}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-6">
        Question types in this test: {info.types.MCQ ?? 0} MCQ, {info.types.MSQ ?? 0} MSQ and {info.types.NAT ?? 0} NAT.
      </p>
      {mode === "RANKED" && (
        <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          This is a ranked test. Only your first submitted attempt counts towards your rank, and the timer keeps running
          if you close the tab.
        </p>
      )}
      {mode === "DEMO" && (
        <p className="mt-4 text-sm text-zinc-500">
          The demo can be taken once every 24 hours. When you submit, you&apos;ll see your score and the solutions.
        </p>
      )}
    </>
  );
}
