// src/lib/gate/contracts.ts
// Shared types for the GATE Mock Test Platform (demo-first vertical slice)

export enum PaletteState {
  Not_Visited = "Not_Visited",
  Not_Answered = "Not_Answered",
  Answered = "Answered",
  Marked_For_Review = "Marked_For_Review",
  Answered_And_Marked = "Answered_And_Marked",
}

export type QuestionType = "MCQ" | "MSQ" | "NAT";
export type AttemptMode = "RANKED" | "PRACTICE" | "DEMO";
export type AttemptStatus = "IN_PROGRESS" | "SUBMITTED" | "EXPIRED" | "ABANDONED";

export interface DraftAnswer {
  type: QuestionType;
  selectedOptionIds?: string[]; // logical option ids like ["a"], ["b","d"]
  natRaw?: string;
  natNormalized?: number | null;
  updatedAt: string; // ISO timestamp
}

export interface CommittedAnswer {
  type: QuestionType;
  selectedOptionIds?: string[]; // logical option ids like ["a"], ["b","d"]
  natRaw?: string;
  natNormalized?: number | null;
  savedAt: string; // ISO timestamp
}

export interface AttemptSession {
  attemptId: string;
  userId: string | null; // null for guest demo
  guestToken: string | null;
  testVersionId: string;
  mode: AttemptMode;
  status: AttemptStatus;
  startedAt: string;
  endsAt: string;
  lastSeenAt: string;
  shuffleSeed: string;

  // question_version_ids in display order
  questionOrder: string[];

  // qvId -> logical option ids in display order, e.g. { "<qvId>": ["a","b","c","d"] }
  optionOrderByQuestion: Record<string, string[]>;

  currentQuestionId: string;
  palette: Record<string, PaletteState>;
  drafts: Record<string, DraftAnswer>;
  committed: Record<string, CommittedAnswer>;

  calculator: {
    memory: number;
  };

  focusLostCount: number;
  focusLostSeconds: number;
  versionCounter: number;
}

export interface AttemptEvent {
  eventId: string;
  attemptId: string;
  userId: string | null;
  type:
    | "HEARTBEAT"
    | "ANSWER_COMMIT"
    | "PALETTE_UPDATE"
    | "SUBMIT"
    | "ABANDON";
  occurredAt: string;
  payload: unknown;
}

export interface QuestionMeta {
  questionVersionId: string;
  type: QuestionType;
  marks: number;

  // For MCQ/MSQ: logical correct option ids from options_array, e.g. ["a"] or ["b","d"]
  correctOptionIds?: string[];

  // For NAT
  natLowerBound?: number;
  natUpperBound?: number;
  natPrecision?: number;
}

export interface GradeResult {
  earned: number; // may be negative if you later add negative marking for MCQ
  maxMarks: number;
  correct: boolean;
}

export interface AttemptGradeResult {
  score: number;
  maxScore: number;
  percent: number;
  passed: boolean;
  perQuestion: Array<{
    questionVersionId: string;
    earned: number;
    maxMarks: number;
    correct: boolean;
  }>;
}

/**
 * BlueprintProfile combines DB-sourced fields (id, durationSeconds, passPercent)
 * with exam-structure fields supplied in code from blueprints.ts.
 * Structure is fixed by the exam format, so it is NOT stored in the DB.
 */
export interface BlueprintProfile {
  id: string;
  name: string;
  paperCode: string;

  // Structure — fixed by the exam format, supplied in code (see blueprints.ts).
  totalQuestions: number;
  totalMarks: number;
  gaQuestions: number;
  gaMarks: number;
  ga1MarkCount: number;
  ga2MarkCount: number;
  coreQuestions: number;
  coreMarks: number;
  core1MarkCount: number;
  core2MarkCount: number;
  coreMcqMin: number;
  coreMcqMax: number;
  coreMsqMin: number;
  coreMsqMax: number;
  coreNatMin: number;
  coreNatMax: number;
  difficultyEasyPct: number;
  difficultyMediumPct: number;
  difficultyHardPct: number;

  // Sourced from the DB row.
  durationSeconds: number;
  passPercent: number;
}
