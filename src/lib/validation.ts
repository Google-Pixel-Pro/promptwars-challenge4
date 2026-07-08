import { z } from 'zod';

export const scenarioIdSchema = z.enum([
  'normal-flow',
  'halftime-rush',
  'post-match-exodus',
  'security-incident',
]);

export const advisorRequestSchema = z.object({
  scenarioId: scenarioIdSchema,
  operatorNote: z.string().max(300).optional(),
});

export const languageSchema = z.enum(['en', 'es', 'fr', 'pt', 'ar', 'hi']);

export const announcementRequestSchema = z.object({
  message: z.string().min(1, 'Message is required.').max(400),
  targetLanguage: languageSchema,
  urgency: z.enum(['routine', 'important', 'urgent']).default('routine'),
});

export const accessibilityNeedSchema = z.enum([
  'wheelchair',
  'low-vision',
  'hearing',
  'sensory-friendly',
  'cognitive-support',
]);

export const accessibilityRequestSchema = z.object({
  need: accessibilityNeedSchema,
  currentZoneId: z.string().min(1).max(40),
  scenarioId: scenarioIdSchema,
});

export type AdvisorRequest = z.infer<typeof advisorRequestSchema>;
export type AnnouncementRequest = z.infer<typeof announcementRequestSchema>;
export type AccessibilityRequest = z.infer<typeof accessibilityRequestSchema>;
