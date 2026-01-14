import { cookies } from 'next/headers';

const ADMIN_API_URL =
  process.env.ADMIN_API_URL ?? 'http://localhost:3001/v1';

export interface AdminSession {
  userId?: string;
  email?: string;
}

export async function getAdminSession(): Promise<AdminSession | null> {
  const cookieStore = cookies();
  const auth = cookieStore.get('admin_auth')?.value;
  const otp = cookieStore.get('admin_otp')?.value;

  if (!auth || !otp) {
    return null;
  }

  const response = await fetch(`${ADMIN_API_URL}/admin/session`, {
    method: 'GET',
    headers: {
      Authorization: `Basic ${auth}`,
      'x-admin-otp': otp,
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    return null;
  }

  return response.json();
}

export function getAdminAuthHeaders() {
  const cookieStore = cookies();
  const auth = cookieStore.get('admin_auth')?.value;
  const otp = cookieStore.get('admin_otp')?.value;

  if (!auth || !otp) {
    return null;
  }

  return {
    Authorization: `Basic ${auth}`,
    'x-admin-otp': otp,
  };
}
