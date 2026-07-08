'use client';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import type { AdvisorResponse, OperationalRecommendation } from '@/types';

const CATEGORY_LABEL: Record<OperationalRecommendation['category'], string> = {
  'gate-management': 'Gate Management',
  staffing: 'Staffing',
  communication: 'Communication',
  medical: 'Medical',
  security: 'Security',
  facility: 'Facility',
  transportation: 'Transportation',
};

const PRIORITY_TONE: Record<OperationalRecommendation['priority'], 'critical' | 'high' | 'elevated'> = {
  1: 'critical',
  2: 'high',
  3: 'elevated',
};

export function AdvisorPanel({
  advisor,
  loading,
  error,
  onRefresh,
}: {
  advisor: AdvisorResponse | null;
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-console-muted">
          Recommendations are generated from live risk scores for the selected scenario.
        </p>
        <Button variant="secondary" onClick={onRefresh} disabled={loading}>
          {loading ? 'Thinking…' : 'Refresh recommendations'}
        </Button>
      </div>

      {error && (
        <p role="alert" className="rounded-lg border border-risk-critical/40 bg-risk-critical/10 p-3 text-sm text-risk-critical">
          {error}
        </p>
      )}

      {!error && advisor && (
        <>
          <div>
            <Badge tone={advisor.source === 'gemini' ? 'ai' : 'fallback'}>
              {advisor.source === 'gemini' ? 'Gemini-generated' : 'Rule-based fallback (no API key configured)'}
            </Badge>
          </div>

          {advisor.recommendations.length === 0 ? (
            <p className="text-sm text-console-muted">No action needed — all zones nominal.</p>
          ) : (
            <ol className="flex flex-col gap-3">
              {advisor.recommendations
                .slice()
                .sort((a, b) => a.priority - b.priority)
                .map((rec) => (
                  <li
                    key={rec.id}
                    className="rounded-lg border border-console-border bg-console-panelAlt p-4"
                  >
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <Badge tone={PRIORITY_TONE[rec.priority]}>Priority {rec.priority}</Badge>
                      <Badge tone="neutral">{CATEGORY_LABEL[rec.category]}</Badge>
                      <span className="font-mono text-xs text-console-muted">
                        {rec.targetZoneIds.join(', ')}
                      </span>
                    </div>
                    <p className="font-medium text-console-text">{rec.action}</p>
                    <p className="mt-1 text-sm text-console-muted">{rec.rationale}</p>
                  </li>
                ))}
            </ol>
          )}
        </>
      )}
    </div>
  );
}
