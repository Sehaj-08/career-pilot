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
  TrendingUp
} from 'lucide-react';
import {
  fetchQuestionsByRole,
  submitAnswerForEvaluation,
  getInterviewSessionKey,
  readInterviewAnswers,
  saveInterviewAnswer
} from '../services/api';

const TOTAL_DURATION_SECONDS = 30 * 60; // 30 minutes

export default function Interview() {
  const navigate = useNavigate();

  // Retrieve candidate context from localStorage
  const candidateName = localStorage.getItem('candidate_name') || 'Candidate';
  const candidateRole = localStorage.getItem('candidate_role') || 'Backend Developer';

  // Questions and navigation state
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answer, setAnswer] = useState('');
  const [evaluation, setEvaluation] = useState(null);
  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(TOTAL_DURATION_SECONDS);

  const answerRef = useRef('');
  const questionsRef = useRef([]);
  const currentIndexRef = useRef(0);
  const evaluationRef = useRef(null);
  const submissionInProgressRef = useRef(false);
  const sessionKeyRef = useRef(getInterviewSessionKey());
  const mountedRef = useRef(true);
  answerRef.current = answer;
  questionsRef.current = questions;
  currentIndexRef.current = currentIndex;
  evaluationRef.current = evaluation;

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // 1. Load questions (from localStorage or fetch as fallback)
  useEffect(() => {
    async function loadQuestions() {
      const cached = localStorage.getItem('interview_questions');
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setQuestions(parsed);
            return;
          }
        } catch (e) {
          console.warn('Error parsing cached questions:', e);
        }
      }

      // If not cached, fetch from backend for the selected role
      const fetched = await fetchQuestionsByRole(candidateRole);
      setQuestions(fetched);
      localStorage.setItem('interview_questions', JSON.stringify(fetched));
    }

    loadQuestions();

    // Restore index if candidate refreshed mid-interview
    const savedIndex = parseInt(localStorage.getItem('current_question_index') || '0', 10);
    if (!isNaN(savedIndex) && savedIndex >= 0) {
      setCurrentIndex(savedIndex);
    }
  }, [candidateRole]);

  // 2. Persistent Wall-Clock 30-Minute Timer
  useEffect(() => {
    let startTime = parseInt(localStorage.getItem('interview_start_time') || '0', 10);
    if (!startTime) {
      startTime = Date.now();
      localStorage.setItem('interview_start_time', startTime.toString());
    }

    const calculateRemaining = () => {
      const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
      return Math.max(0, TOTAL_DURATION_SECONDS - elapsedSeconds);
    };

    setSecondsRemaining(calculateRemaining());

    const timerInterval = setInterval(() => {
      const remaining = calculateRemaining();
      setSecondsRemaining(remaining);

      // Automatic timeout handling when 30 minutes expire
      if (remaining <= 0) {
        clearInterval(timerInterval);
        handleTimeExpired();
      }
    }, 1000);

    return () => clearInterval(timerInterval);
  }, []);

  const handleTimeExpired = () => {
    // Preserve the current response even if time expires before AI evaluation completes.
    const currentTyped = answerRef.current.trim();
    const activeQuestions = questionsRef.current;
    const activeIndex = currentIndexRef.current;
    const activeQuestion = activeQuestions[activeIndex];

    if (currentTyped && activeQuestion) {
      const timedEntry = {
        question_id: activeQuestion.id,
        question_number: activeIndex + 1,
        question_title: activeQuestion.title,
        answer: currentTyped,
        submitted_at: new Date().toISOString(),
        evaluation: evaluationRef.current,
        evaluation_status: evaluationRef.current ? 'complete' : 'draft'
      };
      saveInterviewAnswer(timedEntry, sessionKeyRef.current);
    }

    navigate('/result');
  };

  const formatTime = (totalSeconds) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const currentQuestion = questions[currentIndex] || {
    id: `q_${currentIndex + 1}`,
    title: 'Loading question...',
    role: candidateRole
  };

  const isLastQuestion = currentIndex >= (questions.length - 1) && questions.length > 0;

  // Restore answer/evaluation or draft when the page is refreshed mid-question.
  useEffect(() => {
    if (!questions.length) return;
    const cached = readInterviewAnswers();
    const existing = cached.find((item) => item.question_id === currentQuestion.id);
    if (existing?.evaluation) {
      setAnswer(existing.answer || '');
      setEvaluation(existing.evaluation);
    } else if (existing?.evaluation_status === 'draft' && existing.answer) {
      // Restore a submitted draft whose evaluation failed before success
      setAnswer(existing.answer);
      setEvaluation(null);
    }
  }, [questions, currentIndex, currentQuestion.id]);

  // 3. Evaluate the current answer before allowing progression.
  const handleSubmit = async (e) => {
    e.preventDefault();
    const submittedAnswer = answer.trim();

    if (!submittedAnswer) {
      setSubmitError('Please enter an answer before requesting evaluation.');
      return;
    }
    if (submissionInProgressRef.current || isSubmitting || evaluation) return;

    submissionInProgressRef.current = true;
    setIsSubmitting(true);
    setSubmitError('');

    // Persist the draft immediately so a refresh or failure does not lose it.
    const draftEntry = {
      question_id: currentQuestion.id,
      question_number: currentIndex + 1,
      question_title: currentQuestion.title,
      answer: submittedAnswer,
      submitted_at: new Date().toISOString(),
      evaluation: null,
      evaluation_status: 'draft'
    };
    saveInterviewAnswer(draftEntry, sessionKeyRef.current);

    // Snapshot the session key so we can guard against late responses.
    const submissionSessionKey = sessionKeyRef.current;

    try {
      const result = await submitAnswerForEvaluation(
        candidateRole,
        currentQuestion.id,
        submittedAnswer
      );

      // If the component unmounted or a new interview session started, discard.
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

  const handleNextQuestion = () => {
    if (!evaluation) return;

    if (isLastQuestion) {
      navigate('/result');
      return;
    }

    const nextIndex = currentIndex + 1;
    setCurrentIndex(nextIndex);
    localStorage.setItem('current_question_index', nextIndex.toString());
    setAnswer('');
    setEvaluation(null);
    setSubmitError('');
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-950 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Top Header / Meta Bar */}
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

          {/* 30-Minute Persistent Timer Component */}
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

        {/* Progress Bar */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 shadow-md">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span>Progress: Question {currentIndex + 1} of {questions.length || 5}</span>
            <span className="font-medium text-indigo-400">{Math.round(((currentIndex) / (questions.length || 5)) * 100)}% Complete</span>
          </div>
          <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
            <div 
              className="bg-gradient-to-r from-indigo-500 to-violet-500 h-full transition-all duration-300"
              style={{ width: `${Math.max(10, ((currentIndex) / (questions.length || 5)) * 100)}%` }}
            ></div>
          </div>
        </div>

        {/* Main Content Layout: 2 Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Left Column: Question & Answer (2 cols) */}
          <div className="lg:col-span-2 space-y-6">

            {/* Current Question Section */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-7 shadow-xl">
              <div className="flex items-center justify-between gap-4 mb-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-xs font-semibold">
                  <HelpCircle className="w-3.5 h-3.5" />
                  <span>Question {currentIndex + 1} of {questions.length || 5}</span>
                </div>
                <span className="text-xs text-slate-400">{candidateRole} Track</span>
              </div>

              <h2 className="text-xl sm:text-2xl font-semibold text-white tracking-tight leading-snug">
                {currentQuestion.title}
              </h2>
              
              <p className="mt-3 text-sm text-slate-400">
                Provide a structured, comprehensive technical explanation. Highlight architectural considerations, trade-offs, and best practices.
              </p>
            </div>

            {/* Answer Input Section */}
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
                placeholder="Type your technical answer here. Address key concepts, mechanisms, and implementation details..."
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
                    ? 'Evaluation complete. Review it before continuing.'
                    : 'Your answer will remain available if AI evaluation fails.'}
                </p>

                {!evaluation && (
                  <button
                    type="submit"
                    disabled={isSubmitting || !answer.trim()}
                    className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl text-sm shadow-lg shadow-indigo-600/25 transition-all flex items-center gap-2 active:scale-[0.99]"
                  >
                    {isSubmitting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                    <span>{isSubmitting ? 'Evaluating Answer...' : 'Submit for Evaluation'}</span>
                  </button>
                )}
              </div>
            </form>

            {evaluation && (
              <section className="bg-slate-900 border border-indigo-500/30 rounded-2xl p-6 sm:p-7 shadow-xl space-y-5" aria-live="polite">
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
                    <ul className="space-y-2">
                      {evaluation.strengths.map((strength, index) => (
                        <li key={`${strength}-${index}`} className="flex items-start gap-2 text-xs text-slate-300">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 mt-0.5 flex-shrink-0" />
                          <span>{strength}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="rounded-xl bg-amber-500/5 border border-amber-500/20 p-4">
                    <div className="flex items-center gap-2 text-sm font-semibold text-amber-400 mb-3">
                      <AlertCircle className="w-4 h-4" /> Areas for Improvement
                    </div>
                    <ul className="space-y-2">
                      {evaluation.improvements.map((improvement, index) => (
                        <li key={`${improvement}-${index}`} className="flex items-start gap-2 text-xs text-slate-300">
                          <ArrowRight className="w-3.5 h-3.5 text-amber-400 mt-0.5 flex-shrink-0" />
                          <span>{improvement}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={handleNextQuestion}
                    className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold rounded-xl text-sm shadow-lg shadow-indigo-600/25 transition-all flex items-center gap-2 active:scale-[0.99]"
                  >
                    <span>{isLastQuestion ? 'View Results' : 'Next Question'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </section>
            )}

          </div>

          {/* Right Column: Webcam & Monitoring Placeholders (1 col) */}
          <div className="space-y-6">

            {/* Webcam Preview Placeholder */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-300">
                  <Video className="w-4 h-4 text-indigo-400" />
                  <span>Webcam Preview</span>
                </div>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                  Placeholder
                </span>
              </div>

              {/* Placeholder Video Container */}
              <div className="relative aspect-video rounded-xl bg-slate-950 border border-slate-800 flex flex-col items-center justify-center p-4 text-center overflow-hidden">
                <div className="w-12 h-12 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 mb-2">
                  <CameraOff className="w-6 h-6" />
                </div>
                <div className="text-xs font-medium text-slate-300">
                  Camera Feed Disabled
                </div>
                <div className="text-[11px] text-slate-500 mt-1 max-w-[200px]">
                  Webcam stream and MediaPipe proctoring will activate in Hour 4 & 5.
                </div>
              </div>
            </div>

            {/* Monitoring Status Placeholder */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-300">
                  <ShieldAlert className="w-4 h-4 text-emerald-400" />
                  <span>Monitoring Status</span>
                </div>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Placeholder
                </span>
              </div>

              {/* Status Indicators */}
              <div className="space-y-2.5 text-xs">
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950 border border-slate-800/80">
                  <span className="text-slate-400 flex items-center gap-2">
                    <Eye className="w-3.5 h-3.5 text-indigo-400" /> Face Tracking
                  </span>
                  <span className="text-slate-500 font-mono">Standby</span>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950 border border-slate-800/80">
                  <span className="text-slate-400 flex items-center gap-2">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> Tab Focus
                  </span>
                  <span className="text-emerald-400 font-semibold">Active</span>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950 border border-slate-800/80">
                  <span className="text-slate-400 flex items-center gap-2">
                    <ShieldAlert className="w-3.5 h-3.5 text-amber-400" /> Integrity Score
                  </span>
                  <span className="text-slate-200 font-bold font-mono">100%</span>
                </div>
              </div>

              <div className="text-[11px] text-slate-500 pt-2 border-t border-slate-800">
                Cheating and gaze detection scheduled for Hour 4 & 5.
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
