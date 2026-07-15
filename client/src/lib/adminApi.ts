import { appConfig } from './config';
import { getAccessToken } from './supabase';

async function adminFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const accessToken = await getAccessToken();
  if (!accessToken) throw new Error('אין סשן פעיל');

  const res = await fetch(`${appConfig.apiUrl}/api/admin${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
      ...(init?.headers || {}),
    },
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body.error || `Request failed (${res.status})`);
  }
  return body as T;
}

export type AdminUserRow = {
  id: string;
  name: string;
  phone: string;
  role: 'guest' | 'staff' | 'admin';
  traveler_type: string | null;
  status: string;
  color: string;
  last_seen_at: string | null;
  last_location_at: string | null;
  created_at: string | null;
  expires_at: string | null;
  is_deleted: boolean;
};

export type DistressCallRow = {
  id: string;
  client_request_id: string;
  user_id: string;
  lat: number | null;
  lng: number | null;
  triggered_at: string;
  closed_at: string | null;
  closed_by: string | null;
  notes: string | null;
  whatsapp_sent: boolean;
  users?: {
    id: string;
    name: string;
    phone: string;
    role: string;
    traveler_type: string | null;
    color: string;
  } | null;
};

export type ActivityEvent = {
  id: string;
  user_id: string | null;
  event_type: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
  users?: { id: string; name: string; phone: string } | null;
};

export type PoiAdmin = {
  id: string;
  name: string;
  description: string | null;
  lat: number;
  lng: number;
  type: 'khan' | 'parking' | 'water' | 'warning' | 'other';
  created_by: string | null;
  created_at: string;
};

export const adminApi = {
  listUsers: () => adminFetch<{ users: AdminUserRow[] }>('/users'),
  addUser: (body: { name: string; phone: string; role: string }) =>
    adminFetch<{ userId: string; inviteUrl: string; inviteToken: string }>('/users', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  removeUser: (id: string) =>
    adminFetch<{ ok: boolean }>(`/users/${id}`, { method: 'DELETE' }),
  extendUser: (id: string, days?: number) =>
    adminFetch<{ user: AdminUserRow }>(`/users/${id}/extend`, {
      method: 'PATCH',
      body: JSON.stringify({ days }),
    }),
  userTrail: (id: string, hours = 24) =>
    adminFetch<{ points: Array<{ lat: number; lng: number; recorded_at: string }> }>(
      `/users/${id}/trail?hours=${hours}`,
    ),

  listDistress: (openOnly = false) =>
    adminFetch<{ calls: DistressCallRow[] }>(`/distress${openOnly ? '?open=1' : ''}`),
  closeDistress: (id: string, notes?: string) =>
    adminFetch<{ ok: boolean }>(`/distress/${id}/close`, {
      method: 'PATCH',
      body: JSON.stringify({ notes }),
    }),

  getDuty: () =>
    adminFetch<{
      duty_officer: {
        name: string;
        phone: string;
        backup_name: string | null;
        backup_phone: string | null;
      } | null;
    }>('/duty-officer'),
  putDuty: (body: {
    name: string;
    phone: string;
    backup_name?: string | null;
    backup_phone?: string | null;
  }) =>
    adminFetch('/duty-officer', { method: 'PUT', body: JSON.stringify(body) }),

  getProtocol: () =>
    adminFetch<{ protocol: { content: string } | null }>('/protocol'),
  putProtocol: (content: string) =>
    adminFetch('/protocol', { method: 'PUT', body: JSON.stringify({ content }) }),

  listPoi: () => adminFetch<{ poi: PoiAdmin[] }>('/poi'),
  createPoi: (body: Omit<PoiAdmin, 'id' | 'created_by' | 'created_at'>) =>
    adminFetch<{ poi: PoiAdmin }>('/poi', { method: 'POST', body: JSON.stringify(body) }),
  updatePoi: (id: string, body: Partial<PoiAdmin>) =>
    adminFetch<{ poi: PoiAdmin }>(`/poi/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deletePoi: (id: string) =>
    adminFetch<{ ok: boolean }>(`/poi/${id}`, { method: 'DELETE' }),

  activityLog: (params: {
    event_type?: string;
    user_id?: string;
    from?: string;
    to?: string;
  }) => {
    const q = new URLSearchParams();
    if (params.event_type) q.set('event_type', params.event_type);
    if (params.user_id) q.set('user_id', params.user_id);
    if (params.from) q.set('from', params.from);
    if (params.to) q.set('to', params.to);
    const qs = q.toString();
    return adminFetch<{ events: ActivityEvent[] }>(`/activity-log${qs ? `?${qs}` : ''}`);
  },
};
