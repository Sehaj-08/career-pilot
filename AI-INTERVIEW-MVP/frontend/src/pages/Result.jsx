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
  ChevronUp
} from 'lucide-react';

export default function Result() {
  const navigate = useNavigate();

  const [candidateName, setCandidateName] = useState('Candidate');
  const [candidateRole, setCandidateRole] = useState('Backend Developer');
  const [submittedAnswers, setSubmittedAnswers] = useState([]);
  const [expandedIndex, setExpandedIndex] = useState(0);

  function loadAnswers() {
    try {
      const rawAnswers = localStorage.getItem('interview_answers');
      if (rawAnswers) {
        const parsed = JSON.parse(rawAnswers);
        if (Array.isArray(parsed)) {
          setSubmittedAnswers(parsed);
        }
      }
    } catch (e) {
      console.warn('Error reading answers:', e);
    }
  }

  useEffect(() => {
    const savedName = localStorage.getItem('candidate_name');
    const savedRole = localStorage.getItem('candidate_role');
    if (savedName) setCandidateName(savedName);
    if (savedRole) setCandidateRole(savedRole);
    loadAnswers();

    // Re-read storage if Interview writes a late evaluation after navigation.
    window.addEventListener('interview-answers-updated', loadAnswers);
    window.addEventListener('storage', loadAnswers);
    return () => {
      window.removeEventListener('interview-answers-updated', loadAnswers);
      window.removeEventListener('storage', loadAnswers);
    };
  }, []);

  const totalQuestions = 5;
  const questionsCount = submittedAnswers.length;
  const evaluatedAnswers = submittedAnswers.filter(
    (item) => item.evaluation && Number.isFinite(Number(item.evaluation.score))
  );
  const averageScore = evaluatedAnswers.length
    ? evaluatedAnswers.reduce((sum, item) => sum + Number(item.evaluation.score), 0) / evaluatedAnswers.length
    : null;
  const combinedStrengths = [...new Set(
    evaluatedAnswers.flatMap((item) => item.evaluation.strengths || [])
  )];
  const combinedImprovements = [...new Set(
    evaluatedAnswers.flatMap((item) => item.evaluation.improvements || [])
  )];

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
                <span>Interview Session Completed</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                Evaluation Summary
              </h1>
              <p className="text-sm text-slate-400 mt-1">
                AI evaluation summary for your {candidateRole} technical assessment.
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

        {/* Score & Questions Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">

          {/* Average AI Score */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Average AI Score
                </span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  {evaluatedAnswers.length} Evaluated
                </span>
              </div>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-violet-400">
                  {averageScore === null ? '--' : averageScore.toFixed(1)}
                </span>
                <span className="text-lg text-slate-500 font-medium">/ 10</span>
              </div>
              <div className={`text-xs mt-2 flex items-center gap-1.5 font-medium ${averageScore === null ? 'text-amber-400' : 'text-indigo-300'}`}>
                <Sparkles className="w-3.5 h-3.5" />
                <span>{averageScore === null ? 'No successfully evaluated answers' : 'Calculated from individual AI evaluation scores'}</span>
              </div>
            </div>
            <div className="text-xs text-slate-500 mt-6 pt-3 border-t border-slate-800">
              Evaluation dimensions: technical correctness, relevance, and completeness
            </div>
          </div>

          {/* Questions Answered */}
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
                  {questionsCount}
                </span>
                <span className="text-lg text-slate-500 font-medium">/ {totalQuestions} Questions</span>
              </div>
              <div className="text-xs text-emerald-400 mt-2 flex items-center gap-1.5 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{evaluatedAnswers.length} of {questionsCount} preserved responses evaluated</span>
              </div>
            </div>
            <div className="text-xs text-slate-500 mt-6 pt-3 border-t border-slate-800">
              Technical track: {candidateRole} (Hour 2)
            </div>
          </div>

        </div>

        {/* Submitted Answers Review Section */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-indigo-400 font-semibold text-sm">
              <FileText className="w-4 h-4" />
              <span>Submitted Responses Review ({submittedAnswers.length})</span>
            </div>
            <span className="text-xs text-slate-400">Preserved in session memory</span>
          </div>

          {submittedAnswers.length === 0 ? (
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-400 text-center">
              No answers recorded yet. Complete an interview to view submitted responses.
            </div>
          ) : (
            <div className="space-y-3">
              {submittedAnswers.map((item, index) => {
                const isExpanded = expandedIndex === index;
                return (
                  <div 
                    key={item.question_id || index}
                    className="rounded-xl bg-slate-950/80 border border-slate-800/80 overflow-hidden"
                  >
                    <button
                      onClick={() => setExpandedIndex(isExpanded ? -1 : index)}
                      className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-900/50 transition-colors"
                    >
                      <div className="flex items-center gap-3 pr-4 min-w-0">
                        <span className="w-6 h-6 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold flex items-center justify-center flex-shrink-0">
                          {index + 1}
                        </span>
                        <span className="text-sm font-medium text-slate-200 line-clamp-1">
                          {item.question_title}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        {item.evaluation ? (
                          <span className="text-sm font-bold text-indigo-300">{item.evaluation.score}/10</span>
                        ) : (
                          <span className="text-[10px] font-semibold uppercase text-amber-400">Not evaluated</span>
                        )}
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-slate-400" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-slate-400" />
                        )}
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="px-4 pb-4 pt-3 border-t border-slate-900 space-y-4">
                        <div>
                          <div className="text-xs text-slate-500 font-medium mb-2">Candidate Answer:</div>
                          <p className="text-xs text-slate-300 leading-relaxed bg-slate-900/60 p-3 rounded-lg border border-slate-800 whitespace-pre-wrap">
                            {item.answer}
                          </p>
                        </div>

                        {item.evaluation ? (
                          <div className="space-y-3">
                            <div>
                              <div className="text-xs text-slate-500 font-medium mb-1">AI Feedback:</div>
                              <p className="text-xs text-slate-300 leading-relaxed">{item.evaluation.feedback}</p>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
                                <div className="text-xs font-semibold text-emerald-400 mb-2">Strengths</div>
                                <ul className="space-y-1 text-xs text-slate-300 list-disc list-inside">
                                  {(item.evaluation.strengths || []).map((strength, strengthIndex) => (
                                    <li key={`${strength}-${strengthIndex}`}>{strength}</li>
                                  ))}
                                </ul>
                              </div>
                              <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
                                <div className="text-xs font-semibold text-amber-400 mb-2">Improvements</div>
                                <ul className="space-y-1 text-xs text-slate-300 list-disc list-inside">
                                  {(item.evaluation.improvements || []).map((improvement, improvementIndex) => (
                                    <li key={`${improvement}-${improvementIndex}`}>{improvement}</li>
                                  ))}
                                </ul>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300">
                            This response was preserved without an AI score, for example because time expired or evaluation failed.
                          </div>
                        )}

                        <div className="text-[10px] text-slate-500 text-right">
                          Submitted at: {new Date(item.submitted_at).toLocaleTimeString()}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Strengths and Areas for Improvement Sections */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Strengths Section */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm">
              <TrendingUp className="w-4 h-4" />
              <span>Observed Strengths</span>
            </div>
            {combinedStrengths.length ? (
              <ul className="space-y-3 text-xs text-slate-300">
                {combinedStrengths.map((strength, index) => (
                  <li key={`${strength}-${index}`} className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                    <span>{strength}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs text-slate-400">
                No AI-evaluated strengths are available.
              </p>
            )}
          </div>

          {/* Areas for Improvement Section */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-2 text-amber-400 font-semibold text-sm">
              <AlertCircle className="w-4 h-4" />
              <span>Areas for Improvement</span>
            </div>
            {combinedImprovements.length ? (
              <ul className="space-y-3 text-xs text-slate-300">
                {combinedImprovements.map((improvement, index) => (
                  <li key={`${improvement}-${index}`} className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
                    <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                    <span>{improvement}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs text-slate-400">
                No AI-evaluated improvement areas are available.
              </p>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}
