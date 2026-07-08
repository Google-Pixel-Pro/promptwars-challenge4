import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'PulsePoint AI · Stadium Operations Command Center',
  description:
    'GenAI-powered crowd, safety, and multilingual decision support for FIFA World Cup 2026 venue operations.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-console-bg font-body text-console-text antialiased">{children}</body>
    </html>
  );
}
