// src/app/gate/attempt/[attemptId]/page.tsx
"use client";

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import { useParams, useRouter } from "next/navigation";

// ─── Types ───────────────────────────────────────────────────────────────────

type PaletteState =
  | "Not_Visited"
  | "Not_Answered"
  | "Answered"
  | "Marked_For_Review"
  | "Answered_And_Marked";

interface DraftAnswer {
  type: "MCQ" | "MSQ" | "NAT";
  selectedOptionIds?: string[];
  natRaw?: string;
}

interface QuestionData {
  questionVersionId: string;
  type: "MCQ" | "MSQ" | "NAT";
  marks: number;
  text: string;
  options: Array<{ id: string; text: string }>;
  section: "GA" | "CORE";
}

interface SessionState {
  attemptId: string;
  endsAt: string;
  questionOrder: string[];
  optionOrderByQuestion: Record<string, string[]>;
  palette: Record<string, PaletteState>;
  drafts: Record<string, DraftAnswer>;
  committed: Record<string, DraftAnswer>;
  currentQuestionId: string;
  serverTime: string;
  remainingMs: number;
  calculator: { memory: number };
}

// ─── Palette color map (TCS iON parity) ─────────────────────────────────────

const PALETTE_COLORS: Record<PaletteState, string> = {
  Not_Visited: "#FFFFFF",
  Not_Answered: "#FF0000",
  Answered: "#00A86B",
  Marked_For_Review: "#9932CC",
  Answered_And_Marked: "#9932CC",
};

