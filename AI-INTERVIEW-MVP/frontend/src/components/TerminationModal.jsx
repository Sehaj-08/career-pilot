import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldAlert,
  AlertOctagon,
  ArrowRight,
  User,
  Briefcase,
  FileText,
  Clock,
} from 'lucide-react';
import { STRIKE_CATEGORIES, CATEGORY_LABELS } from '../hooks/useStrikeManager';

export default function TerminationModal({
  candidateName = 'Candidate',
  candidateRole = 'Backend Developer',
  terminationReason = 'Exceeded two-strike violation limit.',
  strikes = {},
  onViewReport = null,
}) {
  const navigate = useNavigate();

  const handleNavigate = () => {
    if (onViewReport) onViewReport();
    navigate('/result');
  };

  const categories = [
    { key: STRIKE_CATEGORIES.TAB_SWITCH, label: CATEGORY_LABELS[STRIKE_CATEGORIES.TAB_SWITCH] },
    { key: STRIKE_CATEGORIES.FULLSCREEN_EXIT, label: CATEGORY_LABELS[STRIKE_CATEGORIES.FULLSCREEN_EXIT] },
    { key: STRIKE_CATEGORIES.MULTIPLE_FACES, label: CATEGORY_LABELS[STRIKE_CATEGORIES.MULTIPLE_FACES] },
    { key: STRIKE_CATEGORIES.FACE_ABSENT, label: CATEGORY_LABELS[STRIKE_CATEGORIES.FACE_ABSENT] },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-md flex items-center justify-center p-4 select-none">
      <div className="w-full max-w-xl bg-slate-900 border-2 border-rose-500/50 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 animate-scaleIn">
        
        {/* Header Banner */}
        <div className="flex items-center gap-4 border-b border-slate-800 pb-5">
          <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 flex-shrink-0 animate-pulse">
            <AlertOctagon className="w-8 h-8" />
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[11px] font-bold uppercase tracking-wider mb-1">
              Two-Strike Policy Violation
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Interview Terminated
            </h2>
          </div>
        </div>

        {/* Reason Box */}
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 space-y-2">
          <div className="text-xs font-semibold text-rose-300 uppercase tracking-wider">
            Termination Trigger
          </div>
          <p className="text-sm font-medium text-rose-100 leading-relaxed">
            {terminationReason}
          </p>
        </div>

        {/* Candidate Meta */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center gap-2.5">
            <User className="w-4 h-4 text-indigo-400 flex-shrink-0" />
            <div className="min-w-0">
              <span className="text-[10px] text-slate-500 block uppercase">Candidate</span>
              <span className="font-semibold text-slate-200 truncate block">{candidateName}</span>
            </div>
          </div>
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center gap-2.5">
            <Briefcase className="w-4 h-4 text-violet-400 flex-shrink-0" />
            <div className="min-w-0">
              <span className="text-[10px] text-slate-500 block uppercase">Role</span>
              <span className="font-semibold text-slate-200 truncate block">{candidateRole}</span>
            </div>
          </div>
        </div>

        {/* Category Strikes Breakdown */}
        <div className="space-y-2.5">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Category Strike Breakdown (Limit: 2 Strikes Each)
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {categories.map(({ key, label }) => {
              const count = strikes[key] || 0;
              const isTrigger = count >= 2;
              return (
                <div
                  key={key}
                  className={`p-3 rounded-xl border flex items-center justify-between ${
                    isTrigger
                      ? 'bg-rose-500/15 border-rose-500/40 text-rose-200'
                      : count === 1
                      ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                      : 'bg-slate-950/50 border-slate-800 text-slate-400'
                  }`}
                >
                  <span className="font-medium text-[11px] truncate">{label}</span>
                  <span
                    className={`text-xs font-bold px-2 py-0.5 rounded ${
                      isTrigger
                        ? 'bg-rose-500 text-white'
                        : count === 1
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {count} / 2
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 text-[11px] text-slate-400 leading-relaxed">
          <strong>Session Audit Notice:</strong> All responses submitted prior to termination, along with timestamps and proctoring audit events, have been preserved in the database.
        </div>

        {/* Action Button */}
        <div className="pt-2">
          <button
            type="button"
            onClick={handleNavigate}
            className="w-full py-4 px-6 bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white font-bold rounded-2xl text-sm shadow-xl shadow-rose-600/25 transition-all flex items-center justify-center gap-2 active:scale-[0.99]"
          >
            <span>View Performance & Incident Report</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

      </div>
    </div>
  );
}
