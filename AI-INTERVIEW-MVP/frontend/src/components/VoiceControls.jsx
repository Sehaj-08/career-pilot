import React from 'react';
import { Mic, MicOff, Check, Square, Sparkles } from 'lucide-react';

export default function VoiceControls({
  status = 'listening',
  isMuted = false,
  onToggleMute,
  onFinishSpeaking,
  onInterrupt,
}) {
  const isCandidateTurn = status === 'listening';
  const isAITurn = status === 'speaking';

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl flex flex-wrap items-center justify-between gap-4">
      {/* Left: Mic status & mute toggle */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onToggleMute}
          className={`px-4 py-2.5 rounded-xl font-semibold text-xs transition-all flex items-center gap-2 shadow-sm ${
            isMuted
              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30 hover:bg-rose-500/30'
              : 'bg-slate-800 text-slate-200 border border-slate-700 hover:bg-slate-700 hover:text-white'
          }`}
          title={isMuted ? 'Unmute Microphone' : 'Mute Microphone'}
        >
          {isMuted ? <MicOff className="w-4 h-4 text-rose-400" /> : <Mic className="w-4 h-4 text-emerald-400" />}
          <span>{isMuted ? 'Microphone Muted' : 'Microphone Active'}</span>
        </button>

        <div className="hidden sm:block text-xs text-slate-500">
          {isMuted ? 'Click to unmute and speak' : 'Hardware echo cancellation active'}
        </div>
      </div>

      {/* Right: Turn Action Buttons */}
      <div className="flex items-center gap-3">
        {/* Barge-in Interrupt Button */}
        {isAITurn && (
          <button
            type="button"
            onClick={onInterrupt}
            className="px-4 py-2.5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 font-semibold text-xs rounded-xl transition-all flex items-center gap-2 active:scale-95"
          >
            <Square className="w-3.5 h-3.5 fill-amber-300" />
            <span>Interrupt & Speak</span>
          </button>
        )}

        {/* Done Speaking / Next Turn Button */}
        <button
          type="button"
          onClick={onFinishSpeaking}
          disabled={!isCandidateTurn}
          className={`px-5 py-2.5 font-bold text-xs rounded-xl shadow-lg transition-all flex items-center gap-2 active:scale-95 ${
            isCandidateTurn
              ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-600/25 cursor-pointer'
              : 'bg-slate-800 text-slate-500 border border-slate-700/50 cursor-not-allowed opacity-60'
          }`}
        >
          {status === 'thinking' || status === 'transcribing' ? (
            <>
              <Sparkles className="w-4 h-4 animate-spin text-amber-300" />
              <span>Processing…</span>
            </>
          ) : (
            <>
              <Check className="w-4 h-4" />
              <span>Done Speaking</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
