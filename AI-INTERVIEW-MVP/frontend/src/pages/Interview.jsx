import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Clock,
  Video,
  ShieldAlert,
  Send,
  CheckCircle,
  User,
  Briefcase,
  HelpCircle,
  Eye,
  CameraOff,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Loader2,
  TrendingUp,
  Zap,
  Maximize2,
  Shield,
  AlertTriangle,
  X,
  Lock,
} from 'lucide-react';
import {
  fetchQuestionsByRole,
  submitAnswerForEvaluation,
  requestNextQuestion,
  getInterviewSessionKey,
  readInterviewAnswers,
  saveInterviewAnswer,
  saveInterviewResult,
} from '../services/api';
import { useWebcam } from '../hooks/useWebcam';
import { useMonitoring } from '../hooks/useMonitoring';
import { getStoredEvents } from '../utils/eventLogger';
import { buildInterviewReport } from '../utils/scoreCalculator';
import WebcamMonitor from '../components/WebcamMonitor';
import MonitoringPanel from '../components/MonitoringPanel';

const TOTAL_DURATION_SECONDS = 30 * 60;
const TOTAL_QUESTIONS = 5;

const DIFFICULTY_STYLES = {
  Easy:   { bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', text: 'text-emerald-400' },
  Medium: { bg: 'bg-amber-500/10',   border: 'border-amber-500/20',   text: 'text-amber-400'   },
  Hard:   { bg: 'bg-rose-500/10',    border: 'border-rose-500/20',    text: 'text-rose-400'    },
};

export default function Interview() {
  const navigate = useNavigate();

  const candidateName = localStorage.getItem('candidate_name') || 'Candidate';
  const candidateRole = localStorage.getItem('candidate_role') || 'Backend Developer';
  const interviewId    = localStorage.getItem('interview_session_id') || `sess_${Date.now()}`;

  // Current question shown to the candidate (public shape: { id, title, difficulty? })
  const [currentQuestion, setCurrentQuestion]   = useState(null);
  const [currentIndex, setCurrentIndex]         = useState(0);
  const [answer, setAnswer]                     = useState('');
  const [evaluation, setEvaluation]             = useState(null);
  const [submitError, setSubmitError]           = useState('');
  const [nextQError, setNextQError]             = useState('');
  const [isSubmitting, setIsSubmitting]         = useState(false);
  const [isGenerating, setIsGenerating]         = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(TOTAL_DURATION_SECONDS);

  // Hour 6: Fullscreen gating state
  const [hasStarted, setHasStarted] = useState(() => {
    const savedIndex = parseInt(localStorage.getItem('current_question_index') || '0', 10);
    const answers = readInterviewAnswers();
    const alreadyStarted = localStorage.getItem('interview_monitoring_started') === 'true';
    return alreadyStarted || savedIndex > 0 || answers.length > 0;
  });

  const { videoRef, isCameraActive, error, faceCount } = useWebcam();
  const {
    isMonitoring,
    isFullscreen,
    warning,
    metrics,
    events,
    startMonitoring,
    stopMonitoring,
    requestFullscreen,
    exitFullscreen,
    clearWarning,
    updateFaceMetrics,
    handleCopy,
    handlePaste,
    handleCut,
    handleContextMenu,
  } = useMonitoring();

  // Sync webcam face metrics with monitoring hook
  useEffect(() => {
    updateFaceMetrics(faceCount);
  }, [faceCount, updateFaceMetrics]);

  // If already started (e.g. page refresh), ensure monitoring is started
  useEffect(() => {
    if (hasStarted && !isMonitoring) {
      startMonitoring();
    }
  }, [hasStarted, isMonitoring, startMonitoring]);

  const answerRef              = useRef('');
  const currentIndexRef        = useRef(0);
  const currentQuestionRef     = useRef(null);
  const evaluationRef          = useRef(null);
  const submissionInProgressRef = useRef(false);
  const sessionKeyRef          = useRef(getInterviewSessionKey());
  const mountedRef             = useRef(true);
  const isCompletingRef        = useRef(false);

  answerRef.current          = answer;
  currentIndexRef.current    = currentIndex;
  currentQuestionRef.current = currentQuestion;
  evaluationRef.current      = evaluation;

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // ── 1. Load first predefined question ────────────────────────────────────
  useEffect(() => {
    async function loadFirstQuestion() {
      // Restore a resumed session
      const savedIndex = parseInt(localStorage.getItem('current_question_index') || '0', 10);

      if (savedIndex > 0) {
        // Resume: restore persisted question text from interview_answers
        const cached = readInterviewAnswers();
        const lastEntry = cached[savedIndex - 1];
        if (lastEntry) {
          setCurrentQuestion({ id: lastEntry.question_id, title: lastEntry.question_title, difficulty: lastEntry.difficulty });
          setCurrentIndex(savedIndex - 1);
          if (lastEntry.evaluation) {
            setAnswer(lastEntry.answer || '');
            setEvaluation(lastEntry.evaluation);
          } else if (lastEntry.evaluation_status === 'draft') {
            setAnswer(lastEntry.answer || '');
          }
          return;
        }
      }

      // Fresh session: fetch predefined question 1
      try {
        const cached = localStorage.getItem('interview_questions');
        let questions = [];
        if (cached) {
          questions = JSON.parse(cached);
        }
        if (!Array.isArray(questions) || questions.length === 0) {
          questions = await fetchQuestionsByRole(candidateRole);
          localStorage.setItem('interview_questions', JSON.stringify(questions));
        }
        if (questions.length > 0) {
          setCurrentQuestion({ ...questions[0], difficulty: 'Medium' });
          setCurrentIndex(0);
          localStorage.setItem('current_question_index', '0');
        }
      } catch (e) {
        console.warn('Failed to load first question:', e);
      }
    }

    loadFirstQuestion();
  }, [candidateRole]);

  // ── 2. Persistent 30-minute wall-clock timer ─────────────────────────────
  useEffect(() => {
    let startTime = parseInt(localStorage.getItem('interview_start_time') || '0', 10);
    if (!startTime) {
      startTime = Date.now();
      localStorage.setItem('interview_start_time', startTime.toString());
    }

    const calculateRemaining = () => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      return Math.max(0, TOTAL_DURATION_SECONDS - elapsed);
    };

    setSecondsRemaining(calculateRemaining());

    const timerInterval = setInterval(() => {
      const remaining = calculateRemaining();
      setSecondsRemaining(remaining);
      if (remaining <= 0) {
        clearInterval(timerInterval);
        handleTimeExpired();
      }
    }, 1000);

    return () => clearInterval(timerInterval);
  }, []);

  const finishAndPersistInterview = async (extraDraft = null) => {
    if (isCompletingRef.current) return;
    isCompletingRef.current = true;
    stopMonitoring();
    await exitFullscreen();

    if (extraDraft) {
      saveInterviewAnswer(extraDraft, sessionKeyRef.current);
    }

    const answers = readInterviewAnswers();
    const storedEvents = getStoredEvents(interviewId);
    const reportPayload = buildInterviewReport(
      candidateName,
      candidateRole,
      interviewId,
      answers,
      storedEvents
    );

    try {
      await saveInterviewResult(reportPayload);
      localStorage.setItem('interview_saved_to_db', 'true');
    } catch (err) {
      console.warn('Backend SQLite save failed; preserved report locally:', err);
      localStorage.setItem('interview_saved_to_db', 'false');
      localStorage.setItem('interview_report_pending', JSON.stringify(reportPayload));
    }

    navigate('/result');
  };

  const handleTimeExpired = async () => {
    const typedAnswer  = answerRef.current.trim();
    const activeQ      = currentQuestionRef.current;
    const activeIndex  = currentIndexRef.current;

    let finalDraft = null;
    if (typedAnswer && activeQ) {
      finalDraft = {
        question_id:    activeQ.id,
        question_number: activeIndex + 1,
        question_title: activeQ.title,
        difficulty:     activeQ.difficulty || 'Medium',
        answer:         typedAnswer,
        submitted_at:   new Date().toISOString(),
        evaluation:     evaluationRef.current,
        evaluation_status: evaluationRef.current ? 'complete' : 'draft',
      };
    }
    await finishAndPersistInterview(finalDraft);
  };

  const formatTime = (totalSeconds) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const isLastQuestion = currentIndex >= TOTAL_QUESTIONS - 1;

  // ── 3. Start Fullscreen Gated Session ─────────────────────────────────────
  const handleStartFullscreen = async () => {
    await requestFullscreen();
    startMonitoring();
    localStorage.setItem('interview_monitoring_started', 'true');
    setHasStarted(true);
  };

  // ── 4. Submit answer → evaluate ───────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    const submittedAnswer = answer.trim();

    if (!submittedAnswer) {
      setSubmitError('Please enter an answer before requesting evaluation.');
      return;
    }
    if (submissionInProgressRef.current || isSubmitting || evaluation) return;
    if (!currentQuestion) return;

    submissionInProgressRef.current = true;
    setIsSubmitting(true);
    setSubmitError('');

    // Persist draft immediately so a refresh never loses the answer.
    const draftEntry = {
      question_id:    currentQuestion.id,
      question_number: currentIndex + 1,
      question_title: currentQuestion.title,
      difficulty:     currentQuestion.difficulty || 'Medium',
      answer:         submittedAnswer,
      submitted_at:   new Date().toISOString(),
      evaluation:     null,
      evaluation_status: 'draft',
    };
    saveInterviewAnswer(draftEntry, sessionKeyRef.current);

    const submissionSessionKey = sessionKeyRef.current;

    try {
      const result = await submitAnswerForEvaluation(
        candidateRole,
        currentQuestion.id,
        submittedAnswer,
      );

      if (!mountedRef.current || submissionSessionKey !== getInterviewSessionKey()) return;

      const completedEntry = { ...draftEntry, evaluation: result, evaluation_status: 'complete' };
      saveInterviewAnswer(completedEntry, submissionSessionKey);

      if (mountedRef.current) {
        setAnswer(submittedAnswer);
        setEvaluation(result);
      }
    } catch (error) {
      if (mountedRef.current) {
        setSubmitError(error.message || 'Unable to evaluate your answer. Please retry.');
      }
    } finally {
      submissionInProgressRef.current = false;
      if (mountedRef.current) setIsSubmitting(false);
    }
  };

  // ── 5. Request next adaptive question ─────────────────────────────────────
  const handleNextQuestion = async () => {
    if (!evaluation) return;

    if (isLastQuestion) {
      await finishAndPersistInterview();
      return;
    }

    setIsGenerating(true);
    setNextQError('');

    try {
      const nextQ = await requestNextQuestion(
        candidateRole,
        currentQuestion.title,
        answer,
        evaluation.score,
        currentIndex + 1,
        interviewId,
      );

      if (!mountedRef.current) return;

      const nextIndex = currentIndex + 1;
      const nextQuestion = {
        id:         nextQ.question_id,
        title:      nextQ.question,
        difficulty: nextQ.difficulty,
      };

      setCurrentQuestion(nextQuestion);
      setCurrentIndex(nextIndex);
      setAnswer('');
      setEvaluation(null);
      setNextQError('');
      localStorage.setItem('current_question_index', nextIndex.toString());
    } catch (error) {
      if (mountedRef.current) {
        setNextQError(
          error.message ||
          'Could not generate the next question. Your answer is saved — please retry.',
        );
      }
    } finally {
      if (mountedRef.current) setIsGenerating(false);
    }
  };

  // ── 6. Restore a draft / evaluated state on page refresh ─────────────────
  useEffect(() => {
    if (!currentQuestion) return;
    const cached   = readInterviewAnswers();
    const existing = cached.find((item) => item.question_id === currentQuestion.id);
    if (existing?.evaluation) {
      setAnswer(existing.answer || '');
      setEvaluation(existing.evaluation);
    } else if (existing?.evaluation_status === 'draft' && existing.answer) {
      setAnswer(existing.answer);
      setEvaluation(null);
    }
  }, [currentQuestion?.id]);

  if (!currentQuestion) {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-slate-950 flex items-center justify-center">
        <div className="flex items-center gap-3 text-slate-400">
          <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
          <span className="text-sm">Loading question…</span>
        </div>
      </div>
    );
  }

  // ── Pre-Interview Fullscreen Gate Modal ────────────────────────────────────
  if (!hasStarted) {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-slate-950 flex items-center justify-center p-4">
        <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 flex-shrink-0">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                Security & Proctoring Verification
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                Technical Assessment – {candidateRole}
              </p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800/80 space-y-3 text-xs sm:text-sm text-slate-300">
            <div className="font-semibold text-slate-200 flex items-center gap-2">
              <Lock className="w-4 h-4 text-indigo-400" />
              <span>Assessment Protocol & Rules:</span>
            </div>
            <ul className="space-y-2 text-slate-400">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <span><strong className="text-slate-200">Fullscreen Required:</strong> The interview runs exclusively in fullscreen mode to ensure fairness.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <span><strong className="text-slate-200">Restricted Clipboard:</strong> Copying, cutting, and pasting are disabled inside the interface.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <span><strong className="text-slate-200">Tab & Focus Monitoring:</strong> Switching tabs or windows will be logged as suspicious activity.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <span><strong className="text-slate-200">Webcam Proctoring:</strong> Face presence tracking will be active throughout your 30-minute session.</span>
              </li>
            </ul>
          </div>

          <div className="pt-2">
            <button
              type="button"
              onClick={handleStartFullscreen}
              className="w-full py-4 px-6 bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold rounded-2xl text-base shadow-xl shadow-indigo-600/25 transition-all flex items-center justify-center gap-3 active:scale-[0.99]"
            >
              <Maximize2 className="w-5 h-5" />
              <span>Start Fullscreen Interview</span>
            </button>
            <p className="text-[11px] text-slate-500 text-center mt-3">
              Clicking will request fullscreen mode and immediately initiate proctoring.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const diffStyle = DIFFICULTY_STYLES[currentQuestion.difficulty] || DIFFICULTY_STYLES.Medium;

  return (
    <div
      onCopy={handleCopy}
      onPaste={handlePaste}
      onCut={handleCut}
      onContextMenu={handleContextMenu}
      className="min-h-[calc(100vh-4rem)] bg-slate-950 p-4 sm:p-6 lg:p-8 select-text"
    >
      <div className="max-w-7xl mx-auto space-y-6">

        {/* ── Top Warning Banner (Hour 6) ── */}
        {warning && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex items-center justify-between gap-4 shadow-lg animate-fadeIn">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0" />
              <div className="text-sm font-medium text-amber-200">
                {warning}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {!isFullscreen && (
                <button
                  type="button"
                  onClick={requestFullscreen}
                  className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-colors flex items-center gap-1.5"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span>Re-enter Fullscreen</span>
                </button>
              )}
              <button
                type="button"
                onClick={clearWarning}
                className="p-1 rounded-lg text-amber-300 hover:bg-amber-500/20 transition-colors"
                title="Dismiss warning"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ── Header bar ── */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4 shadow-xl">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-slate-300">
              <User className="w-4 h-4 text-indigo-400" />
              <span className="font-semibold text-white">{candidateName}</span>
            </div>
            <span className="text-slate-700">|</span>
            <div className="flex items-center gap-2 text-sm text-slate-300">
              <Briefcase className="w-4 h-4 text-violet-400" />
              <span className="text-slate-300">{candidateRole}</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 bg-slate-950 px-4 py-2 rounded-xl border border-slate-800 shadow-inner">
            <Clock className={`w-4 h-4 ${secondsRemaining < 300 ? 'text-rose-400 animate-pulse' : 'text-indigo-400'}`} />
            <div className="text-xs text-slate-400 font-medium">Time Remaining:</div>
            <div className={`text-base font-bold font-mono ${secondsRemaining < 300 ? 'text-rose-400' : 'text-indigo-300'}`}>
              {formatTime(secondsRemaining)}
            </div>
            <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
              30m Fixed
            </span>
          </div>
        </div>

        {/* ── Progress bar ── */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 shadow-md">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span>Progress: Question {currentIndex + 1} of {TOTAL_QUESTIONS}</span>
            <span className="font-medium text-indigo-400">
              {Math.round((currentIndex / TOTAL_QUESTIONS) * 100)}% Complete
            </span>
          </div>
          <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
            <div
              className="bg-gradient-to-r from-indigo-500 to-violet-500 h-full transition-all duration-300"
              style={{ width: `${Math.max(10, (currentIndex / TOTAL_QUESTIONS) * 100)}%` }}
            />
          </div>
        </div>

        {/* ── Main content grid ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ── Left: Question + Answer form ── */}
          <div className="lg:col-span-2 space-y-6">

            {/* Question card */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-7 shadow-xl">
              <div className="flex items-center justify-between gap-4 mb-4">
                <div className="flex items-center gap-2">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-xs font-semibold">
                    <HelpCircle className="w-3.5 h-3.5" />
                    <span>Question {currentIndex + 1} of {TOTAL_QUESTIONS}</span>
                  </div>
                  {currentQuestion.difficulty && (
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border ${diffStyle.bg} ${diffStyle.border} ${diffStyle.text}`}>
                      <Zap className="w-3 h-3" />
                      {currentQuestion.difficulty}
                    </span>
                  )}
                </div>
                <span className="text-xs text-slate-400">{candidateRole} Track</span>
              </div>

              <h2 className="text-xl sm:text-2xl font-semibold text-white tracking-tight leading-snug">
                {currentQuestion.title}
              </h2>

              <p className="mt-3 text-sm text-slate-400">
                {currentIndex === 0
                  ? 'Provide a structured technical explanation. Highlight architecture, trade-offs, and best practices.'
                  : 'Follow up on the previous topic. Demonstrate depth and practical understanding.'}
              </p>
            </div>

            {/* Answer form (Controlled Textarea - Protected from Copy/Paste/Cut) */}
            <form onSubmit={handleSubmit} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-7 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <label htmlFor="interviewAnswer" className="text-sm font-semibold text-slate-200">
                  Your Response
                </label>
                <span className="text-xs text-slate-400">
                  {answer.trim() ? `${answer.trim().split(/\s+/).length} words` : '0 words'}
                </span>
              </div>

              <textarea
                id="interviewAnswer"
                rows={9}
                value={answer}
                onChange={(e) => {
                  setAnswer(e.target.value);
                  if (submitError) setSubmitError('');
                }}
                disabled={isSubmitting || Boolean(evaluation)}
                placeholder="Type your technical answer directly here. Address key concepts, mechanisms, and implementation details (Pasting is blocked)…"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 resize-y leading-relaxed disabled:opacity-75 disabled:cursor-not-allowed"
                required
              />

              {submitError && (
                <div className="flex items-start gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-sm text-rose-300">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{submitError} Your answer has not been cleared.</span>
                </div>
              )}

              <div className="flex items-center justify-between gap-4 pt-2">
                <p className="text-xs text-slate-500">
                  {evaluation
                    ? 'Evaluation complete. Review it then continue.'
                    : 'Your answer is saved immediately — a retry will not lose it.'}
                </p>

                {!evaluation && (
                  <button
                    type="submit"
                    disabled={isSubmitting || !answer.trim()}
                    className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl text-sm shadow-lg shadow-indigo-600/25 transition-all flex items-center gap-2 active:scale-[0.99]"
                  >
                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    <span>{isSubmitting ? 'Evaluating Answer…' : 'Submit for Evaluation'}</span>
                  </button>
                )}
              </div>
            </form>

            {/* ── Evaluation card ── */}
            {evaluation && (
              <section
                className="bg-slate-900 border border-indigo-500/30 rounded-2xl p-6 sm:p-7 shadow-xl space-y-5"
                aria-live="polite"
              >
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wider text-indigo-400 mb-1">
                      Interview Evaluation
                    </div>
                    <h3 className="text-xl font-bold text-white">AI Answer Review</h3>
                  </div>
                  <div className="flex items-baseline gap-1 px-4 py-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
                    <span className="text-3xl font-extrabold text-indigo-300">{evaluation.score}</span>
                    <span className="text-sm font-semibold text-slate-400">/10</span>
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Feedback</h4>
                  <p className="text-sm text-slate-200 leading-relaxed">{evaluation.feedback}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="rounded-xl bg-emerald-500/5 border border-emerald-500/20 p-4">
                    <div className="flex items-center gap-2 text-sm font-semibold text-emerald-400 mb-3">
                      <TrendingUp className="w-4 h-4" /> Strengths
                    </div>
                    {evaluation.strengths.length > 0 ? (
                      <ul className="space-y-2">
                        {evaluation.strengths.map((s, i) => (
                          <li key={i} className="flex items-start gap-2 text-xs text-slate-300">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 mt-0.5 flex-shrink-0" />
                            <span>{s}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs text-slate-400">No specific technical strengths identified.</p>
                    )}
                  </div>

                  <div className="rounded-xl bg-amber-500/5 border border-amber-500/20 p-4">
                    <div className="flex items-center gap-2 text-sm font-semibold text-amber-400 mb-3">
                      <AlertCircle className="w-4 h-4" /> Areas for Improvement
                    </div>
                    {evaluation.improvements.length > 0 ? (
                      <ul className="space-y-2">
                        {evaluation.improvements.map((imp, i) => (
                          <li key={i} className="flex items-start gap-2 text-xs text-slate-300">
                            <ArrowRight className="w-3.5 h-3.5 text-amber-400 mt-0.5 flex-shrink-0" />
                            <span>{imp}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs text-slate-400">No significant gaps identified.</p>
                    )}
                  </div>
                </div>

                {!isLastQuestion && (
                  <div className="pt-1 text-xs text-indigo-300/70 flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5" />
                    <span>
                      {evaluation.score < 5
                        ? 'Next question will be easier to consolidate the fundamentals.'
                        : evaluation.score <= 7
                          ? 'Next question will be at a similar difficulty.'
                          : 'Great answer! Next question will be harder.'}
                    </span>
                  </div>
                )}

                {nextQError && (
                  <div className="flex items-start gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-sm text-rose-300">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>{nextQError}</span>
                  </div>
                )}

                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={handleNextQuestion}
                    disabled={isGenerating}
                    className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl text-sm shadow-lg shadow-indigo-600/25 transition-all flex items-center gap-2 active:scale-[0.99]"
                  >
                    {isGenerating ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /><span>Generating Question…</span></>
                    ) : (
                      <><span>{isLastQuestion ? 'View Results' : 'Next Question'}</span><ArrowRight className="w-4 h-4" /></>
                    )}
                  </button>
                </div>
              </section>
            )}
          </div>

          {/* ── Right: Webcam + Monitoring Panels ── */}
          <div className="space-y-6">

            <WebcamMonitor
              videoRef={videoRef}
              isCameraActive={isCameraActive}
              error={error}
              faceCount={faceCount}
            />

            <MonitoringPanel
              metrics={metrics}
              events={events}
              warning={warning}
              isFullscreen={isFullscreen}
              onRequestFullscreen={requestFullscreen}
              isMonitoring={isMonitoring}
            />

          </div>
        </div>
      </div>
    </div>
  );
}