function PaletteDot({ state }: { state: PaletteState }) {
  const bg = PALETTE_COLORS[state];
  const hasGreenDot = state === "Answered_And_Marked";
  return (
    <span
      className="relative inline-flex h-8 w-8 items-center justify-center rounded border text-xs font-bold"
      style={{
        backgroundColor: bg,
        color: state === "Not_Visited" || state === "Not_Answered" ? "#000" : "#FFF",
        borderColor: state === "Not_Visited" ? "#ccc" : bg,
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

// ─── Calculator modal ────────────────────────────────────────────────────────

function CalculatorModal({
  open,
  onClose,
  memory,
  onMemoryChange,
}: {
  open: boolean;
  onClose: () => void;
  memory: number;
  onMemoryChange: (m: number) => void;
}) {
  const [display, setDisplay] = useState("0");
  const [prevVal, setPrevVal] = useState<number | null>(null);
  const [op, setOp] = useState<string | null>(null);
  const [fresh, setFresh] = useState(true);

  const input = useCallback(
    (ch: string) => {
      if (fresh) {
        setDisplay(ch === "." ? "0." : ch);
        setFresh(false);
      } else {
        if (ch === "." && display.includes(".")) return;
        setDisplay(display + ch);
      }
    },
    [display, fresh]
  );

  const clear = () => {
    setDisplay("0");
    setPrevVal(null);
    setOp(null);
    setFresh(true);
  };

  const compute = useCallback(() => {
    if (prevVal === null || !op) return;
    const cur = parseFloat(display);
    let result = 0;
    switch (op) {
      case "+": result = prevVal + cur; break;
      case "-": result = prevVal - cur; break;
      case "*": result = prevVal * cur; break;
      case "/": result = cur !== 0 ? prevVal / cur : NaN; break;
    }
    setDisplay(String(result));
    setPrevVal(null);
    setOp(null);
    setFresh(true);
  }, [display, prevVal, op]);

  const doOp = (nextOp: string) => {
    if (prevVal !== null && op) compute();
    setPrevVal(parseFloat(display));
    setOp(nextOp);
    setFresh(true);
  };

  const unary = (fn: (x: number) => number) => {
    const val = fn(parseFloat(display));
    setDisplay(String(val));
    setFresh(true);
  };

  if (!open) return null;

  const btn = (label: string, action: () => void, className = "") => (
    <button
      key={label}
      onClick={action}
      className={`rounded border bg-gray-50 px-2 py-2 text-sm font-mono hover:bg-gray-100 active:bg-gray-200 ${className}`}
    >
      {label}
    </button>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={onClose}>
      <div
        className="w-72 rounded-xl border bg-white p-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-2 flex items-center justify-between text-xs text-gray-500">
          <span>Scientific Calculator</span>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700">&#10005;</button>
        </div>
        <div className="mb-3 rounded border bg-gray-900 px-3 py-2 text-right font-mono text-lg text-green-400 truncate">
          {display}
        </div>
        <div className="grid grid-cols-5 gap-1">
          {btn("MC", () => onMemoryChange(0))}
          {btn("MR", () => { setDisplay(String(memory)); setFresh(true); })}
          {btn("MS", () => onMemoryChange(parseFloat(display)))}
          {btn("M+", () => onMemoryChange(memory + parseFloat(display)))}
          {btn("M-", () => onMemoryChange(memory - parseFloat(display)))}

          {btn("sin", () => unary(Math.sin))}
          {btn("cos", () => unary(Math.cos))}
          {btn("tan", () => unary(Math.tan))}
          {btn("log", () => unary(Math.log10))}
          {btn("ln", () => unary(Math.log))}

          {btn("x!", () => {
            const n = Math.round(parseFloat(display));
            let f = 1; for (let i = 2; i <= n; i++) f *= i;
            setDisplay(String(f)); setFresh(true);
          })}
          {btn("\u03C0", () => { setDisplay(String(Math.PI)); setFresh(true); })}
          {btn("e", () => { setDisplay(String(Math.E)); setFresh(true); })}
          {btn("(", () => {})}
          {btn(")", () => {})}

          {btn("C", clear, "bg-red-100")}
          {btn("\u232B", () => setDisplay(display.length > 1 ? display.slice(0, -1) : "0"))}
          {btn("/", () => doOp("/"))}
          {btn("*", () => doOp("*"))}
          {btn("-", () => doOp("-"))}

          {btn("7", () => input("7"))}
          {btn("8", () => input("8"))}
          {btn("9", () => input("9"))}
          {btn("+", () => doOp("+"))}
          {btn("=", compute, "row-span-2 bg-[#00A86B] text-white")}

          {btn("4", () => input("4"))}
          {btn("5", () => input("5"))}
          {btn("6", () => input("6"))}
          {btn(".", () => input("."))}

          {btn("1", () => input("1"))}
          {btn("2", () => input("2"))}
          {btn("3", () => input("3"))}
          {btn("0", () => input("0"), "col-span-2")}
        </div>
      </div>
    </div>
  );
}

// ─── NAT Keypad ──────────────────────────────────────────────────────────────

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
        {["7","8","9","-","4","5","6",".","1","2","3",""].map((ch, i) =>
          ch ? (
            <button
              key={i}
              onClick={() => press(ch)}
              disabled={disabled}
              className="rounded border bg-white px-3 py-2 font-mono text-sm hover:bg-gray-50 disabled:opacity-40"
            >
              {ch}
            </button>
          ) : (
            <button
              key={i}
              onClick={backspace}
              disabled={disabled}
              className="rounded border bg-gray-100 px-3 py-2 text-sm hover:bg-gray-200 disabled:opacity-40"
            >
              &#9003;
            </button>
          )
        )}
        <button
          onClick={() => press("0")}
          disabled={disabled}
          className="col-span-2 rounded border bg-white px-3 py-2 font-mono text-sm hover:bg-gray-50 disabled:opacity-40"
        >
          0
        </button>
        <button
          onClick={clear}
          disabled={disabled}
          className="col-span-2 rounded border bg-red-50 px-3 py-2 text-sm text-red-600 hover:bg-red-100 disabled:opacity-40"
        >
          Clear
        </button>
      </div>
    </div>
  );
}

// ─── Submit Modal ────────────────────────────────────────────────────────────

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
  const answered = entries.filter((s) => s === "Answered" || s === "Answered_And_Marked").length;
  const notAnswered = entries.filter((s) => s === "Not_Answered").length;
  const marked = entries.filter((s) => s === "Marked_For_Review").length;
  const notVisited = entries.filter((s) => s === "Not_Visited").length;

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
        <div className="mt-6 flex gap-3 justify-end">
          <button
            onClick={onCancel}
            disabled={busy}
            className="rounded border px-4 py-2 text-sm hover:bg-gray-50 disabled:opacity-50"
          >
            Go Back
          </button>
          <button
            onClick={onConfirm}
            disabled={busy}
            className="rounded bg-[#00A86B] px-4 py-2 text-sm font-semibold text-white hover:bg-[#009060] disabled:opacity-50"
          >
            {busy ? "Submitting…" : "Yes, Submit"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Question Paper Modal (65 questions, click navigates) ────────────────────

function QuestionPaperModal({
  open,
  onClose,
  questionOrder,
  palette,
  questions,
  onNavigate,
}: {
  open: boolean;
  onClose: () => void;
  questionOrder: string[];
  palette: Record<string, PaletteState>;
  questions: Map<string, QuestionData>;
  onNavigate: (qvId: string) => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="max-h-[80vh] w-full max-w-3xl overflow-y-auto rounded-xl border bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">Question Paper</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xl">&times;</button>
        </div>
        <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
          {questionOrder.map((qvId, idx) => {
            const st = palette[qvId] ?? "Not_Visited";
            return (
              <button
                key={qvId}
                onClick={() => { onNavigate(qvId); onClose(); }}
                className="relative flex items-center justify-center rounded border h-10 w-10 text-xs font-bold transition-transform hover:scale-110"
                style={{
                  backgroundColor: PALETTE_COLORS[st],
                  color: st === "Not_Visited" || st === "Not_Answered" ? "#000" : "#FFF",
                  borderColor: st === "Not_Visited" ? "#ccc" : PALETTE_COLORS[st],
                }}
              >
                {idx + 1}
                {st === "Answered_And_Marked" && (
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
          <span className="flex items-center gap-1"><span className="h-3 w-3 rounded border" style={{ backgroundColor: "#FFFFFF" }} /> Not Visited</span>
          <span className="flex items-center gap-1"><span className="h-3 w-3 rounded" style={{ backgroundColor: "#FF0000" }} /> Not Answered</span>
          <span className="flex items-center gap-1"><span className="h-3 w-3 rounded" style={{ backgroundColor: "#00A86B" }} /> Answered</span>
          <span className="flex items-center gap-1"><span className="h-3 w-3 rounded" style={{ backgroundColor: "#9932CC" }} /> Marked</span>
          <span className="flex items-center gap-1">
            <span className="relative h-3 w-3 rounded" style={{ backgroundColor: "#9932CC" }}>
              <span className="absolute -bottom-px -right-px h-1.5 w-1.5 rounded-full" style={{ backgroundColor: "#00A86B" }} />
            </span>
            Answered+Marked
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Offline Banner + Lock Overlay ───────────────────────────────────────────

function OfflineBanner({ countdown }: { countdown: number }) {
  if (countdown <= 0) {
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-gray-900/90">
        <div className="text-center text-white">
          <div className="text-2xl font-bold">Connection Lost</div>
          <p className="mt-2 text-gray-300">UI locked. Attempting reconnection every 5s…</p>
        </div>
      </div>
    );
  }
  const mm = String(Math.floor(countdown / 60)).padStart(2, "0");
  const ss = String(countdown % 60).padStart(2, "0");
  return (
    <div className="fixed top-14 left-0 right-0 z-50 bg-yellow-500 px-4 py-2 text-center text-sm font-semibold text-black">
      You are offline. Auto-lock in {mm}:{ss}…
    </div>
  );
}

// ─── MAIN EXAM SIMULATOR ────────────────────────────────────────────────────

export default function GateAttemptPage() {
  const params = useParams<{ attemptId: string }>();
  const attemptId = params.attemptId;
  const router = useRouter();

  // ── State ──
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<SessionState | null>(null);
  const [questions, setQuestions] = useState<Map<string, QuestionData>>(new Map());
  const [currentQvId, setCurrentQvId] = useState<string>("");
  const [palette, setPalette] = useState<Record<string, PaletteState>>({});
  const [drafts, setDrafts] = useState<Record<string, DraftAnswer>>({});
  const [committed, setCommitted] = useState<Record<string, DraftAnswer>>({});
  const [calcMemory, setCalcMemory] = useState(0);
  const [zoom, setZoom] = useState(100);

  // Modals
  const [calcOpen, setCalcOpen] = useState(false);
  const [submitModalOpen, setSubmitModalOpen] = useState(false);
  const [questionPaperOpen, setQuestionPaperOpen] = useState(false);
  const [submitBusy, setSubmitBusy] = useState(false);

  // Timer
  const [remainingMs, setRemainingMs] = useState(0);
  const endsAtRef = useRef<number>(0);
  const autoSubmitRef = useRef(false);

  // Offline handling
  const [isOnline, setIsOnline] = useState(true);
  const [offlineCountdown, setOfflineCountdown] = useState(180);
  const offlineStartRef = useRef<number | null>(null);
  const cachedPayloadRef = useRef<any>(null);

  // ── Load attempt session ──
  useEffect(() => {
    let alive = true;
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`/api/gate/attempts/${attemptId}`, { cache: "no-store" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? `Load failed (${res.status})`);
        if (data.status === "SUBMITTED") {
          router.replace(`/gate/report/${attemptId}`);
          return;
        }
        if (data.status === "INVALIDATED") {
          throw new Error("Attempt was invalidated. Please start a new one.");
        }
        if (!alive) return;

        setSession(data);
        setPalette(data.palette ?? {});
        setDrafts(data.drafts ?? {});
        setCommitted(data.committed ?? {});
        setCurrentQvId(data.currentQuestionId ?? data.questionOrder?.[0] ?? "");
        setCalcMemory(data.calculator?.memory ?? 0);
        endsAtRef.current = new Date(data.endsAt).getTime();
        setRemainingMs(Math.max(0, endsAtRef.current - Date.now()));

        // Load question content (would come from a separate API in real impl; using stubs)
        // In production, the resume endpoint would include question content
        const qMap = new Map<string, QuestionData>();
        for (let i = 0; i < (data.questionOrder ?? []).length; i++) {
          const qvId = data.questionOrder[i];
          qMap.set(qvId, {
            questionVersionId: qvId,
            type: "MCQ",
            marks: i < 10 ? (i < 5 ? 1 : 2) : (i < 35 ? 1 : 2),
            text: `Question ${i + 1}`,
            options: [
              { id: `${qvId}-a`, text: "Option A" },
              { id: `${qvId}-b`, text: "Option B" },
              { id: `${qvId}-c`, text: "Option C" },
              { id: `${qvId}-d`, text: "Option D" },
            ],
            section: i < 10 ? "GA" : "CORE",
          });
        }
        setQuestions(qMap);
      } catch (e: any) {
        if (alive) setError(e?.message ?? "Failed to load attempt");
      } finally {
        if (alive) setLoading(false);
      }
    }
    load();
    return () => { alive = false; };
  }, [attemptId, router]);

  // ── Timer tick ──
  useEffect(() => {
    if (!session) return;
    const timer = setInterval(() => {
      const ms = Math.max(0, endsAtRef.current - Date.now());
      setRemainingMs(ms);
      if (ms <= 0 && !autoSubmitRef.current) {
        autoSubmitRef.current = true;
        doSubmit(true);
      }
    }, 1000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  // ── Heartbeat every 15s ──
  useEffect(() => {
    if (!session || !currentQvId) return;
    const hb = setInterval(async () => {
      if (!isOnline) return;
      try {
        await fetch(`/api/gate/attempts/${attemptId}/heartbeat`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            currentQuestionId: currentQvId,
            draftAnswer: drafts[currentQvId] ?? undefined,
            calcState: { memory: calcMemory },
          }),
        });
      } catch {
        // Offline handled below
      }
    }, 15_000);
    return () => clearInterval(hb);
  }, [session, currentQvId, drafts, calcMemory, isOnline, attemptId]);

  // ── Offline detection ──
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
      // Flush cached payload
      if (cachedPayloadRef.current) {
        try {
          await fetch(`/api/gate/attempts/${attemptId}/heartbeat`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(cachedPayloadRef.current),
          });
        } catch { /* retry next heartbeat */ }
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

  // Offline countdown tick
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

  // ── Zoom (Ctrl+=/Ctrl+-/Ctrl+0) ──
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

  // ── Prevent browser back ──
  useEffect(() => {
    const handler = () => {
      window.history.pushState(null, "", window.location.href);
    };
    window.history.pushState(null, "", window.location.href);
    window.addEventListener("popstate", handler);
    return () => window.removeEventListener("popstate", handler);
  }, []);

  // ── Derived ──
  const questionOrder = session?.questionOrder ?? [];
  const currentIdx = questionOrder.indexOf(currentQvId);
  const currentQ = questions.get(currentQvId);
  const currentDraft = drafts[currentQvId];

  const fmtTime = useMemo(() => {
    const totalSec = Math.floor(remainingMs / 1000);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }, [remainingMs]);

  const isLocked = remainingMs <= 0;

  // ── Handlers ──
  async function saveDraft(qvId: string, draft: DraftAnswer) {
    setDrafts((prev) => ({ ...prev, [qvId]: draft }));
    if (!isOnline) {
      cachedPayloadRef.current = { currentQuestionId: qvId, draftAnswer: draft };
      return;
    }
  }

  async function commitAnswer(qvId: string) {
    const draft = drafts[qvId];
    if (!draft) return;
    try {
      const res = await fetch(`/api/gate/attempts/${attemptId}/answer`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionId: qvId,
          type: draft.type,
          selectedOptionIds: draft.selectedOptionIds,
          natRaw: draft.natRaw,
        }),
      });
      const data = await res.json();
      if (res.ok && data.paletteState) {
        setPalette((p) => ({ ...p, [qvId]: data.paletteState }));
        setCommitted((c) => ({ ...c, [qvId]: draft }));
      }
    } catch { /* offline: cached */ }
  }

  async function handleSaveAndNext() {
    if (isLocked) return;
    await commitAnswer(currentQvId);
    if (currentIdx < questionOrder.length - 1) {
      setCurrentQvId(questionOrder[currentIdx + 1]);
    }
  }

  async function handleMarkToggle() {
    if (isLocked) return;
    try {
      const res = await fetch(`/api/gate/attempts/${attemptId}/mark`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId: currentQvId }),
      });
      const data = await res.json();
      if (res.ok && data.paletteState) {
        setPalette((p) => ({ ...p, [currentQvId]: data.paletteState }));
      }
    } catch { /* offline fallback */ }
  }

  async function handleClear() {
    if (isLocked) return;
    try {
      const res = await fetch(`/api/gate/attempts/${attemptId}/clear`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId: currentQvId }),
      });
      const data = await res.json();
      if (res.ok && data.paletteState) {
        setPalette((p) => ({ ...p, [currentQvId]: data.paletteState }));
        setDrafts((d) => { const n = { ...d }; delete n[currentQvId]; return n; });
        setCommitted((c) => { const n = { ...c }; delete n[currentQvId]; return n; });
      }
    } catch { /* offline fallback */ }
  }

  async function doSubmit(isAuto = false) {
    setSubmitBusy(true);
    try {
      const res = await fetch(`/api/gate/attempts/${attemptId}/submit`, { method: "POST" });
      if (res.ok) {
        router.push(`/gate/report/${attemptId}`);
      } else {
        const data = await res.json();
        setError(`${isAuto ? "Auto-submit" : "Submit"} failed: ${data.error ?? res.status}`);
      }
    } catch (e: any) {
      setError(`Submit failed: ${e?.message}`);
    } finally {
      setSubmitBusy(false);
      setSubmitModalOpen(false);
    }
  }

  function navigateToQuestion(qvId: string) {
    setCurrentQvId(qvId);
  }

  // ── Render ──
  if (loading) return <div className="flex items-center justify-center h-screen text-gray-500">Loading exam…</div>;
  if (error) return <div className="flex items-center justify-center h-screen"><div className="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700 max-w-md">{error}</div></div>;
  if (!session) return <div className="flex items-center justify-center h-screen text-gray-500">No session found.</div>;

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col overflow-hidden">
      {/* Offline */}
      {!isOnline && <OfflineBanner countdown={offlineCountdown} />}

      {/* Auto-submit overlay */}
      {isLocked && !submitBusy && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-gray-900/80">
          <div className="text-center text-white">
            <div className="text-2xl font-bold">Time&apos;s Up!</div>
            <p className="mt-2 text-gray-300">Submitting final responses…</p>
          </div>
        </div>
      )}

      {/* Top bar */}
      <div className="flex h-12 shrink-0 items-center justify-between border-b bg-gray-50 px-4">
        <div className="flex items-center gap-4 text-sm">
          <span className="font-semibold">GATE CS/IT Mock</span>
          <span className="text-gray-500">Q {currentIdx + 1} of {questionOrder.length}</span>
          {currentQ && (
            <span className="rounded bg-gray-200 px-2 py-0.5 text-xs">
              {currentQ.section} &middot; {currentQ.marks} mark{currentQ.marks > 1 ? "s" : ""}
            </span>
          )}
        </div>
        <div className="flex items-center gap-4">
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
              remainingMs < 60000 ? "bg-red-600 text-white animate-pulse" : "bg-gray-800 text-green-400"
            }`}
          >
            {fmtTime}
          </div>
        </div>
      </div>

      {/* Main content: left pane 70% + right pane 30% */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left pane: Question */}
        <div className="flex-[7] overflow-y-auto border-r p-6" style={{ fontSize: `${zoom}%` }}>
          {currentQ ? (
            <div>
              <div className="mb-1 text-xs text-gray-400 uppercase">
                Question {currentIdx + 1} &middot; {currentQ.type} &middot; {currentQ.marks} mark{currentQ.marks > 1 ? "s" : ""}
              </div>

              {/* Question text (Markdown rendering placeholder) */}
              <div className="mb-4 text-base leading-relaxed whitespace-pre-wrap">
                {currentQ.text}
              </div>

              {/* Options for MCQ/MSQ */}
              {(currentQ.type === "MCQ" || currentQ.type === "MSQ") && (
                <div className="space-y-2">
                  {currentQ.options.map((opt) => {
                    const selected = (currentDraft?.selectedOptionIds ?? committed[currentQvId]?.selectedOptionIds ?? []).includes(opt.id);
                    return (
                      <label
                        key={opt.id}
                        className={`flex cursor-pointer items-center gap-3 rounded border px-4 py-3 transition-colors ${
                          selected ? "border-[#00A86B] bg-[#00A86B]/5" : "border-gray-200 hover:bg-gray-50"
                        } ${isLocked ? "cursor-not-allowed opacity-60" : ""}`}
                      >
                        <input
                          type={currentQ.type === "MCQ" ? "radio" : "checkbox"}
                          name={`q-${currentQvId}`}
                          checked={selected}
                          disabled={isLocked}
                          onChange={() => {
                            if (isLocked) return;
                            let next: string[];
                            if (currentQ.type === "MCQ") {
                              next = [opt.id];
                            } else {
                              const prev = currentDraft?.selectedOptionIds ?? [];
                              next = selected ? prev.filter((x) => x !== opt.id) : [...prev, opt.id];
                            }
                            saveDraft(currentQvId, {
                              type: currentQ.type,
                              selectedOptionIds: next,
                            });
                          }}
                          className="accent-[#00A86B]"
                        />
                        <span>{opt.text}</span>
                      </label>
                    );
                  })}
                </div>
              )}

              {/* NAT input */}
              {currentQ.type === "NAT" && (
                <NATKeypad
                  value={currentDraft?.natRaw ?? committed[currentQvId]?.natRaw ?? ""}
                  onChange={(v) => saveDraft(currentQvId, { type: "NAT", natRaw: v })}
                  disabled={isLocked}
                />
              )}

              {/* Action buttons */}
              <div className="mt-6 flex flex-wrap gap-2">
                <button
                  onClick={handleSaveAndNext}
                  disabled={isLocked}
                  className="rounded bg-[#00A86B] px-4 py-2 text-sm font-semibold text-white hover:bg-[#009060] disabled:opacity-50"
                >
                  Save &amp; Next
                </button>
                <button
                  onClick={handleMarkToggle}
                  disabled={isLocked}
                  className="rounded border border-[#9932CC] px-4 py-2 text-sm font-semibold text-[#9932CC] hover:bg-[#9932CC]/5 disabled:opacity-50"
                >
                  Mark for Review
                </button>
                <button
                  onClick={handleClear}
                  disabled={isLocked}
                  className="rounded border border-red-300 px-4 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
                >
                  Clear Response
                </button>
              </div>

              {/* Prev/Next navigation */}
              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => currentIdx > 0 && setCurrentQvId(questionOrder[currentIdx - 1])}
                  disabled={currentIdx === 0}
                  className="rounded border px-3 py-1.5 text-sm hover:bg-gray-50 disabled:opacity-30"
                >
                  &larr; Previous
                </button>
                <button
                  onClick={() => currentIdx < questionOrder.length - 1 && setCurrentQvId(questionOrder[currentIdx + 1])}
                  disabled={currentIdx === questionOrder.length - 1}
                  className="rounded border px-3 py-1.5 text-sm hover:bg-gray-50 disabled:opacity-30"
                >
                  Next &rarr;
                </button>
              </div>

              {/* Zoom indicator */}
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

        {/* Right pane: Palette + Submit */}
        <div className="flex-[3] flex flex-col overflow-y-auto bg-gray-50 p-4">
          <div className="mb-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Question Palette
          </div>
          <div className="grid grid-cols-5 gap-1.5">
            {questionOrder.map((qvId, idx) => {
              const st = palette[qvId] ?? "Not_Visited";
              const isCurrent = qvId === currentQvId;
              return (
                <button
                  key={qvId}
                  onClick={() => navigateToQuestion(qvId)}
                  className={`relative flex items-center justify-center rounded text-xs font-bold h-8 w-8 transition-all ${
                    isCurrent ? "ring-2 ring-blue-500 ring-offset-1" : ""
                  }`}
                  style={{
                    backgroundColor: PALETTE_COLORS[st],
                    color: st === "Not_Visited" || st === "Not_Answered" ? "#000" : "#FFF",
                    borderWidth: 1,
                    borderColor: st === "Not_Visited" ? "#ccc" : PALETTE_COLORS[st],
                  }}
                  title={`Q${idx + 1}: ${st.replace(/_/g, " ")}`}
                >
                  {idx + 1}
                  {st === "Answered_And_Marked" && (
                    <span
                      className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full border border-white"
                      style={{ backgroundColor: "#00A86B" }}
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="mt-4 space-y-1 text-[10px] text-gray-500">
            <div className="flex items-center gap-1"><PaletteDot state="Not_Visited" /> Not Visited</div>
            <div className="flex items-center gap-1"><PaletteDot state="Not_Answered" /> Not Answered</div>
            <div className="flex items-center gap-1"><PaletteDot state="Answered" /> Answered</div>
            <div className="flex items-center gap-1"><PaletteDot state="Marked_For_Review" /> Marked for Review</div>
            <div className="flex items-center gap-1"><PaletteDot state="Answered_And_Marked" /> Answered &amp; Marked</div>
          </div>

          {/* Submit */}
          <div className="mt-auto pt-4">
            <button
              onClick={() => setSubmitModalOpen(true)}
              disabled={isLocked}
              className="w-full rounded-lg bg-blue-600 py-3 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              Submit Test
            </button>
          </div>
        </div>
      </div>

      {/* Modals */}
      <CalculatorModal
        open={calcOpen}
        onClose={() => setCalcOpen(false)}
        memory={calcMemory}
        onMemoryChange={setCalcMemory}
      />
      <SubmitModal
        open={submitModalOpen}
        palette={palette}
        onConfirm={() => doSubmit(false)}
        onCancel={() => setSubmitModalOpen(false)}
        busy={submitBusy}
      />
      <QuestionPaperModal
        open={questionPaperOpen}
        onClose={() => setQuestionPaperOpen(false)}
        questionOrder={questionOrder}
        palette={palette}
        questions={questions}
        onNavigate={navigateToQuestion}
      />
    </div>
  );
}
