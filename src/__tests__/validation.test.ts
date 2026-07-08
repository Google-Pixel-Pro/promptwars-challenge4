import { describe, it, expect } from 'vitest';
import {
  advisorRequestSchema,
  announcementRequestSchema,
  accessibilityRequestSchema,
} from '@/lib/validation';

describe('advisorRequestSchema', () => {
  it('accepts a valid scenarioId with no note', () => {
    const result = advisorRequestSchema.safeParse({ scenarioId: 'normal-flow' });
    expect(result.success).toBe(true);
  });

  it('rejects an unknown scenarioId', () => {
    const result = advisorRequestSchema.safeParse({ scenarioId: 'made-up-scenario' });
    expect(result.success).toBe(false);
  });

  it('rejects an operatorNote longer than 300 characters', () => {
    const result = advisorRequestSchema.safeParse({
      scenarioId: 'normal-flow',
      operatorNote: 'x'.repeat(301),
    });
    expect(result.success).toBe(false);
  });
});

describe('announcementRequestSchema', () => {
  it('accepts a valid announcement request', () => {
    const result = announcementRequestSchema.safeParse({
      message: 'Please proceed to the nearest exit.',
      targetLanguage: 'es',
      urgency: 'urgent',
    });
    expect(result.success).toBe(true);
  });

  it('defaults urgency to routine when omitted', () => {
    const result = announcementRequestSchema.safeParse({
      message: 'Welcome to the stadium.',
      targetLanguage: 'en',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.urgency).toBe('routine');
    }
  });

  it('rejects an empty message', () => {
    const result = announcementRequestSchema.safeParse({ message: '', targetLanguage: 'en' });
    expect(result.success).toBe(false);
  });

  it('rejects an unsupported language code', () => {
    const result = announcementRequestSchema.safeParse({ message: 'Hi', targetLanguage: 'zz' });
    expect(result.success).toBe(false);
  });
});

describe('accessibilityRequestSchema', () => {
  it('accepts a valid request', () => {
    const result = accessibilityRequestSchema.safeParse({
      need: 'wheelchair',
      currentZoneId: 'gate-a-lower',
      scenarioId: 'normal-flow',
    });
    expect(result.success).toBe(true);
  });

  it('rejects an unknown accessibility need', () => {
    const result = accessibilityRequestSchema.safeParse({
      need: 'telepathy',
      currentZoneId: 'gate-a-lower',
      scenarioId: 'normal-flow',
    });
    expect(result.success).toBe(false);
  });
});
