import React from 'react';
import { 
  ShieldAlert, 
  ShieldCheck, 
  Maximize2, 
  Minimize2, 
  Eye, 
  Copy, 
  MousePointer, 
  AlertTriangle, 
  Clock,
  History
} from 'lucide-react';

export default function MonitoringPanel({ monitoring }) {
  const {
    isFullscreen,
    tabActive,
    warning,
    summary,
    toggleFullscreen
  } = monitoring;

  const {
    suspiciousCount = 0,
    tabSwitches = 0,
    clipboardActions = 0,
    fullscreenExits = 0,
    rightClicks = 0,
    integrityScore = 100,
    recentEvents = []
  } = summary || {};

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-300">
          <ShieldAlert className="w-4 h-4 text-emerald-400" />
          <span>Security & Activity</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
            suspiciousCount === 0 
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
              : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
          }`}>
            {suspiciousCount === 0 ? 'Secure' : `${suspiciousCount} Flagged`}
          </span>
        </div>
      </div>

      {/* Warning Alert Banner (Toast) */}
      {warning && (
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2 animate-fadeIn">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-400" />
          <div className="font-medium leading-relaxed">{warning}</div>
        </div>
      )}

      {/* Fullscreen Mode Action Box */}
      <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
            isFullscreen 
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
              : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
          }`}>
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-200">
              {isFullscreen ? 'Fullscreen Mode' : 'Standard Window'}
            </div>
            <div className="text-[11px] text-slate-500">
              {isFullscreen ? 'Active & Monitored' : 'Recommended for testing'}
            </div>
          </div>
        </div>

        <button
          onClick={toggleFullscreen}
          type="button"
          className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700/80 text-slate-300 text-xs font-medium border border-slate-700 transition-colors"
        >
          {isFullscreen ? 'Exit Fullscreen' : 'Enable Fullscreen'}
        </button>
      </div>

      {/* Status Indicators Grid */}
      <div className="space-y-2 text-xs">
        <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80">
          <span className="text-slate-400 flex items-center gap-2">
            <Eye className="w-3.5 h-3.5 text-indigo-400" /> Tab Focus
          </span>
          <span className={`font-semibold ${tabActive ? 'text-emerald-400' : 'text-rose-400'}`}>
            {tabActive ? 'Active' : 'Unfocused'}
          </span>
        </div>

        <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80">
          <span className="text-slate-400 flex items-center gap-2">
            <Copy className="w-3.5 h-3.5 text-violet-400" /> Clipboard Guard
          </span>
          <span className="text-slate-300 font-mono text-[11px]">Monitored</span>
        </div>

        <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80">
          <span className="text-slate-400 flex items-center gap-2">
            <MousePointer className="w-3.5 h-3.5 text-amber-400" /> Context Menu
          </span>
          <span className="text-slate-300 font-mono text-[11px]">Monitored</span>
        </div>
      </div>

      {/* Suspicious Activity Breakdown Counters */}
      <div className="pt-2 border-t border-slate-800/80 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-400 font-medium">Suspicious Events</span>
          <span className="font-bold text-white font-mono bg-slate-800 px-2 py-0.5 rounded text-[11px]">
            {suspiciousCount} Total
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-[11px]">
          <div className="p-2 rounded-lg bg-slate-950/50 border border-slate-800/60 flex justify-between items-center">
            <span className="text-slate-500">Tab Switches:</span>
            <span className={`font-mono font-semibold ${tabSwitches > 0 ? 'text-amber-400' : 'text-slate-300'}`}>
              {tabSwitches}
            </span>
          </div>
          <div className="p-2 rounded-lg bg-slate-950/50 border border-slate-800/60 flex justify-between items-center">
            <span className="text-slate-500">Clipboard:</span>
            <span className={`font-mono font-semibold ${clipboardActions > 0 ? 'text-amber-400' : 'text-slate-300'}`}>
              {clipboardActions}
            </span>
          </div>
          <div className="p-2 rounded-lg bg-slate-950/50 border border-slate-800/60 flex justify-between items-center">
            <span className="text-slate-500">Fullscreen Exits:</span>
            <span className={`font-mono font-semibold ${fullscreenExits > 0 ? 'text-amber-400' : 'text-slate-300'}`}>
              {fullscreenExits}
            </span>
          </div>
          <div className="p-2 rounded-lg bg-slate-950/50 border border-slate-800/60 flex justify-between items-center">
            <span className="text-slate-500">Right-clicks:</span>
            <span className={`font-mono font-semibold ${rightClicks > 0 ? 'text-amber-400' : 'text-slate-300'}`}>
              {rightClicks}
            </span>
          </div>
        </div>
      </div>

      {/* Activity Event Log */}
      <div className="pt-2 border-t border-slate-800/80 space-y-2">
        <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
          <History className="w-3.5 h-3.5" />
          <span>Activity History</span>
        </div>

        {recentEvents.length === 0 ? (
          <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800/60 text-center text-[11px] text-slate-500">
            No suspicious activities recorded.
          </div>
        ) : (
          <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1 text-[11px]">
            {recentEvents.map((evt) => (
              <div 
                key={evt.id} 
                className="p-2 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between gap-2"
              >
                <div className="flex items-center gap-2 truncate">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0"></span>
                  <span className="text-slate-300 truncate">{evt.description}</span>
                </div>
                <span className="text-slate-500 font-mono text-[10px] flex-shrink-0">
                  {evt.timeFormatted}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
