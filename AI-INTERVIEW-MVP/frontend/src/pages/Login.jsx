import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bot, ArrowRight, User, AlertCircle, ShieldCheck } from 'lucide-react';

export default function Login() {
  const [candidateName, setCandidateName] = useState(
    localStorage.getItem('candidate_name') || ''
  );
  const [errorMessage, setErrorMessage] = useState('');
  const navigate = useNavigate();

  const handleContinue = (e) => {
    e.preventDefault();
    const trimmed = candidateName.trim();

    if (!trimmed) {
      setErrorMessage('Please enter your full name before continuing.');
      return;
    }

    setErrorMessage('');
    localStorage.setItem('candidate_name', trimmed);
    navigate('/dashboard');
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-8 shadow-2xl shadow-indigo-950/20 backdrop-blur-xl">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 mb-4 shadow-inner">
              <Bot className="w-8 h-8 text-indigo-400" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white mb-2">
              AI Interview
            </h1>
            <p className="text-sm text-slate-400">
              Welcome to the automated technical evaluation platform. Please enter your name to proceed.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleContinue} className="space-y-5">
            <div>
              <label
                htmlFor="candidateName"
                className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2"
              >
                Candidate Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <User className="w-4 h-4" />
                </div>
                <input
                  id="candidateName"
                  type="text"
                  value={candidateName}
                  onChange={(e) => {
                    setCandidateName(e.target.value);
                    if (errorMessage) setErrorMessage('');
                  }}
                  placeholder="e.g. Alex Johnson"
                  className={`w-full pl-10 pr-4 py-3 bg-slate-950/80 border rounded-xl text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 transition-all ${
                    errorMessage
                      ? 'border-rose-500/80 focus:ring-rose-500/20'
                      : 'border-slate-800 focus:border-indigo-500 focus:ring-indigo-500/20'
                  }`}
                  autoFocus
                />
              </div>

              {errorMessage && (
                <div className="flex items-center gap-1.5 mt-2 text-xs text-rose-400">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}
            </div>

            <button
              type="submit"
              className="w-full py-3 px-4 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold rounded-xl text-sm shadow-lg shadow-indigo-600/25 transition-all flex items-center justify-center gap-2 group active:scale-[0.99]"
            >
              <span>Continue</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </form>

          {/* Footer note */}
          <div className="mt-8 pt-6 border-t border-slate-800/80 flex items-center justify-center gap-2 text-xs text-slate-500">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>Hour 1 MVP • Ready for Verification</span>
          </div>
        </div>
      </div>
    </div>
  );
}
