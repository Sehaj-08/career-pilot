import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Bot, User, Clock } from 'lucide-react';

export default function Navbar() {
  const location = useLocation();
  const candidateName = localStorage.getItem('candidate_name');
  const role = localStorage.getItem('candidate_role');

  return (
    <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="h-9 w-9 rounded-lg bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <span className="text-lg font-bold tracking-tight text-white">AI Interview</span>
            <span className="ml-2 text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              MVP
            </span>
          </div>
        </Link>

        {/* Quick Info & Navigation */}
        <div className="flex items-center gap-6">
          {candidateName && (
            <div className="hidden sm:flex items-center gap-2 text-xs text-slate-300 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700/60">
              <User className="w-3.5 h-3.5 text-indigo-400" />
              <span className="font-medium text-slate-200">{candidateName}</span>
              {role && (
                <>
                  <span className="text-slate-500">•</span>
                  <span className="text-slate-400">{role}</span>
                </>
              )}
            </div>
          )}

          <nav className="flex items-center gap-1 sm:gap-2">
            <Link
              to="/login"
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                location.pathname === '/login' || location.pathname === '/'
                  ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              Login
            </Link>
            <Link
              to="/dashboard"
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                location.pathname === '/dashboard'
                  ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              Dashboard
            </Link>
            <Link
              to="/interview"
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                location.pathname === '/interview'
                  ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              Interview
            </Link>
            <Link
              to="/result"
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                location.pathname === '/result'
                  ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              Result
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
}
