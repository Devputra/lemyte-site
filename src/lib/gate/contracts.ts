// src/lib/gate/contracts.ts
// Shared types for the GATE Mock Test Platform

export enum PaletteState {
  Not_Visited = "Not_Visited",
  Not_Answered = "Not_Answered",
  Answered = "Answered",
  Marked_For_Review = "Marked_For_Review",
  Answered_And_Marked = "Answered_And_Marked",
}

export type QuestionType = "MCQ" | "MSQ" | "NAT";
export type AttemptMode = "RANKED" | "PRACTICE" | "DEMO";
export type AttemptStatus = "IN_PROGRESS" | "SUBMITTED" | "INVALIDATED";

export interface DraftAnswer {
  type: QuestionType;
  selectedOptionIds?: string[];
  natRaw?: string;
  natNormalized?: number | null;
  updatedAt: string; // ISO timestamp
}

export interface CommittedAnswer {
  type: QuestionType;
  selectedOptionIds?: string[];
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
  questionOrder: string[]; // question_version_ids in display order
  optionOrderByQuestion: Record<string, string[]>; // qvId -> option_ids in order (natural by default)
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
  type: "HEARTBEAT" | "ANSWER_COMMIT" | "PALETTE_UPDATE" | "SUBMIT" | "INVALIDATE";
  occurredAt: string;
  payload: unknown;
}

export interface QuestionMeta {
  questionVersionId: string;
  questionId: string;
  type: QuestionType;
  marks: number;
  correctOptionIds?: string[];
  natLowerBound?: number;
  natUpperBound?: number;
  natPrecision?: number;
}

export interface GradeResult {
  earned: number; // can be negative (fractional) for MCQ
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

export interface BlueprintProfile {
  id: string;
  name: string;
  paperCode: string;
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
  durationSeconds: number;
  passPercent: number;
}
