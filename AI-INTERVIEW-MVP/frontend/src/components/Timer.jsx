import React, { useEffect, useState } from 'react';

export default function Timer({ initialSeconds = 120, onTimeUp }) {
  const [timeLeft, setTimeLeft] = useState(initialSeconds);

  useEffect(() => {
    setTimeLeft(initialSeconds);
  }, [initialSeconds]);

  useEffect(() => {
    if (timeLeft <= 0) {
      if (onTimeUp) onTimeUp();
      return;
    }

    const interval = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [timeLeft, onTimeUp]);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const isUrgent = timeLeft < 30;

  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '0.5rem',
      padding: '0.4rem 0.8rem',
      borderRadius: '0.5rem',
      border: '1px solid var(--border)',
      backgroundColor: isUrgent ? 'rgba(239, 68, 68, 0.15)' : 'var(--bg-card)',
      color: isUrgent ? 'var(--danger)' : 'var(--text-primary)',
      fontWeight: 700,
      fontSize: '0.9rem'
    }}>
      <span>⏱</span>
      <span>
        {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
      </span>
    </div>
  );
}
