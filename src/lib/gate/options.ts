// src/lib/gate/options.ts
// Shared option-handling utilities for GATE question data.

/** Shape of elements inside the options_array JSONB column. */
export interface OptionRecord {
  id?: string;
  markdown?: string;
  isCorrect?: boolean;
  is_correct?: boolean;
  correct?: boolean;
  isAnswer?: boolean;
  answer?: boolean;
}

function isCorrectOption(opt: OptionRecord): boolean {
  return (
    opt.isCorrect === true ||
    opt.is_correct === true ||
    opt.correct === true ||
    opt.isAnswer === true ||
    opt.answer === true
  );
}

export function extractCorrectOptionIds(optionsArray: unknown): string[] {
  if (!Array.isArray(optionsArray)) return [];

  return optionsArray
    .filter((opt: unknown) => {
      if (!opt || typeof opt !== "object") return false;
      return isCorrectOption(opt as OptionRecord);
    })
    .map((opt: unknown) => String((opt as OptionRecord).id ?? ""))
    .filter(Boolean);
}

export function normalizeOptions(
  optionsArray: unknown,
  selectedOptionIds: string[] | null
): Array<{
  id: string;
  markdown: string;
  text: string;
  isCorrect: boolean;
  isSelected: boolean;
}> {
  if (!Array.isArray(optionsArray)) return [];

  const selected = new Set((selectedOptionIds ?? []).map(String));

  return optionsArray
    .filter((opt: unknown) => opt && typeof opt === "object")
    .map((opt: unknown) => {
      const o = opt as OptionRecord;
      const id = String(o.id ?? "");
      return {
        id,
        markdown: String((o as Record<string, unknown>).markdown ?? ""),
        text: String((o as Record<string, unknown>).markdown ?? ""),
        isCorrect: isCorrectOption(o),
        isSelected: selected.has(id),
      };
    })
    .filter((opt) => opt.id.length > 0);
}
