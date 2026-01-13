import '@losiris/design-system/styles.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'L-Osiris Viewer',
  description: 'Quiet exhibition viewer experience.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
