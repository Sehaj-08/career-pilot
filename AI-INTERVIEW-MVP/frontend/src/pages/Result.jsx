import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Award, 
  User, 
  Briefcase, 
  CheckCircle2, 
  TrendingUp, 
  AlertCircle, 
  ArrowLeft,
  Calendar,
  Sparkles
} from 'lucide-react';

export default function Result() {
  const navigate = useNavigate();

  const [candidateName, setCandidateName] = useState('Candidate');
  const [candidateRole, setCandidateRole] = useState('Software Engineer');
  const [questionsAnswered, setQuestionsAnswered] = useState(1);

  useEffect(() => {
    const savedName = localStorage.getItem('candidate_name');
    const savedRole = localStorage.getItem('candidate_role');
    const savedAnswered = localStorage.getItem('questions_answered');

    if (savedName) setCandidateName(savedName);
    if (savedRole) setCandidateRole(savedRole);
    if (savedAnswered) setQuestionsAnswered(parseInt(savedAnswered, 10));
  }, []);

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-950 p-4 sm:p-6 lg:p-8 flex justify-center items-center">
      <div className="w-full max-w-4xl space-y-6">

        {/* Top Header Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 transform translate-x-8 -translate-y-8 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative z-10">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold mb-3">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Interview Session Complete</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                Evaluation Summary
              </h1>
              <p className="text-sm text-slate-400 mt-1">
                Overview of submitted responses and placeholder evaluation metrics for Hour 1.
              </p>
            </div>

            <button
              onClick={() => navigate('/dashboard')}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700/80 text-slate-200 text-sm font-semibold border border-slate-700/70 transition-colors self-start sm:self-center"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Dashboard</span>
            </button>
          </div>

          {/* Candidate Meta Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mt-6 pt-6 border-t border-slate-800/80">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                <User className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">Candidate</div>
                <div className="text-sm font-medium text-slate-200">{candidateName}</div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-violet-600/10 border border-violet-500/20 flex items-center justify-center text-violet-400">
                <Briefcase className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">Role Applied</div>
                <div className="text-sm font-medium text-slate-200">{candidateRole}</div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-amber-600/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                <Calendar className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">Duration</div>
                <div className="text-sm font-medium text-slate-200">30 Minutes</div>
              </div>
            </div>
          </div>
        </div>

        {/* Score & Questions Summary Placeholders */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">

          {/* Total Score Placeholder */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Total Score Placeholder
                </span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  Hour 3 Feature
                </span>
              </div>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-violet-400">
                  --
                </span>
                <span className="text-lg text-slate-500 font-medium">/ 100</span>
              </div>
              <div className="text-xs text-amber-400 mt-2 flex items-center gap-1.5 font-medium">
                <Sparkles className="w-3.5 h-3.5" />
                <span>AI scoring engine will compute scores in Hour 3</span>
              </div>
            </div>
            <div className="text-xs text-slate-500 mt-6 pt-3 border-t border-slate-800">
              Evaluation metrics: Technical Depth, Relevance, Clarity
            </div>
          </div>

          {/* Questions Answered Placeholder */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Questions Answered
                </span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Completed
                </span>
              </div>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-4xl font-extrabold text-white">
                  {questionsAnswered}
                </span>
                <span className="text-lg text-slate-500 font-medium">/ 1 Question</span>
              </div>
              <div className="text-xs text-emerald-400 mt-2 flex items-center gap-1.5 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Sample static response submitted successfully</span>
              </div>
            </div>
            <div className="text-xs text-slate-500 mt-6 pt-3 border-t border-slate-800">
              Multi-question bank will unlock in Hour 2
            </div>
          </div>

        </div>

        {/* Strengths and Areas for Improvement Sections */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Strengths Section */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm">
              <TrendingUp className="w-4 h-4" />
              <span>Observed Strengths (Placeholder)</span>
            </div>
            <ul className="space-y-3 text-xs text-slate-300">
              <li className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <span>Demonstrated clear understanding of core {candidateRole} responsibilities.</span>
              </li>
              <li className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <span>Structured articulation of technical experience and prior projects.</span>
              </li>
              <li className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <span>High candidate focus maintained throughout the allocated interview window.</span>
              </li>
            </ul>
          </div>

          {/* Areas for Improvement Section */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-2 text-amber-400 font-semibold text-sm">
              <AlertCircle className="w-4 h-4" />
              <span>Areas for Improvement (Placeholder)</span>
            </div>
            <ul className="space-y-3 text-xs text-slate-300">
              <li className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
                <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                <span>Incorporate specific metric-driven outcomes and production system benchmarks.</span>
              </li>
              <li className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
                <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                <span>Provide deeper trade-off analysis between tooling options for {candidateRole}.</span>
              </li>
              <li className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
                <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                <span>Elaborate further on incident response and edge-case handling scenarios.</span>
              </li>
            </ul>
          </div>

        </div>

      </div>
    </div>
  );
}
