import React from 'react';
import {
  Shield,
  ShieldAlert,
  Maximize2,
  Eye,
  AlertTriangle,
  CheckCircle2,
  History,
  Copy,
  Scissors,
  ClipboardPaste,
  MousePointer,
  UserX,
  Users,
} from 'lucide-react';

export default function MonitoringPanel({
  metrics = {
    faceDetected: true,
    multipleFaces: false,
    tabSwitches: 0,
    suspiciousCount: 0,
    integrityScore: 100,
    isFullscreen: true,
  },
  events = [],
  warning = '',
  isFullscreen = true,
  onRequestFullscreen = null,
  isMonitoring = true,
}) {
  const suspiciousCount = metrics.suspiciousCount ?? 0;
  const integrityScore = metrics.integrityScore ?? 100;

  // Determine status color scheme
  let statusBadge = {
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
    text: 'text-emerald-400',
    dot: 'bg-emerald-500',
    label: isMonitoring ? 'Active' : 'Inactive',
  };

  if (!isMonitoring) {
    statusBadge = {
      bg: 'bg-slate-800',
      border: 'border-slate-700',
      text: 'text-slate-400',
      dot: 'bg-slate-500',
      label: 'Inactive',
    };
  } else if (suspiciousCount > 3 || !isFullscreen) {
    statusBadge = {
      bg: 'bg-rose-500/10',
      border: 'border-rose-500/20',
      text: 'text-rose-400',
      dot: 'bg-rose-500',
      label: 'Warning',
    };
  } else if (suspiciousCount > 0) {
    statusBadge = {
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/20',
      text: 'text-amber-400',
      dot: 'bg-amber-500',
      label: 'Attention',
    };
  }

  // Helper to choose event icon
  const getEventIcon = (type) => {
    switch (type) {
      case 'fullscreen_exit':
      case 'fullscreen_enter':
        return <Maximize2 className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />;
      case 'tab_switch':
      case 'window_blur':
        return <Eye className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />;
      case 'copy_attempt':
        return <Copy className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />;
      case 'paste_attempt':
        return <ClipboardPaste className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />;
      case 'cut_attempt':
        return <Scissors className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />;
      case 'right_click_attempt':
        return <MousePointer className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />;
      case 'face_absent':
        return <UserX className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />;
      case 'multiple_faces':
        return <Users className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />;
      default:
        return <AlertTriangle className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />;
    }
  };

  const formatTimestamp = (isoString) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
      return '';
    }
  };

  // Recent 10 events, newest first
  const displayEvents = [...events].reverse().slice(0, 10);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
      {/* ── Top Header ── */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          {suspiciousCount > 0 ? (
            <ShieldAlert className="w-4 h-4 text-amber-400" />
          ) : (
            <Shield className="w-4 h-4 text-indigo-400" />
          )}
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-200">
            Security Monitor
          </span>
        </div>

        <div className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[10px] font-semibold ${statusBadge.bg} ${statusBadge.border} ${statusBadge.text}`}>
          <div className={`w-1.5 h-1.5 rounded-full ${statusBadge.dot} ${isMonitoring ? 'animate-pulse' : ''}`} />
          <span>{statusBadge.label}</span>
        </div>
      </div>

      {/* ── Status Grid ── */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        {/* Fullscreen Status */}
        <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-col justify-between">
          <span className="text-[11px] text-slate-400 font-medium">Fullscreen</span>
          <div className="flex items-center justify-between mt-1">
            <span
              className={`font-semibold text-xs ${
                isFullscreen ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {isFullscreen ? 'Active' : 'Exited'}
            </span>
            {!isFullscreen && onRequestFullscreen && (
              <button
                type="button"
                onClick={onRequestFullscreen}
                className="text-[10px] px-1.5 py-0.5 rounded bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 transition-colors"
              >
                Re-enter
              </button>
            )}
          </div>
        </div>

        {/* Tab Monitoring */}
        <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-col justify-between">
          <span className="text-[11px] text-slate-400 font-medium">Tab Monitoring</span>
          <span
            className={`font-semibold text-xs mt-1 ${
              metrics.tabSwitches === 0 ? 'text-emerald-400' : 'text-amber-400'
            }`}
          >
            {metrics.tabSwitches === 0 ? 'Normal' : `${metrics.tabSwitches} Switches`}
          </span>
        </div>

        {/* Face Detection Status (Hour 5) */}
        <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-col justify-between">
          <span className="text-[11px] text-slate-400 font-medium">Face Presence</span>
          <span
            className={`font-semibold text-xs mt-1 ${
              metrics.faceDetected && !metrics.multipleFaces
                ? 'text-emerald-400'
                : 'text-amber-400'
            }`}
          >
            {metrics.multipleFaces
              ? 'Multiple Faces'
              : metrics.faceDetected
              ? 'Centered'
              : 'Not Detected'}
          </span>
        </div>

        {/* Suspicious Activities Counter */}
        <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-col justify-between">
          <span className="text-[11px] text-slate-400 font-medium">Suspicious Activities</span>
          <span
            className={`font-bold text-xs mt-1 ${
              suspiciousCount === 0
                ? 'text-emerald-400'
                : suspiciousCount <= 3
                ? 'text-amber-400'
                : 'text-rose-400'
            }`}
          >
            {suspiciousCount} {suspiciousCount === 1 ? 'Event' : 'Events'}
          </span>
        </div>
      </div>

      {/* ── Integrity Score Gauge ── */}
      <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-400 font-medium">Session Integrity</span>
          <span
            className={`font-bold ${
              integrityScore >= 85
                ? 'text-emerald-400'
                : integrityScore >= 60
                ? 'text-amber-400'
                : 'text-rose-400'
            }`}
          >
            {integrityScore}%
          </span>
        </div>
        <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden border border-slate-800">
          <div
            className={`h-full transition-all duration-300 ${
              integrityScore >= 85
                ? 'bg-emerald-500'
                : integrityScore >= 60
                ? 'bg-amber-500'
                : 'bg-rose-500'
            }`}
            style={{ width: `${Math.max(5, integrityScore)}%` }}
          />
        </div>
      </div>

      {/* ── Live Activity History ── */}
      <div className="space-y-2 pt-1">
        <div className="flex items-center justify-between text-[11px] text-slate-400 font-semibold uppercase tracking-wider">
          <div className="flex items-center gap-1.5">
            <History className="w-3.5 h-3.5 text-indigo-400" />
            <span>Activity History</span>
          </div>
          <span className="text-[10px] text-slate-500">{events.length} logged</span>
        </div>

        <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1 scrollbar-thin scrollbar-thumb-slate-800">
          {displayEvents.length === 0 ? (
            <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800/60 text-[11px] text-slate-500 text-center flex items-center justify-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500/60" />
              <span>No suspicious activity detected</span>
            </div>
          ) : (
            displayEvents.map((evt) => (
              <div
                key={evt.id}
                className={`p-2 rounded-lg text-xs border flex items-start gap-2 transition-all ${
                  evt.isSuspicious
                    ? 'bg-rose-500/5 border-rose-500/20 text-slate-300'
                    : 'bg-slate-950/50 border-slate-800 text-slate-400'
                }`}
              >
                <div className="mt-0.5">{getEventIcon(evt.type)}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] leading-snug truncate font-medium text-slate-200">
                    {evt.message}
                  </div>
                  <div className="text-[9px] text-slate-500 mt-0.5">
                    {formatTimestamp(evt.timestamp)}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
