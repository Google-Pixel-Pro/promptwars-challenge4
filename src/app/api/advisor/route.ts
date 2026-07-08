import { NextRequest, NextResponse } from 'next/server';
import { advisorRequestSchema } from '@/lib/validation';
import { checkRateLimit } from '@/lib/rateLimit';
import { getCached, setCached, cacheKeyFromParts } from '@/lib/cache';
import { scoreStadium } from '@/lib/riskEngine';
import { generateAdvisorResponse } from '@/lib/gemini';
import { getScenario } from '@/data/scenarios';
import { sanitizeForPrompt } from '@/lib/sanitize';
import { logger } from '@/lib/logger';
import type { AdvisorResponse, ZoneRisk } from '@/types';

export const runtime = 'nodejs';

interface CachedPayload {
  advisor: AdvisorResponse;
  zoneRisks: ZoneRisk[];
}

export async function POST(request: NextRequest) {
  const clientKey = request.headers.get('x-forwarded-for') ?? 'anonymous';
  const rate = checkRateLimit(`advisor:${clientKey}`);
  if (!rate.allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Please wait before requesting another recommendation.' },
      { status: 429 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
  }

  const parsed = advisorRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request.', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { scenarioId, operatorNote } = parsed.data;
  const scenario = getScenario(scenarioId);
  if (!scenario) {
    return NextResponse.json({ error: 'Unknown scenario.' }, { status: 404 });
  }

  const sanitizedNote = operatorNote ? sanitizeForPrompt(operatorNote) : undefined;
  const zoneRisks = scoreStadium(scenario);

  const cacheKey = cacheKeyFromParts('advisor', scenarioId, sanitizedNote ?? '');
  const cached = getCached<CachedPayload>(cacheKey);
  if (cached) {
    return NextResponse.json({ ...cached.advisor, zoneRisks: cached.zoneRisks, cached: true });
  }

  try {
    const advisor = await generateAdvisorResponse(scenario, zoneRisks, sanitizedNote);
    setCached(cacheKey, { advisor, zoneRisks });
    return NextResponse.json({ ...advisor, zoneRisks, cached: false });
  } catch (error) {
    logger.error('api/advisor', error);
    return NextResponse.json(
      { error: 'Unable to generate recommendations right now. Please try again.' },
      { status: 500 }
    );
  }
}
