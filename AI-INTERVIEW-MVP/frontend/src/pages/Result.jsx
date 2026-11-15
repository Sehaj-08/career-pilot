import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  User, 
  Briefcase, 
  CheckCircle2, 
  TrendingUp, 
  AlertCircle, 
  ArrowLeft,
  Calendar,
  Sparkles,
  FileText,
  ChevronDown,
  ChevronUp,
  Shield,
  ShieldAlert,
  Database,
  Award,
  RefreshCw,
  Loader2,
  Maximize2,
  Eye,
  Copy,
  ClipboardPaste,
  Scissors,
  MousePointer,
  UserX,
  Users,
  AlertOctagon,
} from 'lucide-react';
import { fetchInterviewResult, saveInterviewResult } from '../services/api';
import {
  calculateAverageScore,
  countStrongAnswers,
  countQuestionsAnswered,
  countMonitoringAlerts,
  extractStrengths,
  extractImprovements,
  generateOverallFeedback,
  buildInterviewReport,
} from '../utils/scoreCalculator';
import { getStoredEvents, computeIntegritySummary } from '../utils/eventLogger';

export default function Result() {
  const navigate = useNavigate();

  const [candidateName, setCandidateName] = useState('Candidate');
  const [candidateRole, setCandidateRole] = useState('Backend Developer');
  const [interviewId, setInterviewId] = useState('');
  const [submittedAnswers, setSubmittedAnswers] = useState([]);
  const [monitoringEvents, setMonitoringEvents] = useState([]);
  const [expandedIndex, setExpandedIndex] = useState(0);

  // Database synchronization state
  const [isDbSynced, setIsDbSynced] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState('');
  const [dbRecord, setDbRecord] = useState(null);

  useEffect(() => {
    const savedName = localStorage.getItem('candidate_name') || 'Candidate';
    const savedRole = localStorage.getItem('candidate_role') || 'Backend Developer';
    const savedId = localStorage.getItem('interview_session_id') || `sess_${Date.now()}`;

    setCandidateName(savedName);
    setCandidateRole(savedRole);
    setInterviewId(savedId);

    // Load local answers
    try {
      const rawAnswers = localStorage.getItem('interview_answers');
      if (rawAnswers) {
        const parsed = JSON.parse(rawAnswers);
        if (Array.isArray(parsed)) setSubmittedAnswers(parsed);
      }
    } catch (e) {
      console.warn('Error reading answers:', e);
    }

    // Load local monitoring events
    const localEvents = getStoredEvents(savedId);
    setMonitoringEvents(localEvents);

    // Attempt to fetch from SQLite backend
    loadFromDatabase(savedId, savedName, savedRole);
  }, []);

  const loadFromDatabase = async (id, name, role) => {
    if (!id) return;
    setIsSyncing(true);
    setSyncError('');

    try {
      const result = await fetchInterviewResult(id);
      if (result && result.status === 'success') {
        setDbRecord(result);
        setIsDbSynced(true);
        if (result.candidate) setCandidateName(result.candidate);
        if (result.role) setCandidateRole(result.role);
        if (Array.isArray(result.question_details) && result.question_details.length > 0) {
          // Rehydrate if local was empty
          setSubmittedAnswers((prev) => (prev.length > 0 ? prev : result.question_details));
        }
        if (Array.isArray(result.monitoring_events) && result.monitoring_events.length > 0) {
          setMonitoringEvents(result.monitoring_events);
        }
      }
    } catch (err) {
      console.info('SQLite fetch fallback: using local session memory');
      setIsDbSynced(localStorage.getItem('interview_saved_to_db') === 'true');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSyncToDatabase = async () => {
    setIsSyncing(true);
    setSyncError('');

    const report = buildInterviewReport(
      candidateName,
      candidateRole,
      interviewId,
      submittedAnswers,
      monitoringEvents
    );

    try {
      const res = await saveInterviewResult(report);
      if (res && res.status === 'success') {
        setIsDbSynced(true);
        localStorage.setItem('interview_saved_to_db', 'true');
        localStorage.removeItem('interview_report_pending');
      }
    } catch (err) {
      setSyncError('Could not sync to SQLite. Backend may be offline. Report is safe in browser.');
    } finally {
      setIsSyncing(false);
    }
  };

  // Metrics calculation
  const totalQuestions = 5;
  const questionsCount = countQuestionsAnswered(submittedAnswers);
  const averageScore = calculateAverageScore(submittedAnswers);
  const strongAnswersCount = countStrongAnswers(submittedAnswers);
  const monitoringAlertsCount = countMonitoringAlerts(monitoringEvents);

  const combinedStrengths = extractStrengths(submittedAnswers);
  const combinedImprovements = extractImprovements(submittedAnswers);
  const overallFeedback = dbRecord?.feedback || generateOverallFeedback(
    averageScore,
    strongAnswersCount,
    questionsCount,
    monitoringAlertsCount
  );

  const integritySummary = computeIntegritySummary(interviewId);
  const integrityScore = integritySummary.integrityScore ?? 100;

  const isTerminatedSession = dbRecord?.status === 'terminated' || localStorage.getItem('interview_status') === 'terminated';
  const terminationReasonText = dbRecord?.termination_reason || localStorage.getItem('interview_termination_reason') || '';
  const strikesDetail = dbRecord?.strikes_detail || (() => {
    try {
      const raw = localStorage.getItem('interview_strikes');
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  })();

  // Icon selector for monitoring events
  const getEventIcon = (type) => {
    switch (type) {
      case 'fullscreen_exit':
      case 'fullscreen_enter':
        return <Maximize2 className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />;
      case 'tab_switch':
      case 'window_blur':
        return <Eye className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />;
      case 'copy_attempt':
        return <Copy className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />;
      case 'paste_attempt':
        return <ClipboardPaste className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />;
      case 'cut_attempt':
        return <Scissors className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />;
      case 'right_click_attempt':
        return <MousePointer className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />;
      case 'face_absent':
        return <UserX className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />;
      case 'multiple_faces':
        return <Users className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />;
      default:
        return <AlertCircle className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />;
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-950 p-4 sm:p-6 lg:p-8 flex justify-center items-center">
      <div className="w-full max-w-5xl space-y-6">

        {/* ── Top Header Card ── */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 transform translate-x-8 -translate-y-8 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative z-10">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-3">
                {isTerminatedSession ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/15 text-rose-300 border border-rose-500/30 text-xs font-semibold">
                    <AlertOctagon className="w-3.5 h-3.5 text-rose-400" />
                    <span>Terminated Early (Two-Strike Policy)</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Interview Assessment Completed</span>
                  </span>
                )}

                {isDbSynced ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 text-xs font-semibold">
                    <Database className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Saved in SQLite</span>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={handleSyncToDatabase}
                    disabled={isSyncing}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-semibold transition-colors"
                  >
                    {isSyncing ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <RefreshCw className="w-3.5 h-3.5" />
                    )}
                    <span>Sync to SQLite</span>
                  </button>
                )}
              </div>

              <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                Interview Performance Report
              </h1>
              <p className="text-sm text-slate-400 mt-1">
                Final technical assessment and proctoring evaluation for {candidateRole}.
              </p>
            </div>

            <button
              onClick={() => navigate('/dashboard')}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700/80 text-slate-200 text-sm font-semibold border border-slate-700/70 transition-colors self-start sm:self-center active:scale-[0.98]"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Dashboard</span>
            </button>
          </div>

          {isTerminatedSession && (
            <div className="mt-5 p-4 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-200 text-xs sm:text-sm space-y-1">
              <div className="font-bold flex items-center gap-2 text-rose-300">
                <AlertOctagon className="w-4 h-4 text-rose-400" />
                <span>Academic Integrity Termination:</span>
              </div>
              <p className="text-slate-200">
                {terminationReasonText || 'The interview was terminated because the candidate exceeded the 2-strike violation limit.'}
              </p>
              <p className="text-[11px] text-slate-400 pt-0.5">
                * Note: All scores, feedback, and performance metrics below represent a partial evaluation of answers submitted prior to termination.
              </p>
            </div>
          )}

          {syncError && (
            <div className="mt-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300">
              {syncError}
            </div>
          )}

          {/* Candidate Meta Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-800/80">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                <User className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">Candidate</div>
                <div className="text-sm font-medium text-slate-200">{candidateName}</div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-violet-600/10 border border-violet-500/20 flex items-center justify-center text-violet-400">
                <Briefcase className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">Role Track</div>
                <div className="text-sm font-medium text-slate-200">{candidateRole}</div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-600/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <Database className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">Session ID</div>
                <div className="text-xs font-mono text-slate-300 truncate max-w-[120px]">{interviewId}</div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-600/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                <Calendar className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">Duration</div>
                <div className="text-sm font-medium text-slate-200">30m Fixed</div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Performance Metrics (4-Card Grid) ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

          {/* 1. Average AI Score */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Average AI Score
                </span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  {questionsCount} Evaluated
                </span>
              </div>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-3xl sm:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-violet-400">
                  {averageScore.toFixed(1)}
                </span>
                <span className="text-sm text-slate-500 font-medium">/ 10</span>
              </div>
            </div>
            <div className="text-[11px] text-slate-500 mt-4 pt-2 border-t border-slate-800 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-indigo-400" />
              <span>Correctness & depth</span>
            </div>
          </div>

          {/* 2. Questions Answered */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Questions Answered
                </span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Progress
                </span>
              </div>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-3xl sm:text-4xl font-extrabold text-white">
                  {questionsCount}
                </span>
                <span className="text-sm text-slate-500 font-medium">/ {totalQuestions}</span>
              </div>
            </div>
            <div className="text-[11px] text-slate-500 mt-4 pt-2 border-t border-slate-800 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              <span>{Math.round((questionsCount / totalQuestions) * 100)}% Completed</span>
            </div>
          </div>

          {/* 3. Strong Answers (Score >= 7) */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Strong Answers
                </span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-violet-500/10 text-violet-400 border border-violet-500/20">
                  &ge; 7 / 10
                </span>
              </div>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-3xl sm:text-4xl font-extrabold text-violet-300">
                  {strongAnswersCount}
                </span>
                <span className="text-sm text-slate-500 font-medium">of {questionsCount}</span>
              </div>
            </div>
            <div className="text-[11px] text-slate-500 mt-4 pt-2 border-t border-slate-800 flex items-center gap-1">
              <Award className="w-3 h-3 text-violet-400" />
              <span>High technical proficiency</span>
            </div>
          </div>

          {/* 4. Monitoring Alerts */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Monitoring Alerts
                </span>
                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${
                    monitoringAlertsCount === 0
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                  }`}
                >
                  {monitoringAlertsCount === 0 ? 'Verified' : `${monitoringAlertsCount} Flagged`}
                </span>
              </div>
              <div className="flex items-baseline gap-2 mt-1">
                <span
                  className={`text-3xl sm:text-4xl font-extrabold ${
                    monitoringAlertsCount === 0 ? 'text-emerald-400' : 'text-amber-400'
                  }`}
                >
                  {monitoringAlertsCount}
                </span>
                <span className="text-sm text-slate-500 font-medium">Alerts</span>
              </div>
            </div>
            <div className="text-[11px] text-slate-500 mt-4 pt-2 border-t border-slate-800 flex items-center gap-1">
              <Shield className="w-3 h-3 text-slate-400" />
              <span>Integrity: {integrityScore}%</span>
            </div>
          </div>

        </div>

        {/* ── Overall Assessment Summary Feedback ── */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2 text-indigo-400 font-semibold text-sm">
              <Sparkles className="w-4 h-4" />
              <span>Overall Evaluation Summary</span>
            </div>
            <span className="text-xs text-slate-500">Aggregated from technical reviews</span>
          </div>

          <p className="text-sm text-slate-200 leading-relaxed bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80">
            {overallFeedback}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            {/* Strengths */}
            <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-emerald-400">
                <TrendingUp className="w-4 h-4" />
                <span>Demonstrated Strengths</span>
              </div>
              {combinedStrengths.length > 0 ? (
                <ul className="space-y-1.5 text-xs text-slate-300">
                  {combinedStrengths.map((str, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 mt-0.5 flex-shrink-0" />
                      <span>{str}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-slate-500">No specific strengths recorded.</p>
              )}
            </div>

            {/* Areas for Improvement */}
            <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20 space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-amber-400">
                <AlertCircle className="w-4 h-4" />
                <span>Areas for Improvement</span>
              </div>
              {combinedImprovements.length > 0 ? (
                <ul className="space-y-1.5 text-xs text-slate-300">
                  {combinedImprovements.map((imp, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-400 mt-0.5 flex-shrink-0" />
                      <span>{imp}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-slate-500">No major gaps identified.</p>
              )}
            </div>
          </div>
        </div>

        {/* ── Individual Question Breakdown (Accordion) ── */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2 text-indigo-400 font-semibold text-sm">
              <FileText className="w-4 h-4" />
              <span>Individual Question Results ({submittedAnswers.length})</span>
            </div>
            <span className="text-xs text-slate-500">Predefined & adaptive responses</span>
          </div>

          {submittedAnswers.length === 0 ? (
            <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 text-xs text-slate-400 text-center">
              No answers recorded for this interview session.
            </div>
          ) : (
            <div className="space-y-3">
              {submittedAnswers.map((item, index) => {
                const isExpanded = expandedIndex === index;
                const score = item.evaluation?.score ?? item.score;
                const feedbackText = item.evaluation?.feedback || item.feedback;
                const qStrengths = item.evaluation?.strengths || item.strengths || [];
                const qImprovements = item.evaluation?.improvements || item.improvements || [];

                return (
                  <div 
                    key={item.question_id || index}
                    className="rounded-2xl bg-slate-950/80 border border-slate-800/80 overflow-hidden"
                  >
                    <button
                      onClick={() => setExpandedIndex(isExpanded ? -1 : index)}
                      className="w-full p-4 sm:p-5 flex items-center justify-between text-left hover:bg-slate-900/50 transition-colors"
                    >
                      <div className="flex items-center gap-3 pr-4 min-w-0">
                        <span className="w-7 h-7 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-bold flex items-center justify-center flex-shrink-0">
                          {index + 1}
                        </span>
                        <div className="min-w-0">
                          <span className="text-sm font-medium text-slate-200 line-clamp-1 block">
                            {item.question_title}
                          </span>
                          {item.difficulty && (
                            <span className="text-[10px] text-slate-500 font-semibold uppercase">
                              Difficulty: {item.difficulty}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3 flex-shrink-0">
                        {score !== null && score !== undefined ? (
                          <span className="text-sm font-bold text-indigo-300 px-2.5 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
                            {score} / 10
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold uppercase text-amber-400">
                            Draft
                          </span>
                        )}
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-slate-400" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-slate-400" />
                        )}
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="px-5 pb-5 pt-3 border-t border-slate-900 space-y-4">
                        <div>
                          <div className="text-xs text-slate-400 font-medium mb-1.5">Candidate Response:</div>
                          <p className="text-xs text-slate-200 leading-relaxed bg-slate-900/70 p-3.5 rounded-xl border border-slate-800 whitespace-pre-wrap">
                            {item.answer || '(No answer text recorded)'}
                          </p>
                        </div>

                        {feedbackText ? (
                          <div className="space-y-3">
                            <div>
                              <div className="text-xs text-slate-400 font-medium mb-1">AI Evaluation Feedback:</div>
                              <p className="text-xs text-slate-300 leading-relaxed bg-slate-900/40 p-3 rounded-lg border border-slate-800/80">
                                {feedbackText}
                              </p>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {qStrengths.length > 0 && (
                                <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20 text-xs">
                                  <div className="font-semibold text-emerald-400 mb-1">Strengths</div>
                                  <ul className="list-disc list-inside space-y-0.5 text-slate-300">
                                    {qStrengths.map((s, i) => (
                                      <li key={i}>{s}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}

                              {qImprovements.length > 0 && (
                                <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/20 text-xs">
                                  <div className="font-semibold text-amber-400 mb-1">Improvement Areas</div>
                                  <ul className="list-disc list-inside space-y-0.5 text-slate-300">
                                    {qImprovements.map((imp, i) => (
                                      <li key={i}>{imp}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300">
                            This response was preserved without AI evaluation (e.g. time expired or submitted as draft).
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Proctoring & Security Audit Report ── */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2 text-indigo-400 font-semibold text-sm">
              <ShieldAlert className="w-4 h-4" />
              <span>Proctoring & Security Audit Report</span>
            </div>
            <span className="text-xs text-slate-500">
              Integrity Score: <strong className="text-slate-300">{integrityScore}%</strong>
            </span>
          </div>

          {/* Two-Strike Policy Status */}
          <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              <span>Category Violation Strikes (2-Strike Policy)</span>
              <span className="text-[10px] text-slate-500">Threshold: 2 Strikes = Auto-Termination</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 flex justify-between items-center">
                <span className="text-slate-400 text-[11px]">Tab Switches:</span>
                <span className={`font-bold ${(strikesDetail.tab_switch || 0) >= 2 ? 'text-rose-400' : (strikesDetail.tab_switch || 0) === 1 ? 'text-amber-400' : 'text-emerald-400'}`}>
                  {strikesDetail.tab_switch || 0} / 2
                </span>
              </div>
              <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 flex justify-between items-center">
                <span className="text-slate-400 text-[11px]">Fullscreen Exits:</span>
                <span className={`font-bold ${(strikesDetail.fullscreen_exit || 0) >= 2 ? 'text-rose-400' : (strikesDetail.fullscreen_exit || 0) === 1 ? 'text-amber-400' : 'text-emerald-400'}`}>
                  {strikesDetail.fullscreen_exit || 0} / 2
                </span>
              </div>
              <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 flex justify-between items-center">
                <span className="text-slate-400 text-[11px]">Multiple Faces:</span>
                <span className={`font-bold ${(strikesDetail.multiple_faces || 0) >= 2 ? 'text-rose-400' : (strikesDetail.multiple_faces || 0) === 1 ? 'text-amber-400' : 'text-emerald-400'}`}>
                  {strikesDetail.multiple_faces || 0} / 2
                </span>
              </div>
              <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 flex justify-between items-center">
                <span className="text-slate-400 text-[11px]">No Face:</span>
                <span className={`font-bold ${(strikesDetail.face_absent || 0) >= 2 ? 'text-rose-400' : (strikesDetail.face_absent || 0) === 1 ? 'text-amber-400' : 'text-emerald-400'}`}>
                  {strikesDetail.face_absent || 0} / 2
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
              <span className="text-slate-400 text-[11px] block">Tab Switches</span>
              <span className="text-sm font-bold text-white mt-0.5 block">
                {integritySummary.countsByType['tab_switch'] || 0}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
              <span className="text-slate-400 text-[11px] block">Fullscreen Exits</span>
              <span className="text-sm font-bold text-white mt-0.5 block">
                {integritySummary.countsByType['fullscreen_exit'] || 0}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
              <span className="text-slate-400 text-[11px] block">Clipboard Pastes</span>
              <span className="text-sm font-bold text-white mt-0.5 block">
                {integritySummary.countsByType['paste_attempt'] || 0}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
              <span className="text-slate-400 text-[11px] block">Face Absence / Multiple</span>
              <span className="text-sm font-bold text-white mt-0.5 block">
                {(integritySummary.countsByType['face_absent'] || 0) + (integritySummary.countsByType['multiple_faces'] || 0)}
              </span>
            </div>
          </div>

          <div className="space-y-2 pt-2">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Security Event Timeline ({monitoringEvents.length})
            </div>

            <div className="max-h-48 overflow-y-auto space-y-2 pr-1 scrollbar-thin scrollbar-thumb-slate-800">
              {monitoringEvents.length === 0 ? (
                <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800/60 text-xs text-slate-500 text-center">
                  Zero security infractions logged. The candidate completed the interview with full compliance.
                </div>
              ) : (
                monitoringEvents.map((evt, i) => (
                  <div
                    key={evt.id || i}
                    className={`p-2.5 rounded-xl text-xs border flex items-start gap-2.5 ${
                      evt.isSuspicious
                        ? 'bg-rose-500/5 border-rose-500/20 text-slate-300'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400'
                    }`}
                  >
                    <div className="mt-0.5">{getEventIcon(evt.type)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-slate-200">{evt.message}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        {new Date(evt.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </div>
                    </div>
                    {evt.isSuspicious && (
                      <span className="text-[10px] px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 font-semibold border border-rose-500/30">
                        -{evt.penalty || 5}%
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
