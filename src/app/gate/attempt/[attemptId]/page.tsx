// /src/app/gate/attempt/[attemptId]/page.tsx

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Calculator as CalculatorIcon, FileText, LayoutGrid, Maximize2, Minimize2 } from "lucide-react";
import GateMarkdown, { GateOptionMarkdown } from "@/components/GateMarkdown";
import { PaletteState } from "@/lib/gate/contracts";
import type { DraftAnswer } from "@/lib/gate/contracts";
import { safeJson } from "@/lib/fetch-helpers";
import { Calculator } from "@/components/gate/Calculator";
import { LoadingScene } from "@/components/motion";
import { useExamIntegrity } from "@/lib/gate/exam-integrity";
import { usePreloadImages } from "@/lib/gate/preload-images";

const MOBILE_TOOL = "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded border bg-white text-gray-700";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface QuestionData {
  questionVersionId: string;
  type: "MCQ" | "MSQ" | "NAT";
  marks: number;
  markdown: string;
  options: Array<{ id: string; markdown: string }>;
  section: string;
}

interface SessionState {
  attemptId: string;
  testTitle?: string | null;
  mode?: "PRACTICE" | "RANKED" | "DEMO";
  status: "IN_PROGRESS" | "SUBMITTED" | "EXPIRED" | "ABANDONED";
  endsAt: string;
  startedAt?: string;
  questionOrder: string[];
  optionOrderByQuestion: Record<string, string[]>;
  palette: Record<string, PaletteState>;
  drafts: Record<string, DraftAnswer>;
  committed: Record<string, DraftAnswer>;
  currentQuestionId: string;
  serverTime: string;
  remainingMs: number;
  calculator: { memory: number };
  questions: Record<string, QuestionData>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Palette colors
// ─────────────────────────────────────────────────────────────────────────────

const PALETTE_COLORS: Record<PaletteState, string> = {
  [PaletteState.Not_Visited]: "#FFFFFF",
  [PaletteState.Not_Answered]: "#FF0000",
  [PaletteState.Answered]: "#00A86B",
  [PaletteState.Marked_For_Review]: "#9932CC",
  [PaletteState.Answered_And_Marked]: "#9932CC",
};

function PaletteDot({ state }: { state: PaletteState }) {
  const bg = PALETTE_COLORS[state];
  const hasGreenDot = state === PaletteState.Answered_And_Marked;

  return (
    <span
      className="relative inline-flex h-8 w-8 items-center justify-center rounded border text-xs font-bold"
      style={{
        backgroundColor: bg,
        color:
          state === PaletteState.Not_Visited || state === PaletteState.Not_Answered
            ? "#000"
            : "#FFF",
        borderColor: state === PaletteState.Not_Visited ? "#ccc" : bg,
      }}
    >
      {hasGreenDot && (
        <span
          className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border border-white"
          style={{ backgroundColor: "#00A86B" }}
        />
      )}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Calculator
// ─────────────────────────────────────────────────────────────────────────────

function NATKeypad({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled: boolean;
}) {
  const press = (ch: string) => {
    if (disabled) return;
    if (ch === "." && value.includes(".")) return;
    if (ch === "-" && value.length > 0) return;
    onChange(value + ch);
  };

  const backspace = () => {
    if (disabled) return;
    onChange(value.slice(0, -1));
  };

  const clear = () => {
    if (disabled) return;
    onChange("");
  };

  return (
    <div className="mt-3">
      <div className="mb-2 rounded border bg-gray-50 px-3 py-2 font-mono text-lg min-h-[2.5rem]">
        {value || <span className="text-gray-300">Enter numeric answer</span>}
      </div>
      <div className="grid grid-cols-4 gap-1">
        {["7", "8", "9", "-", "4", "5", "6", ".", "1", "2", "3", ""].map((ch, i) =>
          ch ? (
            <button
              key={i}
              onClick={() => press(ch)}
              disabled={disabled}
              className="min-h-11 min-w-11 lg:min-h-0 lg:min-w-0 rounded border bg-white px-3 py-2 font-mono text-sm hover:bg-gray-50 disabled:opacity-40"
            >
              {ch}
            </button>
          ) : (
            <button
              key={i}
              onClick={backspace}
              disabled={disabled}
              className="min-h-11 min-w-11 lg:min-h-0 lg:min-w-0 rounded border bg-gray-100 px-3 py-2 text-sm hover:bg-gray-200 disabled:opacity-40"
            >
              ⌫
            </button>
          )
        )}
        <button
          onClick={() => press("0")}
          disabled={disabled}
          className="col-span-2 min-h-11 lg:min-h-0 rounded border bg-white px-3 py-2 font-mono text-sm hover:bg-gray-50 disabled:opacity-40"
        >
          0
        </button>
        <button
          onClick={clear}
          disabled={disabled}
          className="col-span-2 min-h-11 lg:min-h-0 rounded border bg-red-50 px-3 py-2 text-sm text-red-600 hover:bg-red-100 disabled:opacity-40"
        >
          Clear
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Submit modal
// ─────────────────────────────────────────────────────────────────────────────

function SubmitModal({
  open,
  palette,
  onConfirm,
  onCancel,
  busy,
}: {
  open: boolean;
  palette: Record<string, PaletteState>;
  onConfirm: () => void;
  onCancel: () => void;
  busy: boolean;
}) {
  if (!open) return null;

  const entries = Object.values(palette);
  const answered = entries.filter(
    (s) => s === PaletteState.Answered || s === PaletteState.Answered_And_Marked
  ).length;
  const notAnswered = entries.filter((s) => s === PaletteState.Not_Answered).length;
  const marked = entries.filter((s) => s === PaletteState.Marked_For_Review).length;
  const notVisited = entries.filter((s) => s === PaletteState.Not_Visited).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-xl border bg-white p-6 shadow-xl">
        <h2 className="text-lg font-bold">Submit Confirmation</h2>
        <p className="mt-2 text-sm text-gray-600">
          Are you sure you want to submit? You cannot change answers after submission.
        </p>

        <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2">
            <span className="h-4 w-4 rounded" style={{ backgroundColor: "#00A86B" }} />
            Answered: {answered}
          </div>
          <div className="flex items-center gap-2">
            <span className="h-4 w-4 rounded" style={{ backgroundColor: "#FF0000" }} />
            Not Answered: {notAnswered}
          </div>
          <div className="flex items-center gap-2">
            <span className="h-4 w-4 rounded" style={{ backgroundColor: "#9932CC" }} />
            Marked: {marked}
          </div>
          <div className="flex items-center gap-2">
            <span className="h-4 w-4 rounded border" style={{ backgroundColor: "#FFFFFF" }} />
            Not Visited: {notVisited}
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onCancel}
            disabled={busy}
            className="min-h-11 min-w-11 lg:min-h-0 lg:min-w-0 rounded border px-4 py-2 text-sm hover:bg-gray-50 disabled:opacity-50"
          >
            Go Back
          </button>
          <button
            onClick={onConfirm}
            disabled={busy}
            className="min-h-11 min-w-11 lg:min-h-0 lg:min-w-0 rounded bg-[#00A86B] px-4 py-2 text-sm font-semibold text-white hover:bg-[#009060] disabled:opacity-50"
          >
            {busy ? "Submitting…" : "Yes, Submit"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Question paper modal
// ─────────────────────────────────────────────────────────────────────────────

function QuestionPaperModal({
  open,
  onClose,
  questionOrder,
  palette,
  onNavigate,
}: {
  open: boolean;
  onClose: () => void;
  questionOrder: string[];
  palette: Record<string, PaletteState>;
  onNavigate: (qvId: string) => void;
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="max-h-[80vh] w-full max-w-3xl overflow-y-auto rounded-xl border bg-white p-4 shadow-xl lg:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">Question Paper</h2>
          <button
            onClick={onClose}
            aria-label="Close question paper"
            className="min-h-11 min-w-11 lg:min-h-0 lg:min-w-0 text-xl text-gray-500 hover:text-gray-700"
          >
            &times;
          </button>
        </div>

        <div className="grid grid-cols-5 gap-2 sm:grid-cols-10">
          {questionOrder.map((qvId, idx) => {
            const st = palette[qvId] ?? PaletteState.Not_Visited;
            return (
              <button
                key={qvId}
                onClick={() => {
                  onNavigate(qvId);
                  onClose();
                }}
                className="relative flex h-11 w-11 lg:h-10 lg:w-10 items-center justify-center rounded border text-xs font-bold transition-transform hover:scale-110"
                style={{
                  backgroundColor: PALETTE_COLORS[st],
                  color:
                    st === PaletteState.Not_Visited || st === PaletteState.Not_Answered
                      ? "#000"
                      : "#FFF",
                  borderColor:
                    st === PaletteState.Not_Visited ? "#ccc" : PALETTE_COLORS[st],
                }}
              >
                {idx + 1}
                {st === PaletteState.Answered_And_Marked && (
                  <span
                    className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full border border-white"
                    style={{ backgroundColor: "#00A86B" }}
                  />
                )}
              </button>
            );
          })}
        </div>

        <div className="mt-4 flex flex-wrap gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <span className="h-3 w-3 rounded border" style={{ backgroundColor: "#FFFFFF" }} />
            Not Visited
          </span>
          <span className="flex items-center gap-1">
            <span className="h-3 w-3 rounded" style={{ backgroundColor: "#FF0000" }} />
            Not Answered
          </span>
          <span className="flex items-center gap-1">
            <span className="h-3 w-3 rounded" style={{ backgroundColor: "#00A86B" }} />
            Answered
          </span>
          <span className="flex items-center gap-1">
            <span className="h-3 w-3 rounded" style={{ backgroundColor: "#9932CC" }} />
            Marked
          </span>
          <span className="flex items-center gap-1">
            <span
              className="relative h-3 w-3 rounded"
              style={{ backgroundColor: "#9932CC" }}
            >
              <span
                className="absolute -bottom-px -right-px h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: "#00A86B" }}
              />
            </span>
            Answered + Marked
          </span>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Offline banner
// ─────────────────────────────────────────────────────────────────────────────

function OfflineBanner({ countdown }: { countdown: number }) {
  if (countdown <= 0) {
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-gray-900/90">
        <div className="text-center text-white">
          <div className="text-2xl font-bold">Connection Lost</div>
          <p className="mt-2 text-gray-300">
            UI locked. Attempting reconnection every 5s…
          </p>
        </div>
      </div>
    );
  }

  const mm = String(Math.floor(countdown / 60)).padStart(2, "0");
  const ss = String(countdown % 60).padStart(2, "0");

  return (
    <div className="fixed left-0 right-0 top-14 z-50 bg-yellow-500 px-4 py-2 text-center text-sm font-semibold text-black">
      You are offline. Auto-lock in {mm}:{ss}…
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────────────────────

export default function GateAttemptPage() {
  const params = useParams<{ attemptId: string }>();
  const attemptId = params.attemptId;
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [failedAction, setFailedAction] = useState<(() => Promise<void>) | null>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const actionRunning = useRef(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [session, setSession] = useState<SessionState | null>(null);
  const integrity = useExamIntegrity(session?.status === "IN_PROGRESS");
  const [currentQvId, setCurrentQvId] = useState("");
  const [palette, setPalette] = useState<Record<string, PaletteState>>({});
  const [drafts, setDrafts] = useState<Record<string, DraftAnswer>>({});
  // Latest drafts for Retry: the student may change the answer after a failed save.
  const draftsRef = useRef(drafts);
  useEffect(() => {
    draftsRef.current = drafts;
  }, [drafts]);
  const [committed, setCommitted] = useState<Record<string, DraftAnswer>>({});
  const [questions, setQuestions] = useState<Record<string, QuestionData>>({});
  const [calcMemory, setCalcMemory] = useState(0);
  const [zoom, setZoom] = useState(100);

  const [calcOpen, setCalcOpen] = useState(false);
  const [submitModalOpen, setSubmitModalOpen] = useState(false);
  const [questionPaperOpen, setQuestionPaperOpen] = useState(false);
  const [submitBusy, setSubmitBusy] = useState(false);
  const [submitFailure, setSubmitFailure] = useState(false);
  const submitRunning = useRef(false);
  const palettePanel = useRef<HTMLDivElement>(null);

  const [remainingMs, setRemainingMs] = useState(0);
  const endsAtRef = useRef<number>(0);
  const autoSubmitRef = useRef(false);

  const [isOnline, setIsOnline] = useState(true);
  const [offlineCountdown, setOfflineCountdown] = useState(180);
  const offlineStartRef = useRef<number | null>(null);
  const cachedPayloadRef = useRef<Record<string, unknown> | null>(null);

  const doSubmit = useCallback(async (isAuto = false) => {
    if (submitRunning.current) return;
    submitRunning.current = true;
    setSubmitBusy(true);
    setSubmitFailure(false);

    try {
      const res = await fetch(`/api/gate/attempts/${attemptId}/submit`, {
        method: "POST",
      });

      const data = await safeJson(res);

      if (!res.ok) {
        throw new Error(
          `${isAuto ? "Auto-submit" : "Submit"} failed: ${data.error ?? res.status}`
        );
      }

      router.replace(`/gate/report/${attemptId}`);
    } catch {
      setSubmitFailure(true);
    } finally {
      submitRunning.current = false;
      setSubmitBusy(false);
      setSubmitModalOpen(false);
    }
  }, [attemptId, router]);

  useEffect(() => {
    if (!paletteOpen) return;
    const previous = document.activeElement as HTMLElement | null;
    const panel = palettePanel.current;
    const controls = () => Array.from(panel?.querySelectorAll<HTMLButtonElement>("button:not(:disabled)") ?? []);
    controls()[0]?.focus();
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPaletteOpen(false);
      if (event.key !== "Tab") return;
      const buttons = controls();
      const first = buttons[0];
      const last = buttons[buttons.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    window.addEventListener("keydown", keydown);
    return () => { window.removeEventListener("keydown", keydown); previous?.focus(); };
  }, [paletteOpen]);

  // ── Load attempt
  useEffect(() => {
    let alive = true;

    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`/api/gate/attempts/${attemptId}`, {
          cache: "no-store",
        });
        const data = await res.json();
        console.log("ATTEMPT API DATA", data);

        if (!res.ok) {
          throw new Error(data.error ?? `Load failed (${res.status})`);
        }

        if (data.status === "SUBMITTED") {
          router.replace(`/gate/report/${attemptId}`);
          return;
        }

        if (data.status === "EXPIRED") {
          throw new Error("Attempt has expired.");
        }

        if (data.status === "ABANDONED") {
          throw new Error("This test session has ended. Please start the test again.");
        }

        if (!alive) return;

        setSession(data);
        setPalette(data.palette ?? {});
        setDrafts(data.drafts ?? {});
        setCommitted(data.committed ?? {});
        setQuestions(data.questions ?? {});
        setCurrentQvId(data.currentQuestionId ?? data.questionOrder?.[0] ?? "");
        setCalcMemory(data.calculator?.memory ?? 0);
        endsAtRef.current = new Date(data.endsAt).getTime();
        setRemainingMs(Math.max(0, data.remainingMs ?? endsAtRef.current - Date.now()));
      } catch (e: unknown) {
        if (alive) {
          setError(e instanceof Error ? e.message : "Couldn't load this test. Please refresh.");
        }
      } finally {
        if (alive) setLoading(false);
      }
    }

    load();
    return () => {
      alive = false;
    };
  }, [attemptId, router]);

  // ── Timer
  useEffect(() => {
    if (!session) return;

    const timer = setInterval(() => {
      const ms = Math.max(0, endsAtRef.current - Date.now());
      setRemainingMs(ms);

      if (ms <= 0 && !autoSubmitRef.current) {
        autoSubmitRef.current = true;
        void doSubmit(true);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [session, doSubmit]);

  // ── Heartbeat every 15s
  useEffect(() => {
    if (!session || !currentQvId) return;

    const hb = setInterval(async () => {
      const focus = integrity.takeFocusDelta();
      const payload = {
        currentQuestionId: currentQvId,
        draftAnswer: drafts[currentQvId] ?? undefined,
        calcState: { memory: calcMemory },
        focusLostDelta: focus.delta,
      };

      if (!isOnline) {
        focus.restore(); // counted again in the next heartbeat that gets through
        cachedPayloadRef.current = { ...payload, focusLostDelta: undefined };
        return;
      }

      try {
        const res = await fetch(`/api/gate/attempts/${attemptId}/heartbeat`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) focus.restore();
      } catch {
        focus.restore(); // offline handled by navigator events
      }
    }, 15_000);

    return () => clearInterval(hb);
  }, [session, currentQvId, drafts, calcMemory, isOnline, attemptId, integrity]);

  // ── Offline detection
  useEffect(() => {
    const goOffline = () => {
      setIsOnline(false);
      offlineStartRef.current = Date.now();
      setOfflineCountdown(180);
    };

    const goOnline = async () => {
      setIsOnline(true);
      offlineStartRef.current = null;
      setOfflineCountdown(180);

      if (cachedPayloadRef.current) {
        try {
          await fetch(`/api/gate/attempts/${attemptId}/heartbeat`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(cachedPayloadRef.current),
          });
        } catch {
          // retry next heartbeat
        }
        cachedPayloadRef.current = null;
      }
    };

    window.addEventListener("offline", goOffline);
    window.addEventListener("online", goOnline);

    return () => {
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("online", goOnline);
    };
  }, [attemptId]);

  useEffect(() => {
    if (isOnline) return;

    const t = setInterval(() => {
      if (offlineStartRef.current) {
        const elapsed = Math.floor((Date.now() - offlineStartRef.current) / 1000);
        setOfflineCountdown(Math.max(0, 180 - elapsed));
      }
    }, 1000);

    return () => clearInterval(t);
  }, [isOnline]);

  // ── Keyboard zoom
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === "=" || e.key === "+") {
          e.preventDefault();
          setZoom((z) => Math.min(200, z + 10));
        } else if (e.key === "-") {
          e.preventDefault();
          setZoom((z) => Math.max(100, z - 10));
        } else if (e.key === "0") {
          e.preventDefault();
          setZoom(100);
        }
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // ── Prevent browser back
  useEffect(() => {
    const handler = () => {
      window.history.pushState(null, "", window.location.href);
    };

    window.history.pushState(null, "", window.location.href);
    window.addEventListener("popstate", handler);

    return () => window.removeEventListener("popstate", handler);
  }, []);

  const questionOrder = session?.questionOrder ?? [];
  const currentIdx = questionOrder.indexOf(currentQvId);
  const currentQ = questions[currentQvId];
  const currentDraft = drafts[currentQvId];
  usePreloadImages(questions, questionOrder, currentIdx);

  const orderedOptions = useMemo(() => {
    if (!currentQ) return [];

    const map = new Map(currentQ.options.map((opt) => [opt.id, opt]));
    const optionIds =
      session?.optionOrderByQuestion?.[currentQvId] ??
      currentQ.options.map((opt) => opt.id);

    return optionIds
      .map((id) => map.get(id))
      .filter((opt): opt is NonNullable<typeof opt> => Boolean(opt));
  }, [currentQ, currentQvId, session]);

  const fmtTime = useMemo(() => {
    const totalSec = Math.floor(remainingMs / 1000);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(
      s
    ).padStart(2, "0")}`;
  }, [remainingMs]);

  const isLocked = remainingMs <= 0;

  async function saveDraft(qvId: string, draft: DraftAnswer) {
    setDrafts((prev) => ({ ...prev, [qvId]: draft }));

    if (!isOnline) {
      cachedPayloadRef.current = {
        currentQuestionId: qvId,
        draftAnswer: draft,
        calcState: { memory: calcMemory },
      };
    }
  }

  async function sendAction(
    action: "answer" | "mark" | "clear",
    qvId: string,
    draft?: DraftAnswer,
    nextQvId?: string,
  ) {
    if (actionRunning.current || isLocked) return;
    actionRunning.current = true;
    setActionBusy(true);
    try {
      const res = await fetch(`/api/gate/attempts/${attemptId}/${action}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionId: qvId,
          ...(action === "answer" && draft ? {
            type: draft.type,
            selectedOptionIds: draft.selectedOptionIds,
            natRaw: draft.natRaw,
          } : {}),
        }),
      });
      const data = await safeJson(res);
      if (res.status === 409 && data.error === "ATTEMPT_SUBMITTED") {
        setFailedAction(null);
        router.replace(`/gate/report/${attemptId}`);
        return;
      }
      if (res.status === 409 && data.error === "ATTEMPT_ENDED") {
        setFailedAction(null);
        endsAtRef.current = 0;
        autoSubmitRef.current = true;
        setRemainingMs(0);
        void doSubmit(true);
        return;
      }
      if (!res.ok) throw new Error("Action failed");
      if (data.paletteState) {
        setPalette((p) => ({ ...p, [qvId]: data.paletteState as PaletteState }));
      }
      if (action === "answer" && draft) {
        setCommitted((c) => ({ ...c, [qvId]: draft }));
      }
      if (action === "clear") {
        setDrafts((d) => { const next = { ...d }; delete next[qvId]; return next; });
        setCommitted((c) => { const next = { ...c }; delete next[qvId]; return next; });
      }
      setFailedAction(null);
      if (nextQvId) setCurrentQvId(nextQvId);
    } catch {
      setFailedAction(() => () =>
        sendAction(action, qvId, action === "answer" ? (draftsRef.current[qvId] ?? draft) : draft, nextQvId),
      );
    } finally {
      actionRunning.current = false;
      setActionBusy(false);
    }
  }

  async function handleSaveAndNext() {
    if (isLocked || actionBusy) return;
    const next = questionOrder[currentIdx + 1];
    const draft = drafts[currentQvId];
    if (draft) await sendAction("answer", currentQvId, draft, next);
    else if (next) setCurrentQvId(next);
  }

  async function handleMarkToggle() {
    await sendAction("mark", currentQvId);
  }

  async function handleClear() {
    await sendAction("clear", currentQvId);
  }

  function navigateToQuestion(qvId: string) {
    setCurrentQvId(qvId);
    setPaletteOpen(false);
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <LoadingScene label="Setting up your exam…" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="max-w-md rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex h-screen items-center justify-center text-gray-500">
        No session found.
      </div>
    );
  }

  const answeredCount = Object.values(palette).filter(
    (s) => s === PaletteState.Answered || s === PaletteState.Answered_And_Marked,
  ).length;

  const answerActions = (
    <div className="grid shrink-0 grid-cols-3 gap-2 border-t bg-white p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:mt-6 lg:flex lg:flex-wrap lg:border-0 lg:p-0">
      {submitFailure && !isLocked && (
        <div role="alert" className="col-span-3 flex w-full items-center gap-3 text-sm text-rose-700">
          Couldn&apos;t submit. Check your connection.
          <button className="min-h-11 px-3 underline" disabled={submitBusy} onClick={() => void doSubmit()}>Retry submission</button>
        </div>
      )}
      {failedAction && (
        <div role="alert" className="col-span-3 flex w-full items-center gap-3 text-sm text-rose-700">
          Not saved. Check your connection.
          <button className="min-h-11 min-w-11 underline" disabled={actionBusy || isLocked} onClick={() => void failedAction()}>Retry</button>
        </div>
      )}
      <button
        onClick={() => void handleSaveAndNext()}
        disabled={isLocked || actionBusy || submitBusy}
        className="min-h-11 min-w-11 lg:min-h-0 lg:min-w-0 rounded bg-[#00A86B] px-1.5 py-2 text-[13px] leading-tight lg:px-4 lg:text-sm font-semibold text-white hover:bg-[#009060] disabled:opacity-50"
      >
        Save &amp; Next
      </button>

      <button
        onClick={() => void handleMarkToggle()}
        disabled={isLocked || actionBusy || submitBusy}
        className="min-h-11 min-w-11 lg:min-h-0 lg:min-w-0 rounded border border-[#9932CC] px-1.5 py-2 text-[13px] leading-tight lg:px-4 lg:text-sm font-semibold text-[#9932CC] hover:bg-[#9932CC]/5 disabled:opacity-50"
      >
        Mark for Review
      </button>

      <button
        onClick={() => void handleClear()}
        disabled={isLocked || actionBusy || submitBusy}
        className="min-h-11 min-w-11 lg:min-h-0 lg:min-w-0 rounded border border-red-300 px-1.5 py-2 text-[13px] leading-tight lg:px-4 lg:text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
      >
        Clear Response
      </button>
    </div>
  );

  return (
    <div className="flex h-[calc(100dvh-3.5rem)] flex-col overflow-hidden">
      {!isOnline && <OfflineBanner countdown={offlineCountdown} />}

      {integrity.warning && (
        <div role="alert" className="flex items-center justify-between gap-4 border-b border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-900">
          <span>
            <strong>You left the test window</strong>
            {integrity.leftCount > 1 ? ` (${integrity.leftCount} times)` : ""}.{" "}
            {session?.mode === "RANKED"
              ? "In a ranked test every time is recorded with your attempt. Stay on this screen until you submit."
              : "In the real exam you can't switch away, so practise staying on this screen."}
          </span>
          <span className="flex shrink-0 gap-2">
            {integrity.fullscreenSupported && !integrity.fullscreen && (
              <button onClick={integrity.toggleFullscreen} className="min-h-11 min-w-11 lg:min-h-0 lg:min-w-0 rounded bg-amber-900 px-3 py-1 text-xs font-semibold text-white hover:bg-amber-950">
                Back to full screen
              </button>
            )}
            <button onClick={integrity.dismissWarning} className="min-h-11 min-w-11 lg:min-h-0 lg:min-w-0 rounded border border-amber-400 px-3 py-1 text-xs font-semibold hover:bg-amber-100">
              OK
            </button>
          </span>
        </div>
      )}

      {isLocked && !submitBusy && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-gray-900/80">
          <div className="text-center text-white">
            <div className="text-2xl font-bold">Time is up</div>
            <p className="mt-2 text-gray-300">{submitFailure ? "Couldn't submit. Check your connection." : "Submitting final responses…"}</p>
            {submitFailure && <button onClick={() => void doSubmit(true)} className="mt-4 min-h-11 rounded border px-4">Retry submission</button>}
          </div>
        </div>
      )}

      {/* Phone bar: one row. Question count opens the palette; tools are icons; the timer stays visible. */}
      <div className="flex h-14 shrink-0 items-center gap-1.5 border-b bg-gray-50 px-3 lg:hidden">
        <button
          onClick={() => setPaletteOpen(true)}
          aria-label={`Questions: ${answeredCount} of ${questionOrder.length} answered`}
          className="inline-flex min-h-11 items-center gap-1.5 rounded border bg-white px-2.5 text-sm font-semibold"
        >
          <LayoutGrid className="h-4 w-4" aria-hidden />
          {answeredCount}/{questionOrder.length}
        </button>
        <button onClick={() => setCalcOpen(true)} aria-label="Calculator" className={MOBILE_TOOL}>
          <CalculatorIcon className="h-5 w-5" aria-hidden />
        </button>
        <button onClick={() => setQuestionPaperOpen(true)} aria-label="Question paper" className={MOBILE_TOOL}>
          <FileText className="h-5 w-5" aria-hidden />
        </button>
        {integrity.fullscreenSupported && (
          <button
            onClick={integrity.toggleFullscreen}
            aria-label={integrity.fullscreen ? "Exit full screen" : "Full screen"}
            className={MOBILE_TOOL}
          >
            {integrity.fullscreen ? <Minimize2 className="h-5 w-5" aria-hidden /> : <Maximize2 className="h-5 w-5" aria-hidden />}
          </button>
        )}
        <div
          role="timer"
          aria-label="Time left"
          className={`ml-auto rounded px-2.5 py-1.5 font-mono text-sm font-bold ${
            remainingMs < 60000 ? "bg-red-600 text-white animate-pulse" : "bg-gray-800 text-green-400"
          }`}
        >
          {fmtTime}
        </div>
      </div>

      {/* Desktop bar: mirrors the real GATE screen. */}
      <div className="hidden h-12 shrink-0 items-center justify-between gap-2 border-b bg-gray-50 px-4 lg:flex">
        <div className="flex items-center gap-4 text-sm">
          <span className="font-semibold">{session?.testTitle ?? "GATE test"}</span>
          <span className="text-gray-500">
            Q {currentIdx + 1} of {questionOrder.length}
          </span>
          {currentQ && (
            <span className="rounded bg-gray-200 px-2 py-0.5 text-xs">
              {currentQ.section} · {currentQ.marks} mark{currentQ.marks > 1 ? "s" : ""}
            </span>
          )}
        </div>

        <div className="flex items-center gap-4">
          {integrity.fullscreenSupported && (
            <button onClick={integrity.toggleFullscreen} className="rounded border px-2 py-1 text-xs hover:bg-gray-100">
              {integrity.fullscreen ? "Exit full screen" : "Full screen"}
            </button>
          )}
          <button
            onClick={() => setCalcOpen(true)}
            className="rounded border px-2 py-1 text-xs hover:bg-gray-100"
          >
            Calculator
          </button>

          <button
            onClick={() => setQuestionPaperOpen(true)}
            className="rounded border px-2 py-1 text-xs hover:bg-gray-100"
          >
            Question Paper
          </button>

          <div
            className={`rounded px-3 py-1 font-mono text-sm font-bold ${
              remainingMs < 60000
                ? "bg-red-600 text-white animate-pulse"
                : "bg-gray-800 text-green-400"
            }`}
          >
            {fmtTime}
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left pane */}
        <div
          className="min-w-0 flex-1 overflow-y-auto p-4 lg:flex-[7] lg:border-r lg:p-6"
          style={{ fontSize: `${zoom}%` }}
        >
          {currentQ ? (
            <div>
              <div className="mb-1 text-xs uppercase text-gray-400">
                Question {currentIdx + 1} · {currentQ.type} · {currentQ.marks} mark
                {currentQ.marks > 1 ? "s" : ""}
              </div>

              <div className="mb-4 text-base leading-relaxed">
                <GateMarkdown content={currentQ.markdown} />
              </div>

              {(currentQ.type === "MCQ" || currentQ.type === "MSQ") && (
                <div className="space-y-2">
                  {orderedOptions.map((opt) => {
                    const selected = (
                      currentDraft?.selectedOptionIds ??
                      committed[currentQvId]?.selectedOptionIds ??
                      []
                    ).includes(opt.id);

                    return (
                      <label
                        key={opt.id}
                        className={`flex cursor-pointer items-start gap-3 rounded border px-4 py-3 transition-colors ${
                          selected
                            ? "border-[#00A86B] bg-[#00A86B]/5"
                            : "border-gray-200 hover:bg-gray-50"
                        } ${isLocked ? "cursor-not-allowed opacity-60" : ""}`}
                      >
                        <input
                          type={currentQ.type === "MCQ" ? "radio" : "checkbox"}
                          name={`q-${currentQvId}`}
                          checked={selected}
                          disabled={isLocked || actionBusy || submitBusy}
                          onChange={() => {
                            if (isLocked) return;

                            let next: string[];
                            if (currentQ.type === "MCQ") {
                              next = [opt.id];
                            } else {
                              const prev = currentDraft?.selectedOptionIds ?? [];
                              next = selected
                                ? prev.filter((x) => x !== opt.id)
                                : [...prev, opt.id];
                            }

                            void saveDraft(currentQvId, {
                              type: currentQ.type,
                              selectedOptionIds: next,
                              updatedAt: new Date().toISOString(),
                            });
                          }}
                          className="mt-1 accent-[#00A86B]"
                        />
                        <div className="flex-1">
                          <GateOptionMarkdown content={opt.markdown} />
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}

              {currentQ.type === "NAT" && (
                <NATKeypad
                  value={currentDraft?.natRaw ?? committed[currentQvId]?.natRaw ?? ""}
                  onChange={(v) =>
                    void saveDraft(currentQvId, {
                      type: "NAT",
                      natRaw: v,
                      updatedAt: new Date().toISOString(),
                    })
                  }
                  disabled={isLocked || actionBusy || submitBusy}
                />
              )}

              <div className="hidden lg:block">{answerActions}</div>

              <div className="mt-4 flex gap-2">
                <button
                  onClick={() =>
                    currentIdx > 0 && setCurrentQvId(questionOrder[currentIdx - 1])
                  }
                  disabled={currentIdx === 0}
                  className="min-h-11 min-w-11 lg:min-h-0 lg:min-w-0 rounded border px-3 py-1.5 text-sm hover:bg-gray-50 disabled:opacity-30"
                >
                  ← Previous
                </button>

                <button
                  onClick={() =>
                    currentIdx < questionOrder.length - 1 &&
                    setCurrentQvId(questionOrder[currentIdx + 1])
                  }
                  disabled={currentIdx === questionOrder.length - 1}
                  className="min-h-11 min-w-11 lg:min-h-0 lg:min-w-0 rounded border px-3 py-1.5 text-sm hover:bg-gray-50 disabled:opacity-30"
                >
                  Next →
                </button>
              </div>

              {zoom !== 100 && (
                <div className="mt-3 text-xs text-gray-400">
                  Zoom: {zoom}% (Ctrl+0 to reset)
                </div>
              )}
            </div>
          ) : (
            <div className="text-gray-400">No question selected.</div>
          )}
        </div>

        {paletteOpen && <button tabIndex={-1} aria-label="Close questions" onClick={() => setPaletteOpen(false)} className="fixed inset-0 z-30 bg-black/40 lg:hidden" />}
        {/* Right pane */}
        <div ref={palettePanel} role={paletteOpen ? "dialog" : undefined} aria-modal={paletteOpen || undefined} aria-label="Questions" className={`${paletteOpen ? "fixed inset-x-0 bottom-0 z-40 flex max-h-[80dvh] rounded-t-2xl border-t shadow-xl" : "hidden"} flex-col overflow-y-auto bg-gray-50 p-4 lg:static lg:flex lg:max-h-none lg:flex-[3] lg:rounded-none lg:border-0 lg:shadow-none`}>
          <button onClick={() => setPaletteOpen(false)} className="mb-2 min-h-11 self-end px-3 text-sm underline lg:hidden">Close questions</button>
          <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
            Question Palette
          </div>

          <div className="grid grid-cols-5 gap-1.5">
            {questionOrder.map((qvId, idx) => {
              const st = palette[qvId] ?? PaletteState.Not_Visited;
              const isCurrent = qvId === currentQvId;

              return (
                <button
                  key={qvId}
                  onClick={() => navigateToQuestion(qvId)}
                  className={`relative flex h-11 w-11 items-center lg:h-8 lg:w-8 justify-center rounded text-xs font-bold transition-all ${
                    isCurrent ? "ring-2 ring-green-500 ring-offset-1" : ""
                  }`}
                  style={{
                    backgroundColor: PALETTE_COLORS[st],
                    color:
                      st === PaletteState.Not_Visited || st === PaletteState.Not_Answered
                        ? "#000"
                        : "#FFF",
                    borderWidth: 1,
                    borderColor:
                      st === PaletteState.Not_Visited ? "#ccc" : PALETTE_COLORS[st],
                  }}
                  title={`Q${idx + 1}: ${String(st).replace(/_/g, " ")}`}
                >
                  {idx + 1}
                  {st === PaletteState.Answered_And_Marked && (
                    <span
                      className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full border border-white"
                      style={{ backgroundColor: "#00A86B" }}
                    />
                  )}
                </button>
              );
            })}
          </div>

          <div className="mt-4 space-y-1 text-[10px] text-gray-500">
            <div className="flex items-center gap-1">
              <PaletteDot state={PaletteState.Not_Visited} /> Not Visited
            </div>
            <div className="flex items-center gap-1">
              <PaletteDot state={PaletteState.Not_Answered} /> Not Answered
            </div>
            <div className="flex items-center gap-1">
              <PaletteDot state={PaletteState.Answered} /> Answered
            </div>
            <div className="flex items-center gap-1">
              <PaletteDot state={PaletteState.Marked_For_Review} /> Marked for Review
            </div>
            <div className="flex items-center gap-1">
              <PaletteDot state={PaletteState.Answered_And_Marked} /> Answered &amp; Marked
            </div>
          </div>

          <div className="mt-auto pt-4">
            <button
              onClick={() => setSubmitModalOpen(true)}
              disabled={isLocked || actionBusy || submitBusy}
              className="w-full rounded-lg bg-[#00A86B] py-3 text-sm font-bold text-white hover:bg-[#009060] disabled:opacity-50"
            >
              Submit Test
            </button>
          </div>
        </div>
      </div>

      {currentQ && <div className="shrink-0 lg:hidden">{answerActions}</div>}

      <Calculator
        open={calcOpen}
        onClose={() => setCalcOpen(false)}
        memory={calcMemory}
        onMemoryChange={setCalcMemory}
      />

      <SubmitModal
        open={submitModalOpen}
        palette={palette}
        onConfirm={() => void doSubmit(false)}
        onCancel={() => setSubmitModalOpen(false)}
        busy={submitBusy}
      />

      <QuestionPaperModal
        open={questionPaperOpen}
        onClose={() => setQuestionPaperOpen(false)}
        questionOrder={questionOrder}
        palette={palette}
        onNavigate={navigateToQuestion}
      />
    </div>
  );
}
