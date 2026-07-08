import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import type {
  StadiumState,
  ZoneRisk,
  AdvisorResponse,
  OperationalRecommendation,
  RecommendationCategory,
} from '@/types';
import { buildAdvisorPrompt } from './promptBuilder';
import { generateFallbackRecommendations } from './fallbackAdvisor';
import { logger } from './logger';

const MODEL_NAME = 'gemini-1.5-flash';
const REQUEST_TIMEOUT_MS = 8000;
const MAX_ATTEMPTS = 2;

const VALID_CATEGORIES: RecommendationCategory[] = [
  'gate-management',
  'staffing',
  'communication',
  'medical',
  'security',
  'facility',
  'transportation',
];

const recommendationResponseSchema = {
  type: SchemaType.OBJECT,
  properties: {
    overallRiskLevel: {
      type: SchemaType.STRING,
      enum: ['nominal', 'elevated', 'high', 'critical'],
    },
    recommendations: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          priority: { type: SchemaType.NUMBER },
          action: { type: SchemaType.STRING },
          rationale: { type: SchemaType.STRING },
          targetZoneIds: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
          category: { type: SchemaType.STRING, enum: VALID_CATEGORIES },
        },
        required: ['priority', 'action', 'rationale', 'targetZoneIds', 'category'],
      },
    },
  },
  required: ['overallRiskLevel', 'recommendations'],
};

function getClient(): GoogleGenerativeAI | undefined {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return undefined;
  return new GoogleGenerativeAI(apiKey);
}

/**
 * Drops any AI-produced recommendation that references a zone ID not present
 * in the actual stadium state. This is the second of the two structural
 * anti-hallucination guardrails described in promptBuilder.ts: even if the
 * model invents a plausible-sounding zone, it cannot reach the UI.
 */
export function keepOnlyRealZones(
  recommendations: OperationalRecommendation[],
  state: StadiumState
): OperationalRecommendation[] {
  const realIds = new Set(state.zones.map((zone) => zone.id));
  return recommendations.filter(
    (rec) => rec.targetZoneIds.length > 0 && rec.targetZoneIds.every((id) => realIds.has(id))
  );
}

async function callGeminiOnce(
  client: GoogleGenerativeAI,
  prompt: string,
  signal: AbortSignal
): Promise<unknown> {
  const model = client.getGenerativeModel({
    model: MODEL_NAME,
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: recommendationResponseSchema as never,
      temperature: 0.3,
    },
  });

  const result = await model.generateContent(
    { contents: [{ role: 'user', parts: [{ text: prompt }] }] },
    { signal }
  );

  return JSON.parse(result.response.text());
}

export async function generateAdvisorResponse(
  state: StadiumState,
  zoneRisks: ZoneRisk[],
  operatorNote?: string
): Promise<AdvisorResponse> {
  const client = getClient();
  if (!client) {
    return generateFallbackRecommendations(state, zoneRisks);
  }

  const prompt = buildAdvisorPrompt(state, zoneRisks, operatorNote);

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const parsed = (await callGeminiOnce(client, prompt, controller.signal)) as {
        overallRiskLevel: AdvisorResponse['overallRiskLevel'];
        recommendations: Array<Omit<OperationalRecommendation, 'id'>>;
      };

      const withIds: OperationalRecommendation[] = parsed.recommendations.map((rec, index) => ({
        id: `ai-${index}`,
        ...rec,
      }));

      const validated = keepOnlyRealZones(withIds, state);

      if (validated.length === 0) {
        logger.warn('gemini', 'response referenced no valid zones, using fallback heuristic');
        return generateFallbackRecommendations(state, zoneRisks);
      }

      return {
        generatedAt: new Date().toISOString(),
        overallRiskLevel: parsed.overallRiskLevel,
        recommendations: validated,
        source: 'gemini',
      };
    } catch (error) {
      logger.warn('gemini', `attempt ${attempt} failed: ${error instanceof Error ? error.message : 'unknown'}`);
      if (attempt === MAX_ATTEMPTS) {
        logger.error('gemini', error);
        return generateFallbackRecommendations(state, zoneRisks);
      }
    } finally {
      clearTimeout(timeout);
    }
  }

  return generateFallbackRecommendations(state, zoneRisks);
}

export interface GeneratedText {
  text: string;
  source: 'gemini' | 'fallback-template';
}

/**
 * Generic short-text generation used by the announcement and accessibility
 * endpoints. Falls back to a caller-supplied template so both endpoints stay
 * fully functional without an API key.
 */
export async function generateText(prompt: string, fallbackText: string): Promise<GeneratedText> {
  const client = getClient();
  if (!client) {
    return { text: fallbackText, source: 'fallback-template' };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const model = client.getGenerativeModel({ model: MODEL_NAME, generationConfig: { temperature: 0.4 } });
    const result = await model.generateContent(
      { contents: [{ role: 'user', parts: [{ text: prompt }] }] },
      { signal: controller.signal }
    );
    const text = result.response.text().trim();
    return text.length > 0 ? { text, source: 'gemini' } : { text: fallbackText, source: 'fallback-template' };
  } catch (error) {
    logger.warn('gemini-text', error instanceof Error ? error.message : 'unknown error');
    return { text: fallbackText, source: 'fallback-template' };
  } finally {
    clearTimeout(timeout);
  }
}
