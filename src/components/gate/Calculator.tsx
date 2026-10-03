// src/components/gate/Calculator.tsx — the exam's scientific calculator, modelled on GATE's virtual one:
// a floating, draggable window (the question stays visible), full expressions with brackets, Deg/Rad,
// memory (saved with the attempt) and keyboard input. Evaluation lives in src/lib/gate/calc.ts.
"use client";

import { X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { type Angle, CalcError, evaluate, formatResult } from "@/lib/gate/calc";

type Key = { label: string; insert?: string; act?: () => void; cls?: string; title?: string };

export function Calculator({
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
  const [expr, setExpr] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [angle, setAngle] = useState<Angle>("deg");
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const drag = useRef<{ dx: number; dy: number } | null>(null);
  const box = useRef<HTMLDivElement>(null);

  const value = useCallback((): number | null => {
    try {
      return result !== null ? Number(result) : expr ? evaluate(expr, angle) : 0;
    } catch {
      return null;
    }
  }, [expr, result, angle]);

  const type = useCallback(
    (s: string) => {
      setError(null);
      // After "=", digits start a new expression; operators continue from the answer.
      if (result !== null) {
        setExpr(/^[0-9.(πe√a-z]/.test(s) ? s : result + s);
        setResult(null);
      } else setExpr((e) => e + s);
    },
    [result],
  );

  const equals = useCallback(() => {
    if (!expr) return;
    try {
      const r = formatResult(evaluate(expr, angle));
      setResult(r);
      setError(null);
    } catch (e) {
      setError(e instanceof CalcError ? e.message : "Math error");
    }
  }, [expr, angle]);

  const back = useCallback(() => {
    setError(null);
    if (result !== null) return setResult(null);
    // Remove a whole function name like "sin(" in one press.
    setExpr((e) => e.replace(/(asin|acos|atan|sinh|cosh|tanh|sin|cos|tan|log|ln|exp|√)\($|.$/, ""));
  }, [result]);

  const clear = useCallback(() => {
    setExpr("");
    setResult(null);
    setError(null);
  }, []);

  // Toggle the sign of the last number (or of the answer).
  const negate = () => {
    if (result !== null) return setResult(formatResult(-Number(result)));
    setExpr((e) => {
      const m = e.match(/(\(-)?(\d+\.?\d*|\.\d+)\)?$/);
      if (!m) return e + "-";
      const start = e.length - m[0].length;
      return m[1] ? e.slice(0, start) + m[2] : e.slice(0, start) + `(-${m[2]})`;
    });
  };

  // Keyboard input while open (not while typing in the answer box or any other field).
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (e.ctrlKey || e.metaKey || e.altKey || t.closest("input, textarea, select")) return;
      if (/^[0-9.+\-*/^()!]$/.test(e.key)) type(({ "*": "×", "/": "÷", "-": "−" } as Record<string, string>)[e.key] ?? e.key);
      else if (e.key === "Enter" || e.key === "=") equals();
      else if (e.key === "Backspace") back();
      else if (e.key === "Delete") clear();
      else if (e.key === "Escape") onClose();
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, type, equals, back, clear, onClose]);

  // Dragging by the title bar.
  useEffect(() => {
    const move = (e: PointerEvent) => {
      if (!drag.current) return;
      const w = box.current?.offsetWidth ?? 320;
      setPos({
        x: Math.min(Math.max(0, e.clientX - drag.current.dx), window.innerWidth - w),
        y: Math.min(Math.max(0, e.clientY - drag.current.dy), window.innerHeight - 60),
      });
    };
    const up = () => (drag.current = null);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
  }, []);

  if (!open) return null;

  const mem = (fn: (v: number) => void) => () => {
    const v = value();
    if (v !== null) fn(v);
  };
  const keys: Key[] = [
    { label: "MC", act: () => onMemoryChange(0), title: "Clear memory" },
    { label: "MR", act: () => type(formatResult(memory)), title: "Recall memory" },
    { label: "MS", act: mem((v) => onMemoryChange(v)), title: "Store in memory" },
    { label: "M+", act: mem((v) => onMemoryChange(memory + v)), title: "Add to memory" },
    { label: "M−", act: mem((v) => onMemoryChange(memory - v)), title: "Subtract from memory" },
    { label: "sin", insert: "sin(" },
    { label: "cos", insert: "cos(" },
    { label: "tan", insert: "tan(" },
    { label: "ln", insert: "ln(" },
    { label: "log", insert: "log(", title: "log base 10" },
    { label: "sin⁻¹", insert: "asin(" },
    { label: "cos⁻¹", insert: "acos(" },
    { label: "tan⁻¹", insert: "atan(" },
    { label: "eˣ", insert: "e^(" },
    { label: "10ˣ", insert: "10^(" },
    { label: "x²", insert: "^2" },
    { label: "xʸ", insert: "^" },
    { label: "√", insert: "√(" },
    { label: "1/x", insert: "^(-1)" },
    { label: "n!", insert: "!" },
    { label: "(", insert: "(" },
    { label: ")", insert: ")" },
    { label: "π", insert: "π" },
    { label: "e", insert: "e" },
    { label: "±", act: negate },
    { label: "C", act: clear, cls: "bg-rose-50 text-rose-700 hover:bg-rose-100", title: "Clear (Delete)" },
    { label: "⌫", act: back, title: "Backspace" },
    { label: "÷", insert: "÷" },
    { label: "×", insert: "×" },
    { label: "−", insert: "−" },
  ];
  const pad: Key[] = [
    ..."789".split("").map((d) => ({ label: d, insert: d })),
    { label: "+", insert: "+" },
    ..."456".split("").map((d) => ({ label: d, insert: d })),
    { label: ".", insert: "." },
    ..."123".split("").map((d) => ({ label: d, insert: d })),
    { label: "0", insert: "0" },
  ];
  const base = "min-h-11 lg:min-h-0 rounded-md border border-zinc-200 px-1 py-1.5 font-mono text-[13px] transition-colors active:scale-[0.97]";
  const press = (k: Key) => (k.act ? k.act() : type(k.insert!));

  return (
    <div
      ref={box}
      role="dialog"
      aria-label="Scientific calculator"
      className="fixed max-lg:!left-0 max-lg:!right-0 max-lg:!top-auto max-lg:bottom-0 max-lg:max-h-[90dvh] max-lg:w-full max-lg:overflow-y-auto z-50 w-[320px] select-none rounded-xl border border-zinc-300 bg-white shadow-2xl"
      style={pos ? { left: pos.x, top: pos.y } : { right: 24, top: 96 }}
    >
      <div
        className="flex cursor-move items-center justify-between rounded-t-xl border-b border-zinc-200 bg-zinc-50 px-3 py-2"
        onPointerDown={(e) => {
          if (window.innerWidth < 1024) return;
          const r = box.current!.getBoundingClientRect();
          drag.current = { dx: e.clientX - r.left, dy: e.clientY - r.top };
        }}
      >
        <span className="text-xs font-semibold text-zinc-700">Scientific Calculator</span>
        <div className="flex items-center gap-2">
          <div className="flex overflow-hidden rounded border border-zinc-300 text-[11px] font-semibold" onPointerDown={(e) => e.stopPropagation()}>
            {(["deg", "rad"] as const).map((a) => (
              <button
                key={a}
                onClick={() => {
                  setAngle(a);
                  setResult(null);
                }}
                className={`min-h-11 min-w-11 lg:min-h-0 lg:min-w-0 px-2 py-0.5 ${angle === a ? "bg-brand text-white" : "bg-white text-zinc-600 hover:bg-zinc-100"}`}
              >
                {a === "deg" ? "Deg" : "Rad"}
              </button>
            ))}
          </div>
          <button onClick={onClose} onPointerDown={(e) => e.stopPropagation()} aria-label="Close calculator" className="flex min-h-11 min-w-11 items-center justify-center text-zinc-500 hover:text-zinc-700 lg:min-h-0 lg:min-w-0">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="p-3">
        <div className="mb-2 rounded-md bg-zinc-900 px-3 py-2 text-right font-mono">
          <div className="min-h-[18px] truncate text-xs text-zinc-400" title={expr}>
            {expr || " "}
            {result !== null && " ="}
          </div>
          <div className={`truncate text-xl ${error ? "text-rose-400 text-sm leading-7" : "text-emerald-400"}`}>
            {error ?? result ?? "0"}
          </div>
          <div className="text-[10px] text-zinc-500">{memory !== 0 ? `M = ${formatResult(memory)}` : " "}</div>
        </div>

        <div className="grid grid-cols-5 gap-1">
          {keys.map((k) => (
            <button key={k.label} title={k.title} onClick={() => press(k)} className={`${base} ${k.cls ?? "bg-zinc-50 hover:bg-zinc-100"}`}>
              {k.label}
            </button>
          ))}
        </div>
        <div className="mt-1 grid grid-cols-5 gap-1">
          {pad.slice(0, 4).map((k) => (
            <button key={k.label} onClick={() => press(k)} className={`${base} bg-white text-base hover:bg-zinc-100`}>
              {k.label}
            </button>
          ))}
          <button onClick={equals} title="Equals (Enter)" className={`${base} row-span-3 border-brand bg-brand text-lg font-semibold text-white hover:bg-brand-700`}>
            =
          </button>
          {pad.slice(4).map((k) => (
            <button key={k.label} onClick={() => press(k)} className={`${base} bg-white text-base hover:bg-zinc-100`}>
              {k.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
