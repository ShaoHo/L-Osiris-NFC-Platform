import './globals.css';
import type { ReactNode } from 'react';

export const metadata = {
  title: 'Losiris Admin',
  description: 'Internal admin console',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <main className="page">{children}</main>
      </body>
    </html>
  );
}
