'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { StatusBar } from './StatusBar';
import { ScenarioPicker } from './ScenarioPicker';
import { ZoneGrid } from './ZoneGrid';
import { AdvisorPanel } from './AdvisorPanel';
import { AnnouncementPanel } from './AnnouncementPanel';
import { AccessibilityPanel } from './AccessibilityPanel';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import type { AdvisorResponse, RiskLevel, ScenarioId, StadiumState, ZoneRisk } from '@/types';

interface ScenarioMeta {
  id: ScenarioId;
  label: string;
  description: string;
}

interface StatePayload {
  scenario: StadiumState;
  zoneRisks: ZoneRisk[];
  scenarios: ScenarioMeta[];
}

const RISK_TONE: Record<RiskLevel, 'nominal' | 'elevated' | 'high' | 'critical'> = {
  nominal: 'nominal',
  elevated: 'elevated',
  high: 'high',
  critical: 'critical',
};

async function fetchState(scenarioId: ScenarioId): Promise<StatePayload> {
  const response = await fetch(`/api/state?scenarioId=${scenarioId}`);
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error ?? 'Failed to load scenario data.');
  }
  return data;
}

async function fetchAdvisor(scenarioId: ScenarioId): Promise<AdvisorResponse> {
  const response = await fetch('/api/advisor', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ scenarioId }),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error ?? 'Failed to load recommendations.');
  }
  return data;
}

export function CommandCenter({ initial }: { initial: StatePayload }) {
  const [scenarioId, setScenarioId] = useState<ScenarioId>(initial.scenario.scenarioId);
  const [selectedZoneId, setSelectedZoneId] = useState<string | undefined>(undefined);

  // SWR owns loading/error/caching for both reads. Keying by scenarioId means
  // switching scenarios never lets an in-flight response for the *previous*
  // scenario overwrite the one the user is now looking at, and flipping back
  // to a scenario already fetched this session is instant from cache.
  const {
    data: statePayload,
    error: stateError,
    isLoading: stateLoading,
  } = useSWR(['state', scenarioId], () => fetchState(scenarioId), {
    fallbackData: scenarioId === initial.scenario.scenarioId ? initial : undefined,
    revalidateOnFocus: false,
  });

  const {
    data: advisor,
    error: advisorErrorObj,
    isLoading: advisorLoading,
    mutate: refreshAdvisor,
  } = useSWR(['advisor', scenarioId], () => fetchAdvisor(scenarioId), {
    revalidateOnFocus: false,
  });

  const scenario = statePayload?.scenario ?? initial.scenario;
  const zoneRisks = statePayload?.zoneRisks ?? initial.zoneRisks;
  const scenarios = initial.scenarios;

  function handleScenarioSelect(id: ScenarioId) {
    if (id === scenarioId) return;
    setScenarioId(id);
    setSelectedZoneId(undefined);
  }

  const overallRisk: RiskLevel = zoneRisks[0]?.riskLevel ?? 'nominal';
  const selectedZone = scenario.zones.find((zone) => zone.id === selectedZoneId);
  const selectedRisk = zoneRisks.find((risk) => risk.zoneId === selectedZoneId);

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 lg:px-8">
      <header>
        <p className="font-mono text-xs uppercase tracking-widest text-pitch">PulsePoint AI</p>
        <h1 className="font-display text-2xl font-bold text-floodlight">Stadium Operations Command Center</h1>
        <p className="mt-1 max-w-2xl text-sm text-console-muted">
          GenAI-assisted crowd, safety, and multilingual decision support for FIFA World Cup 2026 venue staff.
        </p>
      </header>

      <StatusBar match={scenario.match} weather={scenario.weather} overallRiskLevel={overallRisk} />

      <ScenarioPicker
        options={scenarios}
        activeId={scenarioId}
        onSelect={handleScenarioSelect}
        disabled={stateLoading}
      />

      {stateError && (
        <p role="alert" className="text-sm text-risk-critical">
          {stateError instanceof Error ? stateError.message : 'Something went wrong.'}
        </p>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <Card
          title="Live Zone Map"
          subtitle="Click a gate for details. Colors reflect the deterministic risk engine."
          className="lg:col-span-3"
        >
          <ZoneGrid
            zones={scenario.zones}
            zoneRisks={zoneRisks}
            selectedZoneId={selectedZoneId}
            onSelectZone={setSelectedZoneId}
          />
          {selectedZone && selectedRisk && (
            <div className="mt-4 rounded-lg border border-console-border bg-console-panelAlt p-4">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <p className="font-display text-sm font-semibold text-console-text">{selectedZone.label}</p>
                <Badge tone={RISK_TONE[selectedRisk.riskLevel]}>
                  {selectedRisk.riskLevel} · {selectedRisk.riskScore}/100
                </Badge>
                {selectedZone.accessibleRoute && <Badge tone="neutral">Accessible entrance</Badge>}
              </div>
              <p className="text-sm text-console-muted">
                Occupancy {Math.round(selectedRisk.occupancyRatio * 100)}% · Inflow{' '}
                {selectedZone.inflowRatePerMin}/min · Outflow {selectedZone.outflowRatePerMin}/min
              </p>
              {selectedRisk.contributingFactors.length > 0 && (
                <ul className="mt-2 list-inside list-disc text-sm text-console-muted">
                  {selectedRisk.contributingFactors.map((factor) => (
                    <li key={factor}>{factor}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </Card>

        <Card
          title="AI Operations Advisor"
          subtitle="Prioritized, context-grounded recommendations for this scenario."
          className="lg:col-span-2"
        >
          <AdvisorPanel
            advisor={advisor ?? null}
            loading={advisorLoading}
            error={advisorErrorObj instanceof Error ? advisorErrorObj.message : null}
            onRefresh={() => refreshAdvisor()}
          />
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card
          title="Multilingual Announcement Composer"
          subtitle="Draft a PA announcement once, adapt it for fans in their language."
        >
          <AnnouncementPanel />
        </Card>

        <Card
          title="Accessibility Concierge"
          subtitle="Deterministic accessible routing, phrased naturally by GenAI."
        >
          <AccessibilityPanel zones={scenario.zones} scenarioId={scenarioId} />
        </Card>
      </div>

      <footer className="border-t border-console-border pt-4 text-xs text-console-muted">
        All stadium, crowd, and incident data on this page is simulated for demonstration. See the README
        for the full list of modeling assumptions.
      </footer>
    </main>
  );
}
