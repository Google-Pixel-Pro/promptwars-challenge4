import { NextRequest, NextResponse } from 'next/server';
import { accessibilityRequestSchema } from '@/lib/validation';
import { checkRateLimit } from '@/lib/rateLimit';
import { generateText } from '@/lib/gemini';
import { getScenario } from '@/data/scenarios';
import { logger } from '@/lib/logger';
import type { AccessibilityNeed } from '@/types';

export const runtime = 'nodejs';

const NEED_LABELS: Record<AccessibilityNeed['id'], string> = {
  wheelchair: 'wheelchair access',
  'low-vision': 'low-vision assistance',
  hearing: 'hearing assistance',
  'sensory-friendly': 'a sensory-friendly route',
  'cognitive-support': 'cognitive support / simplified wayfinding',
};

/**
 * The actual route decision is deliberately deterministic, not
 * AI-generated: for a safety-critical accessibility recommendation, a wrong
 * "creative" answer from an LLM is worse than a plain but always-correct one.
 * Gemini (via generateText) is used only afterwards, to phrase this decision
 * in warmer, more natural language — never to decide the route itself.
 */
function findAccessibleRoute(currentZoneId: string, scenario: ReturnType<typeof getScenario>) {
  if (!scenario) return undefined;

  const currentZone = scenario.zones.find((zone) => zone.id === currentZoneId);
  if (!currentZone) return undefined;

  if (currentZone.accessibleRoute) {
    return { zone: currentZone, viaCurrentGate: true };
  }

  const accessibleNeighbor = currentZone.nearestExitZoneIds
    .map((id) => scenario.zones.find((zone) => zone.id === id))
    .find((zone) => zone?.accessibleRoute);

  if (accessibleNeighbor) {
    return { zone: accessibleNeighbor, viaCurrentGate: false };
  }

  const anyAccessible = scenario.zones.find((zone) => zone.accessibleRoute);
  return anyAccessible ? { zone: anyAccessible, viaCurrentGate: false } : undefined;
}

export async function POST(request: NextRequest) {
  const clientKey = request.headers.get('x-forwarded-for') ?? 'anonymous';
  const rate = checkRateLimit(`accessibility:${clientKey}`);
  if (!rate.allowed) {
    return NextResponse.json({ error: 'Rate limit exceeded. Please wait and try again.' }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
  }

  const parsed = accessibilityRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request.', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { need, currentZoneId, scenarioId } = parsed.data;
  const scenario = getScenario(scenarioId);
  if (!scenario) {
    return NextResponse.json({ error: 'Unknown scenario.' }, { status: 404 });
  }

  const route = findAccessibleRoute(currentZoneId, scenario);
  if (!route) {
    return NextResponse.json({ error: 'Unknown zone for this scenario.' }, { status: 404 });
  }

  const needLabel = NEED_LABELS[need];
  const fallbackText = route.viaCurrentGate
    ? `${route.zone.label} already has an accessible route in place for ${needLabel}. Please proceed to the designated accessible entrance at this gate.`
    : `The nearest accessible route for ${needLabel} is via ${route.zone.label}. Please make your way there and look for the designated accessible entrance.`;

  const prompt = [
    `Write one short, warm, reassuring sentence of accessibility guidance for a fan at a FIFA World Cup 2026 stadium who needs ${needLabel}.`,
    `Fact to convey exactly, without adding new facts: ${fallbackText}`,
    'Respond with only that guidance sentence, nothing else.',
  ].join('\n');

  try {
    const result = await generateText(prompt, fallbackText);
    return NextResponse.json({
      guidance: result.text,
      recommendedZoneId: route.zone.id,
      recommendedZoneLabel: route.zone.label,
      source: result.source,
    });
  } catch (error) {
    logger.error('api/accessibility', error);
    return NextResponse.json({ error: 'Unable to generate guidance right now.' }, { status: 500 });
  }
}
