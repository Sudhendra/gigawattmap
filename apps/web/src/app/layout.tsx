import type { Metadata } from 'next';
import { JetBrains_Mono, Geist, Source_Serif_4 } from 'next/font/google';
import { AppHeader } from '@/components/app-header';
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
  title: 'Gigawatt Map — every AI datacenter and the grid that feeds it',
  description:
    'A public intelligence atlas of the world\u2019s datacenters, the power that feeds them, and the cables that connect them.',
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
        <AppHeader />
        <main className="mx-auto max-w-screen-2xl">{children}</main>
      </body>
    </html>
  );
}
