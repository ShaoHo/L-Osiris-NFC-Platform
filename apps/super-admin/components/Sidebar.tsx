'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const links = [
  { href: '/', label: 'Admin Dashboard' },
  { href: '/governance', label: 'Governance' },
  { href: '/audit', label: 'Audit Actions' },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="ds-sidebar">
      <h2>Super Admin</h2>
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
        VPN + OTP required
      </p>
    </aside>
  );
}
