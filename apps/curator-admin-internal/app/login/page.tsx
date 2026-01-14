import { redirect } from 'next/navigation';
import { LoginForm } from './login-form';
import { getAdminSession } from '../../lib/admin-session';

export default async function LoginPage() {
  const session = await getAdminSession();
  if (session) {
    redirect('/');
  }

  return (
    <section className="card stack">
      <header className="stack">
        <h1>Losiris Admin Access</h1>
        <p className="muted">
          Authenticate against the admin API using your credentials and a valid
          OTP code.
        </p>
      </header>
      <LoginForm />
    </section>
  );
}
