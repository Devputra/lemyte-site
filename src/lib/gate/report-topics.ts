export function weakestTopics(questions: { topicId: string | null; answered: boolean; correct: boolean }[], names: Map<string, string>) {
  const topics = new Map<string, { id: string; name: string; attempted: number; correct: number }>();
  for (const q of questions) {
    if (!q.topicId || !q.answered) continue;
    const row = topics.get(q.topicId) ?? { id: q.topicId, name: names.get(q.topicId) ?? "Topic", attempted: 0, correct: 0 };
    row.attempted++;
    if (q.correct) row.correct++;
    topics.set(q.topicId, row);
  }
  return [...topics.values()]
    .filter((t) => t.correct < t.attempted)
    .sort((a, b) => a.correct / a.attempted - b.correct / b.attempted || b.attempted - a.attempted || a.id.localeCompare(b.id))
    .slice(0, 3);
}

export function attemptedAccuracy(questions: { answered: boolean; correct: boolean }[]): number {
  const attempted = questions.filter((q) => q.answered);
  if (!attempted.length) return 0;
  return Math.round(attempted.filter((q) => q.correct).length / attempted.length * 10_000) / 100;
}
