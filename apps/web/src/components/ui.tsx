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
  variant = 'solid',
}: {
  children: ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit';
  disabled?: boolean;
  variant?: 'solid' | 'ghost';
}) {
  return (
    <button
      className={variant === 'ghost' ? 'btn ghost' : 'btn'}
      type={type}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}

export function Pager({
  page,
  limit,
  total,
  onPage,
}: {
  page: number;
  limit: number;
  total: number;
  onPage: (next: number) => void;
}) {
  const pageCount = Math.max(1, Math.ceil(total / Math.max(1, limit)));
  return (
    <nav className="pager" aria-label="Pagination">
      <Button disabled={page <= 1} onClick={() => onPage(page - 1)}>
        Previous
      </Button>
      <span className="muted">
        Page {page} of {pageCount}
      </span>
      <Button disabled={page >= pageCount} onClick={() => onPage(page + 1)}>
        Next
      </Button>
    </nav>
  );
}

export function Card({ children }: { children: ReactNode }) {
  return <div className="card">{children}</div>;
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {hint ? <span className="muted">{hint}</span> : null}
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
