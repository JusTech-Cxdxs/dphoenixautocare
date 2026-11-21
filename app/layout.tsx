import type { Metadata, Viewport } from 'next';
import { cookies } from 'next/headers';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import { THEME_COOKIE, parseTheme } from '@/lib/theme';
import './globals.css';

export const metadata: Metadata = {
  title: { default: "D'Phoenix Autocare", template: "%s · D'Phoenix Autocare" },
  description: 'Workshop and fleet system for D’Phoenix Autocare. Restore Life To Your Vehicle.',
  icons: { icon: '/brand/logo.png', apple: '/brand/logo.png' },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0A1628' },
  ],
};

// Every page carries a per-request CSP nonce, so nothing is rendered statically.
export const dynamic = 'force-dynamic';

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const theme = parseTheme((await cookies()).get(THEME_COOKIE)?.value);
  return (
    <html lang="en-NG" data-theme={theme === 'system' ? undefined : theme} className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
