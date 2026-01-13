import '@losiris/design-system/styles.css';
import type { Metadata } from 'next';
import { Sidebar } from '../components/Sidebar';

export const metadata: Metadata = {
  title: 'L-Osiris Curator Dashboard',
  description: 'Curator workspace for exhibitions.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <div className="ds-shell">
          <Sidebar />
          <main className="ds-main">{children}</main>
        </div>
      </body>
    </html>
  );
}
