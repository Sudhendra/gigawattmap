import type { Metadata } from 'next';
import { JetBrains_Mono, Geist, Source_Serif_4 } from 'next/font/google';
import { AppHeader } from '@/components/app-header';
import { QueryProvider } from './_components/query-provider';
import { APP_URL } from '@/lib/env';
import { cn } from '@/lib/cn';
import './globals.css';

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
});

const geist = Geist({
  subsets: ['latin'],
  variable: '--font-geist',
  display: 'swap',
});

const sourceSerif = Source_Serif_4({
  subsets: ['latin'],
  variable: '--font-source-serif',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: 'Gigawatt Map — every AI datacenter and the grid that feeds it',
  description:
    'A public intelligence atlas of the world\u2019s datacenters, the power that feeds them, and the cables that connect them.',
  openGraph: {
    type: 'website',
    siteName: 'Gigawatt Map',
    url: APP_URL,
    title: 'Gigawatt Map — every AI datacenter and the grid that feeds it',
    description:
      'A public intelligence atlas of the world\u2019s datacenters, the power that feeds them, and the cables that connect them.',
    images: [
      {
        url: '/api/v1/og',
        width: 1200,
        height: 630,
        alt: 'Gigawatt Map — global AI datacenter atlas',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@gigawattmap',
    title: 'Gigawatt Map — every AI datacenter and the grid that feeds it',
    description:
      'A public intelligence atlas of the world\u2019s datacenters, the power that feeds them, and the cables that connect them.',
    images: ['/api/v1/og'],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <html
      lang="en"
      className={cn(jetbrainsMono.variable, geist.variable, sourceSerif.variable)}
    >
      <body className="min-h-screen bg-bg-base text-text-primary">
        <QueryProvider>
          <AppHeader />
          <main>{children}</main>
        </QueryProvider>
      </body>
    </html>
  );
}
