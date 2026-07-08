/**
 * Tiny structured logger. The only reason this exists instead of bare
 * console calls is to guarantee one thing: request payloads and error
 * objects are never logged in a way that could leak GEMINI_API_KEY or raw
 * user text verbatim into log storage.
 */

type Level = 'info' | 'warn' | 'error';

function safeMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return 'Unknown error';
}

function emit(level: Level, scope: string, message: string): void {
  const line = `[${new Date().toISOString()}] [${level}] [${scope}] ${message}`;
  if (level === 'error') {
    console.error(line);
  } else if (level === 'warn') {
    console.warn(line);
  } else {
    // eslint-disable-next-line no-console -- info logs are intentionally quieter in prod; only warn/error are allowed by default
    console.info(line);
  }
}

export const logger = {
  info: (scope: string, message: string) => emit('info', scope, message),
  warn: (scope: string, message: string) => emit('warn', scope, message),
  error: (scope: string, error: unknown) => emit('error', scope, safeMessage(error)),
};
