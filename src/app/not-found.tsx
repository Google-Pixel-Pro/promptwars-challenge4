import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-console-bg px-4 text-center">
      <p className="font-mono text-xs uppercase tracking-widest text-pitch">404</p>
      <h1 className="font-display text-2xl font-bold text-floodlight">Zone not found</h1>
      <p className="max-w-md text-sm text-console-muted">
        This route doesn&apos;t exist in the command center.
      </p>
      <Link
        href="/"
        className="rounded-lg bg-pitch px-4 py-2 text-sm font-semibold text-console-bg transition-colors hover:bg-pitch-soft"
      >
        Return to dashboard
      </Link>
    </main>
  );
}
