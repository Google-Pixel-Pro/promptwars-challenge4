import type { ReactNode } from 'react';

type Tone = 'nominal' | 'elevated' | 'high' | 'critical' | 'neutral' | 'ai' | 'fallback';

const TONE_CLASSES: Record<Tone, string> = {
  nominal: 'bg-risk-nominal/15 text-risk-nominal border-risk-nominal/40',
  elevated: 'bg-risk-elevated/15 text-risk-elevated border-risk-elevated/40',
  high: 'bg-risk-high/15 text-risk-high border-risk-high/40',
  critical: 'bg-risk-critical/15 text-risk-critical border-risk-critical/40 animate-pulseRing',
  neutral: 'bg-console-panelAlt text-console-muted border-console-border',
  ai: 'bg-pitch/15 text-pitch border-pitch/40',
  fallback: 'bg-console-panelAlt text-console-muted border-console-border',
};

export function Badge({ tone = 'neutral', children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-mono text-xs uppercase tracking-wide ${TONE_CLASSES[tone]}`}
    >
      {children}
    </span>
  );
}
