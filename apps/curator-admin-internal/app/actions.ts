'use server';

import { cookies } from 'next/headers';

export async function clearSession() {
  const cookieStore = cookies();
  cookieStore.set('admin_auth', '', { path: '/', maxAge: 0 });
  cookieStore.set('admin_otp', '', { path: '/', maxAge: 0 });
}
