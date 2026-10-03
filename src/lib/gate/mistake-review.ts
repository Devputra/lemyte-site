export type ReviewAnswer = { questionId: string; seenAt: string; answered: boolean; correct: boolean };

export function selectMistakes(history: ReviewAnswer[], now: number): string[] {
  const latest = new Map<string, ReviewAnswer>();
  for (const row of history) {
    const previous = latest.get(row.questionId);
    if (!previous || Date.parse(row.seenAt) >= Date.parse(previous.seenAt)) latest.set(row.questionId, row);
  }
  const cutoff = now - 2 * 86_400_000;
  return [...latest.values()]
    .filter((row) => row.answered && !row.correct)
    .sort((a, b) => {
      const aDue = Date.parse(a.seenAt) <= cutoff;
      const bDue = Date.parse(b.seenAt) <= cutoff;
      return Number(bDue) - Number(aDue) || Date.parse(a.seenAt) - Date.parse(b.seenAt) || a.questionId.localeCompare(b.questionId);
    })
    .map((row) => row.questionId);
}
