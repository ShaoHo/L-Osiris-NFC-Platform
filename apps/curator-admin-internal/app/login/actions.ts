'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

const ADMIN_API_URL =
  process.env.ADMIN_API_URL ?? 'http://localhost:3001/v1';

interface LoginState {
  error?: string;
}

export async function createSession(
  _: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  const otp = String(formData.get('otp') ?? '').trim();

  if (!email || !password || !otp) {
    return { error: 'Email, password, and OTP are required.' };
  }

  const authToken = Buffer.from(`${email}:${password}`).toString('base64');

  const response = await fetch(`${ADMIN_API_URL}/admin/session`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${authToken}`,
      'x-admin-otp': otp,
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    const message = await response.text();
    return {
      error:
        message ||
        'Unable to create admin session. Verify credentials and OTP.',
    };
  }

  const cookieStore = cookies();
  const secure = process.env.NODE_ENV === 'production';

  cookieStore.set('admin_auth', authToken, {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: '/',
  });
  cookieStore.set('admin_otp', otp, {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: '/',
  });

  redirect('/');
}
