export function calculateFinalScore(technicalScores = [], proctoringMetrics = {}) {
  const avgTech = technicalScores.length
    ? technicalScores.reduce((acc, score) => acc + score, 0) / technicalScores.length
    : 80;

  const penalty = (proctoringMetrics.tabSwitches || 0) * 5 + (proctoringMetrics.multipleFaces ? 15 : 0);
  const integrityScore = Math.max(0, 100 - penalty);
  const overallScore = Math.round(avgTech * 0.7 + integrityScore * 0.3);

  return {
    technicalScore: Math.round(avgTech),
    integrityScore,
    overallScore
  };
}
