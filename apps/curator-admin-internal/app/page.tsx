import { redirect } from 'next/navigation';
import { getAdminSession } from '../lib/admin-session';
import { clearSession } from './actions';

export default async function AdminHomePage() {
  const session = await getAdminSession();

  if (!session) {
    redirect('/login');
  }

  return (
    <section className="card stack">
      <header className="stack">
        <h1>Admin Console</h1>
        <p className="muted">Authenticated admin access is active.</p>
      </header>

      <section className="stack">
        <h2>Session</h2>
        <ul className="list">
          <li>
            <strong>Email:</strong> {session.email ?? 'Unknown'}
          </li>
          <li>
            <strong>User ID:</strong> {session.userId ?? 'Unknown'}
          </li>
        </ul>
      </section>

      <section className="stack">
        <h2>Next steps</h2>
        <p className="muted">
          Use this console to verify your admin session before invoking admin
          APIs or tooling that require OTP-backed access.
        </p>
      </section>

      <form action={clearSession}>
        <button className="button secondary" type="submit">
          Sign out
        </button>
      </form>
    </section>
  );
}
