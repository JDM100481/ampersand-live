import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Ampersand LIVE',
  description: 'BIGO Dias storefront and internal operations workspace',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
