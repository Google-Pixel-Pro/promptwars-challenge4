'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import type { AnnouncementUrgency, SupportedLanguage } from '@/types';

const LANGUAGES: Array<{ id: SupportedLanguage; label: string }> = [
  { id: 'es', label: 'Spanish' },
  { id: 'fr', label: 'French' },
  { id: 'pt', label: 'Portuguese' },
  { id: 'ar', label: 'Arabic' },
  { id: 'hi', label: 'Hindi' },
  { id: 'en', label: 'English' },
];

const URGENCIES: AnnouncementUrgency[] = ['routine', 'important', 'urgent'];

interface AnnouncementResult {
  announcement: string;
  language: SupportedLanguage;
  source: 'gemini' | 'fallback-template';
}

export function AnnouncementPanel() {
  const [message, setMessage] = useState('Heavy congestion at Gate B. Please use Gate D instead.');
  const [language, setLanguage] = useState<SupportedLanguage>('es');
  const [urgency, setUrgency] = useState<AnnouncementUrgency>('important');
  const [result, setResult] = useState<AnnouncementResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/announcement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, targetLanguage: language, urgency }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? 'Failed to generate announcement.');
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
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="text-console-muted">Announcement (English)</span>
        <textarea
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          maxLength={400}
          rows={3}
          className="rounded-lg border border-console-border bg-console-panelAlt p-3 text-console-text focus-visible:outline-none"
        />
      </label>

      <div className="flex flex-wrap gap-4">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-console-muted">Target language</span>
          <select
            value={language}
            onChange={(event) => setLanguage(event.target.value as SupportedLanguage)}
            className="rounded-lg border border-console-border bg-console-panelAlt px-3 py-2 text-console-text focus-visible:outline-none"
          >
            {LANGUAGES.map((lang) => (
              <option key={lang.id} value={lang.id}>
                {lang.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-console-muted">Urgency</span>
          <select
            value={urgency}
            onChange={(event) => setUrgency(event.target.value as AnnouncementUrgency)}
            className="rounded-lg border border-console-border bg-console-panelAlt px-3 py-2 text-console-text focus-visible:outline-none"
          >
            {URGENCIES.map((level) => (
              <option key={level} value={level}>
                {level}
              </option>
            ))}
          </select>
        </label>
      </div>

      <Button onClick={handleGenerate} disabled={loading || message.trim().length === 0}>
        {loading ? 'Generating…' : 'Generate announcement'}
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
          <p
            dir={result.language === 'ar' ? 'rtl' : 'ltr'}
            lang={result.language}
            className="mt-3 text-console-text"
          >
            {result.announcement}
          </p>
        </div>
      )}
    </div>
  );
}
