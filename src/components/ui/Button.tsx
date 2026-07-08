import type { ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
}

const VARIANT_CLASSES: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary: 'bg-pitch text-console-bg hover:bg-pitch-soft disabled:bg-console-panelAlt disabled:text-console-muted',
  secondary:
    'bg-console-panelAlt text-console-text border border-console-border hover:border-pitch/60 disabled:opacity-50',
  ghost: 'bg-transparent text-console-muted hover:text-console-text disabled:opacity-50',
};

export function Button({ variant = 'primary', className = '', disabled, ...rest }: ButtonProps) {
  return (
    <button
      disabled={disabled}
      className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed ${VARIANT_CLASSES[variant]} ${className}`}
      {...rest}
    />
  );
}
