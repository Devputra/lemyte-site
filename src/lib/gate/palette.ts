// src/lib/gate/palette.ts
// Palette state machine for GATE attempt UI

import { PaletteState, type DraftAnswer, type CommittedAnswer } from "./contracts";

/**
 * Check if a draft or committed answer has content (i.e., is not empty/unanswered).
 */
export function hasAnswer(answer: DraftAnswer | CommittedAnswer | null | undefined): boolean {
  if (!answer) return false;
  if (answer.type === "MCQ" || answer.type === "MSQ") {
    return (answer.selectedOptionIds ?? []).length > 0;
  }
  if (answer.type === "NAT") {
    return answer.natRaw !== undefined && answer.natRaw !== null && answer.natRaw.trim() !== "";
  }
  return false;
}

/**
 * Transition: question enters the focal pane for the first time.
 */
export function onVisitQuestion(
  palette: Record<string, PaletteState>,
  questionId: string
): void {
  if (palette[questionId] === PaletteState.Not_Visited || palette[questionId] === undefined) {
    palette[questionId] = PaletteState.Not_Answered;
  }
}

/**
 * Transition: user selects/types a draft (no state change beyond marking as visited).
 */
export function onSelectDraft(
  palette: Record<string, PaletteState>,
  questionId: string
): void {
  onVisitQuestion(palette, questionId);
  // Draft selection does NOT change palette state. Only Save & Next does.
}

/**
 * Transition: Mark / Unmark toggle.
 */
export function onMarkToggle(
  palette: Record<string, PaletteState>,
  questionId: string
): void {
  const state = palette[questionId] ?? PaletteState.Not_Visited;

  switch (state) {
    case PaletteState.Not_Visited:
      palette[questionId] = PaletteState.Marked_For_Review;
      break;
    case PaletteState.Not_Answered:
      palette[questionId] = PaletteState.Marked_For_Review;
      break;
    case PaletteState.Marked_For_Review:
      palette[questionId] = PaletteState.Not_Answered;
      break;
    case PaletteState.Answered:
      palette[questionId] = PaletteState.Answered_And_Marked;
      break;
    case PaletteState.Answered_And_Marked:
      palette[questionId] = PaletteState.Answered;
      break;
  }
}

/**
 * Transition: Clear Response (authoritative Learnamyte parity rule).
 * Deletes draft + committed data and resets to Not_Answered.
 * Also clears mark state.
 */
export function onClear(
  palette: Record<string, PaletteState>,
  drafts: Record<string, DraftAnswer>,
  committed: Record<string, CommittedAnswer>,
  questionId: string
): void {
  delete drafts[questionId];
  delete committed[questionId];
  palette[questionId] = PaletteState.Not_Answered;
}

/**
 * Transition: Save & Next.
 * If draft has an answer → commit it and set to Answered (or Answered_And_Marked).
 * If draft is empty → remains Not_Answered or Marked_For_Review.
 */
export function onSaveAndNext(
  palette: Record<string, PaletteState>,
  drafts: Record<string, DraftAnswer>,
  committed: Record<string, CommittedAnswer>,
  questionId: string
): void {
  const draft = drafts[questionId];
  const currentState = palette[questionId] ?? PaletteState.Not_Answered;

  if (hasAnswer(draft)) {
    // Commit the draft
    committed[questionId] = {
      type: draft!.type,
      selectedOptionIds: draft!.selectedOptionIds,
      natRaw: draft!.natRaw,
      natNormalized: draft!.natNormalized,
      savedAt: new Date().toISOString(),
    };

    // Update palette state
    if (
      currentState === PaletteState.Marked_For_Review ||
      currentState === PaletteState.Answered_And_Marked
    ) {
      palette[questionId] = PaletteState.Answered_And_Marked;
    } else {
      palette[questionId] = PaletteState.Answered;
    }
  } else {
    // No answer to commit — keep current mark state
    if (currentState === PaletteState.Marked_For_Review) {
      palette[questionId] = PaletteState.Marked_For_Review;
    } else if (currentState !== PaletteState.Answered && currentState !== PaletteState.Answered_And_Marked) {
      palette[questionId] = PaletteState.Not_Answered;
    }
    // If already Answered/Answered_And_Marked, keep it (they saved with empty but had prior commit)
  }
}
