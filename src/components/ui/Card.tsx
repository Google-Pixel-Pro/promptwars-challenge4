import type { HTMLAttributes, ReactNode } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  action?: ReactNode;
}

export function Card({ children, title, subtitle, action, className = '', ...rest }: CardProps) {
  return (
    <section
      className={`rounded-xl border border-console-border bg-console-panel shadow-panel ${className}`}
      {...rest}
    >
      {(title || action) && (
        <header className="flex items-start justify-between gap-4 border-b border-console-border px-5 py-4">
          <div>
            {title && (
              <h2 className="font-display text-sm font-semibold uppercase tracking-wide text-console-text">
                {title}
              </h2>
            )}
            {subtitle && <p className="mt-1 text-xs text-console-muted">{subtitle}</p>}
          </div>
          {action}
        </header>
      )}
      <div className="p-5">{children}</div>
    </section>
  );
}
