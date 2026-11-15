import React from 'react';
import { Volume2, Mic, Sparkles, Loader2, Radio } from 'lucide-react';

export default function AudioVisualizer({ status = 'listening', audioVolume = 0 }) {
  // Volume scaling for dynamic pulse (clamped between 0.95 and 1.45)
  const scale = 1 + (audioVolume / 100) * 0.45;
  const glowOpacity = Math.min(1, 0.2 + (audioVolume / 100) * 0.8);

  const getStatusBadge = () => {
    switch (status) {
      case 'speaking':
        return {
          label: 'Interviewer Speaking',
          color: 'text-violet-400',
          bg: 'bg-violet-500/10',
          border: 'border-violet-500/30',
          dot: 'bg-violet-400 animate-pulse',
          icon: <Volume2 className="w-4 h-4 text-violet-400" />,
        };
      case 'listening':
        return {
          label: audioVolume > 10 ? 'Listening to You…' : 'Your Turn to Speak',
          color: 'text-emerald-400',
          bg: 'bg-emerald-500/10',
          border: 'border-emerald-500/30',
          dot: 'bg-emerald-400 animate-ping',
          icon: <Mic className="w-4 h-4 text-emerald-400" />,
        };
      case 'thinking':
        return {
          label: 'Alex is Thinking…',
          color: 'text-amber-400',
          bg: 'bg-amber-500/10',
          border: 'border-amber-500/30',
          dot: 'bg-amber-400 animate-pulse',
          icon: <Sparkles className="w-4 h-4 text-amber-400 animate-spin" />,
        };
      case 'transcribing':
        return {
          label: 'Processing Speech…',
          color: 'text-cyan-400',
          bg: 'bg-cyan-500/10',
          border: 'border-cyan-500/30',
          dot: 'bg-cyan-400',
          icon: <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />,
        };
      case 'connecting':
      default:
        return {
          label: 'Connecting Voice…',
          color: 'text-slate-400',
          bg: 'bg-slate-800',
          border: 'border-slate-700',
          dot: 'bg-slate-500',
          icon: <Radio className="w-4 h-4 text-slate-400" />,
        };
    }
  };

  const badge = getStatusBadge();

  return (
    <div className="relative flex flex-col items-center justify-center py-10 px-6 rounded-2xl bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 border border-slate-800 overflow-hidden shadow-2xl">
      {/* Background ambient lighting */}
      <div
        className="absolute w-72 h-72 rounded-full blur-3xl pointer-events-none transition-all duration-500"
        style={{
          background:
            status === 'speaking'
              ? 'radial-gradient(circle, rgba(139,92,246,0.2) 0%, transparent 70%)'
              : status === 'listening'
              ? `radial-gradient(circle, rgba(16,185,129,${glowOpacity * 0.3}) 0%, transparent 70%)`
              : 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)',
        }}
      />

      {/* Top Status Pill */}
      <div className="relative z-10 mb-8">
        <div className={`inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full text-xs font-semibold border ${badge.bg} ${badge.border} ${badge.color} shadow-sm backdrop-blur-md`}>
          <span className={`w-2 h-2 rounded-full ${badge.dot}`} />
          {badge.icon}
          <span>{badge.label}</span>
        </div>
      </div>

      {/* Central Visualizer Orb / Soundwave */}
      <div className="relative z-10 flex items-center justify-center my-4 h-44 w-44">
        {/* Outer Ring 1 */}
        <div
          className="absolute inset-0 rounded-full border border-indigo-500/20 transition-transform duration-150"
          style={{ transform: `scale(${scale * 1.15})` }}
        />
        {/* Outer Ring 2 */}
        <div
          className="absolute inset-4 rounded-full border border-violet-500/30 transition-transform duration-100"
          style={{ transform: `scale(${scale * 1.05})` }}
        />

        {/* Core Animated Orb */}
        <div
          className="relative w-28 h-28 rounded-full flex items-center justify-center shadow-2xl transition-all duration-150"
          style={{
            transform: `scale(${status === 'listening' ? scale : 1})`,
            background:
              status === 'speaking'
                ? 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)'
                : status === 'listening'
                ? audioVolume > 10
                  ? 'linear-gradient(135deg, #10b981 0%, #06b6d4 100%)'
                  : 'linear-gradient(135deg, #059669 0%, #0284c7 100%)'
                : status === 'thinking'
                ? 'linear-gradient(135deg, #f59e0b 0%, #8b5cf6 100%)'
                : 'linear-gradient(135deg, #475569 0%, #334155 100%)',
            boxShadow:
              status === 'speaking'
                ? '0 0 40px rgba(139,92,246,0.6)'
                : status === 'listening' && audioVolume > 10
                ? '0 0 45px rgba(16,185,129,0.7)'
                : '0 0 25px rgba(99,102,241,0.3)',
          }}
        >
          {/* Animated soundbars inside orb */}
          <div className="flex items-center gap-1.5 h-10">
            {[40, 75, 100, 85, 45].map((baseHeight, idx) => {
              const barHeight =
                status === 'speaking'
                  ? Math.max(15, (baseHeight * (0.4 + Math.sin(Date.now() / 200 + idx) * 0.6)))
                  : status === 'listening'
                  ? Math.max(12, (audioVolume * 0.9 * (baseHeight / 100)))
                  : 12;

              return (
                <div
                  key={idx}
                  className="w-1.5 rounded-full bg-white/90 transition-all duration-75"
                  style={{ height: `${barHeight}px` }}
                />
              );
            })}
          </div>
        </div>
      </div>

      {/* Subtext description */}
      <p className="relative z-10 mt-6 text-xs text-slate-400 font-medium text-center">
        {status === 'speaking' && 'AI interviewer is speaking. You can interrupt anytime by speaking.'}
        {status === 'listening' && 'Speak clearly into your microphone. Pause when finished.'}
        {status === 'thinking' && 'Analyzing your response with Ollama…'}
        {status === 'transcribing' && 'Transcribing your audio with ElevenLabs…'}
        {status === 'connecting' && 'Establishing real-time voice channel…'}
      </p>
    </div>
  );
}
