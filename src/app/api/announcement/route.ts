import { NextRequest, NextResponse } from 'next/server';
import { announcementRequestSchema } from '@/lib/validation';
import { checkRateLimit } from '@/lib/rateLimit';
import { generateText } from '@/lib/gemini';
import { sanitizeForPrompt } from '@/lib/sanitize';
import { logger } from '@/lib/logger';
import type { SupportedLanguage } from '@/types';

export const runtime = 'nodejs';

const LANGUAGE_NAMES: Record<SupportedLanguage, string> = {
  en: 'English',
  es: 'Spanish',
  fr: 'French',
  pt: 'Portuguese',
  ar: 'Arabic',
  hi: 'Hindi',
};

// Deterministic, safety-reviewed fallback phrases used when no API key is
// configured, so the feature still demonstrates real multilingual output
// rather than failing silently.
const FALLBACK_TEMPLATES: Record<SupportedLanguage, string> = {
  en: 'Attention: please follow steward instructions and proceed calmly to the nearest available exit.',
  es: 'Atención: sigan las instrucciones del personal y diríjanse con calma a la salida más cercana.',
  fr: "Attention : veuillez suivre les instructions du personnel et vous diriger calmement vers la sortie la plus proche.",
  pt: 'Atenção: sigam as instruções da equipe e dirijam-se com calma à saída mais próxima disponível.',
  ar: 'انتباه: يرجى اتباع تعليمات المشرفين والتوجه بهدوء إلى أقرب مخرج متاح.',
  hi: 'ध्यान दें: कृपया स्टाफ के निर्देशों का पालन करें और शांति से निकटतम निकास की ओर बढ़ें।',
};

export async function POST(request: NextRequest) {
  const clientKey = request.headers.get('x-forwarded-for') ?? 'anonymous';
  const rate = checkRateLimit(`announcement:${clientKey}`);
  if (!rate.allowed) {
    return NextResponse.json({ error: 'Rate limit exceeded. Please wait and try again.' }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
  }

  const parsed = announcementRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request.', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { message, targetLanguage, urgency } = parsed.data;
  const sanitizedMessage = sanitizeForPrompt(message);
  const languageName = LANGUAGE_NAMES[targetLanguage];

  const prompt = [
    `Translate and adapt the following stadium PA announcement into ${languageName}.`,
    `Urgency level: ${urgency}. Keep the tone appropriate for a live public-address system:`,
    urgency === 'urgent'
      ? 'clear, calm, and direct, with no unnecessary words.'
      : 'clear and courteous.',
    'Do not add information that was not in the original message.',
    '',
    `Original message: "${sanitizedMessage}"`,
    '',
    `Respond with only the ${languageName} announcement text, nothing else.`,
  ].join('\n');

  try {
    const result = await generateText(prompt, FALLBACK_TEMPLATES[targetLanguage]);
    return NextResponse.json({
      announcement: result.text,
      language: targetLanguage,
      urgency,
      source: result.source,
    });
  } catch (error) {
    logger.error('api/announcement', error);
    return NextResponse.json({ error: 'Unable to generate the announcement right now.' }, { status: 500 });
  }
}
