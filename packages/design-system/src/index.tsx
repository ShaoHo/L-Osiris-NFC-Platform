import React from 'react';

export function Card({ children, className = '' }: React.PropsWithChildren<{ className?: string }>) {
  return <div className={`ds-card ${className}`.trim()}>{children}</div>;
}

export function Stack({ children, className = '' }: React.PropsWithChildren<{ className?: string }>) {
  return <div className={`ds-stack ${className}`.trim()}>{children}</div>;
}

export function Grid({
  children,
  className = '',
  columns = 2,
}: React.PropsWithChildren<{ className?: string; columns?: number }>) {
  return <div className={`ds-grid cols-${columns} ${className}`.trim()}>{children}</div>;
}

export function Pill({ children, className = '' }: React.PropsWithChildren<{ className?: string }>) {
  return <span className={`ds-pill ${className}`.trim()}>{children}</span>;
}

export function Button({
  children,
  variant = 'primary',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary';
}) {
  return (
    <button className={`ds-button ${variant === 'secondary' ? 'secondary' : ''}`.trim()} {...props}>
      {children}
    </button>
  );
}
