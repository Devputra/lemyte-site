/** Competition rank: ties share rank. Percentile is the share scoring at or below you. */
export function rankedStanding(total: number, higher: number) {
  if (!Number.isInteger(total) || !Number.isInteger(higher) || total < 1 || higher < 0 || higher >= total) return null;
  return { rank: higher + 1, total, percentile: Math.round(((total - higher) / total) * 10000) / 100 };
}
