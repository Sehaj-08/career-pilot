import React, { useState, useEffect } from 'react';
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
  CameraOff
} from 'lucide-react';

export default function Interview() {
  const navigate = useNavigate();

  // Retrieve candidate context from localStorage
  const candidateName = localStorage.getItem('candidate_name') || 'Candidate';
  const candidateRole = localStorage.getItem('candidate_role') || 'Software Engineer';

  // State
  const [answer, setAnswer] = useState(localStorage.getItem('candidate_answer') || '');
  const [secondsRemaining, setSecondsRemaining] = useState(30 * 60); // 30 minutes in seconds
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Static Question for Hour 1 MVP
  const sampleQuestion = {
    number: 1,
    total: 1,
    title: 'What is your understanding of the role you have applied for?'
  };

  // 30-minute Timer countdown
  useEffect(() => {
    const timerInterval = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timerInterval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timerInterval);
  }, []);

  const formatTime = (totalSeconds) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    // Persist answer in localStorage for demo-state persistence
    localStorage.setItem('candidate_answer', answer);
    localStorage.setItem('questions_answered', '1');
    
    // Smooth transition to Result screen
    setTimeout(() => {
      setIsSubmitting(false);
      navigate('/result');
    }, 300);
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

          {/* 30-Minute Timer Component */}
          <div className="flex items-center gap-2.5 bg-slate-950 px-4 py-2 rounded-xl border border-slate-800 shadow-inner">
            <Clock className={`w-4 h-4 ${secondsRemaining < 300 ? 'text-rose-400 animate-pulse' : 'text-indigo-400'}`} />
            <div className="text-xs text-slate-400 font-medium">Time Remaining:</div>
            <div className={`text-base font-bold font-mono ${secondsRemaining < 300 ? 'text-rose-400' : 'text-indigo-300'}`}>
              {formatTime(secondsRemaining)}
            </div>
            <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
              30m Max
            </span>
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
                  <span>Question {sampleQuestion.number} of {sampleQuestion.total}</span>
                </div>
                <span className="text-xs text-slate-400">Sample Technical Question</span>
              </div>

              <h2 className="text-xl sm:text-2xl font-semibold text-white tracking-tight leading-snug">
                {sampleQuestion.title}
              </h2>
              
              <p className="mt-3 text-sm text-slate-400">
                Please articulate your responsibilities, technical expectations, and how your skill set aligns with the {candidateRole} position.
              </p>
            </div>

            {/* Answer Input Section */}
            <form onSubmit={handleSubmit} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-7 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <label htmlFor="interviewAnswer" className="text-sm font-semibold text-slate-200">
                  Your Answer
                </label>
                <span className="text-xs text-slate-400">
                  {answer.trim() ? `${answer.trim().split(/\s+/).length} words` : '0 words'}
                </span>
              </div>

              <textarea
                id="interviewAnswer"
                rows={8}
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="Type your structured answer here. Elaborate on your background, technical depth, and approaches..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 resize-y leading-relaxed"
                required
              />

              <div className="flex items-center justify-between pt-2">
                <p className="text-xs text-slate-500">
                  Submit whenever ready. In Hour 3, your response will be evaluated by the AI Engine.
                </p>

                <button
                  type="submit"
                  disabled={isSubmitting || !answer.trim()}
                  className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl text-sm shadow-lg shadow-indigo-600/25 transition-all flex items-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  <span>{isSubmitting ? 'Submitting...' : 'Submit Answer'}</span>
                </button>
              </div>
            </form>

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
              <div className="relative aspect-video rounded-xl bg-slate-950 border border-slate-800 flex flex-col items-center justify-center p-4 text-center overflow-hidden group">
                <div className="w-12 h-12 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 mb-2">
                  <CameraOff className="w-6 h-6" />
                </div>
                <div className="text-xs font-medium text-slate-300">
                  Camera Feed Disabled
                </div>
                <div className="text-[11px] text-slate-500 mt-1 max-w-[200px]">
                  Webcam stream and MediaPipe face mesh will activate in later MVP hours.
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
                Proctoring and gaze tracking integration scheduled for Hour 4 & 5.
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
