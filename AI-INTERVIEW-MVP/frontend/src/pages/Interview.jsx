import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Clock, 
  Video, 
  Send, 
  User, 
  Briefcase, 
  HelpCircle,
  CameraOff
} from 'lucide-react';
import { fetchQuestionsByRole } from '../services/api';
import { useMonitoring } from '../hooks/useMonitoring';
import MonitoringPanel from '../components/MonitoringPanel';

const TOTAL_DURATION_SECONDS = 30 * 60; // 30 minutes

export default function Interview() {
  const navigate = useNavigate();

  // Retrieve candidate context from localStorage
  const candidateName = localStorage.getItem('candidate_name') || 'Candidate';
  const candidateRole = localStorage.getItem('candidate_role') || 'Backend Developer';

  // Security and activity monitoring hook
  const monitoring = useMonitoring();

  // Questions and navigation state
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answer, setAnswer] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(TOTAL_DURATION_SECONDS);

  const answerRef = useRef('');
  answerRef.current = answer;

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
    // If the candidate had typed anything in the current answer, record it
    const currentTyped = answerRef.current.trim();
    const cachedAnswers = JSON.parse(localStorage.getItem('interview_answers') || '[]');
    
    if (currentTyped && questions[currentIndex]) {
      cachedAnswers.push({
        question_id: questions[currentIndex].id,
        question_number: currentIndex + 1,
        question_title: questions[currentIndex].title,
        answer: currentTyped,
        submitted_at: new Date().toISOString()
      });
      localStorage.setItem('interview_answers', JSON.stringify(cachedAnswers));
    }
    
    localStorage.setItem('questions_answered', cachedAnswers.length.toString());
    localStorage.setItem('interview_monitoring_summary', JSON.stringify(monitoring.summary));
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

  // 3. Handle Submit Answer and progression
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!answer.trim() || isSubmitting) return;

    setIsSubmitting(true);

    // Retrieve existing answers array
    const cachedAnswers = JSON.parse(localStorage.getItem('interview_answers') || '[]');

    // Append current response
    const newEntry = {
      question_id: currentQuestion.id,
      question_number: currentIndex + 1,
      question_title: currentQuestion.title,
      answer: answer.trim(),
      submitted_at: new Date().toISOString()
    };

    const updatedAnswers = [...cachedAnswers, newEntry];
    localStorage.setItem('interview_answers', JSON.stringify(updatedAnswers));
    localStorage.setItem('questions_answered', updatedAnswers.length.toString());

    // Check if more questions remain
    if (currentIndex + 1 < questions.length) {
      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);
      localStorage.setItem('current_question_index', nextIndex.toString());
      setAnswer('');
      setIsSubmitting(false);
    } else {
      // Completed all 5 questions -> persist monitoring summary and navigate to Result
      localStorage.setItem('interview_monitoring_summary', JSON.stringify(monitoring.summary));
      setTimeout(() => {
        setIsSubmitting(false);
        navigate('/result');
      }, 350);
    }
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
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="Type your technical answer here. Address key concepts, mechanisms, and implementation details..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 resize-y leading-relaxed"
                required
              />

              <div className="flex items-center justify-between pt-2">
                <p className="text-xs text-slate-500">
                  {isLastQuestion ? 'Final question. Submitting will complete the assessment.' : 'Answers are saved sequentially.'}
                </p>

                <button
                  type="submit"
                  disabled={isSubmitting || !answer.trim()}
                  className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl text-sm shadow-lg shadow-indigo-600/25 transition-all flex items-center gap-2 active:scale-[0.99]"
                >
                  <Send className="w-4 h-4" />
                  <span>
                    {isSubmitting 
                      ? 'Saving...' 
                      : isLastQuestion 
                        ? 'Submit & Complete Interview' 
                        : 'Submit & Next Question'}
                  </span>
                </button>
              </div>
            </form>

          </div>

          {/* Right Column: Webcam Preview & Functional Monitoring Panel (1 col) */}
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

            {/* Functional Hour 6 Security & Monitoring Panel */}
            <MonitoringPanel monitoring={monitoring} />

          </div>

        </div>

      </div>
    </div>
  );
}
