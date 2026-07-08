import { NextRequest, NextResponse } from 'next/server';
import { scenarioIdSchema } from '@/lib/validation';
import { getScenario, SCENARIO_META } from '@/data/scenarios';
import { scoreStadium } from '@/lib/riskEngine';
import { checkRateLimit } from '@/lib/rateLimit';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const clientKey = request.headers.get('x-forwarded-for') ?? 'anonymous';
  const rate = checkRateLimit(`state:${clientKey}`, Date.now(), 60);
  if (!rate.allowed) {
    return NextResponse.json({ error: 'Rate limit exceeded.' }, { status: 429 });
  }

  const rawScenarioId = request.nextUrl.searchParams.get('scenarioId') ?? 'normal-flow';
  const parsed = scenarioIdSchema.safeParse(rawScenarioId);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid scenarioId.', scenarios: SCENARIO_META }, { status: 400 });
  }

  const scenario = getScenario(parsed.data);
  if (!scenario) {
    return NextResponse.json({ error: 'Unknown scenario.' }, { status: 404 });
  }

  const zoneRisks = scoreStadium(scenario);
  return NextResponse.json({ scenario, zoneRisks, scenarios: SCENARIO_META });
}
