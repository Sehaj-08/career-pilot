import React, { useState } from 'react';
import { Bot, User, History, ChevronDown, ChevronUp } from 'lucide-react';

export default function VoiceTranscript({
  currentInterviewerSentence = '',
  candidateTranscript = '',
  conversationHistory = [],
}) {
  const [showHistory, setShowHistory] = useState(false);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl space-y-4">
      {/* Header bar */}
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
            Live Conversation Transcript
          </span>
        </div>

        {conversationHistory.length > 0 && (
          <button
            type="button"
            onClick={() => setShowHistory((prev) => !prev)}
            className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            <History className="w-3.5 h-3.5" />
            <span>History ({conversationHistory.length})</span>
            {showHistory ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        )}
      </div>

      {/* Expanded History Modal / Feed */}
      {showHistory && conversationHistory.length > 0 && (
        <div className="max-h-48 overflow-y-auto space-y-3 p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-xs text-slate-300 pr-2">
          {conversationHistory.map((item, idx) => (
            <div
              key={idx}
              className={`p-2.5 rounded-lg border ${
                item.speaker === 'interviewer'
                  ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-100'
                  : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-100'
              }`}
            >
              <div className="font-semibold text-[10px] uppercase tracking-wider mb-1 opacity-75">
                {item.speaker === 'interviewer' ? 'Alex (Interviewer)' : 'You (Candidate)'}
              </div>
              <p className="leading-relaxed">{item.text}</p>
            </div>
          ))}
        </div>
      )}

      {/* Latest Interviewer Spoken Question / Sentence */}
      {currentInterviewerSentence && (
        <div className="flex items-start gap-3 p-3.5 rounded-xl bg-indigo-500/5 border border-indigo-500/20">
          <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-400 flex-shrink-0 mt-0.5">
            <Bot className="w-4 h-4" />
          </div>
          <div className="space-y-1">
            <div className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider">
              Alexa (Interviewer)
            </div>
            <p className="text-sm text-slate-100 font-medium leading-relaxed">
              {currentInterviewerSentence}
            </p>
          </div>
        </div>
      )}

      {/* Real-time Candidate Spoken Transcript */}
      <div className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-950 border border-slate-800">
        <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 flex-shrink-0 mt-0.5">
          <User className="w-4 h-4" />
        </div>
        <div className="space-y-1 flex-1">
          <div className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">
            Your Spoken Response
          </div>
          <p className="text-sm text-slate-300 leading-relaxed min-h-[1.5rem]">
            {candidateTranscript || (
              <span className="text-slate-600 italic">
                Start speaking… your words will transcribe here in real-time.
              </span>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
