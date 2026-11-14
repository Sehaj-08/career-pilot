import React from 'react';

export default function WebcamMonitor({ videoRef, isCameraActive, warningMessage }) {
  return (
    <div className="card" style={{ position: 'relative', overflow: 'hidden', padding: 0 }}>
      <div style={{
        position: 'relative',
        width: '100%',
        height: '240px',
        backgroundColor: '#000',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            transform: 'scaleX(-1)'
          }}
        />
        {!isCameraActive && (
          <div style={{ position: 'absolute', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            Camera Inactive
          </div>
        )}
        <div style={{
          position: 'absolute',
          top: 10,
          left: 10,
          display: 'flex',
          gap: '8px'
        }}>
          <span className={`badge ${isCameraActive ? 'badge-success' : 'badge-danger'}`}>
            {isCameraActive ? 'LIVE' : 'OFFLINE'}
          </span>
        </div>
      </div>
      {warningMessage && (
        <div style={{
          backgroundColor: 'rgba(239, 68, 68, 0.15)',
          color: 'var(--danger)',
          padding: '0.5rem 1rem',
          fontSize: '0.8rem',
          borderTop: '1px solid var(--danger)'
        }}>
          ⚠️ {warningMessage}
        </div>
      )}
    </div>
  );
}
