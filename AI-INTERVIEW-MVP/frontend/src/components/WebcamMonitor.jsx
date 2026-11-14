import React from 'react';

export default function WebcamMonitor({ videoRef, isCameraActive, error, faceCount }) {
  // Determine UI state
  let statusColor = 'bg-slate-500'; // Initializing
  let statusText = 'Initializing...';

  if (error) {
    statusColor = 'bg-rose-500';
    statusText = 'Camera Error';
  } else if (isCameraActive) {
    if (faceCount === 0) {
      statusColor = 'bg-amber-500';
      statusText = 'No Face Detected';
    } else if (faceCount === 1) {
      statusColor = 'bg-emerald-500';
      statusText = 'One Face Detected';
    } else {
      statusColor = 'bg-rose-600';
      statusText = 'Multiple Faces Detected';
    }
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-xs font-semibold uppercase tracking-wider text-slate-300">
          Webcam & Face Detection
        </div>
        <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full ${statusColor} bg-opacity-20`}>
          <div className={`w-2 h-2 rounded-full ${statusColor}`} />
          <span className={`text-[10px] font-semibold text-slate-100`}>{statusText}</span>
        </div>
      </div>

      <div className="relative aspect-video rounded-xl bg-slate-950 border border-slate-800 overflow-hidden">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover transform scale-x-[-1]"
        />
        {!isCameraActive && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500">
            <span className="text-xs font-medium">Camera Inactive</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="p-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-400">
          Detected: <span className="font-bold text-white">{faceCount}</span>
        </div>
        <div className="p-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-400">
          Status: <span className={`font-bold ${faceCount === 1 ? 'text-emerald-400' : 'text-amber-400'}`}>
            {faceCount === 1 ? 'Normal' : 'Attention'}
          </span>
        </div>
      </div>
    </div>
  );
}
