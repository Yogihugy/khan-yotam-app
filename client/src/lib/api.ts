import { appConfig } from './config';
import { getAccessToken } from './supabase';
import type { Session } from '@supabase/supabase-js';

export type PublicUser = {
  id: string;
  name: string;
  phone: string;
  role: 'guest' | 'staff' | 'admin';
  traveler_type: 'hiker' | 'cyclist' | 'staff' | 'other' | null;
  color: string;
  status: 'active' | 'quiet' | 'offline';
  expires_at: string | null;
};

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${appConfig.apiUrl}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body.error || `Request failed (${res.status})`);
  }
  return body as T;
}

export function verifyInvite(token: string) {
  return apiFetch<{
    session: Session;
    profile_complete: boolean;
    user: PublicUser;
  }>('/auth/verify-invite', {
    method: 'POST',
    body: JSON.stringify({ token }),
  });
}

export function completeProfile(
  accessToken: string,
  payload: { name: string; traveler_type: string; color: string },
) {
  return apiFetch<{ user: PublicUser }>('/auth/complete-profile', {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(payload),
  });
}

export async function postDistress(payload: {
  client_request_id: string;
  lat: number | null;
  lng: number | null;
}) {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    throw new Error('אין סשן פעיל');
  }

  return apiFetch<{
    ok: boolean;
    id?: string;
    whatsapp_sent?: boolean;
    duplicate?: boolean;
    mocked?: boolean;
  }>('/api/distress', {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(payload),
  });
}
