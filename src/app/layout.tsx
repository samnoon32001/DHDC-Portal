import type { Metadata, Viewport } from 'next';
import './globals.css';
import React from 'react';

export const viewport: Viewport = {
  themeColor: '#4f39f6',
  width: 'device-width',
  initialScale: 1,
};

export const metadata: Metadata = {
  title: "DARUL HIDAYA DA'WA COLLEGE, MANOOR | DHDC PORTAL",
  description:
    "Official Academic and Student Dossier Portal for DARUL HIDAYA DA'WA COLLEGE, MANOOR with 360° student dossiers, multi-period attendance, leave tracker, complaint routing, and CCE evaluation.",
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
    apple: '/icons/icon-192.svg',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'DHDC PORTAL',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <link rel="apple-touch-icon" href="/icons/icon-192.svg" />
        <meta name="theme-color" content="#4f39f6" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="DHDC PORTAL" />
      </head>
      <body className="antialiased min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 selection:bg-indigo-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
