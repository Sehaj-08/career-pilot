import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  User, 
  Briefcase, 
  Clock, 
  Play, 
  Server, 
  CheckCircle2, 
  RefreshCw,
  Layers,
  Loader2
} from 'lucide-react';
import { checkBackendHealth, fetchQuestionsByRole, startInterviewSession } from '../services/api';

const JOB_ROLES = [
  'DevOps Engineer',
  'Backend Developer',
  'Frontend Developer'
];

export default function Dashboard() {
  const navigate = useNavigate();

  // Retrieve stored state or fallback
  const [candidateName, setCandidateName] = useState('');
  const [selectedRole, setSelectedRole] = useState(JOB_ROLES[0]);
  const [isStarting, setIsStarting] = useState(false);
  
  // Backend health status state
  const [backendStatus, setBackendStatus] = useState('checking'); // 'checking' | 'connected' | 'disconnected'
  const [backendMessage, setBackendMessage] = useState('');
  const [isCheckingHealth, setIsCheckingHealth] = useState(false);

  useEffect(() => {
    const savedName = localStorage.getItem('candidate_name');
    if (savedName) {
      setCandidateName(savedName);
    } else {
      setCandidateName('Candidate');
    }

    const savedRole = localStorage.getItem('candidate_role');
    if (savedRole && JOB_ROLES.includes(savedRole)) {
      setSelectedRole(savedRole);
    }

    testBackendConnection();
  }, []);

  const testBackendConnection = async () => {
    setIsCheckingHealth(true);
    const result = await checkBackendHealth();
    if (result.isConnected) {
      setBackendStatus('connected');
      setBackendMessage(result.message || 'AI Interview Backend is running');
    } else {
      setBackendStatus('disconnected');
      setBackendMessage(result.error || 'Cannot reach http://localhost:8000');
    }
    setIsCheckingHealth(false);
  };

  const handleStartInterview = async () => {
    setIsStarting(true);
    try {
      const activeName = candidateName.trim() || 'Candidate';

      // 1. Fetch the 5 predefined questions for the chosen job role
      const questions = await fetchQuestionsByRole(selectedRole);

      // 2. Start session on the backend
      const sessionData = await startInterviewSession(activeName, selectedRole);

      // 3. Persist session state in localStorage
      localStorage.setItem('candidate_name', activeName);
      localStorage.setItem('candidate_role', selectedRole);
      localStorage.setItem('interview_duration', '30'); // Fixed at 30 minutes
      localStorage.setItem('interview_session_id', sessionData.session_id || `sess_${Date.now()}`);
      localStorage.setItem('interview_questions', JSON.stringify(questions));
      localStorage.setItem('interview_start_time', Date.now().toString());
      localStorage.setItem('current_question_index', '0');
      localStorage.setItem('interview_answers', JSON.stringify([]));
      localStorage.setItem('questions_answered', '0');
      localStorage.removeItem('interview_monitoring_started');
      localStorage.removeItem('interview_monitoring_events');

      // 4. Navigate to the functional Interview screen
      navigate('/interview');
    } catch (error) {
      console.error('Failed to start interview:', error);
      setIsStarting(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] p-4 sm:p-6 lg:p-8 bg-slate-950 flex flex-col justify-center items-center">
      <div className="w-full max-w-3xl space-y-6">
        
        {/* Top Header Card */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <div>
            <div className="flex items-center gap-2 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-1">
              <Layers className="w-4 h-4" />
              <span>Interview Configuration</span>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Candidate Dashboard
            </h1>
            <p className="text-sm text-slate-400 mt-0.5">
              Review your details and prepare for the 30-minute evaluation.
            </p>
          </div>

          {/* Backend Connection Status Badge */}
          <div className="flex items-center gap-3 bg-slate-950/70 border border-slate-800 rounded-xl px-4 py-2.5 self-start sm:self-center">
            <div className="flex items-center gap-2">
              <Server className="w-4 h-4 text-slate-400" />
              <div className="text-xs">
                <span className="text-slate-400 block font-medium">Backend API</span>
                {backendStatus === 'checking' && (
                  <span className="text-amber-400 font-semibold flex items-center gap-1">
                    Checking...
                  </span>
                )}
                {backendStatus === 'connected' && (
                  <span className="text-emerald-400 font-semibold flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    Connected
                  </span>
                )}
                {backendStatus === 'disconnected' && (
                  <span className="text-rose-400 font-semibold flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                    Disconnected
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={testBackendConnection}
              disabled={isCheckingHealth}
              title="Refresh connection status"
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isCheckingHealth ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Configuration Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Candidate Info Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                  <User className="w-4 h-4 text-indigo-400" />
                  <span>Candidate Info</span>
                </div>
                <button
                  onClick={() => navigate('/login')}
                  className="text-xs text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
                >
                  Change
                </button>
              </div>
              <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4">
                <div className="text-xs text-slate-500 mb-1">Registered Name</div>
                <div className="text-lg font-semibold text-white tracking-wide">
                  {candidateName}
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-800/60 text-xs text-slate-400 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Identity validated for session</span>
            </div>
          </div>

          {/* Job Role Selection Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-2 text-slate-400 text-xs font-semibold uppercase tracking-wider">
              <Briefcase className="w-4 h-4 text-indigo-400" />
              <span>Select Job Role</span>
            </div>

            <div>
              <label htmlFor="roleSelect" className="block text-xs text-slate-400 mb-2 font-medium">
                Target Engineering Role
              </label>
              <div className="relative">
                <select
                  id="roleSelect"
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="w-full bg-slate-950/90 border border-slate-800 rounded-xl px-4 py-3 text-slate-100 text-sm font-medium focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 cursor-pointer transition-all"
                >
                  {JOB_ROLES.map((role) => (
                    <option key={role} value={role} className="bg-slate-900 text-white">
                      {role}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              Assessment questions will be tailored to the core competencies of the selected position (5 technical questions).
            </p>
          </div>

        </div>

        {/* Fixed Duration Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-violet-600/10 border border-violet-500/20 flex items-center justify-center text-violet-400 flex-shrink-0">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Interview Duration
              </div>
              <div className="text-xl font-bold text-white flex items-center gap-2 mt-0.5">
                <span>30 Minutes</span>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-violet-500/10 text-violet-300 border border-violet-500/20">
                  Fixed Duration
                </span>
              </div>
            </div>
          </div>
          <div className="text-xs text-slate-400 sm:text-right max-w-xs">
            Standardized time for every candidate. A persistent live countdown will display once you begin.
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-2">
          <button
            onClick={handleStartInterview}
            disabled={isStarting}
            className="w-full py-4 px-6 bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-75 disabled:cursor-not-allowed text-white font-bold rounded-2xl text-base shadow-xl shadow-indigo-600/25 transition-all flex items-center justify-center gap-3 active:scale-[0.99]"
          >
            {isStarting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Loading Questions...</span>
              </>
            ) : (
              <>
                <Play className="w-5 h-5 fill-white" />
                <span>Start Interview</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
