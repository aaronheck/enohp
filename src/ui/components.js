import React from 'react';
import { Link } from 'react-router-dom';
import './components.css';

const AVATAR_COLORS = ['var(--sky)', 'var(--lilac)', 'var(--butter)', 'var(--mint)', 'var(--rose)', 'var(--tomato)'];

export function avatarColor(name = '') {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

export function initials(name = '') {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return '?';
  if (words.length === 1) return words[0][0].toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

export function Screen({ left, right, children, className = '' }) {
  return (
    <main className={'screen ' + className}>
      {(left || right) && (
        <div className="topbar">
          <span>{left}</span>
          <span>{right}</span>
        </div>
      )}
      {children}
    </main>
  );
}

export const Button = React.forwardRef(function Button({ variant = 'primary', to, className = '', ...props }, ref) {
  const cls = `btn btn-${variant} ${className}`;
  if (to) return <Link ref={ref} to={to} className={cls} {...props} />;
  return <button ref={ref} type="button" className={cls} {...props} />;
});

export function Avatar({ name, you, empty }) {
  if (empty) return <div className="avatar avatar-empty">?</div>;
  return (
    <div
      className={'avatar' + (you ? ' avatar-you' : '')}
      style={{ background: you ? 'var(--butter)' : avatarColor(name) }}
      title={name}
    >
      {you ? 'You' : initials(name)}
    </div>
  );
}

/** The players so far, then you, then a couple of empty seats. */
export function ChainAvatars({ names, maxShown = 5 }) {
  const shown = names.slice(-maxShown);
  return (
    <div className="avatars" aria-label={`${names.length} players before you`}>
      {shown.map((n, i) => (
        <Avatar key={i} name={n} />
      ))}
      <Avatar you />
      <Avatar empty />
    </div>
  );
}

export const PlayIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M7 4.5v15a1 1 0 0 0 1.5.86l12.5-7.5a1 1 0 0 0 0-1.72L8.5 3.64A1 1 0 0 0 7 4.5z" fill="currentColor" />
  </svg>
);

export const StopIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <rect x="5" y="5" width="14" height="14" rx="3" fill="currentColor" />
  </svg>
);

export function StageChips({ stages, current }) {
  const idx = stages.findIndex((s) => s.key === current);
  return (
    <div className="chips">
      {stages.map((s, i) => (
        <span key={s.key} className={'chip' + (i < idx ? ' chip-done' : i === idx ? ' chip-on' : '')}>
          {i < idx ? '✓ ' : ''}
          {s.label}
        </span>
      ))}
    </div>
  );
}

export function Notice({ children }) {
  if (!children) return null;
  return (
    <div className="notice" role="alert">
      {children}
    </div>
  );
}
