import React from 'react';

export default function MonitoringPanel({ metrics = { faceDetected: true, multipleFaces: false, tabSwitches: 0, integrityScore: 100 } }) {
  return (
    <div className="card">
      <h3 style={{ fontSize: '1rem', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
        Proctoring Status
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.875rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: 'var(--text-muted)' }}>Face Detection</span>
          <span className={`badge ${metrics.faceDetected ? 'badge-success' : 'badge-danger'}`}>
            {metrics.faceDetected ? 'Centered' : 'Not Detected'}
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: 'var(--text-muted)' }}>Single Candidate</span>
          <span className={`badge ${!metrics.multipleFaces ? 'badge-success' : 'badge-warning'}`}>
            {!metrics.multipleFaces ? 'Verified' : 'Multiple Faces'}
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: 'var(--text-muted)' }}>Tab Switches</span>
          <span className={`badge ${metrics.tabSwitches === 0 ? 'badge-success' : 'badge-warning'}`}>
            {metrics.tabSwitches} Events
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid var(--border)' }}>
          <span style={{ fontWeight: 600 }}>Integrity Score</span>
          <span style={{ fontWeight: 700, color: metrics.integrityScore > 80 ? 'var(--success)' : 'var(--warning)' }}>
            {metrics.integrityScore}%
          </span>
        </div>
      </div>
    </div>
  );
}
