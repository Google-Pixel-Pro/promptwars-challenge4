'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import type { AccessibilityNeed, ScenarioId, Zone } from '@/types';

const NEEDS: AccessibilityNeed[] = [
  { id: 'wheelchair', label: 'Wheelchair access' },
  { id: 'low-vision', label: 'Low-vision assistance' },
  { id: 'hearing', label: 'Hearing assistance' },
  { id: 'sensory-friendly', label: 'Sensory-friendly route' },
  { id: 'cognitive-support', label: 'Cognitive support' },
];

interface AccessibilityResult {
  guidance: string;
  recommendedZoneLabel: string;
  source: 'gemini' | 'fallback-template';
}

export function AccessibilityPanel({ zones, scenarioId }: { zones: Zone[]; scenarioId: ScenarioId }) {
  const [need, setNeed] = useState<AccessibilityNeed['id']>('wheelchair');
  const [zoneId, setZoneId] = useState<string>(zones[0]?.id ?? '');
  const [result, setResult] = useState<AccessibilityResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/accessibility', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ need, currentZoneId: zoneId, scenarioId }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? 'Failed to generate guidance.');
      }
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-4">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-console-muted">Accessibility need</span>
          <select
            value={need}
            onChange={(event) => setNeed(event.target.value as AccessibilityNeed['id'])}
            className="rounded-lg border border-console-border bg-console-panelAlt px-3 py-2 text-console-text focus-visible:outline-none"
          >
            {NEEDS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-console-muted">Current zone</span>
          <select
            value={zoneId}
            onChange={(event) => setZoneId(event.target.value)}
            className="rounded-lg border border-console-border bg-console-panelAlt px-3 py-2 text-console-text focus-visible:outline-none"
          >
            {zones.map((zone) => (
              <option key={zone.id} value={zone.id}>
                {zone.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <Button onClick={handleGenerate} disabled={loading || !zoneId}>
        {loading ? 'Finding route…' : 'Get accessibility guidance'}
      </Button>

      {error && (
        <p role="alert" className="text-sm text-risk-critical">
          {error}
        </p>
      )}

      {result && !error && (
        <div className="rounded-lg border border-console-border bg-console-panelAlt p-4">
          <Badge tone={result.source === 'gemini' ? 'ai' : 'fallback'}>
            {result.source === 'gemini' ? 'Gemini-generated' : 'Template fallback (no API key configured)'}
          </Badge>
          <p className="mt-3 text-console-text">{result.guidance}</p>
          <p className="mt-2 text-xs text-console-muted">
            Recommended zone: {result.recommendedZoneLabel}
          </p>
        </div>
      )}

      <p className="text-xs text-console-muted">
        The recommended route itself is computed deterministically from zone accessibility data.
        Generative AI is used only to phrase the guidance naturally, never to decide the route.
      </p>
    </div>
  );
}
