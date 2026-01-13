'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const links = [
  { href: '/', label: 'Dashboard' },
  { href: '/exhibitions', label: 'Exhibitions' },
  { href: '/ai-studio', label: 'AI Studio' },
  { href: '/media-library', label: 'Media Library' },
  { href: '/analytics', label: 'Analytics' },
  { href: '/account/payout', label: 'Account & Payout' },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="ds-sidebar">
      <h2>Curator Console</h2>
      <nav>
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={pathname === link.href ? 'active' : undefined}
          >
            {link.label}
          </Link>
        ))}
      </nav>
      <p className="ds-muted" style={{ marginTop: 24 }}>
        Curator ID: <strong>{process.env.NEXT_PUBLIC_CURATOR_ID ?? 'curator_dev'}</strong>
      </p>
    </aside>
  );
}
