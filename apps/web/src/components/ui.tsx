import { ReactNode } from 'react';

export function PageShell({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="page">
      <h1>{title}</h1>
      {children}
    </section>
  );
}

export function Button({
  children,
  onClick,
  type = 'button',
  disabled,
}: {
  children: ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit';
  disabled?: boolean;
}) {
  return (
    <button className="btn" type={type} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}

export function Card({ children }: { children: ReactNode }) {
  return <div className="card">{children}</div>;
}

export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}

export function LoadingState() {
  return <p className="muted">Loading…</p>;
}

export function ErrorFallback({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="card error">
      <p>{message}</p>
      <button className="btn" type="button" onClick={onRetry}>
        Retry
      </button>
    </div>
  );
}
