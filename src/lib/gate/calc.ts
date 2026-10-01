// src/lib/gate/calc.ts — expression evaluator for the exam's scientific calculator (no eval()).
//
// Grammar (lowest to highest precedence):
//   expr    := term (("+" | "-") term)*
//   term    := unary (("*" | "/") unary | <implicit ×> unary)*      e.g. 2π, 3(4+1), (1+2)(3+4)
//   unary   := ("-" | "+") unary | power                            so -2^2 = -4, like a real calculator
//   power   := postfix ("^" unary)?                                 right-associative: 2^3^2 = 2^9
//   postfix := primary "!"*
//   primary := number | "π" | "e" | func "(" expr ")" | "(" expr ")"
// Display symbols × ÷ − √ are accepted alongside * / - sqrt. Unclosed brackets are closed at the end.

export type Angle = "deg" | "rad";

export class CalcError extends Error {}

const FUNCS: Record<string, (x: number, a: Angle) => number> = {
  sin: (x, a) => Math.sin(a === "deg" ? (x * Math.PI) / 180 : x),
  cos: (x, a) => Math.cos(a === "deg" ? (x * Math.PI) / 180 : x),
  tan: (x, a) => {
    if (a === "deg" && Math.abs(((x % 180) + 180) % 180 - 90) < 1e-12) throw new CalcError("tan undefined");
    return Math.tan(a === "deg" ? (x * Math.PI) / 180 : x);
  },
  asin: (x, a) => (a === "deg" ? (Math.asin(x) * 180) / Math.PI : Math.asin(x)),
  acos: (x, a) => (a === "deg" ? (Math.acos(x) * 180) / Math.PI : Math.acos(x)),
  atan: (x, a) => (a === "deg" ? (Math.atan(x) * 180) / Math.PI : Math.atan(x)),
  sinh: (x) => Math.sinh(x),
  cosh: (x) => Math.cosh(x),
  tanh: (x) => Math.tanh(x),
  ln: (x) => Math.log(x),
  log: (x) => Math.log10(x),
  sqrt: (x) => Math.sqrt(x),
  exp: (x) => Math.exp(x),
};

type Tok = { t: "num"; v: number } | { t: "op"; v: string } | { t: "fn"; v: string };

function tokenize(src: string): Tok[] {
  const s = src.replace(/×/g, "*").replace(/÷/g, "/").replace(/[−–]/g, "-").replace(/√/g, "sqrt").replace(/\s+/g, "");
  const out: Tok[] = [];
  let i = 0;
  while (i < s.length) {
    const rest = s.slice(i);
    const num = rest.match(/^(\d+\.?\d*|\.\d+)(E[+-]?\d+)?/);
    if (num) {
      out.push({ t: "num", v: parseFloat(num[0]) });
      i += num[0].length;
      continue;
    }
    const fn = Object.keys(FUNCS)
      .sort((a, b) => b.length - a.length)
      .find((f) => rest.startsWith(f));
    if (fn) {
      out.push({ t: "fn", v: fn });
      i += fn.length;
      continue;
    }
    if (rest[0] === "π") out.push({ t: "num", v: Math.PI });
    else if (rest[0] === "e") out.push({ t: "num", v: Math.E });
    else if ("+-*/^()!".includes(rest[0])) out.push({ t: "op", v: rest[0] });
    else throw new CalcError(`Unexpected "${rest[0]}"`);
    i += 1;
  }
  return out;
}

function factorial(n: number): number {
  if (n < 0 || !Number.isInteger(n)) throw new CalcError("n! needs a whole number ≥ 0");
  if (n > 170) return Infinity;
  let f = 1;
  for (let k = 2; k <= n; k++) f *= k;
  return f;
}

export function evaluate(src: string, angle: Angle = "deg"): number {
  const toks = tokenize(src);
  let p = 0;
  const peek = () => toks[p];
  const isOp = (v: string) => peek()?.t === "op" && peek()!.v === v;
  const startsOperand = () => {
    const k = peek();
    return !!k && (k.t === "num" || k.t === "fn" || (k.t === "op" && k.v === "("));
  };

  function expr(): number {
    let v = term();
    while (isOp("+") || isOp("-")) v = toks[p++].v === "+" ? v + term() : v - term();
    return v;
  }
  function term(): number {
    let v = unary();
    for (;;) {
      if (isOp("*")) (p++, (v *= unary()));
      else if (isOp("/")) {
        p++;
        const d = unary();
        if (d === 0) throw new CalcError("Cannot divide by zero");
        v /= d;
      } else if (startsOperand()) v *= unary(); // implicit multiplication
      else return v;
    }
  }
  function unary(): number {
    if (isOp("-")) return p++, -unary();
    if (isOp("+")) return p++, unary();
    return power();
  }
  function power(): number {
    const base = postfix();
    if (isOp("^")) return p++, Math.pow(base, unary());
    return base;
  }
  function postfix(): number {
    let v = primary();
    while (isOp("!")) (p++, (v = factorial(v)));
    return v;
  }
  function primary(): number {
    const k = toks[p++];
    if (!k) throw new CalcError("Incomplete expression");
    if (k.t === "num") return k.v;
    if (k.t === "fn") {
      if (!isOp("(")) throw new CalcError(`${k.v} needs brackets, e.g. ${k.v}(30)`);
      p++;
      const v = FUNCS[k.v](expr(), angle);
      if (isOp(")")) p++;
      return v;
    }
    if (k.v === "(") {
      const v = expr();
      if (isOp(")")) p++; // tolerate a missing final ")"
      return v;
    }
    throw new CalcError(`Unexpected "${k.v}"`);
  }

  const v = expr();
  if (p < toks.length) throw new CalcError(`Unexpected "${toks[p].v}"`);
  if (Number.isNaN(v)) throw new CalcError("Math error");
  return v;
}

/** Show up to 10 significant digits, without float noise like 0.30000000000000004. */
export function formatResult(v: number): string {
  if (!Number.isFinite(v)) return v > 0 ? "∞" : v < 0 ? "−∞" : "Error";
  if (v === 0) return "0";
  const a = Math.abs(v);
  if (a >= 1e12 || a < 1e-9) return v.toExponential(8).replace(/\.?0+e/, "e");
  return String(parseFloat(v.toPrecision(10)));
}
