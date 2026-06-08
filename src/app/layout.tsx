import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Ampersand LIVE Console',
  description: 'Manual-first BIGO reseller commerce operating system',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
