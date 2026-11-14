import React from 'react';

export default function QuestionCard({ question, currentNumber = 1, totalQuestions = 5 }) {
  if (!question) {
    return <div className="card">Loading question...</div>;
  }

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
        <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
          Question {currentNumber} of {totalQuestions}
        </span>
        <span className="badge badge-warning">{question.difficulty || 'Intermediate'}</span>
      </div>
      <h2 style={{ fontSize: '1.25rem', fontWeight: 600, lineHeight: 1.4 }}>
        {question.title || question.text}
      </h2>
      {question.category && (
        <span style={{ display: 'inline-block', marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--accent)' }}>
          Category: {question.category}
        </span>
      )}
    </div>
  );
}
