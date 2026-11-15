/**
 * Score Calculator & Report Generator for AI Interview MVP (Hour 7)
 *
 * Implements performance metrics, aggregation, and payload generation
 * based on actual AI evaluation responses and proctoring event logs.
 */

import { computeIntegritySummary } from './eventLogger.js';

/**
 * Calculate the average score from evaluated question answers.
 * Formula: Sum of evaluated scores / Number of evaluated questions.
 * Does not divide by 5 when fewer questions were answered.
 */
export function calculateAverageScore(answers = []) {
  if (!Array.isArray(answers) || answers.length === 0) return 0;

  const evaluated = answers.filter(
    (item) => item?.evaluation && Number.isFinite(Number(item.evaluation.score))
  );

  if (evaluated.length === 0) return 0;

  const totalScore = evaluated.reduce(
    (sum, item) => sum + Number(item.evaluation.score),
    0
  );

  return Math.round((totalScore / evaluated.length) * 10) / 10;
}

/**
 * Count the number of strong answers (score >= 7 out of 10).
 */
export function countStrongAnswers(answers = []) {
  if (!Array.isArray(answers)) return 0;

  return answers.filter(
    (item) =>
      item?.evaluation &&
      Number.isFinite(Number(item.evaluation.score)) &&
      Number(item.evaluation.score) >= 7
  ).length;
}

/**
 * Count the number of successfully evaluated questions.
 */
export function countQuestionsAnswered(answers = []) {
  if (!Array.isArray(answers)) return 0;

  return answers.filter(
    (item) =>
      item?.evaluation &&
      Number.isFinite(Number(item.evaluation.score))
  ).length;
}

/**
 * Count unique suspicious monitoring alerts.
 */
export function countMonitoringAlerts(events = []) {
  if (!Array.isArray(events)) return 0;

  const suspicious = events.filter((e) => e && e.isSuspicious);
  const seenIds = new Set();
  let count = 0;

  for (const evt of suspicious) {
    const key = evt.id || `${evt.type}_${evt.timestamp}`;
    if (!seenIds.has(key)) {
      seenIds.add(key);
      count++;
    }
  }

  return count;
}

/**
 * Extract combined distinct strengths from all question evaluations.
 */
export function extractStrengths(answers = []) {
  if (!Array.isArray(answers)) return [];
  const list = answers
    .filter((item) => item?.evaluation?.strengths)
    .flatMap((item) => item.evaluation.strengths);
  return [...new Set(list)];
}

/**
 * Extract combined distinct areas for improvement from all question evaluations.
 */
export function extractImprovements(answers = []) {
  if (!Array.isArray(answers)) return [];
  const list = answers
    .filter((item) => item?.evaluation?.improvements)
    .flatMap((item) => item.evaluation.improvements);
  return [...new Set(list)];
}

/**
 * Generate an overall synthesized summary based on actual evaluation scores.
 */
export function generateOverallFeedback(averageScore, strongCount, totalAnswered, warningsCount) {
  if (totalAnswered === 0) {
    return 'Assessment incomplete. No questions were submitted for evaluation.';
  }

  let performanceNote = '';
  if (averageScore >= 8.5) {
    performanceNote = 'Exceptional technical depth and clear architectural reasoning across all topics.';
  } else if (averageScore >= 7.0) {
    performanceNote = 'Strong technical understanding with solid fundamentals and well-structured answers.';
  } else if (averageScore >= 5.0) {
    performanceNote = 'Satisfactory foundational knowledge, though some practical implementation details and edge cases were missed.';
  } else {
    performanceNote = 'Basic understanding shown, but significant gaps remain in core technical mechanisms and best practices.';
  }

  let proctoringNote = '';
  if (warningsCount === 0) {
    proctoringNote = ' Perfect session integrity maintained with zero security flags.';
  } else if (warningsCount <= 2) {
    proctoringNote = ` Note: ${warningsCount} minor monitoring alert(s) recorded during the session.`;
  } else {
    proctoringNote = ` Notice: ${warningsCount} suspicious activity alerts logged during assessment.`;
  }

  return `${performanceNote}${proctoringNote}`;
}

/**
 * Construct the complete interview report payload for SQLite persistence.
 */
export function buildInterviewReport(candidateName, candidateRole, interviewId, answers = [], events = []) {
  const avgScore = calculateAverageScore(answers);
  const totalAnswered = countQuestionsAnswered(answers);
  const strongCount = countStrongAnswers(answers);
  const warnings = countMonitoringAlerts(events);
  const feedback = generateOverallFeedback(avgScore, strongCount, totalAnswered, warnings);

  // Clean question details to store
  const questionDetails = (answers || []).map((item, idx) => ({
    question_number: item.question_number || idx + 1,
    question_id: item.question_id || `q_${idx + 1}`,
    question_title: item.question_title || 'Technical Question',
    difficulty: item.difficulty || 'Medium',
    answer: item.answer || '',
    score: item.evaluation?.score ?? null,
    feedback: item.evaluation?.feedback || '',
    strengths: item.evaluation?.strengths || [],
    improvements: item.evaluation?.improvements || [],
    submitted_at: item.submitted_at || new Date().toISOString(),
  }));

  return {
    interview_id: interviewId || `sess_${Date.now()}`,
    candidate: candidateName || 'Candidate',
    role: candidateRole || 'Backend Developer',
    score: avgScore,
    total_questions: totalAnswered,
    strong_answers: strongCount,
    warnings,
    feedback,
    question_details: questionDetails,
    monitoring_events: events || [],
    completed_at: new Date().toISOString(),
  };
}
