import React from 'react';

export default function AnswerInput({ value, onChange, onSubmit, isSubmitting }) {
  const wordCount = value.trim() ? value.trim().split(/\s+/).length : 0;

  return (
    <div className="card">
      <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
        Your Response
      </label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Type your answer or explanation clearly here..."
        rows={6}
        style={{
          width: '100%',
          backgroundColor: 'var(--bg-primary)',
          color: 'var(--text-primary)',
          border: '1px solid var(--border)',
          borderRadius: '0.5rem',
          padding: '0.75rem',
          fontSize: '0.95rem',
          resize: 'vertical',
          outline: 'none'
        }}
      />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.75rem' }}>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          Word count: {wordCount}
        </span>
        <button
          className="btn btn-primary"
          onClick={onSubmit}
          disabled={isSubmitting || !value.trim()}
        >
          {isSubmitting ? 'Evaluating...' : 'Submit & Next'}
        </button>
      </div>
    </div>
  );
}
