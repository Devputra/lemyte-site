// src/lib/gate/__tests__/calc.test.ts
import { describe, expect, it } from "vitest";

import { CalcError, evaluate, formatResult } from "../calc";

const ev = (s: string, a: "deg" | "rad" = "deg") => evaluate(s, a);

describe("evaluate", () => {
  it("follows operator precedence and brackets", () => {
    expect(ev("2+3*4")).toBe(14);
    expect(ev("(2+3)*4")).toBe(20);
    expect(ev("10−4÷2")).toBe(8);
    expect(ev("2×(3+4)÷7")).toBe(2);
  });
  it("handles powers (right-assoc) and unary minus like a calculator", () => {
    expect(ev("2^3^2")).toBe(512);
    expect(ev("-2^2")).toBe(-4);
    expect(ev("(-2)^2")).toBe(4);
    expect(ev("2^-1")).toBe(0.5);
  });
  it("supports implicit multiplication and constants", () => {
    expect(ev("2π")).toBeCloseTo(2 * Math.PI);
    expect(ev("3(4+1)")).toBe(15);
    expect(ev("(1+2)(3+4)")).toBe(21);
    expect(ev("e^2")).toBeCloseTo(Math.E ** 2);
  });
  it("uses degrees by default and radians on request", () => {
    expect(ev("sin(30)")).toBeCloseTo(0.5);
    expect(ev("cos(60)")).toBeCloseTo(0.5);
    expect(ev("asin(0.5)")).toBeCloseTo(30);
    expect(ev("sin(π/2)", "rad")).toBeCloseTo(1);
    expect(() => ev("tan(90)")).toThrow(CalcError);
  });
  it("has logs, roots, factorial, exp", () => {
    expect(ev("log(1000)")).toBeCloseTo(3);
    expect(ev("ln(e)")).toBeCloseTo(1);
    expect(ev("√(16)+sqrt(9)")).toBe(7);
    expect(ev("5!")).toBe(120);
    expect(ev("exp(0)")).toBe(1);
    expect(ev("1.5E3")).toBe(1500);
  });
  it("closes a missing final bracket and rejects bad input", () => {
    expect(ev("(2+3")).toBe(5);
    expect(ev("sin(30")).toBeCloseTo(0.5);
    expect(() => ev("2+")).toThrow(CalcError);
    expect(() => ev("4/0")).toThrow(CalcError);
    expect(() => ev("2.5!")).toThrow(CalcError);
    expect(() => ev("2$3")).toThrow(CalcError);
    expect(() => ev("sin 30")).toThrow(CalcError);
  });
});

describe("formatResult", () => {
  it("removes float noise and switches to exponent form for extremes", () => {
    expect(formatResult(0.1 + 0.2)).toBe("0.3");
    expect(formatResult(1 / 3)).toBe("0.3333333333");
    expect(formatResult(2e15)).toBe("2e+15");
    expect(formatResult(-0)).toBe("0");
    expect(formatResult(Infinity)).toBe("∞");
  });
});
